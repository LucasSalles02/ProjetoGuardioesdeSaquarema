import json
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import pytest

from gds.database import connection


def test_health_and_registration(client, account, auth_headers, db_url):
    assert client.get("/api/health").json()["database"] == "postgresql"
    assert account["usuario"]["role"] == "USER"
    assert account["usuario"]["admin"] is False
    assert "password_hash" not in json.dumps(account)
    assert client.get("/api/auth/me", headers=auth_headers).json()["usuario"]["id"] == account["usuario"]["id"]
    with connection(db_url) as db:
        assert db.execute("SELECT password_hash FROM users").fetchone()["password_hash"].startswith("scrypt$")


def test_login_duplicate_logout_and_password(client, account, auth_headers):
    duplicate = client.post("/api/auth/register", json={"nome": "Aluno", "email": " ALUNO@EXAMPLE.COM ", "senha": "segredo123"})
    assert duplicate.status_code == 403
    assert client.post("/api/auth/login", json={"email": "aluno@example.com", "senha": "errada"}).status_code == 401
    logged = client.post("/api/auth/login", json={"email": "aluno@example.com", "senha": "segredo123"})
    assert logged.status_code == 200
    assert client.post("/api/auth/logout", headers=auth_headers).json() == {"ok": True}
    assert client.get("/api/auth/me", headers=auth_headers).status_code == 401
    headers = {"Authorization": f"Bearer {logged.json()['token']}"}
    assert client.patch("/api/account/password", headers=headers, json={"senhaAtual": "errada", "novaSenha": "novosegredo123"}).status_code == 400
    assert client.patch("/api/account/password", headers=headers, json={"senhaAtual": "segredo123", "novaSenha": "novosegredo123"}).status_code == 200
    assert client.get("/api/auth/me", headers=headers).status_code == 401
    assert client.post("/api/auth/login", json={"email": "aluno@example.com", "senha": "novosegredo123"}).status_code == 200


def test_profile_edits_require_administrative_endpoint(client, account, auth_headers):
    assert client.patch("/api/account/profile", headers=auth_headers, json={"nome": "Novo Nome", "role": "ADMIN"}).status_code == 403
    result = client.get("/api/auth/me", headers=auth_headers).json()["usuario"]
    assert result["nome"] == "Aluno Teste" and result["role"] == "USER"


@pytest.mark.parametrize("path", ["admin/users", "admin/content", "missions", "learning/modules", "progress", "progress/history", "achievements", "games"])
def test_protected_routes(client, path):
    assert client.get(f"/api/{path}").status_code == 401
    assert client.get(f"/api/{path}", headers={"Authorization": "Bearer invalid"}).status_code == 401


def test_expiration_and_current_role(client, auth_headers, admin_headers, db_url):
    assert client.post("/api/auth/admin/login", json={"username": "GESTOR", "senha": "segredo123"}).status_code == 200
    assert client.get("/api/admin/users", headers=admin_headers).status_code == 200
    with connection(db_url) as db:
        db.execute("UPDATE users SET role='USER'")
    assert client.get("/api/admin/users", headers=admin_headers).status_code == 403
    assert client.post("/api/auth/admin/login", json={"username": "gestor", "senha": "segredo123"}).status_code == 401
    with connection(db_url) as db:
        db.execute("UPDATE sessions SET created_at='2000-01-01T00:00:00.000Z'")
    assert client.get("/api/auth/me", headers=auth_headers).status_code == 401


def test_rate_limit_and_json(client):
    for _ in range(30):
        assert client.post("/api/auth/admin/login", json={"username": "none", "senha": "bad"}).status_code == 401
    assert client.post("/api/auth/login", json={}).status_code == 429
    for content in ["{", "[]", "null"]:
        assert client.post("/api/auth/register", content=content).status_code == 400
    assert client.post("/api/auth/register", content='x' * 100_001).status_code == 413


def test_missions_quiz_and_achievements(client, auth_headers):
    missions = client.get("/api/missions", headers=auth_headers).json()["missoes"]
    quiz = next(item for item in missions if item["id"] == "quiz-ambiental")
    assert all("answer" not in question for question in quiz["validacao"]["questions"])
    endpoint = "/api/missions/lixo-marinho/submit"
    assert client.post(endpoint, headers=auth_headers, json={"residuo1": "garrafa"}).status_code == 400
    evidence = {"residuo1": "garrafa", "residuo2": "sacola", "residuo3": "canudo"}
    done = client.post(endpoint, headers=auth_headers, json=evidence).json()
    assert done["xpGanho"] == 100
    assert done["usuario"]["missoesConcluidas"] == 1
    assert done["novasConquistas"][0]["id"] == "primeira-missao"
    assert client.post(endpoint, headers=auth_headers, json=evidence).json()["xpGanho"] == 0
    assert client.post("/api/missions/quiz-ambiental/submit", headers=auth_headers, json={"respostas": {}}).status_code == 400
    answers = {"residuo-praia": "recolher-descartar", "animal-silvestre": "observar-distancia", "microplasticos": "reutilizaveis"}
    assert client.post("/api/missions/quiz-ambiental/submit", headers=auth_headers, json={"respostas": answers}).status_code == 200
    assert client.get("/api/progress", headers=auth_headers).json()["stats"]["missoesConcluidas"] == 2
    assert client.get("/api/progress/history", headers=auth_headers).json()["atividades"]
    assert client.get("/api/achievements", headers=auth_headers).json()["conquistas"][0]["obtida"] is True


