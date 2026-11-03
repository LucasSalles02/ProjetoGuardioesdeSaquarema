import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "python"))

from gds.admin import provision_admin
from gds.database import connection, migrate
from gds.errors import ApiError
from gds.import_sqlite import import_sqlite


def main():
    parser = argparse.ArgumentParser(description="Operacoes do backend Python/PostgreSQL")
    parser.add_argument("command", choices=["migrate", "import-sqlite", "admin", "check"])
    parser.add_argument("--source", default=str(Path(__file__).parent / "data" / "ecomar.sqlite"))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--reset-password", action="store_true")
    args = parser.parse_args()
    try:
        if args.command == "import-sqlite":
            print(json.dumps(import_sqlite(args.source, dry_run=args.dry_run), ensure_ascii=False))
        elif args.command == "migrate":
            migrate()
            print("Migracoes PostgreSQL aplicadas.")
        elif args.command == "admin":
            migrate()
            with connection() as db:
                provision_admin(db, args.reset_password)
            print("Administrador provisionado.")
        else:
            with connection() as db:
                db.execute("SELECT 1")
            print("PostgreSQL conectado.")
    except (ApiError, RuntimeError, FileNotFoundError) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"Operacao falhou ({type(exc).__name__}). Verifique DATABASE_URL e o PostgreSQL; nenhum segredo foi registrado.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
