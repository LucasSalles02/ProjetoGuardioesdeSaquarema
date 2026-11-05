from .config import project_env
from .identity import cpf_digits
from .errors import ApiError
from .security import email, hash_password, identifier, profile, token
from .time import now


def provision_admin(db, reset=False):
    if reset:
        raise ApiError("Realize o reset pelo painel administrativo. A senha inicial volta a ser o CPF cadastrado.")
    cpf = cpf_digits(project_env("ADMIN_CPF", ""))
    password = project_env("ADMIN_PASSWORD", "")
    if not 12 <= len(password) <= 256:
        raise ApiError("Defina ADMIN_CPF (11 digitos) e ADMIN_PASSWORD (12-256 caracteres) no ambiente local.")
    db.execute("SELECT pg_advisory_xact_lock(18022028)")
    existing = db.execute("SELECT id,role,active FROM users WHERE cpf=%s FOR UPDATE", (cpf,)).fetchone()
    if existing:
        if existing["role"] != "ADMIN":
            raise ApiError("CPF ja utilizado por outra categoria de conta.")
        if not existing["active"]:
            raise ApiError("A conta administrativa esta desativada. O provisionamento nao reativa contas.")
        return
    safe = profile({"nome": project_env("ADMIN_NAME") or "Administrador", "email": project_env("ADMIN_EMAIL"), "senha": password})
    legacy = db.execute("SELECT id,role,active,cpf FROM users WHERE email=%s FOR UPDATE", (email(safe["email"]),)).fetchone()
    if legacy and legacy["role"] == "ADMIN" and legacy["active"] and legacy["cpf"] is None:
        # Local provisioning can complete a legacy admin's explicitly supplied CPF;
        # it preserves the password and never converts or reactivates another account.
        db.execute("UPDATE users SET cpf=%s,updated_at=%s WHERE id=%s", (cpf, now(), legacy["id"]))
        db.execute("UPDATE sessions SET revoked_at=%s WHERE user_id=%s AND revoked_at IS NULL", (now(), legacy["id"]))
        return
    if legacy:
        raise ApiError("Email ja utilizado. Use um email exclusivo para o administrador.")
    user_id, salt, stamp = identifier("usr"), token(), now()
    db.execute("INSERT INTO users (id,nome,cpf,email,role,password_salt,password_hash,created_at,updated_at) VALUES (%s,%s,%s,%s,'ADMIN',%s,%s,%s,%s)",
               (user_id, safe["nome"], cpf, safe["email"], salt, hash_password(password, salt), stamp, stamp))
    db.execute("INSERT INTO stats (user_id) VALUES (%s)", (user_id,))
