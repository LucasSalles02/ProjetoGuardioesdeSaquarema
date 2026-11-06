import re

from .errors import ApiError
from . import access, schools, school_management, highlights

# HTTP contracts deliberately retain the URLs and Portuguese envelopes used by React.
ROUTES = [
    ("GET", r"school-management/students/([^/]+)/record", lambda s, u, b, p: school_management.student_record(s, u, p[0])),
    ("POST", r"school-management/classes/([^/]+)/students", lambda s, u, b, p: school_management.allocate_students(s, u, p[0], b)),
    ("GET", r"highlights", lambda s, u, b, p: highlights.listing(s, u)),
    ("GET", r"admin/highlights", lambda s, u, b, p: highlights.listing(s, u, True)),
    ("POST", r"admin/highlights", lambda s, u, b, p: highlights.save(s, u, b)),
    ("PATCH", r"admin/highlights/settings", lambda s, u, b, p: highlights.save_settings(s, u, b)),
    ("PATCH", r"admin/highlights/([^/]+)", lambda s, u, b, p: highlights.save(s, u, b, p[0])),
    ("DELETE", r"admin/highlights/([^/]+)", lambda s, u, b, p: highlights.delete(s, u, p[0])),
    ("PATCH", r"admin/schools/([^/]+)/reactivate", lambda s, u, b, p: schools.reactivate(s, u, p[0], b)),
    ("PATCH", r"admin/schools/([^/]+)/deactivate", lambda s, u, b, p: schools.deactivate(s, u, p[0], b)),
    ("GET", r"school-management/students/([^/]+)/progress", lambda s, u, b, p: school_management.student_progress(s, u, p[0])),
    ("GET", r"school-management/classes/([^/]+)/summary", lambda s, u, b, p: school_management.class_summary(s, u, p[0])),
    ("GET", r"admin/school-stages", lambda s, u, b, p: school_management.stages(s, u, True)),
    ("POST", r"admin/school-stages", lambda s, u, b, p: school_management.save_stage(s, u, b)),
    ("PATCH", r"admin/school-stages/([^/]+)", lambda s, u, b, p: school_management.save_stage(s, u, b, p[0])),
    ("GET", r"school-management/stages", lambda s, u, b, p: school_management.stages(s, u)),
    ("GET", r"school-management/classes", lambda s, u, b, p: school_management.classes(s, u)),
    ("POST", r"school-management/classes", lambda s, u, b, p: school_management.save_class(s, u, b)),
    ("PATCH", r"school-management/classes/([^/]+)", lambda s, u, b, p: school_management.save_class(s, u, b, p[0])),
    ("GET", r"school-management/students", lambda s, u, b, p: school_management.students(s, u)),
    ("PATCH", r"school-management/students/([^/]+)/class", lambda s, u, b, p: school_management.assign_class(s, u, p[0], b)),
    ("GET", r"admin/schools", lambda s, u, b, p: schools.admin_list(s, u)),
    ("GET", r"admin/schools/managers", lambda s, u, b, p: schools.managers(s, u)),
    ("GET", r"admin/schools/([^/]+)", lambda s, u, b, p: schools.admin_get(s, u, p[0])),
    ("POST", r"admin/schools", lambda s, u, b, p: schools.save(s, u, b)),
    ("PATCH", r"admin/schools/([^/]+)", lambda s, u, b, p: schools.save(s, u, b, p[0])),
    ("GET", r"school-units", lambda s, u, b, p: schools.my_units(s, u)),
    ("GET", r"school-units/([^/]+)", lambda s, u, b, p: schools.my_units(s, u, p[0])),
    ("GET", r"admin/profiles", lambda s, u, b, p: access.list_profiles(s, u)),
    ("POST", r"admin/profiles", lambda s, u, b, p: access.save_profile(s, u, b)),
    ("PATCH", r"admin/profiles/([^/]+)", lambda s, u, b, p: access.save_profile(s, u, b, p[0])),
    ("GET", r"auth/me", lambda s, u, b, p: {"usuario": s.user(u)}),
    ("POST", r"auth/first-access/password", lambda s, u, b, p: s.first_access_password(u, b)),
    ("PATCH", r"account/profile", lambda s, u, b, p: s.update_profile(u, b)),
    ("PATCH", r"account/password", lambda s, u, b, p: s.change_password(u, b)),
    ("GET", r"admin/users", lambda s, u, b, p: s.admin_users(u)),
    ("GET", r"admin/users/([^/]+)", lambda s, u, b, p: s.admin_user(u, p[0])),
    ("POST", r"admin/users", lambda s, u, b, p: s.admin_create_user(u, b)),
    ("PATCH", r"admin/users/([^/]+)", lambda s, u, b, p: s.admin_edit_user(u, p[0], b)),
    ("POST", r"admin/users/([^/]+)/reset-password", lambda s, u, b, p: s.admin_reset_password(u, p[0])),
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


def dispatch(service, method, path, body, bearer, requested_school=""):
    if (method, path) == ("GET", "health"):
        service.one("SELECT 1 AS ok")
        return {"ok": True, "service": "guardioes-de-saquarema-backend", "runtime": "python", "database": "postgresql"}
    if method == "POST":
        if path == "auth/register":
            raise ApiError("Cadastro publico desativado. Solicite seu cadastro ao administrador.", 403)
        if path in ["auth/login", "auth/admin/login"]:
            return service.login(body, path == "auth/admin/login")
        if path == "auth/logout":
            return service.logout(bearer)
    if (path == "school-context" and method in ["GET", "POST"]) or (path == "school-current" and method == "GET"):
        if method == "POST":
            service.db.execute("SELECT pg_advisory_xact_lock(18022029)")
        user_id = service.authenticate(bearer)
        schools.available_units(service, user_id)
        if path == "school-current":
            unit = schools.require_context(service, user_id, bearer, requested_school)
            return {"unidade": unit}
        return schools.context(service, user_id, bearer) if method == "GET" else schools.select_context(service, user_id, bearer, body)
    for verb, pattern, handler in ROUTES:
        match = re.fullmatch(pattern, path)
        if verb == method and match:
            # Acquire before authenticate() locks the actor: concurrent administrators
            # deactivating one another cannot deadlock or remove the last active admin.
            if (path.startswith("admin/") or path.startswith("school-management/")) and method in ["POST", "PATCH", "DELETE"]:
                service.db.execute("SELECT pg_advisory_xact_lock(18022029)")
            user_id = service.authenticate(bearer, (method, path) in [("GET", "auth/me"), ("POST", "auth/first-access/password")])
            permission = access.route_permission(method, path)
            if permission:
                access.require(service, user_id, permission)
            actor = service.one("SELECT role FROM users WHERE id=%s", (user_id,))
            if (actor["role"] == "GESTOR_ESCOLAR" and path not in ["auth/me", "auth/first-access/password", "account/profile", "account/password", "school-units"]) or (actor["role"] == "ADMIN" and path.startswith("school-management/")):
                unit = schools.require_context(service, user_id, bearer, requested_school)
                service.school_id = unit["id"]
                if path.startswith("school-units/") and match.groups()[0] != str(unit["id"]):
                    raise ApiError("Unidade escolar fora do contexto ativo.", 404)
            return handler(service, user_id, body, match.groups())
    raise ApiError("Endpoint nao encontrado.", 404)
