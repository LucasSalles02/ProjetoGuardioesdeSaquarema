import re
from pathlib import Path

import pytest

from gds.content_icons import ICONS
from gds.database import connection


@pytest.mark.parametrize("kind",["mission","lesson"])
def test_icon_round_trip_preservation_and_automatic_fallback(client,admin_headers,db_url,kind):
    path = "/api/admin/missions/lixo-marinho" if kind == "mission" else "/api/admin/modules/vida-marinha/lessons/ecossistemas-costeiros"
    with connection(db_url) as db:
        before = db.execute("SELECT SUM(xp) AS xp FROM stats").fetchone()["xp"]
        activities = db.execute("SELECT COUNT(*) AS n FROM activities").fetchone()["n"]
    response = client.patch(path,headers=admin_headers,json={"icon": "turtle"})
    assert response.status_code == 200,response.text
    read = "/api/missions" if kind == "mission" else "/api/learning/modules/vida-marinha"
    result = client.get(read,headers=admin_headers).json()
    rows = result["missoes"] if kind == "mission" else result["modulo"]["lessons"]
    identifier = "lixo-marinho" if kind == "mission" else "ecossistemas-costeiros"
    assert next(item for item in rows if item["id"] == identifier)["icon"] == "turtle"
    assert client.patch(path,headers=admin_headers,json={"titulo": "Titulo atualizado"}).status_code == 200
    with connection(db_url) as db:
        table = "missions" if kind == "mission" else "lessons"
        assert db.execute(f"SELECT icon FROM {table} WHERE id=%s",(identifier,)).fetchone()["icon"] == "turtle"
        assert db.execute("SELECT SUM(xp) AS xp FROM stats").fetchone()["xp"] == before
        assert db.execute("SELECT COUNT(*) AS n FROM activities").fetchone()["n"] == activities
    assert client.patch(path,headers=admin_headers,json={"icon": None}).status_code == 200
    result = client.get(read,headers=admin_headers).json()
    rows = result["missoes"] if kind == "mission" else result["modulo"]["lessons"]
    assert next(item for item in rows if item["id"] == identifier)["icon"] is None


@pytest.mark.parametrize("value",["not-an-icon","<script>",{},[],42,False])
def test_invalid_icons_are_rejected_without_modifying_content(client,admin_headers,value):
    path = "/api/admin/missions/lixo-marinho"
    response = client.patch(path,headers=admin_headers,json={"icon": value,"titulo": "Invalid change"})
    assert response.status_code == 400,response.text
    mission = next(item for item in client.get("/api/missions",headers=admin_headers).json()["missoes"] if item["id"] == "lixo-marinho")
    assert mission["icon"] is None and mission["titulo"] != "Invalid change"


def test_new_mission_and_lesson_save_selected_icons(client,admin_headers):
    mission = client.post("/api/admin/missions",headers=admin_headers,json={"titulo": "Missao com icone", "descricao": "Atividade ambiental", "icon": "leaf"})
    assert mission.status_code == 200,mission.text
    assert mission.json()["missao"]["icon"] == "leaf"
    lesson = client.post("/api/admin/modules/vida-marinha/lessons",headers=admin_headers,json={"titulo": "Aula com icone", "resumo": "Aprendizagem ambiental", "icon": "fish"})
    assert lesson.status_code == 200,lesson.text
    assert next(item for item in lesson.json()["modulo"]["lessons"] if item["titulo"] == "Aula com icone")["icon"] == "fish"


def test_students_cannot_configure_icons(client,auth_headers):
    assert client.patch("/api/admin/missions/lixo-marinho",headers=auth_headers,json={"icon": "turtle"}).status_code == 403
    assert client.patch("/api/admin/modules/vida-marinha/lessons/ecossistemas-costeiros",headers=auth_headers,json={"icon": "turtle"}).status_code == 403


def test_frontend_bank_matches_backend_whitelist():
    source = (Path(__file__).resolve().parents[2] / "frontend/src/services/contentIcons.js").read_text(encoding="utf-8")
    assert set(re.findall(r'id: "([a-z-]+)"',source)) == ICONS
