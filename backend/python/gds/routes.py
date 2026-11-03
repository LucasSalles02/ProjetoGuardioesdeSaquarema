import re

from .errors import ApiError
from . import registration

# HTTP contracts deliberately retain the URLs and Portuguese envelopes used by React.
ROUTES = [
    ("GET", r"auth/me", lambda s, u, b, p: {"usuario": s.user(u)}),
    ("POST", r"auth/first-access/password", lambda s, u, b, p: s.first_access_password(u, b)),
    ("PATCH", r"account/profile", lambda s, u, b, p: s.update_profile(u, b)),
    ("PATCH", r"account/password", lambda s, u, b, p: s.change_password(u, b)),
    ("GET", r"admin/users", lambda s, u, b, p: s.admin_users(u)),
    ("GET", r"admin/users/([^/]+)", lambda s, u, b, p: s.admin_user(u, p[0])),
    ("POST", r"admin/users", lambda s, u, b, p: s.admin_create_user(u, b)),
    ("PATCH", r"admin/users/([^/]+)", lambda s, u, b, p: s.admin_edit_user(u, p[0], b)),
    ("POST", r"admin/users/([^/]+)/reset-password", lambda s, u, b, p: s.admin_reset_password(u, p[0])),
    ("GET", r"admin/registration-requests", lambda s, u, b, p: registration.list_requests(s, u)),
    ("POST", r"admin/registration-requests/([^/]+)/approve", lambda s, u, b, p: registration.review(s, u, p[0], True, b)),
    ("POST", r"admin/registration-requests/([^/]+)/reject", lambda s, u, b, p: registration.review(s, u, p[0], False, b)),
    ("PATCH", r"admin/users/([^/]+)/deactivate", lambda s, u, b, p: s.admin_deactivate_user(u, p[0])),
    ("GET", r"admin/content", lambda s, u, b, p: s.admin_content(u)),
    ("POST", r"admin/missions", lambda s, u, b, p: s.save_content(u, "mission", None, b)),
    ("PATCH", r"admin/missions/([^/]+)", lambda s, u, b, p: s.save_content(u, "mission", p[0], b)),
    ("POST", r"admin/modules", lambda s, u, b, p: s.save_content(u, "module", None, b)),
    ("PATCH", r"admin/modules/([^/]+)", lambda s, u, b, p: s.save_content(u, "module", p[0], b)),
    ("POST", r"admin/modules/([^/]+)/lessons", lambda s, u, b, p: s.save_content(u, "lesson", None, b, p[0])),
    ("PATCH", r"admin/modules/([^/]+)/lessons/([^/]+)", lambda s, u, b, p: s.save_content(u, "lesson", p[1], b, p[0])),
    ("PATCH", r"admin/games/([^/]+)", lambda s, u, b, p: s.save_content(u, "game", p[0], b)),
    ("GET", r"missions", lambda s, u, b, p: s.list_missions(u)),
    ("POST", r"missions/([^/]+)/submit", lambda s, u, b, p: s.submit_mission(u, p[0], b)),
    ("GET", r"learning/modules", lambda s, u, b, p: s.list_modules(u)),
    ("GET", r"learning/modules/([^/]+)", lambda s, u, b, p: s.get_module(u, p[0])),
    ("POST", r"learning/modules/([^/]+)/lessons/([^/]+)/submit", lambda s, u, b, p: s.submit_lesson(u, p[0], p[1], b)),
    ("GET", r"progress", lambda s, u, b, p: s.progress(u)),
    ("GET", r"progress/history", lambda s, u, b, p: s.history(u)),
    ("GET", r"achievements", lambda s, u, b, p: s.achievements(u)),
    ("GET", r"games", lambda s, u, b, p: s.list_games()),
    ("POST", r"games/memory/sessions", lambda s, u, b, p: s.start_game(u, "memory")),
    ("POST", r"games/puzzle/sessions", lambda s, u, b, p: s.start_game(u, "puzzle")),
    ("POST", r"games/memory/sessions/([^/]+)/flip", lambda s, u, b, p: s.play_game(u, "memory", p[0], b)),
    ("POST", r"games/puzzle/sessions/([^/]+)/move", lambda s, u, b, p: s.play_game(u, "puzzle", p[0], b)),
]


def dispatch(service, method, path, body, bearer):
    if (method, path) == ("GET", "health"):
        service.one("SELECT 1 AS ok")
        return {"ok": True, "service": "guardioes-de-saquarema-backend", "runtime": "python", "database": "postgresql"}
    if method == "POST":
        if path == "auth/register":
            return registration.request_registration(service, body)
        if path in ["auth/login", "auth/admin/login"]:
            return service.login(body, path == "auth/admin/login")
        if path == "auth/logout":
            return service.logout(bearer)
    for verb, pattern, handler in ROUTES:
        match = re.fullmatch(pattern, path)
        if verb == method and match:
            # Acquire before authenticate() locks the actor: concurrent administrators
            # deactivating one another cannot deadlock or remove the last active admin.
            if (path.startswith("admin/users") or path.startswith("admin/registration-requests")) and method in ["POST", "PATCH"]:
                service.db.execute("SELECT pg_advisory_xact_lock(18022029)")
            user_id = service.authenticate(bearer, (method, path) in [("GET", "auth/me"), ("POST", "auth/first-access/password")])
            return handler(service, user_id, body, match.groups())
    raise ApiError("Endpoint nao encontrado.", 404)
