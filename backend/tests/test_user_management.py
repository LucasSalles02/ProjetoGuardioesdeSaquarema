import secrets
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest

from gds.admin import provision_admin
from gds.database import connection, migrate


def new_account(role="USER", suffix="one"):
    return {"nome": f"Conta {suffix}", "username": f"conta_{suffix}", "email": f"{suffix}@example.com",
            "cpf": f"{secrets.randbelow(10**11):011d}", "birth_date": "29/02/2000", "role": role}


def login(client, payload, password=None):
    path = "/api/auth/admin/login" if payload["role"] == "ADMIN" else "/api/auth/login"
    return client.post(path, json={"username": payload["cpf"], "email": payload["cpf"], "senha": password or payload["cpf"]})


def enter(client, payload):
    initial = login(client, payload)
    assert initial.status_code == 200, initial.text
    headers = {"Authorization": f"Bearer {initial.json()['token']}"}
    password = secrets.token_hex(16)
    setup = client.post("/api/auth/first-access/password", headers=headers, json={"novaSenha": password, "confirmarSenha": password})
    assert setup.status_code == 200, setup.text
    return {"Authorization": f"Bearer {setup.json()['token']}"}, password


@pytest.mark.parametrize("role", ["USER", "GESTOR_ESCOLAR", "ADMIN"])
def test_cpf_first_access_restricts_all_profiles_until_password_set(client, admin_headers, role, db_url):
    before = client.get("/api/auth/me", headers=admin_headers).json()["usuario"]["id"]
    payload = new_account(role)
    response = client.post("/api/admin/users", headers=admin_headers, json=payload)
    assert response.status_code == 200, response.text
    created = response.json()["usuario"]
    assert "token" not in response.json()
    assert created["role"] == role and created["must_change_password"] is True
    assert created["birth_date"] == "29/02/2000" and created["cpf"] == payload["cpf"]
    assert not any(key in created for key in ["password_hash", "password_salt", "senha"])
    assert client.get("/api/auth/me", headers=admin_headers).json()["usuario"]["id"] == before
    initial = login(client, payload).json()
    headers = {"Authorization": f"Bearer {initial['token']}"}
    for path in ["/api/missions", "/api/admin/users", "/api/progress", "/api/games"]:
        assert client.get(path, headers=headers).status_code == 403
    assert client.patch("/api/account/password", headers=headers, json={"senhaAtual": payload["cpf"], "novaSenha": "novaSenha123456"}).status_code == 403
    assert client.get("/api/auth/me", headers=headers).json()["usuario"]["must_change_password"] is True
    for values in [{"novaSenha": "short", "confirmarSenha": "short"}, {"novaSenha": "senhaNova123456", "confirmarSenha": "diferente"}, {"novaSenha": payload["cpf"], "confirmarSenha": payload["cpf"]}]:
        assert client.post("/api/auth/first-access/password", headers=headers, json=values).status_code == 400
    password = secrets.token_hex(16)
    setup = client.post("/api/auth/first-access/password", headers=headers, json={"novaSenha": password, "confirmarSenha": password})
    assert setup.status_code == 200
    assert setup.json()["usuario"]["must_change_password"] is False
    assert client.get("/api/auth/me", headers=headers).status_code == 401
    assert login(client, payload).status_code == 401
    assert login(client, payload, password).status_code == 200
    with connection(db_url) as db:
        assert db.execute("SELECT password_hash FROM users WHERE id=%s", (created["id"],)).fetchone()["password_hash"].startswith("scrypt$")


@pytest.mark.parametrize("role", ["USER", "GESTOR_ESCOLAR"])
def test_non_admin_cannot_create_edit_reset_or_read_users(client, account, auth_headers, db_url, role):
    with connection(db_url) as db:
        db.execute("UPDATE users SET role=%s WHERE id=%s", (role, account["usuario"]["id"]))
    target = account["usuario"]["id"]
    for method, path, body in [("GET", "/api/admin/users", None), ("GET", f"/api/admin/users/{target}", None),
        ("POST", "/api/admin/users", new_account()), ("PATCH", f"/api/admin/users/{target}", {"nome": "Novo Nome"}),
        ("PATCH", f"/api/admin/users/{target}/deactivate", {}), ("POST", f"/api/admin/users/{target}/reset-password", {})]:
        assert client.request(method, path, headers=auth_headers, json=body).status_code == 403
        assert client.request(method, path, json=body).status_code == 401
    assert client.patch("/api/account/profile", headers=auth_headers, json={"nome": "Nao permitido"}).status_code == 403


