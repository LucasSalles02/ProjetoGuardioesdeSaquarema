import json
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from gds.time import day

import pytest

from gds.database import connection
from gds.service import Service


EVIDENCE = {"residuo1": "garrafa", "residuo2": "sacola", "residuo3": "canudo"}


def calendar(monkeypatch, date):
    monkeypatch.setattr("gds.service.day", lambda: date)
    monkeypatch.setattr("gds.daily_missions.day", lambda: date)
    monkeypatch.setattr("gds.service.now", lambda: date + "T12:00:00.000Z")


def puzzle(client, headers, db_url):
    response = client.post("/api/games/puzzle/sessions",headers=headers)
    assert response.status_code == 200, response.text
    session = response.json()["sessionId"]
    with connection(db_url) as db:
        row = db.execute("SELECT state_json FROM game_sessions WHERE id=%s",(session,)).fetchone()
        state = {**json.loads(row["state_json"]),"board": [1,2,3,4,5,6,7,0,8]}
        db.execute("UPDATE game_sessions SET state_json=%s WHERE id=%s",(json.dumps(state),session))
    return f"/api/games/puzzle/sessions/{session}/move"


def finish(client, headers, path):
    response = client.post(path,headers=headers,json={"tile": 8})
    assert response.status_code == 200, response.text
    return response.json()


def test_game_daily_limit_zero_xp_history_and_no_retroactive_replay(client,admin_headers,db_url,monkeypatch):
    calendar(monkeypatch,"2027-01-01")
    first = puzzle(client,admin_headers,db_url)
    assert finish(client,admin_headers,first)["xpGanho"] == 90
    second = puzzle(client,admin_headers,db_url)
    result = finish(client,admin_headers,second)
    assert result["xpGanho"] == 0 and result["recompensas"]["rewardsRemaining"] == 0
    assert result["usuario"]["jogosConcluidos"] == 2
    history = client.get("/api/progress/history",headers=admin_headers).json()["atividades"]
    assert sorted(item["xpGanho"] for item in history) == [0,90]
    assert client.patch("/api/admin/games/puzzle",headers=admin_headers,json={"dailyRewardLimit": 2}).status_code == 200
    assert finish(client,admin_headers,second)["xpGanho"] == 0
    third = puzzle(client,admin_headers,db_url)
    assert finish(client,admin_headers,third)["xpGanho"] == 90
    calendar(monkeypatch,"2027-01-02")
    assert finish(client,admin_headers,second)["xpGanho"] == 0
    assert finish(client,admin_headers,puzzle(client,admin_headers,db_url))["xpGanho"] == 90


def test_concurrent_game_sessions_cannot_exceed_daily_limit(client,auth_headers,db_url):
    paths = [puzzle(client,auth_headers,db_url) for _ in range(2)]
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda path: finish(client,auth_headers,path),paths))
    assert sorted(item["xpGanho"] for item in results) == [0,90]
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert all(item["xpGanho"] == 0 for item in pool.map(lambda path: finish(client,auth_headers,path),paths))
    history = client.get("/api/progress/history",headers=auth_headers).json()["atividades"]
    assert len(history) == 2


def test_game_configuration_preserves_session_xp_and_zero_limit(client,admin_headers,db_url):
    path = puzzle(client,admin_headers,db_url)
    response = client.patch("/api/admin/games/puzzle",headers=admin_headers,json={"xpRecompensa": 30,"dailyRewardLimit": 0})
    assert response.status_code == 200, response.text
    assert finish(client,admin_headers,path)["xpGanho"] == 0
    path = puzzle(client,admin_headers,db_url)
    assert client.patch("/api/admin/games/puzzle",headers=admin_headers,json={"xpRecompensa": 50,"dailyRewardLimit": 2}).status_code == 200
    assert finish(client,admin_headers,path)["xpGanho"] == 30
    assert finish(client,admin_headers,puzzle(client,admin_headers,db_url))["xpGanho"] == 50


@pytest.mark.parametrize("limit",[-1,1.5,"2",True,None])
def test_invalid_game_limit_rejected(client,admin_headers,limit):
    # Null retains the existing value, consistent with other partial content edits.
    response = client.patch("/api/admin/games/puzzle",headers=admin_headers,json={"dailyRewardLimit": limit})
    assert response.status_code == (200 if limit is None else 400)


