import pytest

from gds.database import connection
from gds.service import Service


@pytest.fixture
def setup_deactivation(client, admin_headers, db_url):
    with connection(db_url) as db:
        manager = Service(db).register({"nome": "Gestor Desativacao", "email": "desativargestor@example.com", "senha": "segredo123"})
        db.execute("UPDATE users SET role='GESTOR_ESCOLAR' WHERE id=%s", (manager["usuario"]["id"],))
    units = [client.post("/api/admin/schools", headers=admin_headers, json={"name": name, "manager_ids": [manager["usuario"]["id"]]}).json()["unidade"] for name in ["Unidade Encerrada", "Unidade Preservada"]]
    manager_headers = {"Authorization": "Bearer " + manager["token"]}
    client.post("/api/school-context", headers=manager_headers, json={"school_id": units[0]["id"]})
    client.post("/api/school-context", headers=admin_headers, json={"school_id": units[0]["id"]})
    stage = client.get("/api/school-management/stages", headers=manager_headers).json()["etapas"][0]
    classroom = client.post("/api/school-management/classes", headers=manager_headers, json={"identification": "Turma Preservada", "stage_id": stage["id"]}).json()["turma"]
    student = client.post("/api/admin/users", headers=admin_headers, json={"nome": "Aluno Desativacao", "username": "aluno.desativacao", "email": "desativaraluno@example.com", "cpf": "00123456789", "birth_date": "01/01/2015", "role": "USER", "school_id": units[0]["id"], "registration_number": "000123"}).json()["usuario"]
    client.patch(f"/api/school-management/students/{student['id']}/class", headers=manager_headers, json={"class_id": classroom["id"]})
    with connection(db_url) as db:
        db.execute("UPDATE users SET escola='Unidade Encerrada',turma='Turma Preservada',must_change_password=FALSE WHERE id=%s", (student["id"],))
        db.execute("UPDATE stats SET xp=725,missoes_concluidas=3 WHERE user_id=%s", (student["id"],))
        token = Service(db).create_session(student["id"])
        password_hash = db.execute("SELECT password_hash FROM users WHERE id=%s", (student["id"],)).fetchone()["password_hash"]
    return {"units": units, "manager": manager, "manager_headers": manager_headers, "student": student, "student_headers": {"Authorization": "Bearer " + token}, "password_hash": password_hash, "classroom": classroom}


def test_deactivation_detaches_students_managers_and_contexts_atomically(client, admin_headers, setup_deactivation, db_url):
    setup = setup_deactivation
    unit = setup["units"][0]
    response = client.patch(f"/api/admin/schools/{unit['id']}/deactivate", headers=admin_headers, json={"confirm": True})
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["unidade"]["active"] is False and result["unidade"]["deactivated_at"]
    assert result["alunos_desvinculados"] == 1 and result["gestores_desvinculados"] == 1
    detail = client.get(f"/api/admin/users/{setup['student']['id']}", headers=admin_headers).json()["usuario"]
    assert detail["school_id"] is None and detail["class_id"] is None and detail["linked_schools"] == []
    student = client.get("/api/auth/me", headers=setup["student_headers"]).json()["usuario"]
    assert student["active"] is True and student["escola"] == "" and student["turma"] == "" and student["xp"] == 725
    for headers in [admin_headers, setup["manager_headers"]]:
        context = client.get("/api/school-context", headers=headers).json()
        assert context["unidade"] is None
        assert {item["id"] for item in context["unidades"]} == {setup["units"][1]["id"]}
        assert client.post("/api/school-context", headers=headers, json={"school_id": unit["id"]}).status_code == 404
        assert client.get("/api/school-management/classes", headers=headers).status_code == 409
    manager = client.get(f"/api/admin/users/{setup['manager']['usuario']['id']}", headers=admin_headers).json()["usuario"]
    assert manager["linked_schools"] == [{"id": setup["units"][1]["id"], "name": setup["units"][1]["name"]}]
    units = client.get("/api/admin/schools", headers=admin_headers).json()["unidades"]
    assert next(item for item in units if item["id"] == unit["id"])["active"] is False
    with connection(db_url) as db:
        assert db.execute("SELECT COUNT(*) AS n FROM school_classes WHERE id=%s", (setup["classroom"]["id"],)).fetchone()["n"] == 1
        assert db.execute("SELECT password_hash FROM users WHERE id=%s", (setup["student"]["id"],)).fetchone()["password_hash"] == setup["password_hash"]
        archived = db.execute("SELECT student_links,manager_ids FROM school_deactivations WHERE school_id=%s", (unit["id"],)).fetchone()
        assert archived["student_links"][0]["registration_number"] == "000123"
        assert archived["student_links"][0]["class_id"] == setup["classroom"]["id"]
        assert archived["manager_ids"] == [setup["manager"]["usuario"]["id"]]
    repeat = client.patch(f"/api/admin/schools/{unit['id']}/deactivate", headers=admin_headers, json={"confirm": True})
    assert repeat.status_code == 200 and repeat.json()["alunos_desvinculados"] == 0
    with connection(db_url) as db:
        assert db.execute("SELECT COUNT(*) AS n FROM school_deactivations WHERE school_id=%s", (unit["id"],)).fetchone()["n"] == 1