def test_duplicates_and_validation(client, admin_headers):
    payload = new_account()
    assert client.post("/api/admin/users", headers=admin_headers, json=payload).status_code == 200
    for override in [{"username": "other", "email": " ONE@EXAMPLE.COM "}, {"username": "CONTA_ONE", "email": "other@example.com"}, {"username": "other", "email": "other@example.com", "cpf": payload["cpf"]}]:
        assert client.post("/api/admin/users", headers=admin_headers, json={**payload, **override}).status_code == 400
    for override in [{"role": []}, {"role": "SUPERADMIN"}, {"cpf": "1234567890"}, {"cpf": "123456789012"}, {"cpf": 12345678901},
        {"cpf": "abc12345678901"}, {"birth_date": "2000-02-29"}, {"birth_date": "31/02/2000"}, {"birth_date": "01/01/9999"},
        {"username": "x"}, {"nome": "a"}, {"email": "invalid"}, {"senha": "nao-permitida"}]:
        assert client.post("/api/admin/users", headers=admin_headers, json={**new_account(suffix="invalid"), **override}).status_code == 400
    leading = new_account(suffix="leading")
    leading["cpf"] = "001.234.567-89"
    created = client.post("/api/admin/users", headers=admin_headers, json=leading)
    assert created.json()["usuario"]["cpf"] == "00123456789"
    assert client.get("/api/admin/users/not-found", headers=admin_headers).status_code == 404


@pytest.mark.parametrize("role", ["USER", "GESTOR_ESCOLAR", "ADMIN"])
def test_admin_reset_restores_cpf_revokes_sessions_and_preserves_data(client, admin_headers, db_url, role):
    payload = new_account(role)
    target = client.post("/api/admin/users", headers=admin_headers, json=payload).json()["usuario"]
    headers, password = enter(client, payload)
    extra = login(client, payload, password).json()["token"]
    evidence = {"residuo1": "garrafa", "residuo2": "sacola", "residuo3": "canudo"}
    if role == "GESTOR_ESCOLAR":
        assert client.post("/api/missions/lixo-marinho/submit", headers=headers, json=evidence).status_code == 403
        # Preserve legacy progress without granting student actions to a school manager.
        with connection(db_url) as db:
            from gds.service import Service
            Service(db).submit_mission(target["id"], "lixo-marinho", evidence)
    else:
        assert client.post("/api/missions/lixo-marinho/submit", headers=headers, json=evidence).status_code == 200
    response = client.post(f"/api/admin/users/{target['id']}/reset-password", headers=admin_headers)
    assert response.status_code == 200 and response.json()["usuario"]["must_change_password"] is True
    for value in [headers, {"Authorization": f"Bearer {extra}"}]:
        assert client.get("/api/auth/me", headers=value).status_code == 401
    assert login(client, payload, password).status_code == 401
    initial = login(client, payload)
    assert initial.status_code == 200
    assert client.get("/api/progress", headers={"Authorization": f"Bearer {initial.json()['token']}"}).status_code == 403
    with connection(db_url) as db:
        assert db.execute("SELECT xp FROM stats WHERE user_id=%s", (target["id"],)).fetchone()["xp"] == 100
        assert db.execute("SELECT COUNT(*) AS n FROM activities WHERE user_id=%s", (target["id"],)).fetchone()["n"] == 2


