import pytest

from gds.database import connection
from gds.progression import THRESHOLDS, progression
from gds.service import Service


@pytest.mark.parametrize("level,threshold", list(enumerate(THRESHOLDS, 1)))
def test_exact_level_boundaries(level, threshold):
    assert progression(threshold)["nivel"] == level
    if threshold:
        assert progression(threshold - 1)["nivel"] == level - 1
    assert progression(threshold)["percentualNivel"] == (100 if level == 10 else 0)


def test_partial_progress_and_maximum():
    assert progression(475)["percentualNivel"] == 50
    assert progression(475)["xpFaltante"] == 75
    assert progression(1100)["percentualNivel"] == 50
    assert progression(9000) == {"nivel": 10, "xpInicioNivel": 1200, "xpProximoNivel": 1200,
                                  "nivelMaximo": True, "xpFaltante": 0, "percentualNivel": 100}
    assert progression(-100)["nivel"] == 1


def test_achievements_follow_levels_without_bonus_and_preserve_xp(client, account, auth_headers, db_url):
    user_id = account["usuario"]["id"]
    with connection(db_url) as db:
        db.execute("UPDATE stats SET xp=390 WHERE user_id=%s", (user_id,))
        reward = Service(db).reward(user_id, 20, "missao", "Teste de marco")
        assert reward["xpGanho"] == 20 and reward["novoNivel"] == 5 and reward["levelUp"]
        assert {item["nivelNecessario"] for item in reward["novasConquistas"]} == {1, 2, 3, 4, 5}
        assert all(item["xp"] == 0 for item in reward["novasConquistas"])
        assert Service(db).unlock(user_id) == []
        assert db.execute("SELECT SUM(xp_awarded) AS xp FROM achievement_awards WHERE user_id=%s", (user_id,)).fetchone()["xp"] == 0
    result = client.get("/api/achievements", headers=auth_headers).json()
    assert not result["visualizacaoAdmin"]
    assert len(result["conquistas"]) == 10
    assert sum(item["obtida"] for item in result["conquistas"]) == 5
    assert all(item["obtida"] == (item["nivelNecessario"] <= 5) for item in result["conquistas"])


def test_maximum_keeps_earning_xp(client, account, db_url):
    user_id = account["usuario"]["id"]
    with connection(db_url) as db:
        db.execute("UPDATE stats SET xp=1190 WHERE user_id=%s", (user_id,))
        service = Service(db)
        first = service.reward(user_id, 30, "jogo", "Marco final")
        assert first["usuario"]["xp"] == 1220 and first["novoNivel"] == 10 and first["levelUp"]
        again = service.reward(user_id, 70, "jogo", "Continuar aprendendo")
        assert again["usuario"]["xp"] == 1290 and again["novoNivel"] == 10 and not again["levelUp"]


def test_admin_preview_does_not_grant_awards_or_xp(client, admin_headers, db_url):
    before = client.get("/api/auth/me", headers=admin_headers).json()["usuario"]["xp"]
    for _ in range(2):
        result = client.get("/api/achievements", headers=admin_headers).json()
        assert result["visualizacaoAdmin"]
        assert all(item["disponivel"] and not item["obtida"] for item in result["conquistas"])
    assert client.get("/api/auth/me", headers=admin_headers).json()["usuario"]["xp"] == before
    with connection(db_url) as db:
        assert db.execute("SELECT COUNT(*) AS n FROM achievement_awards").fetchone()["n"] == 0


@pytest.mark.parametrize("xp", [5, 9.9, 20.1, 40, 45, 500])
def test_invalid_mission_rewards_are_rejected(client, admin_headers, xp):
    result = client.post("/api/admin/missions", headers=admin_headers,
                         json={"titulo": "Missao teste", "descricao": "Teste educativo", "xpRecompensa": xp})
    assert result.status_code == 400
