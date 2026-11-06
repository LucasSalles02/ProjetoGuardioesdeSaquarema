"""Access profiles. School grants never replace institutional authorization."""

from .errors import ApiError
from .security import identifier
from .time import now
from psycopg.types.json import Jsonb

MANAGER_ONLY = {"classes.create", "classes.update", "enrollments.update"}

def module(key, label, roles, actions, reference, scope="platform", implemented=True):
    return {"id": key, "label": label, "roles": roles, "reference": reference, "scope": scope,
            "actions": [{"id": action, "label": title, "implemented": implemented and (action != "delete" or key == "highlights"), "roles": ["GESTOR_ESCOLAR"] if f"{key}.{action}" in MANAGER_ONLY else roles}
                        for action, title in actions]}


CATALOG = [
    module("highlights", "Destaques da tela inicial", ["ADMIN"], [("read", "Consultar destaques e conteúdos vinculáveis"), ("create", "Criar destaques"), ("update", "Editar e publicar destaques"), ("delete", "Excluir destaques")], "Gerenciamento solicitado pelo usuário"),
    module("learning", "Aprender", ["USER", "ADMIN"], [("read", "Consultar conteúdos"), ("complete", "Concluir aulas")], "RF02, RN12", "own"),
    module("games", "Jogos", ["USER", "ADMIN"], [("read", "Consultar jogos"), ("play", "Jogar e registrar resultado")], "RF03, RN12", "own"),
    module("missions", "Missões diárias", ["USER", "ADMIN"], [("read", "Consultar missões"), ("submit", "Realizar missões")], "RF04, RN12", "own"),
    module("progress", "Meu progresso e histórico", ["USER", "ADMIN"], [("read", "Consultar o próprio progresso e histórico")], "RF05–RF08, RF14", "own"),
    module("achievements", "Conquistas", ["USER", "ADMIN"], [("read", "Consultar as próprias conquistas")], "RF07", "own"),
    module("users", "Usuários e perfis de acesso", ["ADMIN"], [("read", "Consultar usuários"), ("create", "Cadastrar usuários"), ("update", "Editar usuários e atribuir perfis"), ("deactivate", "Desativar usuários"), ("reset", "Resetar senha")], "RF01, RF10, RN11"),
    module("profiles", "Perfis de acesso", ["ADMIN"], [("read", "Consultar perfis e permissões"), ("create", "Criar perfis"), ("update", "Editar perfis personalizados")], "RF20; configuração solicitada pelo usuário"),
    module("content", "Gestão de conteúdos e aulas", ["ADMIN"], [("read", "Consultar conteúdo administrativo"), ("create", "Cadastrar conteúdos e aulas"), ("update", "Editar conteúdos e aulas"), ("delete", "Excluir conteúdos (previsto)")], "RF09, RN11"),
    module("mission_admin", "Gestão de missões", ["ADMIN"], [("create", "Criar missões"), ("update", "Editar missões")], "RF11, RN09, RN11"),
    module("game_admin", "Gestão de jogos", ["ADMIN"], [("update", "Editar jogos")], "RF09, RN11"),
    module("institutions", "Unidades Escolares", ["ADMIN"], [("read", "Consultar unidades e gestores"), ("create", "Cadastrar unidades"), ("update", "Editar e reativar unidades, autorizar e revogar gestores"), ("deactivate", "Desativar unidades e retirar vinculos")], "RF10, RN02, RN11, RN14"),
    module("school_units", "Minhas Unidades Escolares", ["GESTOR_ESCOLAR"], [("read", "Consultar unidades vinculadas")], "RF10, RF20, RN02, RN14", "school"),
    module("school_stages", "Etapas Escolares", ["ADMIN"], [("read", "Consultar etapas"), ("create", "Cadastrar etapas"), ("update", "Editar e ativar etapas")], "Cadastro de etapas solicitado pelo usuario"),
    module("classes", "Turmas escolares", ["GESTOR_ESCOLAR", "ADMIN"], [("read", "Consultar turmas"), ("create", "Cadastrar turmas"), ("update", "Organizar turmas")], "RF15, RF17, RN02–RN06, RN14", "school"),
    module("enrollments", "Alunos das escolas", ["GESTOR_ESCOLAR", "ADMIN"], [("read", "Consultar alunos"), ("update", "Vincular e organizar alunos nas turmas")], "RF16–RF17, RN05–RN06, RN14–RN15", "school"),
    module("school_progress", "Acompanhamento pedagógico", ["GESTOR_ESCOLAR", "ADMIN"], [("read", "Consultar XP, níveis, conquistas e missões dos alunos"), ("reports", "Consultar relatórios e consolidado por turma")], "RF12, RF18–RF19, RN07–RN08, RN10, RN14", "school"),
]