def test_edit_cpf_pending_and_completed_accounts_and_protect_password(client, admin_headers):
    payload = new_account()
    target = client.post("/api/admin/users", headers=admin_headers, json=payload).json()["usuario"]
    path = f"/api/admin/users/{target['id']}"
    old_headers = {"Authorization": f"Bearer {login(client, payload).json()['token']}"}
    updated = {**payload, "nome": "Nome Editado", "cpf": "00123456789", "birth_date": "15/04/2010", "escola": "Escola Atualizada", "turma": "Turma Atualizada"}
    response = client.patch(path, headers=admin_headers, json=updated)
    assert response.status_code == 200 and response.json()["usuario"]["birth_date"] == "15/04/2010"
    assert response.json()["usuario"]["escola"] == "Escola Atualizada"
    assert client.get("/api/auth/me", headers=old_headers).status_code == 401
    assert login(client, payload).status_code == 401
    headers, password = enter(client, updated)
    updated["cpf"] = "00987654321"
    assert client.patch(path, headers=admin_headers, json=updated).status_code == 200
    assert client.get("/api/auth/me", headers=headers).status_code == 401
    assert login(client, updated, password).status_code == 200
    assert login(client, updated).status_code == 401
    for body in [{"senha": "qualquerSenha123"}, {"password_hash": "hash"}, {"active": False}, {"must_change_password": False}, {"role": []}]:
        assert client.patch(path, headers=admin_headers, json=body).status_code == 400


def test_deactivation_blocks_first_access_and_does_not_delete_history(client, admin_headers, db_url):
    payload = new_account()
    target = client.post("/api/admin/users", headers=admin_headers, json=payload).json()["usuario"]
    first_token = login(client, payload).json()["token"]
    path = f"/api/admin/users/{target['id']}/deactivate"
    result = client.patch(path, headers=admin_headers).json()["usuario"]
    assert result["active"] is False
    assert client.patch(path, headers=admin_headers).json()["usuario"]["deactivated_at"] == result["deactivated_at"]
    assert login(client, payload).status_code == 401
    assert client.post("/api/auth/first-access/password", headers={"Authorization": f"Bearer {first_token}"}, json={"novaSenha": "novaSenha1234", "confirmarSenha": "novaSenha1234"}).status_code == 401
    assert client.post(f"/api/admin/users/{target['id']}/reset-password", headers=admin_headers).json()["usuario"]["active"] is False
    migrate(db_url)
    assert login(client, payload).status_code == 401


def test_self_admin_role_and_deactivation_protected_and_own_reset_works(client, admin_headers, account):
    user_id = account["usuario"]["id"]
    assert client.patch(f"/api/admin/users/{user_id}/deactivate", headers=admin_headers).status_code == 400
    assert client.post(f"/api/admin/users/{user_id}/reset-password", headers=admin_headers).status_code == 400  # No legacy CPF yet.
    data = {"nome": "Gestor", "username": "gestor", "email": "aluno@example.com", "cpf": "00123456789", "birth_date": "01/01/1980", "role": "USER"}
    assert client.patch(f"/api/admin/users/{user_id}", headers=admin_headers, json=data).status_code == 400
    data["role"] = "ADMIN"
    assert client.patch(f"/api/admin/users/{user_id}", headers=admin_headers, json=data).status_code == 200
    fresh = client.post("/api/auth/admin/login", json={"username": "gestor", "senha": "segredo123"}).json()["token"]
    assert client.post(f"/api/admin/users/{user_id}/reset-password", headers={"Authorization": f"Bearer {fresh}"}).status_code == 200
    assert client.get("/api/admin/users", headers={"Authorization": f"Bearer {fresh}"}).status_code == 401


def test_concurrent_admin_deactivation_keeps_one_active(client, admin_headers, account, db_url):
    payload = new_account("ADMIN", "second")
    second = client.post("/api/admin/users", headers=admin_headers, json=payload).json()["usuario"]
    second_headers, _ = enter(client, payload)
    barrier = Barrier(2)
    def deactivate(pair):
        target, headers = pair
        barrier.wait(timeout=5)
        return client.patch(f"/api/admin/users/{target}/deactivate", headers=headers).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(deactivate, [(second["id"], admin_headers), (account["usuario"]["id"], second_headers)]))
    assert sorted(results) == [200, 401]
    with connection(db_url) as db:
        assert db.execute("SELECT COUNT(*) AS n FROM users WHERE role='ADMIN' AND active=TRUE").fetchone()["n"] == 1
