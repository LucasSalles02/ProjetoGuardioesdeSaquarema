import pytest

from gds.database import connection
from gds.service import Service


@pytest.fixture
def manager_context(client, admin_headers, db_url):
    with connection(db_url) as db:
        manager = Service(db).register({"nome": "Gestor Contexto", "email": "contexto@example.com", "senha": "segredo123"})
        db.execute("UPDATE users SET role='GESTOR_ESCOLAR',cpf='88123456789' WHERE id=%s", (manager["usuario"]["id"],))
    units = []
    for name in ["Escola Azul", "Escola Verde", "Escola Alheia"]:
        result = client.post("/api/admin/schools", headers=admin_headers, json={"name": name, "manager_ids": [manager["usuario"]["id"]] if name != "Escola Alheia" else []})
        assert result.status_code == 200, result.text
        units.append(result.json()["unidade"])
    return manager["usuario"]["id"], {"Authorization": "Bearer " + manager["token"]}, units


def test_manager_must_choose_unit_before_entering(client, manager_context):
    _, headers, units = manager_context
    context = client.get("/api/school-context", headers=headers)
    assert context.status_code == 200
    assert context.json()["unidade"] is None
    assert {row["id"] for row in context.json()["unidades"]} == {units[0]["id"], units[1]["id"]}
    for path in ["/api/school-current", f"/api/school-units/{units[0]['id']}"]:
        result = client.get(path, headers=headers)
        assert result.status_code == 409
        assert result.json()["codigo"] == "UNIDADE_OBRIGATORIA"
    assert client.get("/api/auth/me", headers=headers).status_code == 200
    # An unavailable operation stays forbidden even before school selection.
    assert client.patch("/api/account/profile", headers=headers, json={"nome": "Alteracao"}).status_code == 403


def test_switching_unit_changes_all_current_data_and_rejects_other_unit(client, manager_context):
    _, headers, units = manager_context
    for current, other in [(units[0], units[1]), (units[1], units[0])]:
        chosen = client.post("/api/school-context", headers=headers, json={"school_id": current["id"]})
        assert chosen.status_code == 200
        assert chosen.json()["unidade"]["id"] == current["id"]
        scoped_headers = {**headers, "X-School-Id": str(current["id"])}
        result = client.get("/api/school-current", headers=scoped_headers).json()["unidade"]
        assert result["id"] == current["id"] and result["name"] == current["name"]
        assert client.get(f"/api/school-units/{other['id']}", headers=scoped_headers).status_code == 404
        assert client.get("/api/school-context", headers=headers).json()["unidade"]["id"] == current["id"]
    # Query parameters and a stale header cannot override the server-side selected school.
    stale = client.get("/api/school-current", headers={**headers, "X-School-Id": str(units[0]["id"])}, params={"school_id": units[0]["id"]})
    assert stale.status_code == 409 and stale.json()["codigo"] == "UNIDADE_DESATUALIZADA"
    assert client.get("/api/school-context", headers=headers).json()["unidade"]["id"] == units[1]["id"]


def test_invalid_selection_keeps_previous_school(client, manager_context):
    _, headers, units = manager_context
    assert client.post("/api/school-context", headers=headers, json={"school_id": units[0]["id"]}).status_code == 200
    for payload, status in [({"school_id": units[2]["id"]}, 404), ({"school_id": True}, 400), ({"school_id": []}, 400), ({}, 400), ({"school_id": units[1]["id"], "manager_id": "forged"}, 400)]:
        assert client.post("/api/school-context", headers=headers, json=payload).status_code == status
        assert client.get("/api/school-current", headers=headers).json()["unidade"]["id"] == units[0]["id"]


def test_revocation_clears_selection_and_requires_new_choice(client, admin_headers, manager_context):
    _, headers, units = manager_context
    unit = units[0]
    client.post("/api/school-context", headers=headers, json={"school_id": unit["id"]})
    client.patch(f"/api/admin/schools/{unit['id']}", headers=admin_headers, json={"name": unit["name"], "manager_ids": []})
    assert client.get("/api/school-current", headers=headers).status_code == 409
    context = client.get("/api/school-context", headers=headers).json()
    assert context["unidade"] is None
    assert {row["id"] for row in context["unidades"]} == {units[1]["id"]}
    assert client.post("/api/school-context", headers=headers, json={"school_id": unit["id"]}).status_code == 404