def test_lesson_exactly_once(client, auth_headers):
    assert client.get("/api/learning/modules", headers=auth_headers).json()["modulos"]
    endpoint = "/api/learning/modules/vida-marinha/lessons/ecossistemas-costeiros/submit"
    assert client.post(endpoint, headers=auth_headers, json={"resposta": "curta"}).status_code == 400
    payload = {"resposta": "Vou observar a praia sem interferir na vida marinha local."}
    first = client.post(endpoint, headers=auth_headers, json=payload).json()
    second = client.post(endpoint, headers=auth_headers, json=payload).json()
    assert first["usuario"]["aulasConcluidas"] == 1
    assert second["xpGanho"] == 0
    assert second["modulo"]["concluidas"] == 1


def test_concurrent_reward_once(client, auth_headers):
    evidence = {"residuo1": "garrafa", "residuo2": "sacola", "residuo3": "canudo"}
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda _: client.post("/api/missions/lixo-marinho/submit", headers=auth_headers, json=evidence), range(4)))
    assert all(result.status_code == 200 for result in results)
    assert sorted(result.json()["xpGanho"] for result in results) == [0, 0, 0, 100]


def test_admin_content_lifecycle(client, admin_headers):
    module = {"titulo": "Modulo Local", "descricao": "Descricao educativa local"}
    result = client.post("/api/admin/modules", headers=admin_headers, json=module)
    assert result.status_code == 200, result.text
    assert result.json()["modulo"]["id"] == "modulo-local"
    lesson = {"titulo": "Aula Local", "resumo": "Resumo educativo", "xp": 55}
    assert client.post("/api/admin/modules/modulo-local/lessons", headers=admin_headers, json=lesson).status_code == 200
    edited = client.patch("/api/admin/modules/modulo-local/lessons/aula-local", headers=admin_headers, json={"xp": 65})
    assert edited.json()["modulo"]["lessons"][0]["xp"] == 65
    assert client.patch("/api/admin/modules/modulo-local", headers=admin_headers, json={"active": False}).status_code == 200
    mission = {"titulo": "Auditoria Local", "descricao": "Registrar tres itens", "xpRecompensa": 45, "validationType": "list"}
    created = client.post("/api/admin/missions", headers=admin_headers, json=mission)
    assert created.status_code == 200, created.text
    assert created.json()["missao"]["xpRecompensa"] == 45
    assert client.patch("/api/admin/missions/auditoria-local", headers=admin_headers, json={"active": False}).status_code == 200
    assert client.patch("/api/admin/games/memory", headers=admin_headers, json={"xpRecompensa": 75, "enabled": False}).json()["jogo"]["xpRecompensa"] == 75
    content = client.get("/api/admin/content", headers=admin_headers).json()
    assert any(row["id"] == "modulo-local" and not row["active"] for row in content["modulos"])
    assert client.post("/api/games/memory/sessions", headers=admin_headers).status_code == 404
    users = client.get("/api/admin/users", headers=admin_headers).json()["usuarios"]
    assert "password_hash" not in users[0]


def test_memory_reward_and_ownership(client, auth_headers, db_url):
    start = client.post("/api/games/memory/sessions", headers=auth_headers).json()
    assert all(card["symbol"] is None for card in start["jogo"]["cards"])
    with connection(db_url) as db:
        state = json.loads(db.execute("SELECT state_json FROM game_sessions WHERE id=%s", (start["sessionId"],)).fetchone()["state_json"])
    pairs = {}
    for card in state["cards"]:
        pairs.setdefault(card["symbol"], []).append(card["id"])
    for pair in pairs.values():
        for card_id in pair:
            response = client.post(f"/api/games/memory/sessions/{start['sessionId']}/flip", headers=auth_headers, json={"cardId": card_id})
            assert response.status_code == 200, response.text
    assert response.json()["xpGanho"] == 70
    assert response.json()["jogo"]["completed"] is True
    assert client.post(f"/api/games/memory/sessions/{start['sessionId']}/flip", headers=auth_headers, json={"cardId": card_id}).json()["xpGanho"] == 0
    with connection(db_url) as db:
        from gds.service import Service
        stranger = Service(db).register({"nome": "Outro Aluno", "email": "other@example.com", "senha": "segredo123"})
    assert client.post(f"/api/games/memory/sessions/{start['sessionId']}/flip", headers={"Authorization": f"Bearer {stranger['token']}"}, json={"cardId": card_id}).status_code == 404


def test_puzzle_moves_and_rewards(client, auth_headers, db_url):
    start = client.post("/api/games/puzzle/sessions", headers=auth_headers).json()
    with connection(db_url) as db:
        state = {"board": [1,2,3,4,5,6,0,7,8], "moves": 0, "completed": False, "xpReward": 90}
        db.execute("UPDATE game_sessions SET state_json=%s WHERE id=%s", (json.dumps(state), start["sessionId"]))
    endpoint = f"/api/games/puzzle/sessions/{start['sessionId']}/move"
    assert client.post(endpoint, headers=auth_headers, json={"tile": 5}).status_code == 400
    assert client.post(endpoint, headers=auth_headers, json={"tile": 7.5}).status_code == 400
    assert client.post(endpoint, headers=auth_headers, json={"tile": 7}).status_code == 200
    solved = client.post(endpoint, headers=auth_headers, json={"tile": 8}).json()
    assert solved["xpGanho"] == 90 and solved["jogo"]["completed"] is True
    assert client.post(endpoint, headers=auth_headers, json={"tile": 8}).json()["xpGanho"] == 0
