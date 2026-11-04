"""Administrative account lifecycle; institutional permissions belong to a later stage."""
import re

from .errors import ApiError
from .security import hash_password, identifier, profile, token
from .time import now
from .identity import cpf_digits, birth_date
from .access import resolve_profile, require_target
from .school_management import admin_links, admin_membership

ROLES = {"USER", "GESTOR_ESCOLAR", "ADMIN"}
LIST_FIELDS = "id,nome,username,email,role,active,deactivated_at,created_at,updated_at,cpf,TO_CHAR(birth_date,'DD/MM/YYYY') AS birth_date,must_change_password,COALESCE(access_profile_id,role) AS profile_id,(SELECT name FROM access_profiles WHERE id=COALESCE(users.access_profile_id,users.role)) AS profile_name"


def list_users(service, actor_id):
    service.require_admin(actor_id)
    return {"usuarios": service.all(f"SELECT {LIST_FIELDS} FROM users ORDER BY created_at DESC,id")}


def get_user(service, actor_id, target_id):
    service.require_admin(actor_id)
    return _read_user(service, target_id)


def _read_user(service, target_id):
    account = service.one(f"SELECT {LIST_FIELDS},turma,escola FROM users WHERE id=%s", (target_id,))
    if not account:
        raise ApiError("Usuario nao encontrado.", 404)
    return {"usuario": {**account, **admin_links(service, account)}}


def create_user(service, actor_id, data):
    service.require_admin(actor_id)
    if any(key in data for key in ["senha", "password", "password_hash", "password_salt"]):
        raise ApiError("Nao informe senha no cadastro. O primeiro acesso utiliza o CPF e exige uma nova senha.")
    role, profile_id = resolve_profile(service, data, actor_id=actor_id)
    if not isinstance(role, str) or role not in ROLES:
        raise ApiError("Selecione um perfil valido: Aluno, Gestor Escolar ou Administrador.")
    raw_username = data.get("username")
    if not isinstance(raw_username, str):
        raise ApiError("Informe um usuario de 3 a 40 caracteres: letras, numeros, ponto, hifen ou sublinhado.")
    username = raw_username.strip().lower()
    if not re.fullmatch(r"[a-z0-9_.-]{3,40}", username):
        raise ApiError("Informe um usuario de 3 a 40 caracteres: letras, numeros, ponto, hifen ou sublinhado.")
    if any(not isinstance(data.get(key), str) for key in ["nome", "email"]):
        raise ApiError("Informe nome e email validos.")
    safe = profile(data, False)
    cpf = cpf_digits(data.get("cpf"))
    date = birth_date(data.get("birth_date"))
    if service.one("SELECT id FROM users WHERE email=%s", (safe["email"],)):
        raise ApiError("Este email ja esta cadastrado.")
    if service.one("SELECT id FROM users WHERE username=%s", (username,)):
        raise ApiError("Este nome de usuario ja esta cadastrado.")
    if service.one("SELECT id FROM users WHERE cpf=%s", (cpf,)):
        raise ApiError("Este CPF ja esta cadastrado.")
    user_id, salt, stamp = identifier("usr"), token(), now()
    # Never create a session for the new account or replace the administrator's session.
    service.db.execute("INSERT INTO users (id,nome,username,email,role,cpf,birth_date,turma,escola,must_change_password,password_salt,password_hash,created_at,updated_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,TRUE,%s,%s,%s,%s)",
                       (user_id, safe["nome"], username, safe["email"], role, cpf, date, safe["turma"], safe["escola"], salt, hash_password(cpf, salt), stamp, stamp))
    service.db.execute("UPDATE users SET access_profile_id=%s WHERE id=%s", (profile_id, user_id))
    service.db.execute("INSERT INTO stats (user_id) VALUES (%s)", (user_id,))
    admin_membership(service, actor_id, user_id, role, data)
    return get_user(service, actor_id, user_id)


