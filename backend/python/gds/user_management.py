"""Administrative account lifecycle; institutional permissions belong to a later stage."""
import re

from .errors import ApiError
from .security import hash_password, identifier, token
from .time import now
from .identity import cpf_digits, birth_date
from .onboarding import initial_secret, registration
from psycopg.types.json import Jsonb
from .access import effective, resolve_profile, require_target
from .school_management import admin_links, admin_membership

LIST_FIELDS = "id,nome,username,email,role,active,deactivated_at,created_at,updated_at,cpf,registration_number,TO_CHAR(birth_date,'DD/MM/YYYY') AS birth_date,must_change_password,COALESCE(access_profile_id,role) AS profile_id,(SELECT name FROM access_profiles WHERE id=COALESCE(users.access_profile_id,users.role)) AS profile_name"


def list_users(service, actor_id):
    service.require_admin(actor_id)
    return {"usuarios": service.all(f"SELECT {LIST_FIELDS} FROM users ORDER BY created_at DESC,id")}


def get_user(service, actor_id, target_id):
    service.require_admin(actor_id)
    return _read_user(service, target_id, actor_id)


def _read_user(service, target_id, actor_id):
    account = service.one(f"SELECT {LIST_FIELDS},turma,escola,guardians FROM users WHERE id=%s", (target_id,))
    if not account:
        raise ApiError("Usuario nao encontrado.", 404)
    # Reset permission alone must not disclose private family contact details.
    if "users.read" not in effective(service, actor_id)["permissions"]:
        account.pop("guardians", None)
    return {"usuario": {**account, **admin_links(service, account)}}


