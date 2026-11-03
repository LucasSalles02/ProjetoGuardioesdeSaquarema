import re
from datetime import datetime

from .errors import ApiError
from .time import day


def cpf_digits(value):
    if not isinstance(value, str):
        raise ApiError("Informe um CPF com 11 digitos.")
    value = value.strip()
    if not re.fullmatch(r"(?:[0-9]{11}|[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2})", value):
        raise ApiError("Informe um CPF com 11 digitos, no formato 000.000.000-00 ou somente numeros.")
    return re.sub(r"[.-]", "", value)


def birth_date(value):
    if not isinstance(value, str) or not re.fullmatch(r"[0-9]{2}/[0-9]{2}/[0-9]{4}", value):
        raise ApiError("Informe a data de nascimento no formato DD/MM/AAAA.")
    try:
        result = datetime.strptime(value, "%d/%m/%Y").date()
    except ValueError:
        raise ApiError("Informe uma data de nascimento valida.") from None
    if result.isoformat() > day():
        raise ApiError("A data de nascimento nao pode estar no futuro.")
    return result


def matches_cpf(value, cpf):
    if not cpf:
        return False
    try:
        return cpf_digits(value) == cpf
    except ApiError:
        return False
