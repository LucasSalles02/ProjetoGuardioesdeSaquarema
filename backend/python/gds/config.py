import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[3]
load_dotenv(ROOT / ".env", override=False)


def project_env(key, default=None):
    return os.getenv(f"GUARDIOES_DE_SAQUAREMA_{key}", os.getenv(f"ECOMAR_{key}", default))


def database_url():
    value = os.getenv("DATABASE_URL")
    if not value:
        raise RuntimeError("Defina DATABASE_URL para conectar ao PostgreSQL. Consulte backend/README.md.")
    return value