def allowed(role):
    return {f"{m['id']}.{a['id']}" for m in CATALOG if role in m["roles"] for a in m["actions"] if role in a["roles"]}


def effective(service, user_id):
    result = service.one("SELECT p.id,p.name,p.base_role,p.permissions FROM users u JOIN access_profiles p ON p.id=COALESCE(u.access_profile_id,u.role) WHERE u.id=%s AND u.active=TRUE AND p.base_role=u.role", (user_id,))
    if not result:
        raise ApiError("Perfil de acesso invalido. Contate o administrador.", 403)
    return {**result, "permissions": sorted(set(result["permissions"]) & allowed(result["base_role"]))}


def require(service, user_id, permission):
    if permission not in effective(service, user_id)["permissions"]:
        raise ApiError("Seu perfil nao permite esta acao.", 403)


def require_delegation(service, actor_id, permissions):
    profile = effective(service, actor_id)
    delegable = set(profile["permissions"])
    if profile["base_role"] == "ADMIN":
        # Managing accounts/profiles may delegate school operations to managers;
        # it never authorizes an administrator to execute those operations.
        delegable.update(MANAGER_ONLY)
    # Authorizing managers to schools includes delegating the scoped school reader.
    # It does not give administrators the manager-only endpoint or any school data bypass.
    if "institutions.update" in delegable:
        delegable.add("school_units.read")
    if not set(permissions) <= delegable:
        raise ApiError("Voce nao pode gerenciar ou conceder permissoes superiores as do seu perfil.", 403)


def require_target(service, actor_id, target_id):
    target = service.one("SELECT id FROM users WHERE id=%s", (target_id,))
    if target:
        # Include inactive accounts, which still retain their assigned profile.
        profile = service.one("SELECT p.permissions FROM users u JOIN access_profiles p ON p.id=COALESCE(u.access_profile_id,u.role) WHERE u.id=%s", (target_id,))
        require_delegation(service, actor_id, profile["permissions"] if profile else allowed("ADMIN"))


def list_profiles(service, actor_id):
    service.require_admin(actor_id)
    return {"perfis": service.all("SELECT id,name,base_role,system,description,permissions FROM access_profiles ORDER BY system DESC,name"), "modulos": CATALOG}


def save_profile(service, actor_id, data, profile_id=None):
    service.require_admin(actor_id)
    if profile_id:
        current = service.one("SELECT * FROM access_profiles WHERE id=%s FOR UPDATE", (profile_id,))
        if not current:
            raise ApiError("Perfil nao encontrado.", 404)
        if current["system"]:
            raise ApiError("Perfis padrao preservam as regras da documentacao. Crie um perfil personalizado.")
        require_delegation(service, actor_id, current["permissions"])
    name, description, role = data.get("name"), data.get("description", ""), data.get("base_role")
    permissions = data.get("permissions")
    if not isinstance(name, str) or not 3 <= len(name.strip()) <= 60:
        raise ApiError("Informe um nome de perfil entre 3 e 60 caracteres.")
    if not isinstance(description, str) or len(description) > 300:
        raise ApiError("A descricao deve ter ate 300 caracteres.")
    if role not in ["ADMIN", "GESTOR_ESCOLAR", "USER"]:
        raise ApiError("Selecione um perfil base valido.")
    if profile_id and current["base_role"] != role:
        raise ApiError("O perfil base nao pode ser alterado. Crie outro perfil.")
    if not isinstance(permissions, list) or any(not isinstance(p, str) for p in permissions) or not set(permissions) <= allowed(role):
        raise ApiError("Permissoes invalidas para o perfil base. Respeite as responsabilidades da documentacao.")
    grants = set(permissions)
    require_delegation(service, actor_id, grants)
    # Write actions depend on a readable screen; reject tampered requests as well.
    for key in ["learning", "games", "missions", "users", "profiles", "content", "institutions", "school_stages", "classes", "enrollments", "highlights"]:
        if any(p.startswith(key + ".") and p != key + ".read" for p in grants) and key + ".read" not in grants:
            raise ApiError("Permita consultar o modulo antes de habilitar suas acoes.")
    if "enrollments.update" in grants and "classes.read" not in grants:
        raise ApiError("Organizar alunos exige consultar as turmas.")
    if "school_progress.read" in grants and "enrollments.read" not in grants:
        raise ApiError("Consultar progresso individual exige consultar os alunos.")
    if "school_progress.reports" in grants and "classes.read" not in grants:
        raise ApiError("Consultar consolidados exige consultar as turmas.")
    if any(p.startswith(("mission_admin.", "game_admin.")) for p in grants) and "content.read" not in grants:
        raise ApiError("A gestao de missoes e jogos exige consultar o conteudo administrativo.")
    if any(p in grants for p in ["users.create", "users.update"]) and "profiles.read" not in grants:
        raise ApiError("O cadastro e a edicao de usuarios exigem consultar os perfis.")
    if profile_id and service.one("SELECT id FROM users WHERE id=%s AND access_profile_id=%s", (actor_id, profile_id)):
        raise ApiError("Nao altere as permissoes do seu proprio perfil em uso.")
    if service.one("SELECT id FROM access_profiles WHERE lower(name)=lower(%s) AND id<>%s", (name.strip(), profile_id or "")):
        raise ApiError("Ja existe um perfil com este nome.")
    profile_id = profile_id or identifier("profile")
    service.db.execute("INSERT INTO access_profiles (id,name,description,base_role,permissions) VALUES (%s,%s,%s,%s,%s) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,permissions=EXCLUDED.permissions,updated_at=CURRENT_TIMESTAMP",
                       (profile_id, name.strip(), description.strip(), role, Jsonb(sorted(grants))))
    # All existing sessions of affected users must be renewed after a permission edit.
    service.db.execute("UPDATE sessions SET revoked_at=%s WHERE user_id IN (SELECT id FROM users WHERE access_profile_id=%s) AND revoked_at IS NULL", (now(), profile_id))
    return {"perfil": service.one("SELECT id,name,base_role,system,description,permissions FROM access_profiles WHERE id=%s", (profile_id,))}