@pytest.mark.parametrize("repeatable",[True,False])
def test_mission_repetition_and_midnight_catalog(client,admin_headers,monkeypatch,repeatable):
    calendar(monkeypatch,"2027-01-01")
    assert client.patch("/api/admin/missions/lixo-marinho",headers=admin_headers,json={"repeatable": repeatable,"xpRecompensa": 10}).status_code == 200
    first = client.post("/api/missions/lixo-marinho/submit",headers=admin_headers,json={**EVIDENCE,"catalogDate": "2027-01-01"})
    assert first.status_code == 200 and first.json()["xpGanho"] == 10
    assert client.post("/api/missions/lixo-marinho/submit",headers=admin_headers,json=EVIDENCE).json()["xpGanho"] == 0
    calendar(monkeypatch,"2027-01-02")
    assert client.post("/api/missions/lixo-marinho/submit",headers=admin_headers,json={**EVIDENCE,"catalogDate": "2027-01-01"}).status_code == 409
    catalog = client.get("/api/missions",headers=admin_headers).json()
    assert catalog["catalogDate"] == "2027-01-02" and catalog["xpGanhoHoje"] == 0
    mission = next(item for item in catalog["missoes"] if item["id"] == "lixo-marinho")
    assert mission["concluida"] is (not repeatable)
    result = client.post("/api/missions/lixo-marinho/submit",headers=admin_headers,json=EVIDENCE)
    assert result.json()["xpGanho"] == (10 if repeatable else 0)


def test_availability_and_catalog_recovery_are_idempotent(client,admin_headers,db_url,monkeypatch):
    calendar(monkeypatch,"2027-01-01")
    response = client.patch("/api/admin/missions/lixo-marinho",headers=admin_headers,json={"available_from": "2027-01-02","available_until": "2027-01-02"})
    assert response.status_code == 200,response.text
    assert client.post("/api/missions/lixo-marinho/submit",headers=admin_headers,json=EVIDENCE).status_code == 404
    calendar(monkeypatch,"2027-01-02")
    with ThreadPoolExecutor(max_workers=3) as pool:
        catalogs = list(pool.map(lambda _: client.get("/api/missions",headers=admin_headers).json(),range(3)))
    assert all(any(item["id"] == "lixo-marinho" for item in catalog["missoes"]) for catalog in catalogs)
    with connection(db_url) as db:
        assert db.execute("SELECT COUNT(*) AS n FROM daily_missions WHERE date_key='2027-01-02' AND mission_id='lixo-marinho'").fetchone()["n"] == 1
    calendar(monkeypatch,"2027-01-03")
    assert client.post("/api/missions/lixo-marinho/submit",headers=admin_headers,json=EVIDENCE).status_code == 404
    for invalid in ("2027-02-30",False,0,[],{}):
        assert client.patch("/api/admin/missions/lixo-marinho",headers=admin_headers,json={"available_from": invalid}).status_code == 400
    assert client.patch("/api/admin/missions/lixo-marinho",headers=admin_headers,json={"available_until": "2027-01-01"}).status_code == 400


def test_mission_summary_uses_historical_award_after_edit(client,admin_headers):
    assert client.patch("/api/admin/missions/lixo-marinho",headers=admin_headers,json={"xpRecompensa": 10}).status_code == 200
    assert client.post("/api/missions/lixo-marinho/submit",headers=admin_headers,json=EVIDENCE).json()["xpGanho"] == 10
    assert client.patch("/api/admin/missions/lixo-marinho",headers=admin_headers,json={"xpRecompensa": 30}).status_code == 200
    catalog = client.get("/api/missions",headers=admin_headers).json()
    mission = next(item for item in catalog["missoes"] if item["id"] == "lixo-marinho")
    assert catalog["xpGanhoHoje"] == 10 and mission["xpRecebido"] == 10 and mission["xpRecompensa"] == 30


def test_weekly_chart_includes_more_than_eighty_activities(client,auth_headers,account,db_url):
    with connection(db_url) as db:
        service = Service(db)
        for _ in range(85):
            service.grant(account["usuario"]["id"],10,"jogo","Atividade de teste",{"game":1})
    history = client.get("/api/progress/history",headers=auth_headers).json()
    assert len(history["atividades"]) == 80
    assert sum(item["xp"] for item in history["grafico"]) == 850


def test_lesson_edit_deactivation_preserves_awards_and_progress(client,admin_headers,db_url):
    path = "/api/learning/modules/vida-marinha/lessons/ecossistemas-costeiros/submit"
    result = client.post(path,headers=admin_headers,json={"resposta": "Vou cuidar do ambiente e preservar os animais marinhos."})
    assert result.status_code == 200,result.text
    original = result.json()["xpGanho"]
    assert client.patch("/api/admin/modules/vida-marinha/lessons/ecossistemas-costeiros",headers=admin_headers,json={"xp": 500,"active": False}).status_code == 200
    assert client.post(path,headers=admin_headers,json={"resposta": "Vou cuidar do ambiente e preservar os animais marinhos."}).status_code == 404
    with connection(db_url) as db:
        assert db.execute("SELECT xp_awarded FROM lesson_submissions").fetchone()["xp_awarded"] == original
    module = client.get("/api/learning/modules/vida-marinha",headers=admin_headers).json()["modulo"]
    assert module["percentual"] <= 100
    assert client.patch("/api/admin/modules/vida-marinha/lessons/ecossistemas-costeiros",headers=admin_headers,json={"active": True}).status_code == 200
    assert client.post(path,headers=admin_headers,json={}).json()["xpGanho"] == 0


