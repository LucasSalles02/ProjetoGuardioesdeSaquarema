import hashlib
from contextlib import contextmanager
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

from .config import database_url

MIGRATIONS = Path(__file__).resolve().parents[1] / "migrations"


@contextmanager
def connection(url=None):
    with psycopg.connect(url or database_url(), row_factory=dict_row, connect_timeout=5) as db:
        yield db


def migrate(url=None):
    if not list(MIGRATIONS.glob("*.sql")):
        raise RuntimeError("Arquivos de migracao PostgreSQL ausentes.")
    with connection(url) as db:
        db.execute("SELECT pg_advisory_xact_lock(18022026)")
        db.execute("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)")
        for path in sorted(MIGRATIONS.glob("*.sql")):
            source = path.read_text(encoding="utf-8-sig")
            digest = hashlib.sha256(source.encode()).hexdigest()
            applied = db.execute("SELECT checksum FROM schema_migrations WHERE version = %s", (path.name,)).fetchone()
            if applied:
                if applied["checksum"] != digest:
                    raise RuntimeError(f"Migracao aplicada foi alterada: {path.name}")
                continue
            db.execute(source)
            db.execute("INSERT INTO schema_migrations (version, checksum) VALUES (%s, %s)", (path.name, digest))
        from .onboarding import upgrade_credentials
        upgrade_credentials(db)
