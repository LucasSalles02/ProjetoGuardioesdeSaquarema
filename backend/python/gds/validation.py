from copy import deepcopy
import json
from pathlib import Path

from .errors import ApiError
from .security import clean

SPECIAL = json.loads((Path(__file__).parent / "data" / "mission_validation.json").read_text(encoding="utf-8"))


def mission_validation(mission, public=False):
    result = deepcopy(SPECIAL.get(mission["id"]))
    if result is None:
        result = ({"type": "list", "title": "Registre tres itens observados", "fields": ["residuo1", "residuo2", "residuo3"]}
                  if mission.get("validation_type") == "list" else
                  {"type": "text", "title": "Registre sua evidencia da atividade", "field": "resposta", "minLength": 20})
    if public and result["type"] == "quiz":
        for question in result["questions"]:
            question.pop("answer", None)
    return result


def validate_mission(mission, payload):
    rule = mission_validation(mission)
    if rule["type"] == "list":
        values = [clean(payload.get(field), 80) for field in rule["fields"]]
        if any(len(value) < 3 for value in values):
            raise ApiError("Informe tres residuos observados para validar a missao.")
        return {**payload, "residuos": values}
    if rule["type"] == "text":
        return validate_text(payload.get(rule["field"]) or payload.get("resposta"), 500)
    answers = payload.get("respostas", {})
    if not isinstance(answers, dict) or any(answers.get(q["id"]) != q["answer"] for q in rule["questions"]):
        raise ApiError("Revise o quiz: uma ou mais respostas ainda nao estao corretas.")
    return {"respostas": answers}


def validate_text(value, limit=700):
    value = clean(value, limit)
    if len(value) < 20:
        raise ApiError("Escreva uma resposta com pelo menos 20 caracteres.")
    return {"resposta": value}
