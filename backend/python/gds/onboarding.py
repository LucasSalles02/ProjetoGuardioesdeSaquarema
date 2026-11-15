"""Individual temporary credentials and compatibility with existing accounts."""
import secrets
from datetime import datetime, timedelta, timezone

from .errors import ApiError
from .identity import matches_cpf
from .security import hash_password, token
from .time import now


def registration(value):
    if not isinstance(value, str) or not 1 <= len(value.strip()) <= 40 or any(ord(c) < 32 for c in value):
        raise ApiError("Informe a matricula do aluno, com ate 40 caracteres. Preserve zeros a esquerda.")
    return value.strip()


def initial_secret():
    return secrets.token_urlsafe(18)


def matches_initial(value, account):
    if account["role"] == "USER":
        return isinstance(value, str) and bool(account.get("registration_number")) and value == account["registration_number"]
    return matches_cpf(value, account.get("cpf"))


def require_valid_temporary(account):
    if not account["must_change_password"]:
        return
    expiry = account.get("temporary_password_expires_at")
    if isinstance(expiry, str):
        expiry = datetime.fromisoformat(expiry.replace("Z", "+00:00"))
    if expiry is None or expiry <= datetime.now(timezone.utc):
        raise ApiError("Senha temporaria expirada. Solicite uma nova emissao ao administrador.", 401)


def issue_temporary(service, user_id):
    secret, salt = initial_secret(), token()
    expiry = datetime.now(timezone.utc) + timedelta(hours=24)
    service.db.execute("UPDATE users SET password_salt=%s,password_hash=%s,must_change_password=TRUE,initial_credential_version=2,temporary_password_expires_at=%s,updated_at=%s WHERE id=%s",
                       (salt, hash_password(secret, salt), expiry, now(), user_id))
    service.db.execute("UPDATE sessions SET revoked_at=%s WHERE user_id=%s AND revoked_at IS NULL", (now(), user_id))
    return {"password": secret, "expires_at": expiry.isoformat()}


def upgrade_credentials(db):
    # Imported pending credentials also require reissue. Personal passwords survive.
    for account in db.execute("SELECT id,must_change_password FROM users WHERE initial_credential_version<2 FOR UPDATE").fetchall():
        if account["must_change_password"]:
            db.execute("UPDATE users SET temporary_password_expires_at=CURRENT_TIMESTAMP WHERE id=%s", (account["id"],))
            db.execute("UPDATE sessions SET revoked_at=%s WHERE user_id=%s AND revoked_at IS NULL", (now(), account["id"]))
        db.execute("UPDATE users SET initial_credential_version=2 WHERE id=%s", (account["id"],))
