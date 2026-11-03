import base64
import hashlib
import hmac
import re
import secrets

from .errors import ApiError


def token():
    return secrets.token_urlsafe(32)


def identifier(prefix="id"):
    return f"{prefix}_{secrets.token_hex(12)}"


def clean(value, maximum=80):
    return re.sub(r"\s+", " ", str(value or "")).strip()[:maximum]


def email(value):
    return str(value or "").strip().lower()


def valid_password(value):
    return isinstance(value, str) and 8 <= len(value) <= 256


def hash_password(password, salt):
    key = hashlib.scrypt(password.encode("utf-8"), salt=salt.encode("utf-8"), n=32768,
                         r=8, p=1, dklen=32, maxmem=64 * 1024 * 1024)
    return "scrypt$" + base64.b64encode(key).decode("ascii")


def verify_password(password, salt, expected):
    # Legacy PBKDF2 accounts predate the 256-character policy for newly set passwords.
    if not isinstance(password, str) or not password or len(password) > 100_000:
        return False
    if expected.startswith("scrypt$"):
        actual = hash_password(password, salt)
    else:
        key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120000, 32)
        actual = base64.b64encode(key).decode("ascii")
    return hmac.compare_digest(actual, expected)


def profile(data, require_password=True):
    result = {"nome": clean(data.get("nome")), "email": email(data.get("email")),
              "turma": clean(data.get("turma"), 40), "escola": clean(data.get("escola"))}
    if len(result["nome"]) < 2:
        raise ApiError("Informe um nome com pelo menos 2 caracteres.")
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", result["email"]):
        raise ApiError("Informe um email valido.")
    if require_password and not valid_password(data.get("senha")):
        raise ApiError("A senha precisa ter entre 8 e 256 caracteres.")
    return result