@pytest.mark.parametrize("body", [{}, {"confirm": False}, {"confirm": 1}, {"confirm": "true"}, {"confirm": True, "school_id": 999}])
def test_requires_explicit_confirmation_without_partial_changes(client, admin_headers, setup_deactivation, body):
    setup = setup_deactivation
    unit = setup["units"][0]
    assert client.patch(f"/api/admin/schools/{unit['id']}/deactivate", headers=admin_headers, json=body).status_code == 400
    detail = client.get(f"/api/admin/schools/{unit['id']}", headers=admin_headers).json()["unidade"]
    assert detail["active"] is True and detail["gestores"][0]["authorized"] is True
    student = client.get(f"/api/admin/users/{setup['student']['id']}", headers=admin_headers).json()["usuario"]
    assert student["school_id"] == unit["id"] and student["class_id"] == setup["classroom"]["id"]


def test_inactive_school_is_read_only_and_cannot_receive_students(client, admin_headers, setup_deactivation):
    setup = setup_deactivation
    unit = setup["units"][0]
    assert client.patch(f"/api/admin/schools/{unit['id']}/deactivate", headers=admin_headers, json={"confirm": True}).status_code == 200
    assert client.get(f"/api/admin/schools/{unit['id']}", headers=admin_headers).status_code == 200
    assert client.patch(f"/api/admin/schools/{unit['id']}", headers=admin_headers, json={"name": "Outra", "manager_ids": [setup["manager"]["usuario"]["id"]]}).status_code == 400
    assert client.patch(f"/api/admin/users/{setup['student']['id']}", headers=admin_headers, json={"school_id": unit["id"], "registration_number": "000123"}).status_code == 404


def test_deactivation_permission_is_separate_from_editing(client, admin_headers, setup_deactivation, db_url):
    setup = setup_deactivation
    unit = setup["units"][0]
    assert client.patch(f"/api/admin/schools/{unit['id']}/deactivate", headers=setup["manager_headers"], json={"confirm": True}).status_code == 403
    profile = client.post("/api/admin/profiles", headers=admin_headers, json={"name": "Editor sem desativacao", "base_role": "ADMIN", "permissions": ["institutions.read", "institutions.update"]}).json()["perfil"]
    with connection(db_url) as db:
        actor = Service(db).register({"nome": "Editor", "email": "editordesativacao@example.com", "senha": "segredo123"})
        db.execute("UPDATE users SET role='ADMIN',access_profile_id=%s WHERE id=%s", (profile["id"], actor["usuario"]["id"]))
    headers = {"Authorization": "Bearer " + actor["token"]}
    assert client.patch(f"/api/admin/schools/{unit['id']}/deactivate", headers=headers, json={"confirm": True}).status_code == 403


