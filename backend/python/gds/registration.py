import re

from .errors import ApiError
from .identity import birth_date, cpf_digits
from .security import identifier, profile
from .time import now
from .user_management import create_user, get_user

FIELDS = "id,nome,username,email,cpf,TO_CHAR(birth_date,'DD/MM/YYYY') AS birth_date,turma,escola,status,created_at,reviewed_at,reviewed_by,user_id,rejection_reason"


def request_registration(service, data):
    if any(key in data for key in ["senha", "password", "password_hash", "password_salt"]):
        raise ApiError("Nao informe senha. A primeira senha sera o CPF, somente apos aprovacao administrativa.")
    safe = profile(data, False)
    username = data.get("username")
    if not isinstance(username, str) or not re.fullmatch(r"[a-zA-Z0-9_.-]{3,40}", username.strip()):
        raise ApiError("Informe um usuario de 3 a 40 caracteres: letras, numeros, ponto, hifen ou sublinhado.")
    username = username.strip().lower()
    cpf, date = cpf_digits(data.get("cpf")), birth_date(data.get("birth_date"))
    if service.one("SELECT id FROM users WHERE cpf=%s OR email=%s OR username=%s", (cpf, safe["email"], username)) or service.one("SELECT id FROM registration_requests WHERE status='PENDING' AND (cpf=%s OR email=%s OR username=%s)", (cpf, safe["email"], username)):
        raise ApiError("Ja existe cadastro ou solicitacao pendente para os dados informados.")
    service.db.execute("INSERT INTO registration_requests (id,nome,username,email,cpf,birth_date,turma,escola,created_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                       (identifier("req"), safe["nome"], username, safe["email"], cpf, date, safe["turma"], safe["escola"], now()))
    return {"ok": True, "status": "PENDING", "mensagem": "Solicitacao recebida. Aguarde a aprovacao de um administrador. A primeira senha sera o CPF com 11 digitos e devera ser alterada no primeiro acesso."}


def list_requests(service, actor_id):
    service.require_admin(actor_id)
    return {"solicitacoes": service.all(f"SELECT {FIELDS} FROM registration_requests ORDER BY created_at DESC,id")}


def review(service, actor_id, request_id, approve, data):
    service.require_admin(actor_id)
    request = service.one("SELECT * FROM registration_requests WHERE id=%s FOR UPDATE", (request_id,))
    if not request:
        raise ApiError("Solicitacao nao encontrada.", 404)
    if request["status"] == "APPROVED" and approve:
        return {"solicitacao": _read(service, request_id), **get_user(service, actor_id, request["user_id"])}
    if request["status"] != "PENDING":
        raise ApiError("Esta solicitacao ja foi analisada.")
    user = None
    if approve:
        # Public requests are always Aluno, regardless of submitted privilege fields.
        user = create_user(service, actor_id, {**request, "role": "USER", "birth_date": request["birth_date"].strftime("%d/%m/%Y")})["usuario"]
    reason = data.get("motivo", "")
    if not isinstance(reason, str) or len(reason) > 500:
        raise ApiError("O motivo deve ter ate 500 caracteres.")
    service.db.execute("UPDATE registration_requests SET status=%s,reviewed_at=%s,reviewed_by=%s,user_id=%s,rejection_reason=%s WHERE id=%s",
                       ("APPROVED" if approve else "REJECTED", now(), actor_id, user["id"] if user else None, reason.strip() if not approve else None, request_id))
    return {"solicitacao": _read(service, request_id), **({"usuario": user} if user else {})}


def _read(service, request_id):
    return service.one(f"SELECT {FIELDS} FROM registration_requests WHERE id=%s", (request_id,))
