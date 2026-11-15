import asyncio
import logging
from datetime import datetime, timedelta
from contextlib import suppress
import re
import threading
import time
from contextlib import asynccontextmanager

import psycopg
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from .database import connection, migrate
from .errors import ApiError
from .routes import dispatch
from .service import Service
from .daily_missions import ensure_catalog
from .time import ZONE

LOGGER = logging.getLogger("guardioes.api")


class LoginLimiter:
    def __init__(self):
        self.attempts = {}
        self.lock = threading.Lock()

    def check(self, address):
        stamp = time.monotonic()
        with self.lock:
            self.attempts = {key: entry for key, entry in self.attempts.items() if entry[1] > stamp}
            count, until = self.attempts.get(address, (0, stamp + 900))
            if count >= 30:
                raise ApiError("Muitas tentativas. Aguarde 15 minutos.", 429)
            self.attempts[address] = (count + 1, until)


def create_app(url=None):
    @asynccontextmanager
    async def lifespan(_app):
        try:
            await run_in_threadpool(migrate, url)
            def seed():
                with connection(url) as db:
                    service = Service(db)
                    service.seed()
                    ensure_catalog(service)
            await run_in_threadpool(seed)
        except Exception as exc:
            raise RuntimeError(f"Nao foi possivel preparar PostgreSQL ({type(exc).__name__}). Verifique DATABASE_URL e execute db:migrate.") from None
        def renew():
            with connection(url) as db:
                ensure_catalog(Service(db))

        async def renew_at_midnight():
            while True:
                current = datetime.now(ZONE)
                midnight = (current + timedelta(days=1)).replace(hour=0,minute=0,second=0,microsecond=0)
                await asyncio.sleep((midnight-current).total_seconds())
                while True:
                    try:
                        await run_in_threadpool(renew)
                        break
                    except Exception as exc:
                        LOGGER.error("Falha na renovacao diaria: %s",type(exc).__name__)
                        await asyncio.sleep(30)

        renewal = asyncio.create_task(renew_at_midnight())
        try:
            yield
        finally:
            renewal.cancel()
            with suppress(asyncio.CancelledError):
                await renewal

    app = FastAPI(title="Guardiões de Saquarema", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"], allow_headers=["Content-Type", "Authorization", "X-School-Id"])
    app.state.limiter = LoginLimiter()

    def execute(method, path, body, bearer, requested_school):
        # One connection and transaction per request: errors roll back all rewards and content changes.
        with connection(url) as db:
            return dispatch(Service(db), method, path, body, bearer, requested_school)

    @app.api_route("/api/{path:path}", methods=["GET", "POST", "PATCH", "DELETE", "PUT"])
    async def api(request: Request, path: str):
        try:
            body = {}
            if request.method in ["POST", "PATCH"]:
                chunks, size = [], 0
                async for chunk in request.stream():
                    size += len(chunk)
                    if size > (1_000_000 if re.fullmatch(r"admin/highlights(?:/[^/]+)?", path) else 100_000):
                        raise ApiError("Payload muito grande.", 413)
                    chunks.append(chunk)
                raw = b"".join(chunks)
                if raw:
                    import json
                    try:
                        body = json.loads(raw)
                    except (ValueError, UnicodeError):
                        raise ApiError("JSON invalido.") from None
                    if not isinstance(body, dict):
                        raise ApiError("JSON invalido.")
            if request.method == "POST" and path in ["auth/login", "auth/admin/login"]:
                app.state.limiter.check(request.client.host if request.client else "unknown")
            match = re.fullmatch(r"Bearer\s+(.+)", request.headers.get("authorization", ""), re.IGNORECASE)
            result = await run_in_threadpool(execute, request.method, path, body, match.group(1) if match else "", request.headers.get("x-school-id", ""))
            return JSONResponse(result, headers={"Cache-Control": "no-store"})
        except ApiError as exc:
            return JSONResponse({"erro": str(exc), **({"codigo": exc.code} if exc.code else {})}, status_code=exc.status)
        except psycopg.errors.UniqueViolation:
            return JSONResponse({"erro": "Registro ja cadastrado."}, status_code=400)
        except Exception as exc:
            # Exception type only: never log request bodies, connection URLs, credentials or tokens.
            LOGGER.error("Erro interno na API: %s", type(exc).__name__)
            return JSONResponse({"erro": "Erro interno do servidor."}, status_code=500)

    return app
