"""Transactional, verified import; source SQLite is never modified."""
import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from psycopg import sql
from psycopg.types.json import Jsonb

from .database import connection, migrate
from .time import now

TABLES = ["users", "stats", "sessions", "activities", "missions", "modules", "lessons", "games_catalog",
          "mission_submissions", "lesson_submissions", "achievement_awards", "game_sessions"]


def canonical(rows):
    return sorted(json.dumps(row, sort_keys=True, ensure_ascii=False, separators=(",", ":"), default=str) for row in rows)


def import_sqlite(source_path, url=None, backup_directory=None, dry_run=False):
    source_path = Path(source_path).resolve(strict=True)
    backup_directory = Path(backup_directory or source_path.parent / "backups")
    backup_directory.mkdir(parents=True, exist_ok=True)
    backup = backup_directory / f"{source_path.stem}-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')}.sqlite"
    # sqlite backup API includes committed WAL pages and works on a live source.
    with sqlite3.connect(source_path.as_uri() + "?mode=ro", uri=True) as source:
        if source.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise RuntimeError("SQLite de origem nao passou na verificacao de integridade.")
        with sqlite3.connect(backup) as target:
            source.backup(target)
    with sqlite3.connect(backup.as_uri() + "?mode=ro", uri=True) as source:
        source.row_factory = sqlite3.Row
        existing = {row[0] for row in source.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        data = {table: [dict(row) for row in source.execute(f'SELECT * FROM "{table}"')] if table in existing else [] for table in TABLES}
    for row in data["users"]:
        row.setdefault("username", None)
        row["role"] = {"admin": "ADMIN", "student": "USER"}.get(row.get("role"), row.get("role", "USER"))
    counts = {table: len(rows) for table, rows in data.items()}
    digest = hashlib.sha256(json.dumps({table: canonical(rows) for table, rows in data.items()}, sort_keys=True).encode()).hexdigest()
    if dry_run:
        return {"dry_run": True, "counts": counts, "backup": str(backup)}
    # Add PostgreSQL lifecycle defaults after computing the original source digest,
    # preserving recognition of imports performed before migration 002.
    for row in data["users"]:
        row.setdefault("active", True)
        row.setdefault("deactivated_at", None)
        row.setdefault("cpf", None)
        row.setdefault("birth_date", None)
        row.setdefault("must_change_password", False)
        row.setdefault("access_profile_id", None)
        row.setdefault("registration_number", None)
        row.setdefault("guardians", [])
        row.setdefault("initial_credential_version", 0)
    for row in data["sessions"]:
        row.setdefault("school_id", None)
    # Translate future rewards to RN28 without touching accumulated XP/history.
    for row in data["missions"]:
        xp = row["xp_recompensa"]
        if xp not in (10, 20, 30):
            row["xp_recompensa"] = 10 if xp <= 40 else 20 if xp <= 60 else 30
    migrate(url)
    with connection(url) as db:
        db.execute("SELECT pg_advisory_xact_lock(18022027)")
        if db.execute("SELECT source_digest FROM import_receipts WHERE source_digest=%s", (digest,)).fetchone():
            return {"already_imported": True, "counts": counts, "backup": str(backup)}
        if db.execute("SELECT COUNT(*) AS n FROM registration_requests").fetchone()["n"]:
            raise RuntimeError("Destino possui solicitacoes de cadastro. Use um banco vazio para importar.")
        if db.execute("SELECT COUNT(*) AS n FROM schools").fetchone()["n"]:
            raise RuntimeError("Destino possui unidades escolares. Use um banco vazio para importar.")
        if db.execute("SELECT COUNT(*) AS n FROM school_classes").fetchone()["n"]:
            raise RuntimeError("Destino possui turmas. Use um banco vazio para importar.")
        # No merging by email and no overwriting a database already in use.
        for table in TABLES:
            if db.execute(sql.SQL("SELECT COUNT(*) AS n FROM {}").format(sql.Identifier(table))).fetchone()["n"]:
                raise RuntimeError("Destino possui dados. Use um banco vazio para importar; nenhum registro foi substituido.")
        for table, rows in data.items():
            for row in rows:
                columns = list(row)
                query = sql.SQL("INSERT INTO {} ({}) VALUES ({})").format(sql.Identifier(table),
                    sql.SQL(",").join(map(sql.Identifier, columns)), sql.SQL(",").join(sql.Placeholder() for _ in columns))
                db.execute(query, [Jsonb(row[key]) if key == "guardians" else row[key] for key in columns])
            imported = db.execute(sql.SQL("SELECT * FROM {}").format(sql.Identifier(table))).fetchall()
            if canonical(imported) != canonical(rows):
                raise RuntimeError(f"Conferencia de importacao falhou: {table}. Transacao revertida.")
        from .onboarding import upgrade_credentials
        upgrade_credentials(db)
        db.execute("INSERT INTO import_receipts (source_digest,imported_at,table_counts) VALUES (%s,%s,%s)", (digest, now(), json.dumps(counts)))
    return {"imported": True, "counts": counts, "backup": str(backup)}