def test_session_selection_is_independent_and_new_login_requires_choice(client, manager_context, db_url):
    manager, headers, units = manager_context
    client.post("/api/school-context", headers=headers, json={"school_id": units[0]["id"]})
    login = client.post("/api/auth/login", json={"cpf": "88123456789", "senha": "segredo123"})
    other_headers = {"Authorization": "Bearer " + login.json()["token"]}
    assert client.get("/api/school-context", headers=other_headers).json()["unidade"] is None
    client.post("/api/school-context", headers=other_headers, json={"school_id": units[1]["id"]})
    assert client.get("/api/school-current", headers=headers).json()["unidade"]["id"] == units[0]["id"]
    assert client.get("/api/school-current", headers=other_headers).json()["unidade"]["id"] == units[1]["id"]
    with connection(db_url) as db:
        selections = db.execute("SELECT school_id FROM sessions WHERE user_id=%s ORDER BY school_id", (manager,)).fetchall()
        assert [row["school_id"] for row in selections] == [units[0]["id"], units[1]["id"]]


def test_students_and_anonymous_cannot_set_context(client, auth_headers):
    for headers in [{}, auth_headers]:
        assert client.get("/api/school-context", headers=headers).status_code in [401, 403]
        assert client.post("/api/school-context", headers=headers, json={"school_id": 1}).status_code in [401, 403]


def test_admin_can_choose_any_unit_without_manager_link(client, admin_headers, manager_context):
    manager_id, manager_headers, units = manager_context
    result = client.get("/api/school-context", headers=admin_headers)
    assert result.status_code == 200
    assert {unit["id"] for unit in result.json()["unidades"]} == {unit["id"] for unit in units}
    assert result.json()["unidade"] is None
    assert client.get("/api/school-management/classes", headers=admin_headers).status_code == 409
    foreign = units[2]
    assert client.post("/api/school-context", headers=manager_headers, json={"school_id": foreign["id"]}).status_code == 404
    assert client.post("/api/school-context", headers=admin_headers, json={"school_id": foreign["id"]}).status_code == 200
    assert client.get("/api/school-current", headers=admin_headers).json()["unidade"]["id"] == foreign["id"]
    stage = client.get("/api/school-management/stages", headers=admin_headers).json()["etapas"][0]
    assert client.post("/api/school-management/classes", headers=admin_headers, json={"identification": "Bloqueada", "stage_id": stage["id"]}).status_code == 403
    assert client.patch(f"/api/admin/schools/{foreign['id']}", headers=admin_headers, json={"name": foreign["name"], "manager_ids": [manager_id]}).status_code == 200
    assert client.post("/api/school-context", headers=manager_headers, json={"school_id": foreign["id"]}).status_code == 200
    created = client.post("/api/school-management/classes", headers=manager_headers, json={"identification": "Gestor A", "stage_id": stage["id"]})
    assert created.status_code == 200, created.text
    classroom = created.json()["turma"]
    assert classroom["school_id"] == foreign["id"]
    assert client.patch(f"/api/school-management/classes/{classroom['id']}", headers=admin_headers, json={"identification": "Admin B", "stage_id": stage["id"]}).status_code == 403
    assert client.get("/api/school-management/classes", headers=admin_headers).json()["turmas"][0]["id"] == classroom["id"]
    assert client.patch(f"/api/school-management/classes/{classroom['id']}", headers=manager_headers, json={"identification": "Gestor B", "stage_id": stage["id"]}).status_code == 200
    student = client.post("/api/admin/users", headers=admin_headers, json={"nome": "Aluno da Unidade", "username": "aluno.unidade", "email": "alunounidade@example.com", "cpf": "00123456789", "birth_date": "01/01/2015", "role": "USER", "school_id": foreign["id"], "registration_number": "0001"})
    assert student.status_code == 200, student.text
    student_id = student.json()["usuario"]["id"]
    assert client.get("/api/school-management/students", headers=admin_headers).json()["alunos"][0]["id"] == student_id
    assert client.patch(f"/api/school-management/students/{student_id}/class", headers=admin_headers, json={"class_id": classroom["id"]}).status_code == 403
    assert client.patch(f"/api/school-management/students/{student_id}/class", headers=manager_headers, json={"class_id": classroom["id"]}).status_code == 200
    assert client.post("/api/school-context", headers=admin_headers, json={"school_id": units[0]["id"]}).status_code == 200
    assert client.get("/api/school-management/classes", headers=admin_headers).json()["turmas"] == []
    assert client.get("/api/school-management/students", headers=admin_headers).json()["alunos"] == []
    stale = client.get("/api/school-management/classes", headers={**admin_headers, "X-School-Id": str(foreign["id"])})
    assert stale.status_code == 409 and stale.json()["codigo"] == "UNIDADE_DESATUALIZADA"
    assert client.patch(f"/api/school-management/students/{student_id}/class", headers=admin_headers, json={"class_id": classroom["id"]}).status_code == 403
    assert client.patch(f"/api/school-management/classes/{classroom['id']}", headers=admin_headers, json={"identification": "Outra Unidade", "stage_id": stage["id"]}).status_code == 403
    assert client.get(f"/api/school-management/classes/{classroom['id']}/summary", headers=admin_headers).status_code == 404