def test_reactivate_without_managers_does_not_restore_old_links(client, admin_headers, setup_deactivation, db_url):
    setup = setup_deactivation
    unit = setup["units"][0]
    path = f"/api/admin/schools/{unit['id']}"
    assert client.patch(path + "/deactivate", headers=admin_headers, json={"confirm": True}).status_code == 200
    result = client.patch(path + "/reactivate", headers=admin_headers, json={"confirm": True})
    assert result.status_code == 200, result.text
    active = result.json()["unidade"]
    assert active["active"] is True and active["deactivated_at"] is None
    assert all(link["authorized"] is False for link in active["gestores"])
    student_path = f"/api/admin/users/{setup['student']['id']}"
    assert client.get(student_path, headers=admin_headers).json()["usuario"]["school_id"] is None
    assert client.post("/api/school-context", headers=setup["manager_headers"], json={"school_id": unit["id"]}).status_code == 404
    assert client.post("/api/school-context", headers=admin_headers, json={"school_id": unit["id"]}).status_code == 200
    assert client.get("/api/school-management/classes", headers=admin_headers).json()["turmas"][0]["id"] == setup["classroom"]["id"]
    assert client.get("/api/school-management/students", headers=admin_headers).json()["alunos"] == []
    # Reassignment is explicit, and retrying activation must preserve those new links.
    assert client.patch(path, headers=admin_headers, json={"name": unit["name"], "manager_ids": [setup["manager"]["usuario"]["id"]]}).status_code == 200
    assert client.patch(student_path, headers=admin_headers, json={"school_id": unit["id"], "registration_number": "000123"}).status_code == 200
    repeated = client.patch(path + "/reactivate", headers=admin_headers, json={"confirm": True})
    assert repeated.status_code == 200 and repeated.json()["unidade"]["gestores"][0]["authorized"] is True
    assert client.get(student_path, headers=admin_headers).json()["usuario"]["school_id"] == unit["id"]
    with connection(db_url) as db:
        assert db.execute("SELECT COUNT(*) AS n FROM school_deactivations WHERE school_id=%s", (unit["id"],)).fetchone()["n"] == 1


def test_reactivation_requires_confirmation_and_edit_permission(client, admin_headers, setup_deactivation, db_url):
    setup = setup_deactivation
    unit = setup["units"][0]
    path = f"/api/admin/schools/{unit['id']}"
    client.patch(path + "/deactivate", headers=admin_headers, json={"confirm": True})
    for body in [{}, {"confirm": False}, {"confirm": 1}, {"confirm": True, "manager_ids": []}]:
        assert client.patch(path + "/reactivate", headers=admin_headers, json=body).status_code == 400
    assert client.patch(path + "/reactivate", headers=setup["manager_headers"], json={"confirm": True}).status_code == 403
    profile = client.post("/api/admin/profiles", headers=admin_headers, json={"name": "Consulta sem reativacao", "base_role": "ADMIN", "permissions": ["institutions.read"]}).json()["perfil"]
    with connection(db_url) as db:
        actor = Service(db).register({"nome": "Leitor", "email": "leitorreativacao@example.com", "senha": "segredo123"})
        db.execute("UPDATE users SET role='ADMIN',access_profile_id=%s WHERE id=%s", (profile["id"], actor["usuario"]["id"]))
    headers = {"Authorization": "Bearer " + actor["token"]}
    assert client.patch(path + "/reactivate", headers=headers, json={"confirm": True}).status_code == 403
    assert client.get(path, headers=admin_headers).json()["unidade"]["active"] is False


def test_reactivate_school_that_never_had_a_manager(client, admin_headers):
    unit = client.post("/api/admin/schools", headers=admin_headers, json={"name": "Sem gestores", "manager_ids": []}).json()["unidade"]
    path = f"/api/admin/schools/{unit['id']}"
    assert client.patch(path + "/deactivate", headers=admin_headers, json={"confirm": True}).status_code == 200
    result = client.patch(path + "/reactivate", headers=admin_headers, json={"confirm": True})
    assert result.status_code == 200 and result.json()["unidade"]["active"] is True
    assert result.json()["unidade"]["gestores"] == []
