"""Role-specific temporary credentials, including safe upgrades of existing users."""
from .errors import ApiError
from .identity import cpf_digits, matches_cpf
from .security import hash_password, token
from .time import now


def registration(value):
    if not isinstance(value, str) or not 1 <= len(value.strip()) <= 40 or any(ord(c) < 32 for c in value):
        raise ApiError("Informe a matricula do aluno, com ate 40 caracteres. Preserve zeros a esquerda.")
    return value.strip()


def initial_secret(account):
    if account["role"] == "USER":
        return registration(account.get("registration_number"))
    return cpf_digits(account.get("cpf"))


def matches_initial(value, account):
    if account["role"] == "USER":
        return isinstance(value, str) and bool(account.get("registration_number")) and value == account["registration_number"]
    return matches_cpf(value, account.get("cpf"))


def upgrade_credentials(db):
    # Preserve personal passwords, XP and history. Only pending student credentials
    # with a known enrollment number change from the former CPF default.
    for account in db.execute("SELECT id,role,registration_number,must_change_password FROM users WHERE initial_credential_version=0 FOR UPDATE").fetchall():
        if account["role"] == "USER" and account["must_change_password"]:
            if not account["registration_number"]:
                continue  # Requires administrator correction; never invent an identity.
            salt = token()
            db.execute("UPDATE users SET password_salt=%s,password_hash=%s,updated_at=%s WHERE id=%s",
                       (salt, hash_password(account["registration_number"], salt), now(), account["id"]))
            db.execute("UPDATE sessions SET revoked_at=%s WHERE user_id=%s AND revoked_at IS NULL", (now(), account["id"]))
        db.execute("UPDATE users SET initial_credential_version=1 WHERE id=%s", (account["id"],))