def test_admin_school_context_respects_custom_permissions(client, admin_headers, db_url):
    unit = client.post("/api/admin/schools", headers=admin_headers, json={"name": "Unidade Restrita", "manager_ids": []}).json()["unidade"]
    profile = client.post("/api/admin/profiles", headers=admin_headers, json={"name": "Administrador leitor de turmas", "base_role": "ADMIN", "permissions": ["institutions.read", "classes.read"]}).json()["perfil"]
    with connection(db_url) as db:
        account = Service(db).register({"nome": "Admin Leitor", "email": "adminleitor@example.com", "senha": "segredo123"})
        db.execute("UPDATE users SET role='ADMIN',access_profile_id=%s WHERE id=%s", (profile["id"], account["usuario"]["id"]))
    headers = {"Authorization": "Bearer " + account["token"]}
    assert client.post("/api/school-context", headers=headers, json={"school_id": unit["id"]}).status_code == 200
    assert client.get("/api/school-management/classes", headers=headers).status_code == 200
    assert client.post("/api/school-management/classes", headers=headers, json={"identification": "Bloqueada", "stage_id": 1}).status_code == 403
    assert client.get("/api/school-management/students", headers=headers).status_code == 403
    with connection(db_url) as db:
        db.execute("UPDATE access_profiles SET permissions='[\"classes.read\"]'::jsonb WHERE id=%s", (profile["id"],))
    assert client.get("/api/school-context", headers=headers).status_code == 403
    assert client.get("/api/school-management/classes", headers=headers).status_code == 403


def test_admin_cannot_write_even_with_obsolete_grants_in_database(client, admin_headers, manager_context, db_url):
    _, manager_headers, units = manager_context
    assert client.post("/api/school-context", headers=manager_headers, json={"school_id": units[0]["id"]}).status_code == 200
    stage = client.get("/api/school-management/stages", headers=manager_headers).json()["etapas"][0]
    classroom = client.post("/api/school-management/classes", headers=manager_headers, json={"identification": "Consulta protegida", "stage_id": stage["id"]}).json()["turma"]
    client.post("/api/school-context", headers=admin_headers, json={"school_id": units[0]["id"]})
    with connection(db_url) as db:
        db.execute("UPDATE access_profiles SET permissions=permissions || '[\"classes.create\",\"classes.update\",\"enrollments.update\"]'::jsonb WHERE id='ADMIN'")
    grants = client.get("/api/auth/me", headers=admin_headers).json()["usuario"]["permissions"]
    assert not {"classes.create", "classes.update", "enrollments.update"} & set(grants)
    assert client.get("/api/school-management/classes", headers=admin_headers).status_code == 200
    assert client.post("/api/school-management/classes", headers=admin_headers, json={"identification": "Bloqueada", "stage_id": stage["id"]}).status_code == 403
    assert client.patch(f"/api/school-management/classes/{classroom['id']}", headers=admin_headers, json={"identification": "Bloqueada", "stage_id": stage["id"]}).status_code == 403
    assert client.patch("/api/school-management/students/missing/class", headers=admin_headers, json={"class_id": classroom["id"]}).status_code == 403