def resolve_profile(service, data, fallback_role="USER", fallback_id=None, actor_id=None):
    profile_id = data.get("profile_id", data.get("role", fallback_id or fallback_role))
    if not isinstance(profile_id, str):
        raise ApiError("Selecione um perfil de acesso valido.")
    result = service.one("SELECT id,base_role,system,permissions FROM access_profiles WHERE id=%s", (profile_id,))
    if not result or ("role" in data and data["role"] != result["base_role"]):
        raise ApiError("Selecione um perfil de acesso valido e compativel com o perfil base.")
    if actor_id:
        require_delegation(service, actor_id, result["permissions"])
    return result["base_role"], None if result["system"] else result["id"]


def route_permission(method, path):
    if path.startswith("school-management/students/") and path.endswith("/record"):
        return "enrollments.read"
    if path.startswith("school-management/classes/") and path.endswith("/students"):
        return "enrollments.update"
    if path.startswith("admin/highlights"):
        return "highlights." + {"GET": "read", "POST": "create", "PATCH": "update", "DELETE": "delete"}[method]
    if path.startswith("school-management/students/") and path.endswith("/progress"):
        return "school_progress.read"
    if path.startswith("school-management/classes/") and path.endswith("/summary"):
        return "school_progress.reports"
    if path.startswith("admin/school-stages"):
        return "school_stages." + {"GET": "read", "POST": "create", "PATCH": "update"}[method]
    if path == "school-management/stages":
        return "classes.read"
    if path.startswith("school-management/classes"):
        return "classes." + {"GET": "read", "POST": "create", "PATCH": "update"}[method]
    if path.startswith("school-management/students"):
        return "enrollments." + ("read" if method == "GET" else "update")
    if path.startswith("admin/schools") and path.endswith("/deactivate"):
        return "institutions.deactivate"
    if path.startswith("admin/schools"):
        return "institutions." + {"GET": "read", "POST": "create", "PATCH": "update"}[method]
    if path == "school-units" or path.startswith("school-units/"):
        return "school_units.read"
    if path.startswith("admin/profiles"):
        return "profiles." + {"GET": "read", "POST": "create", "PATCH": "update"}[method]
    if path.startswith("admin/users"):
        action = "reset" if path.endswith("reset-password") else "deactivate" if path.endswith("deactivate") else {"GET": "read", "POST": "create", "PATCH": "update"}[method]
        return "users." + action
    if path == "admin/content":
        return "content.read"
    if path.startswith("admin/missions"):
        return "mission_admin." + ("create" if method == "POST" else "update")
    if path.startswith("admin/games"):
        return "game_admin.update"
    if path.startswith("admin/modules"):
        return "content." + ("create" if method == "POST" else "update")
    for prefix, module_id, action in [("learning/", "learning", "complete"), ("games", "games", "play"), ("missions", "missions", "submit"), ("progress", "progress", "read"), ("achievements", "achievements", "read")]:
        if path.startswith(prefix):
            return module_id + "." + ("read" if method == "GET" else action)
    return None
