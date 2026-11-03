import hashlib
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
from gds.database import connection, migrate
from gds.import_sqlite import TABLES, import_sqlite
from gds.security import verify_password

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
                expected = {"usuario": {**expected["usuario"], "active": True, "must_change_password": False}}
            elif path == "/api/admin/users":
                expected = {"usuarios": [{**row, "active": True, "deactivated_at": None, "cpf": None, "birth_date": None, "must_change_password": False} for row in expected["usuarios"]]}
            response = client.get(path, headers=headers)
            assert response.status_code == 200, path
            assert response.json() == expected, path
        assert client.post("/api/auth/login", json={"email": "legado@example.com", "senha": "segredo123"}).status_code == 200
        assert client.post("/api/auth/admin/login", json={"username": "gestor", "senha": "segredo123"}).status_code == 200
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
    with sqlite3.connect(source) as db:
        db.execute("UPDATE activities SET xp_ganho='invalid'")
    with pytest.raises(Exception):
        import_sqlite(source, db_url, tmp_path / "backups")
    with connection(db_url) as db:
        for table in TABLES:
            assert db.execute(f'SELECT COUNT(*) AS n FROM "{table}"').fetchone()["n"] == 0


@pytest.mark.parametrize("prefix", ["GUARDIOES_DE_SAQUAREMA", "ECOMAR"])
def test_admin_idempotent_reset_and_legacy_env(db_url, monkeypatch, prefix):
    password = secrets.token_hex(24)
    for key, value in {"ADMIN_USERNAME": "gestor", "ADMIN_PASSWORD": password, "ADMIN_EMAIL": "gestor@example.com"}.items():
        monkeypatch.delenv(f"GUARDIOES_DE_SAQUAREMA_{key}", raising=False)
        monkeypatch.delenv(f"ECOMAR_{key}", raising=False)
        monkeypatch.setenv(f"{prefix}_{key}", value)
    with connection(db_url) as db:
        provision_admin(db)
        provision_admin(db)
        assert db.execute("SELECT COUNT(*) AS n FROM users").fetchone()["n"] == 1
    with TestClient(create_app(db_url)) as client:
        response = client.post("/api/auth/admin/login", json={"username": "gestor", "senha": password})
        assert response.status_code == 200
        bearer = response.json()["token"]
        replacement = secrets.token_hex(24)
        monkeypatch.setenv(f"{prefix}_ADMIN_PASSWORD", replacement)
        with connection(db_url) as db:
            with pytest.raises(Exception, match="painel administrativo"):
                provision_admin(db, reset=True)
        assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {bearer}"}).status_code == 200
        assert client.post("/api/auth/admin/login", json={"username": "gestor", "senha": password}).status_code == 200
        assert client.post("/api/auth/admin/login", json={"username": "gestor", "senha": replacement}).status_code == 401
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
    assert client.post("/api/auth/login", json={"email": "aluno@example.com", "senha": password}).status_code == 200


def test_migrations_idempotent_and_checksum_guard(db_url):
    migrate(db_url)
    with connection(db_url) as db:
        assert db.execute("SELECT COUNT(*) AS n FROM schema_migrations").fetchone()["n"] == 4
        db.execute("UPDATE schema_migrations SET checksum='invalid'")
    with pytest.raises(RuntimeError, match="foi alterada"):
        migrate(db_url)