def edit_user(service, actor_id, target_id, data):
    service.require_admin(actor_id)
    require_target(service, actor_id, target_id)
    if any(key not in {"nome", "username", "email", "role", "cpf", "birth_date", "turma", "escola", "profile_id", "school_id", "registration_number"} for key in data):
        raise ApiError("Edite somente os dados cadastrais. Senha e situacao possuem operacoes separadas.")
    current = service.one("SELECT * FROM users WHERE id=%s FOR UPDATE", (target_id,))
    if not current:
        raise ApiError("Usuario nao encontrado.", 404)
    selected_role, profile_id = resolve_profile(service, data, current["role"], current["access_profile_id"], actor_id)
    values = {**current, "birth_date": current["birth_date"].strftime("%d/%m/%Y") if current["birth_date"] else None, **data}
    values["role"] = selected_role
    if target_id == actor_id and profile_id != current["access_profile_id"]:
        raise ApiError("Nao e permitido alterar o proprio perfil de acesso.")
    if not isinstance(values["role"], str) or values["role"] not in ROLES:
        raise ApiError("Selecione um perfil valido.")
    if target_id == actor_id and values["role"] != "ADMIN":
        raise ApiError("Nao e permitido alterar o proprio perfil administrativo.")
    raw_username = values["username"]
    if not isinstance(raw_username, str) or not re.fullmatch(r"[a-zA-Z0-9_.-]{3,40}", raw_username.strip()):
        raise ApiError("Informe um usuario de 3 a 40 caracteres: letras, numeros, ponto, hifen ou sublinhado.")
    username = raw_username.strip().lower()
    if not isinstance(values["nome"], str) or not isinstance(values["email"], str):
        raise ApiError("Informe nome e email validos.")
    safe = profile(values, False)
    cpf, date = cpf_digits(values["cpf"]), birth_date(values["birth_date"])
    for column, value, message in [("email", safe["email"], "Este email ja esta cadastrado."), ("username", username, "Este nome de usuario ja esta cadastrado."), ("cpf", cpf, "Este CPF ja esta cadastrado.")]:
        if service.one(f"SELECT id FROM users WHERE {column}=%s AND id<>%s", (value, target_id)):
            raise ApiError(message)
    if current["role"] == "ADMIN" and current["access_profile_id"] is None and (values["role"] != "ADMIN" or profile_id is not None) and current["active"]:
        if service.one("SELECT COUNT(*) AS total FROM users WHERE role='ADMIN' AND access_profile_id IS NULL AND active=TRUE")["total"] <= 1:
            raise ApiError("Mantenha pelo menos um administrador ativo.")
    identity_changed = any([current["cpf"] != cpf, current["email"] != safe["email"], current["username"] != username, current["role"] != values["role"], current["access_profile_id"] != profile_id])
    service.db.execute("UPDATE users SET nome=%s,username=%s,email=%s,role=%s,cpf=%s,birth_date=%s,turma=%s,escola=%s,updated_at=%s WHERE id=%s",
                       (safe["nome"], username, safe["email"], values["role"], cpf, date, safe["turma"], safe["escola"], now(), target_id))
    service.db.execute("UPDATE users SET access_profile_id=%s WHERE id=%s", (profile_id, target_id))
    if current["must_change_password"] and current["cpf"] != cpf:
        salt = token()
        service.db.execute("UPDATE users SET password_salt=%s,password_hash=%s WHERE id=%s", (salt, hash_password(cpf, salt), target_id))
    if current["role"] == "GESTOR_ESCOLAR" and values["role"] != "GESTOR_ESCOLAR":
        service.db.execute("UPDATE school_manager_links SET authorized=FALSE,authorized_by=%s,updated_at=CURRENT_TIMESTAMP WHERE manager_id=%s AND authorized=TRUE", (actor_id, target_id))
    if identity_changed:
        service.db.execute("UPDATE sessions SET revoked_at=%s WHERE user_id=%s AND revoked_at IS NULL", (now(), target_id))
    admin_membership(service, actor_id, target_id, values["role"], data)
    return get_user(service, actor_id, target_id)


def reset_password(service, actor_id, target_id):
    service.require_admin(actor_id)
    require_target(service, actor_id, target_id)
    current = service.one("SELECT cpf FROM users WHERE id=%s FOR UPDATE", (target_id,))
    if not current:
        raise ApiError("Usuario nao encontrado.", 404)
    cpf = cpf_digits(current["cpf"])
    salt, stamp = token(), now()
    service.db.execute("UPDATE users SET password_salt=%s,password_hash=%s,must_change_password=TRUE,updated_at=%s WHERE id=%s",
                       (salt, hash_password(cpf, salt), stamp, target_id))
    service.db.execute("UPDATE sessions SET revoked_at=%s WHERE user_id=%s AND revoked_at IS NULL", (stamp, target_id))
    return _read_user(service, target_id)


def deactivate_user(service, actor_id, target_id):
    service.require_admin(actor_id)
    require_target(service, actor_id, target_id)
    if target_id == actor_id:
        raise ApiError("Nao e permitido desativar a propria conta administrativa.")
    target = service.one("SELECT id,role,active,access_profile_id FROM users WHERE id=%s FOR UPDATE", (target_id,))
    if not target:
        raise ApiError("Usuario nao encontrado.", 404)
    if not target["active"]:
        return get_user(service, actor_id, target_id)
    if target["role"] == "ADMIN" and target["access_profile_id"] is None:
        count = service.one("SELECT COUNT(*) AS total FROM users WHERE role='ADMIN' AND access_profile_id IS NULL AND active=TRUE")["total"]
        if count <= 1:
            raise ApiError("Mantenha pelo menos um administrador ativo.")
    stamp = now()
    service.db.execute("UPDATE school_manager_links SET authorized=FALSE,authorized_by=%s,updated_at=CURRENT_TIMESTAMP WHERE manager_id=%s AND authorized=TRUE", (actor_id, target_id))
    service.db.execute("UPDATE users SET active=FALSE,deactivated_at=%s,updated_at=%s WHERE id=%s", (stamp, stamp, target_id))
    service.db.execute("UPDATE sessions SET revoked_at=%s WHERE user_id=%s AND revoked_at IS NULL", (stamp, target_id))
    return get_user(service, actor_id, target_id)
