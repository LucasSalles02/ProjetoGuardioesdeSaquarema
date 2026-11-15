import hashlib
from contextlib import closing
import json
import os
import secrets
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from gds.admin import provision_admin
from gds.app import create_app
from gds.access import allowed
from gds.progression import progression
from gds.service import Service
from gds.database import connection, migrate
from gds.import_sqlite import TABLES, import_sqlite
from gds.security import verify_password
from gds.time import day

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture
def legacy_source(tmp_path):
    source = tmp_path / "legacy.sqlite"
    snapshot = tmp_path / "contract.json"
    script = r'''
import { writeFileSync } from 'node:fs';
import { GuardioesDeSaquaremaService } from './backend/src/guardioesDeSaquaremaService.js';
const service = new GuardioesDeSaquaremaService({dbPath:process.env.FIXTURE_SQLITE});
try {
 const account=service.register({nome:'Aluno Legado',email:'legado@example.com',senha:'segredo123',turma:'7 Ano',escola:'Escola Azul'});
 const id=account.usuario.id;
 service.submitMission(id,'lixo-marinho',{residuo1:'garrafa',residuo2:'sacola',residuo3:'canudo'});
 service.submitLesson(id,'vida-marinha','ecossistemas-costeiros',{resposta:'Vou observar a praia sem interferir na vida marinha local.'});
 const game=service.startMemory(id);
 service.flipMemory(id,game.sessionId,game.jogo.cards[0].id);
 service.db.prepare("UPDATE users SET role='ADMIN',username='gestor' WHERE id=?").run(id);
 const contract={
  '/api/auth/me':service.me(account.token),
  '/api/missions':service.listMissions(id),
  '/api/learning/modules':service.listModules(id),
  '/api/learning/modules/vida-marinha':service.getModule(id,'vida-marinha'),
  '/api/progress':service.getProgress(id),
  '/api/progress/history':service.getHistory(id),
  '/api/achievements':service.listAchievements(id),
  '/api/games':service.getGames(),
  '/api/admin/content':service.getAdminContent(id),
  '/api/admin/users':service.listUsers(id)
 };
 writeFileSync(process.env.FIXTURE_CONTRACT,JSON.stringify(contract));
} finally {service.close();}
'''
    result = subprocess.run(["node", "--input-type=module", "-e", script], cwd=ROOT,
                            env={**os.environ, "FIXTURE_SQLITE": str(source), "FIXTURE_CONTRACT": str(snapshot)}, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    return source, json.loads(snapshot.read_text(encoding="utf-8"))


def test_import_preserves_data_sessions_and_node_contract(db_url, legacy_source, tmp_path):
    source, contract = legacy_source
    original = hashlib.sha256(source.read_bytes()).hexdigest()
    preview = import_sqlite(source, db_url, tmp_path / "backups", dry_run=True)
    assert preview["dry_run"] and preview["counts"]["users"] == 1
    result = import_sqlite(source, db_url, tmp_path / "backups")
    assert result["imported"] and result["counts"]["game_sessions"] == 1
    assert Path(result["backup"]).is_file()
    assert hashlib.sha256(source.read_bytes()).hexdigest() == original
    assert import_sqlite(source, db_url, tmp_path / "backups")["already_imported"] is True
    with connection(db_url) as db:
        bearer = db.execute("SELECT token FROM sessions LIMIT 1").fetchone()["token"]
        row = db.execute("SELECT * FROM users LIMIT 1").fetchone()
        assert verify_password("segredo123", row["password_salt"], row["password_hash"])
        session = db.execute("SELECT * FROM game_sessions LIMIT 1").fetchone()
    with TestClient(create_app(db_url)) as client:
        headers = {"Authorization": f"Bearer {bearer}"}
        for path, expected in contract.items():
            # Migration 002 adds lifecycle fields; all prior contract fields must still match.
            if path == "/api/auth/me":
                expected = {"usuario": {**expected["usuario"], "active": True, "must_change_password": False, "profile_id": "ADMIN", "profile_name": "Administrador", "permissions": sorted(allowed("ADMIN"))}}
            elif path == "/api/admin/users":
                expected = {"usuarios": [{**row, "active": True, "deactivated_at": None, "cpf": None, "registration_number": None, "birth_date": None, "must_change_password": False, "profile_id": "ADMIN", "profile_name": "Administrador"} for row in expected["usuarios"]]}
            # The new rules change derived progression and future rewards, not history.
            if path == "/api/auth/me":
                expected["usuario"].update(progression(expected["usuario"]["xp"]))
            if path in ("/api/progress", "/api/achievements"):
                with connection(db_url) as db:
                    catalog = Service(db).achievements(row["id"])
                expected.update(catalog)
                if path == "/api/progress":
                    expected["stats"].update(progression(expected["stats"]["xp"]))
            if path in ("/api/missions", "/api/admin/content"):
                for mission in expected["missoes"]:
                    old_xp = mission["xpRecompensa"]
                    xp = old_xp if old_xp in (10,20,30) else 10 if old_xp <= 40 else 20 if old_xp <= 60 else 30
                    mission.update(xpRecompensa=xp, dificuldade={10:"F\u00e1cil",20:"M\u00e9dia",30:"Dif\u00edcil"}[xp])
            if path in ("/api/missions", "/api/admin/content"):
                for mission in expected["missoes"]:
                    mission.update(icon=None,repeatable=True, available_from=None, available_until=None)
                    if path == "/api/missions":
                        mission.update(concluidaHoje=mission["concluida"], concluidaAnteriormente=False, xpRecebido=None if mission["concluida"] else 0)
            if path == "/api/missions":
                expected.update(catalogDate=day(), xpGanhoHoje=sum(item["xpGanho"] for item in contract["/api/progress/history"]["atividades"] if item["tipo"] == "missao"))
            if path in ("/api/games", "/api/admin/content"):
                for game in expected["jogos"]:
                    game["dailyRewardLimit"] = 1
                    if path == "/api/games":
                        game.update(rewardedToday=0,rewardsRemaining=1,rewardDate=day())
            modules = expected.get("modulos", []) + ([expected["modulo"]] if "modulo" in expected else [])
            for module in modules:
                for lesson in module.get("lessons", []):
                    lesson["icon"] = None
            response = client.get(path, headers=headers)
            assert response.status_code == 200, path
            assert response.json() == expected, path
        with connection(db_url) as db:
            db.execute("UPDATE users SET cpf='00123456789' WHERE id=%s", (row["id"],))
        assert client.post("/api/auth/login", json={"cpf": "00123456789", "senha": "segredo123"}).status_code == 200
        assert client.post("/api/auth/admin/login", json={"cpf": "00123456789", "senha": "segredo123"}).status_code == 200
        state = json.loads(session["state_json"])
        second = next(card["id"] for card in state["cards"] if card["id"] not in state["flippedIds"])
        assert client.post(f"/api/games/memory/sessions/{session['id']}/flip", headers=headers, json={"cardId": second}).status_code == 200


def test_import_refuses_nonempty_target(db_url, legacy_source, tmp_path):
    source, _ = legacy_source
    with connection(db_url) as db:
        from gds.service import Service
        Service(db).seed()
    with pytest.raises(RuntimeError, match="Destino possui dados"):
        import_sqlite(source, db_url, tmp_path / "backups")
    with connection(db_url) as db:
        assert db.execute("SELECT COUNT(*) AS n FROM users").fetchone()["n"] == 0


def test_import_rolls_back_on_invalid_record(db_url, legacy_source, tmp_path):
    source, _ = legacy_source
    with closing(sqlite3.connect(source)) as db, db:
        db.execute("UPDATE activities SET xp_ganho='invalid'")
    with pytest.raises(Exception):
        import_sqlite(source, db_url, tmp_path / "backups")
    with connection(db_url) as db:
        for table in TABLES:
            assert db.execute(f'SELECT COUNT(*) AS n FROM "{table}"').fetchone()["n"] == 0


@pytest.mark.parametrize("prefix", ["GUARDIOES_DE_SAQUAREMA", "ECOMAR"])
def test_admin_idempotent_reset_and_legacy_env(db_url, monkeypatch, prefix):
    password = secrets.token_hex(24)
    for key, value in {"ADMIN_CPF": "88123456789", "ADMIN_PASSWORD": password, "ADMIN_EMAIL": "gestor@example.com"}.items():
        monkeypatch.delenv(f"GUARDIOES_DE_SAQUAREMA_{key}", raising=False)
        monkeypatch.delenv(f"ECOMAR_{key}", raising=False)
        monkeypatch.setenv(f"{prefix}_{key}", value)
    with connection(db_url) as db:
        credential = provision_admin(db)
        assert provision_admin(db) is None
        assert db.execute("SELECT COUNT(*) AS n FROM users").fetchone()["n"] == 1
    with TestClient(create_app(db_url)) as client:
        response = client.post("/api/auth/admin/login", json={"cpf": "88123456789", "senha": credential["password"]})
        assert response.status_code == 200
        bearer = response.json()["token"]
        replacement = secrets.token_hex(24)
        monkeypatch.setenv(f"{prefix}_ADMIN_PASSWORD", replacement)
        with connection(db_url) as db:
            assert provision_admin(db) is None
        assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {bearer}"}).status_code == 200
        assert client.post("/api/auth/admin/login", json={"cpf": "88123456789", "senha": password}).status_code == 401
        with connection(db_url) as db:
            reset = provision_admin(db, reset=True)
        assert reset["password"] != credential["password"]
        assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {bearer}"}).status_code == 401
        assert client.post("/api/auth/admin/login", json={"cpf": "88123456789", "senha": credential["password"]}).status_code == 401
        assert client.post("/api/auth/admin/login", json={"cpf": "88123456789", "senha": replacement}).status_code == 401
        assert client.post("/api/auth/admin/login", json={"cpf": "88123456789", "senha": reset["password"]}).status_code == 200
    result = subprocess.run(["node", "backend/createAdmin.js"], cwd=ROOT,
                            env={**os.environ, "DATABASE_URL": db_url, "GUARDIOES_PYTHON": sys.executable}, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr


@pytest.mark.parametrize("password", ["segredo123", "a" * 300])
def test_pbkdf2_compatibility(client, account, db_url, password):
    import base64
    salt = secrets.token_hex(16)
    digest = base64.b64encode(hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120000, 32)).decode()
    with connection(db_url) as db:
        db.execute("UPDATE users SET password_salt=%s,password_hash=%s", (salt, digest))
    assert client.post("/api/auth/login", json={"registration_number": "fixture-001", "senha": password}).status_code == 200


def test_migrations_idempotent_and_checksum_guard(db_url):
    migrate(db_url)
    with connection(db_url) as db:
        assert db.execute("SELECT COUNT(*) AS n FROM schema_migrations").fetchone()["n"] == 19
        db.execute("UPDATE schema_migrations SET checksum='invalid'")
    with pytest.raises(RuntimeError, match="foi alterada"):
        migrate(db_url)


def test_import_closes_all_sqlite_connections(legacy_source,tmp_path,monkeypatch):
    connections = []
    connect = sqlite3.connect

    class TrackedConnection(sqlite3.Connection):
        closed = False

        def close(self):
            self.closed = True
            super().close()

    def tracked_connect(*args,**kwargs):
        result = connect(*args,**kwargs,factory=TrackedConnection)
        connections.append(result)
        return result

    monkeypatch.setattr(sqlite3,"connect",tracked_connect)
    result = import_sqlite(legacy_source[0],backup_directory=tmp_path/"closed-backups",dry_run=True)
    assert result["dry_run"]
    assert len(connections) == 3
    assert all(connection.closed for connection in connections)
