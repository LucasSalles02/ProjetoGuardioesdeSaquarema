import os
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "python"))

import psycopg
import pytest
from fastapi.testclient import TestClient
from psycopg import sql
from psycopg.conninfo import make_conninfo

from gds.app import create_app
from gds.config import database_url
from gds.database import connection, migrate
from gds.service import Service


@pytest.fixture
def db_url():
    base = os.getenv("TEST_DATABASE_URL") or database_url()
    schema = "test_" + uuid.uuid4().hex
    with psycopg.connect(base, autocommit=True) as db:
        db.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
    url = make_conninfo(base, options=f"-c search_path={schema}")
    try:
        migrate(url)
        yield url
    finally:
        # Only this fixture's randomly generated test schema can be removed.
        assert schema.startswith("test_") and len(schema) == 37
        with psycopg.connect(base, autocommit=True) as db:
            db.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))


@pytest.fixture
def client(db_url):
    with TestClient(create_app(db_url)) as value:
        yield value


@pytest.fixture
def account(client, db_url):
    # A pre-existing account from before CPF onboarding; legacy access must survive migrations.
    with connection(db_url) as db:
        result = Service(db).register({"nome": "Aluno Teste", "email": "aluno@example.com", "senha": "segredo123", "turma": "7 Ano", "escola": "Escola do Mar"})
        db.execute("UPDATE users SET registration_number='fixture-001' WHERE id=%s", (result["usuario"]["id"],))
        return result


@pytest.fixture
def auth_headers(account):
    return {"Authorization": f"Bearer {account['token']}"}


@pytest.fixture
def admin_headers(account, db_url):
    with connection(db_url) as db:
        db.execute("UPDATE users SET role='ADMIN',username='gestor',cpf='99123456789' WHERE id=%s", (account["usuario"]["id"],))
    return {"Authorization": f"Bearer {account['token']}"}