def account_values(data, role):
    # The deprecated username input is ignored. Full names are not unique logins.
    name = data.get("nome")
    if not isinstance(name, str) or not 2 <= len(" ".join(name.split())) <= 80:
        raise ApiError("Informe o nome completo, entre 2 e 80 caracteres.")
    mail = data.get("email")
    if mail not in (None, "") and (not isinstance(mail, str) or len(mail) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", mail.strip())):
        raise ApiError("Informe um email valido.")
    if role != "USER" and not mail:
        raise ApiError("Informe o email profissional para o cadastro.")
    cpf = cpf_digits(data.get("cpf")) if role != "USER" or data.get("cpf") else None
    date = birth_date(data["birth_date"]) if data.get("birth_date") else None
    number = registration(data.get("registration_number")) if role == "USER" else None
    contacts = validate_guardians(data.get("guardians", []))
    if role != "USER" and contacts:
        raise ApiError("Responsaveis legais pertencem somente ao cadastro de alunos.")
    return {"nome": " ".join(name.split()), "username": None,
            "email": mail.strip().lower() if mail else None, "cpf": cpf, "birth_date": date,
            "registration_number": number, "guardians": contacts,
            "turma": str(data.get("turma") or "")[:40], "escola": str(data.get("escola") or "")[:80]}


def validate_guardians(contacts):
    if not isinstance(contacts, list) or len(contacts) > 3:
        raise ApiError("Informe ate tres responsaveis legais, somente quando necessario.")
    result = []
    for contact in contacts:
        if not isinstance(contact, dict) or set(contact) - {"name", "relationship", "email", "phone"}:
            raise ApiError("Informe somente nome, vinculo, email e telefone do responsavel.")
        row = {}
        for key, maximum in [("name",80),("relationship",60),("email",254),("phone",24)]:
            value = contact.get(key, "")
            if not isinstance(value, str) or len(value.strip()) > maximum:
                raise ApiError("Dados do responsavel invalidos.")
            row[key] = value.strip()
        if len(row["name"]) < 2 or len(row["relationship"]) < 2 or not (row["email"] or row["phone"]):
            raise ApiError("Informe nome, vinculo e ao menos um contato do responsavel.")
        if row["email"] and not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", row["email"]):
            raise ApiError("Informe um email valido para o responsavel.")
        if row["phone"] and (not re.fullmatch(r"[+0-9() .-]+", row["phone"]) or not 10 <= len(re.sub(r"\D", "", row["phone"])) <= 15):
            raise ApiError("Informe um telefone de contato valido para o responsavel.")
        result.append(row)
    return result


def unique_identity(service, safe, target_id=""):
    if safe["registration_number"] and service.one("SELECT id FROM users WHERE role='USER' AND registration_number=%s AND id<>%s", (safe["registration_number"], target_id)):
        raise ApiError("Esta matricula ja esta cadastrada na plataforma. Informe uma matricula unica para o login.")
    for column, message in [("email", "Este email ja esta cadastrado."), ("username", "Este nome de usuario ja esta cadastrado."), ("cpf", "Este CPF ja esta cadastrado.")]:
        if safe[column] and service.one(f"SELECT id FROM users WHERE {column}=%s AND id<>%s", (safe[column], target_id)):
            raise ApiError(message)


def create_user(service, actor_id, data):
    service.require_admin(actor_id)
    if any(key in data for key in ["senha", "password", "password_hash", "password_salt"]):
        raise ApiError("Nao informe senha: alunos iniciam com a matricula; profissionais, com o CPF. A troca e obrigatoria.")
    if set(data) - {"nome", "username", "email", "role", "cpf", "birth_date", "turma", "escola", "profile_id", "school_id", "registration_number", "guardians"}:
        raise ApiError("Informe somente os dados cadastrais da categoria selecionada.")
    role, profile_id = resolve_profile(service, data, actor_id=actor_id)
    safe = account_values(data, role)
    unique_identity(service, safe)
    secret = initial_secret({**safe, "role": role})
    user_id, salt, stamp = identifier("usr"), token(), now()
    service.db.execute("INSERT INTO users (id,nome,username,email,role,cpf,birth_date,registration_number,guardians,turma,escola,must_change_password,password_salt,password_hash,created_at,updated_at,initial_credential_version) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,TRUE,%s,%s,%s,%s,1)",
                       (user_id, safe["nome"], safe["username"], safe["email"], role, safe["cpf"], safe["birth_date"], safe["registration_number"], Jsonb(safe["guardians"]), safe["turma"], safe["escola"], salt, hash_password(secret, salt), stamp, stamp))
    service.db.execute("UPDATE users SET access_profile_id=%s WHERE id=%s", (profile_id, user_id))
    service.db.execute("INSERT INTO stats (user_id) VALUES (%s)", (user_id,))
    admin_membership(service, actor_id, user_id, role, data)
    return get_user(service, actor_id, user_id)


def edit_user(service, actor_id, target_id, data):
    service.require_admin(actor_id)
    require_target(service, actor_id, target_id)
    if set(data) - {"nome", "username", "email", "role", "cpf", "birth_date", "turma", "escola", "profile_id", "school_id", "registration_number", "guardians"}:
        raise ApiError("Edite somente os dados cadastrais. Senha e situacao possuem operacoes separadas.")
    current = service.one("SELECT * FROM users WHERE id=%s FOR UPDATE", (target_id,))
    if not current:
        raise ApiError("Usuario nao encontrado.", 404)
    role, profile_id = resolve_profile(service, data, current["role"], current["access_profile_id"], actor_id)
    if target_id == actor_id and (role != "ADMIN" or profile_id != current["access_profile_id"]):
        raise ApiError("Nao e permitido alterar o proprio perfil administrativo.")
    values = {**current, "birth_date": current["birth_date"].strftime("%d/%m/%Y") if current["birth_date"] else None, **data}
    if role != "USER":
        values["guardians"] = []
    safe = account_values(values, role)
    safe["username"] = current["username"]  # Preserve legacy storage without exposing an editable field.
    unique_identity(service, safe, target_id)
    if current["role"] == "ADMIN" and current["access_profile_id"] is None and (role != "ADMIN" or profile_id is not None) and current["active"]:
        if service.one("SELECT COUNT(*) AS total FROM users WHERE role='ADMIN' AND access_profile_id IS NULL AND active=TRUE")["total"] <= 1:
            raise ApiError("Mantenha pelo menos um administrador ativo.")
    identity_changed = any(current[key] != safe[key] for key in ("cpf", "email", "username", "registration_number")) or current["role"] != role or current["access_profile_id"] != profile_id
    service.db.execute("UPDATE users SET nome=%s,username=%s,email=%s,role=%s,cpf=%s,birth_date=%s,registration_number=%s,guardians=%s,turma=%s,escola=%s,updated_at=%s WHERE id=%s",
                       (safe["nome"], safe["username"], safe["email"], role, safe["cpf"], safe["birth_date"], safe["registration_number"], Jsonb(safe["guardians"]), safe["turma"], safe["escola"], now(), target_id))
    service.db.execute("UPDATE users SET access_profile_id=%s WHERE id=%s", (profile_id, target_id))
    if current["must_change_password"] and identity_changed:
        salt = token()
        service.db.execute("UPDATE users SET password_salt=%s,password_hash=%s,initial_credential_version=1 WHERE id=%s", (salt, hash_password(initial_secret({**safe, "role": role}), salt), target_id))
    # Changing the category changes the temporary credential rule and requires new onboarding.
    elif current["role"] != role:
        salt = token()
        service.db.execute("UPDATE users SET password_salt=%s,password_hash=%s,must_change_password=TRUE,initial_credential_version=1 WHERE id=%s", (salt, hash_password(initial_secret({**safe, "role": role}), salt), target_id))
    if current["role"] == "GESTOR_ESCOLAR" and role != "GESTOR_ESCOLAR":
        service.db.execute("UPDATE school_manager_links SET authorized=FALSE,authorized_by=%s,updated_at=CURRENT_TIMESTAMP WHERE manager_id=%s AND authorized=TRUE", (actor_id, target_id))
    if identity_changed:
        service.db.execute("UPDATE sessions SET revoked_at=%s WHERE user_id=%s AND revoked_at IS NULL", (now(), target_id))
    admin_membership(service, actor_id, target_id, role, data)
    return get_user(service, actor_id, target_id)


def reset_password(service, actor_id, target_id):
    service.require_admin(actor_id)
    require_target(service, actor_id, target_id)
    current = service.one("SELECT * FROM users WHERE id=%s FOR UPDATE", (target_id,))
    if not current:
        raise ApiError("Usuario nao encontrado.", 404)
    secret = initial_secret(current)
    salt, stamp = token(), now()
    service.db.execute("UPDATE users SET password_salt=%s,password_hash=%s,must_change_password=TRUE,initial_credential_version=1,updated_at=%s WHERE id=%s",
                       (salt, hash_password(secret, salt), stamp, target_id))
    service.db.execute("UPDATE sessions SET revoked_at=%s WHERE user_id=%s AND revoked_at IS NULL", (stamp, target_id))
    return _read_user(service, target_id, actor_id)


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
