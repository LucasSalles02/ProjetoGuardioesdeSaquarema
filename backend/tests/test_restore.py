import os
import secrets
import subprocess
import uuid
from pathlib import Path

import psycopg
import pytest
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict, make_conninfo

from gds.database import connection
from gds.import_sqlite import TABLES, canonical
from gds.service import Service
from gds.registration import request_registration


def test_postgresql_dump_restore_roundtrip(db_url):
    root = Path(__file__).resolve().parents[2]
    binaries = Path(os.getenv("POSTGRES_BIN", root / ".runtime" / "postgres" / "pgsql" / "bin"))
    suffix = ".exe" if os.name == "nt" else ""
    dump, restore = binaries / ("pg_dump" + suffix), binaries / ("pg_restore" + suffix)
    if not dump.exists() or not restore.exists():
        pytest.skip("pg_dump/pg_restore ausentes; configure POSTGRES_BIN para validar restauracao.")
    info = conninfo_to_dict(db_url)
    schema = info["options"].split("=", 1)[1]
    env = {**os.environ, **{f"PG{key.upper()}": info[key] for key in ["host", "port", "user", "password"] if key in info}, "PGDATABASE": info["dbname"]}
    with connection(db_url) as db:
        service = Service(db)
        service.seed()
        account = service.register({"nome": "Teste Backup", "email": "backup@example.com", "senha": secrets.token_hex(24)})
        request_registration(service, {"nome": "Pedido Backup", "username": "pedido_backup", "email": "pedido@example.com", "cpf": "00123456789", "birth_date": "01/02/2010"})
        db.execute("UPDATE stats SET xp=725 WHERE user_id=%s", (account["usuario"]["id"],))
        expected = {table: canonical(db.execute(sql.SQL("SELECT * FROM {}").format(sql.Identifier(table))).fetchall()) for table in [*TABLES, "registration_requests"]}
    result = subprocess.run([str(dump), "--format=custom", "--schema", schema], env=env, capture_output=True)
    assert result.returncode == 0, "pg_dump falhou"
    database = "test_restore_" + uuid.uuid4().hex
    admin_url = make_conninfo(db_url, options="")
    restored_url = make_conninfo(db_url, dbname=database)
    with psycopg.connect(admin_url, autocommit=True) as db:
        db.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database)))
    try:
        result = subprocess.run([str(restore), "--no-owner", "--no-acl", "--dbname", database],
                                input=result.stdout, env={**env, "PGDATABASE": database}, capture_output=True)
        assert result.returncode == 0, "pg_restore falhou"
        with connection(restored_url) as db:
            for table in [*TABLES, "registration_requests"]:
                rows = db.execute(sql.SQL("SELECT * FROM {}").format(sql.Identifier(table))).fetchall()
                assert canonical(rows) == expected[table], table
    finally:
        assert database.startswith("test_restore_") and len(database) == 45
        with psycopg.connect(admin_url, autocommit=True) as db:
            db.execute(sql.SQL("DROP DATABASE {}").format(sql.Identifier(database)))
