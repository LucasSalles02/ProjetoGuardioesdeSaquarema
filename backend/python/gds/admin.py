import re

from .config import project_env
from .errors import ApiError
from .security import email, hash_password, identifier, profile, token
from .time import now


def provision_admin(db, reset=False):
    if reset:
        raise ApiError("Realize o reset pelo painel administrativo. A senha inicial volta a ser o CPF cadastrado.")
    username = str(project_env("ADMIN_USERNAME", "")).strip().lower()
    password = project_env("ADMIN_PASSWORD", "")
    if not re.fullmatch(r"[a-z0-9_.-]{3,40}", username) or not 12 <= len(password) <= 256:
        raise ApiError("Defina GUARDIOES_DE_SAQUAREMA_ADMIN_USERNAME (3-40 caracteres) e ADMIN_PASSWORD (12-256 caracteres).")
    db.execute("SELECT pg_advisory_xact_lock(18022028)")
    existing = db.execute("SELECT id,role,active FROM users WHERE username=%s FOR UPDATE", (username,)).fetchone()
    if existing:
        if existing["role"] != "ADMIN":
            raise ApiError("Nome de usuario ja utilizado por conta comum.")
        if not existing["active"]:
            raise ApiError("A conta administrativa esta desativada. O provisionamento nao reativa contas.")
        return
    safe = profile({"nome": project_env("ADMIN_NAME") or username, "email": project_env("ADMIN_EMAIL"), "senha": password})
    if db.execute("SELECT id FROM users WHERE email=%s", (email(safe["email"]),)).fetchone():
        raise ApiError("Email ja utilizado. Use um email exclusivo para o administrador.")
    user_id, salt, stamp = identifier("usr"), token(), now()
    db.execute("INSERT INTO users (id,nome,username,email,role,password_salt,password_hash,created_at,updated_at) VALUES (%s,%s,%s,%s,'ADMIN',%s,%s,%s,%s)",
               (user_id, safe["nome"], username, safe["email"], salt, hash_password(password, salt), stamp, stamp))
    db.execute("INSERT INTO stats (user_id) VALUES (%s)", (user_id,))
