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
        # Historical requests must remain restorable after public registration is removed.
        db.execute("INSERT INTO registration_requests (id,nome,username,email,cpf,birth_date,created_at) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                   (uuid.uuid4().hex, "Pedido Backup", "pedido_backup", "pedido@example.com", "00123456789", "2010-02-01", "2026-01-01T00:00:00Z"))
        db.execute("UPDATE stats SET xp=725 WHERE user_id=%s", (account["usuario"]["id"],))
        manager = service.register({"nome": "Gestor Backup", "email": "gestorbackup@example.com", "senha": secrets.token_hex(24)})
        db.execute("UPDATE users SET role='GESTOR_ESCOLAR' WHERE id=%s", (manager["usuario"]["id"],))
        school = db.execute("INSERT INTO schools(name) VALUES ('Unidade Backup') RETURNING id").fetchone()["id"]
        db.execute("INSERT INTO school_manager_links(school_id,manager_id,authorized_by) VALUES (%s,%s,%s)", (school,manager["usuario"]["id"],account["usuario"]["id"]))
        db.execute("UPDATE sessions SET school_id=%s WHERE token=%s", (school, manager["token"]))
        stage = db.execute("SELECT id FROM school_stages ORDER BY sort_order LIMIT 1").fetchone()["id"]
        classroom = db.execute("INSERT INTO school_classes(school_id,stage_id,identification) VALUES (%s,%s,'2A') RETURNING id", (school,stage)).fetchone()["id"]
        db.execute("INSERT INTO student_school_memberships(student_id,school_id,registration_number,class_id) VALUES (%s,%s,'0001',%s)", (account["usuario"]["id"],school,classroom))
        db.execute("INSERT INTO class_enrollment_events(student_id,school_id,to_class_id,actor_id) VALUES (%s,%s,%s,%s)", (account["usuario"]["id"],school,classroom,manager["usuario"]["id"]))
        expected = {table: canonical(db.execute(sql.SQL("SELECT * FROM {}").format(sql.Identifier(table))).fetchall()) for table in [*TABLES, "registration_requests", "access_profiles", "schools", "school_manager_links", "school_stages", "school_classes", "student_school_memberships", "class_enrollment_events", "school_deactivations"]}
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
            for table in [*TABLES, "registration_requests", "access_profiles", "schools", "school_manager_links", "school_stages", "school_classes", "student_school_memberships", "class_enrollment_events", "school_deactivations"]:
                rows = db.execute(sql.SQL("SELECT * FROM {}").format(sql.Identifier(table))).fetchall()
                assert canonical(rows) == expected[table], table
    finally:
        assert database.startswith("test_restore_") and len(database) == 45
        with psycopg.connect(admin_url, autocommit=True) as db:
            db.execute(sql.SQL("DROP DATABASE {}").format(sql.Identifier(database)))