def test_reward_limits_are_individual_per_student_and_game(client,auth_headers,db_url):
    assert finish(client,auth_headers,puzzle(client,auth_headers,db_url))["xpGanho"] == 90
    catalog = client.get("/api/games",headers=auth_headers).json()["jogos"]
    assert next(game for game in catalog if game["id"] == "memory")["rewardsRemaining"] == 1
    assert next(game for game in catalog if game["id"] == "puzzle")["rewardsRemaining"] == 0
    with connection(db_url) as db:
        other = Service(db).register({"nome": "Outro Aluno", "email": "outro-jogo@example.com", "senha": "Pessoal1234"})
    headers = {"Authorization": "Bearer " + other["token"]}
    assert finish(client,headers,puzzle(client,headers,db_url))["xpGanho"] == 90


def test_daily_date_uses_brasilia_midnight():
    assert day(datetime(2027,1,2,2,59,59,tzinfo=timezone.utc)) == "2027-01-01"
    assert day(datetime(2027,1,2,3,0,0,tzinfo=timezone.utc)) == "2027-01-02"


def test_game_completed_after_midnight_uses_completion_day(client,auth_headers,db_url,monkeypatch):
    calendar(monkeypatch,"2027-04-01")
    pending = puzzle(client,auth_headers,db_url)
    assert finish(client,auth_headers,puzzle(client,auth_headers,db_url))["xpGanho"] == 90
    calendar(monkeypatch,"2027-04-02")
    assert finish(client,auth_headers,pending)["xpGanho"] == 90
    assert finish(client,auth_headers,puzzle(client,auth_headers,db_url))["xpGanho"] == 0
    with connection(db_url) as db:
        rows = db.execute("SELECT reward_date_key,SUM(xp_awarded) AS xp FROM game_sessions GROUP BY reward_date_key ORDER BY reward_date_key").fetchall()
        assert [(row["reward_date_key"],row["xp"]) for row in rows] == [("2027-04-01",90),("2027-04-02",90)]


def test_catalog_recovers_after_restart_without_retroactive_awards(client,auth_headers,db_url,monkeypatch):
    from fastapi.testclient import TestClient
    from gds.app import create_app

    calendar(monkeypatch,"2027-04-01")
    assert client.post("/api/missions/lixo-marinho/submit",headers=auth_headers,json=EVIDENCE).json()["xpGanho"] == 20
    before = client.get("/api/progress",headers=auth_headers).json()["stats"]["xp"]
    calendar(monkeypatch,"2027-04-03")
    with TestClient(create_app(db_url)) as restarted:
        catalog = restarted.get("/api/missions",headers=auth_headers).json()
        assert catalog["catalogDate"] == "2027-04-03" and catalog["xpGanhoHoje"] == 0
        assert restarted.get("/api/progress",headers=auth_headers).json()["stats"]["xp"] == before
        assert len(restarted.get("/api/progress/history",headers=auth_headers).json()["atividades"]) == 1
    with connection(db_url) as db:
        assert db.execute("SELECT COUNT(*) AS n FROM mission_catalog_days WHERE date_key='2027-04-03'").fetchone()["n"] == 1
        assert db.execute("SELECT COUNT(*) AS n FROM mission_submissions").fetchone()["n"] == 1


def test_scheduled_catalog_retries_after_failure(db_url,monkeypatch):
    import asyncio
    from types import SimpleNamespace
    import gds.app as app_module

    original = app_module.ensure_catalog
    calls, delays, tasks = [], [], []

    def ensure(service):
        calls.append(True)
        if len(calls) == 2:
            raise RuntimeError("Falha transitoria simulada no ambiente isolado")
        return original(service)

    async def sleep(seconds):
        delays.append(seconds)
        if len(delays) == 3:
            raise asyncio.CancelledError
        await asyncio.sleep(0)

    def create_task(coroutine):
        task = asyncio.create_task(coroutine)
        tasks.append(task)
        return task

    class Clock(datetime):
        @classmethod
        def now(cls, zone):
            return cls(2027,4,1,23,59,59,tzinfo=zone)

    monkeypatch.setattr(app_module,"ensure_catalog",ensure)
    monkeypatch.setattr(app_module,"datetime",Clock)
    monkeypatch.setattr(app_module,"asyncio",SimpleNamespace(sleep=sleep,create_task=create_task,CancelledError=asyncio.CancelledError))

    async def scenario():
        app = app_module.create_app(db_url)
        async with app.router.lifespan_context(app):
            with pytest.raises(asyncio.CancelledError):
                await tasks[0]

    asyncio.run(scenario())
    assert len(calls) == 3
    assert delays == [1.0,30,1.0]
