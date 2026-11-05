from concurrent.futures import ThreadPoolExecutor

import pytest

from gds.database import connection
from gds.service import Service


@pytest.fixture
def school_setup(client, admin_headers, db_url):
    with connection(db_url) as db:
        manager = Service(db).register({"nome": "Gestor Turmas", "email": "gestorturmas@example.com", "senha": "segredo123"})
        db.execute("UPDATE users SET role='GESTOR_ESCOLAR',cpf='88123456789' WHERE id=%s", (manager["usuario"]["id"],))
    units = [client.post("/api/admin/schools", headers=admin_headers, json={"name": name, "manager_ids": [manager["usuario"]["id"]]}).json()["unidade"] for name in ["Escola Um", "Escola Dois"]]
    headers = {"Authorization": "Bearer " + manager["token"]}
    assert client.post("/api/school-context", headers=headers, json={"school_id": units[0]["id"]}).status_code == 200
    stages = client.get("/api/school-management/stages", headers=headers).json()["etapas"]
    return {"headers": headers, "units": units, "stages": stages, "manager_id": manager["usuario"]["id"]}


def classroom(client, setup, name="Turma A", stage=None):
    return client.post("/api/school-management/classes", headers=setup["headers"], json={"identification": name, "stage_id": stage or setup["stages"][0]["id"]})


def student(client, admin_headers, school_id, suffix="one", **changes):
    return client.post("/api/admin/users", headers=admin_headers, json={"nome": "Aluno " + suffix, "username": "student_" + suffix, "email": suffix + "@example.com", "role": "USER", "cpf": {"one": "00123456789", "two": "11123456789", "three": "22123456789"}[suffix], "birth_date": "01/01/2015", "school_id": school_id, "registration_number": "000" + suffix, **changes})


def test_default_stages_and_stage_management(client, admin_headers, school_setup):
    stages = client.get("/api/admin/school-stages", headers=admin_headers).json()["etapas"]
    assert [s["name"] for s in stages] == ["2º ano", "3º ano", "4º ano", "5º ano", "6º ano"]
    created = client.post("/api/admin/school-stages", headers=admin_headers, json={"name": "7º ano", "sort_order": 7, "active": True})
    assert created.status_code == 200
    stage = created.json()["etapa"]
    assert classroom(client, school_setup, stage=stage["id"]).status_code == 200
    assert client.patch(f"/api/admin/school-stages/{stage['id']}", headers=admin_headers, json={"name": stage["name"], "sort_order": 7, "active": False}).status_code == 200
    assert classroom(client, school_setup, "Turma B", stage["id"]).status_code == 400
    existing = client.get("/api/school-management/classes", headers=school_setup["headers"]).json()["turmas"][0]
    assert existing["stage_name"] == "7º ano" and existing["stage_active"] is False
    assert client.patch(f"/api/school-management/classes/{existing['id']}", headers=school_setup["headers"], json={"identification": "Turma Renomeada", "stage_id": stage["id"]}).status_code == 200
    assert stage["id"] not in [s["id"] for s in client.get("/api/school-management/stages", headers=school_setup["headers"]).json()["etapas"]]
    assert client.post("/api/admin/school-stages", headers=school_setup["headers"], json={"name": "Outra"}).status_code == 403


def test_classes_bound_to_current_unit_and_stage(client, school_setup):
    setup, headers = school_setup, school_setup["headers"]
    first = classroom(client, setup)
    assert first.status_code == 200, first.text
    item = first.json()["turma"]
    assert item["school_id"] == setup["units"][0]["id"]
    assert classroom(client, setup, " TURMA   A ").status_code == 400
    assert client.post("/api/school-management/classes", headers=headers, json={"identification": "Forjada", "stage_id": setup["stages"][0]["id"], "school_id": setup["units"][1]["id"]}).status_code == 400
    assert client.post("/api/school-context", headers=headers, json={"school_id": setup["units"][1]["id"]}).status_code == 200
    assert client.get("/api/school-management/classes", headers=headers).json()["turmas"] == []
    assert classroom(client, setup).status_code == 200  # Same identification is valid in another unit.
    assert client.patch(f"/api/school-management/classes/{item['id']}", headers=headers, json={"identification": "Intrusao", "stage_id": setup["stages"][0]["id"]}).status_code == 404


def test_membership_single_class_and_progress_preserved(client, admin_headers, school_setup, db_url):
    setup, headers = school_setup, school_setup["headers"]
    created = student(client, admin_headers, setup["units"][0]["id"])
    assert created.status_code == 200, created.text
    account = created.json()["usuario"]
    a, b = classroom(client, setup).json()["turma"], classroom(client, setup, "Turma B").json()["turma"]
    path = f"/api/school-management/students/{account['id']}/class"
    with connection(db_url) as db:
        db.execute("UPDATE stats SET xp=725,missoes_concluidas=3 WHERE user_id=%s", (account["id"],))
    for class_id in [a["id"], b["id"], b["id"]]:
        result = client.patch(path, headers=headers, json={"class_id": class_id})
        assert result.status_code == 200, result.text
        assert result.json()["aluno"]["class_id"] == class_id
    listed = client.get("/api/school-management/students", headers=headers).json()["alunos"]
    assert len(listed) == 1 and listed[0]["class_name"] == "Turma B"
    detail = client.get(f"/api/admin/users/{account['id']}", headers=admin_headers).json()["usuario"]
    assert detail["linked_schools"] == [{"id": setup["units"][0]["id"], "name": "Escola Um"}]
    assert detail["registration_number"] == "000one" and detail["class_name"] == "Turma B"
    with connection(db_url) as db:
        assert db.execute("SELECT COUNT(*) AS n FROM student_school_memberships WHERE student_id=%s", (account["id"],)).fetchone()["n"] == 1
        assert db.execute("SELECT COUNT(*) AS n FROM class_enrollment_events WHERE student_id=%s", (account["id"],)).fetchone()["n"] == 2
        assert db.execute("SELECT xp FROM stats WHERE user_id=%s", (account["id"],)).fetchone()["xp"] == 725
        current_user = Service(db).user(account["id"])
        assert current_user["escola"] == "Escola Um" and current_user["turma"] == "Turma B"
    report = client.get(f"/api/school-management/students/{account['id']}/progress", headers=headers)
    assert report.status_code == 200 and report.json()["progresso"]["xp"] == 725
    assert report.json()["progresso"]["level"] == 7
    assert len(report.json()["progresso"]["achievements"]) == 7
    summary = client.get(f"/api/school-management/classes/{b['id']}/summary", headers=headers).json()["resumo"]
    assert summary["student_count"] == 1 and summary["total_xp"] == 725 and summary["average_xp"] == 725
    assert client.patch(path, headers=headers, json={"class_id": a["id"], "xp": 0}).status_code == 400


def test_no_cross_unit_students_or_classes_even_if_manager_authorized_to_both(client, admin_headers, school_setup):
    setup, headers = school_setup, school_setup["headers"]
    local = student(client, admin_headers, setup["units"][0]["id"]).json()["usuario"]
    other = student(client, admin_headers, setup["units"][1]["id"], "two").json()["usuario"]
    local_class = classroom(client, setup).json()["turma"]
    client.post("/api/school-context", headers=headers, json={"school_id": setup["units"][1]["id"]})
    other_class = classroom(client, setup).json()["turma"]
    client.post("/api/school-context", headers=headers, json={"school_id": setup["units"][0]["id"]})
    assert [s["id"] for s in client.get("/api/school-management/students", headers=headers).json()["alunos"]] == [local["id"]]
    assert client.patch(f"/api/school-management/students/{other['id']}/class", headers=headers, json={"class_id": local_class["id"]}).status_code == 404
    assert client.patch(f"/api/school-management/students/{local['id']}/class", headers=headers, json={"class_id": other_class["id"]}).status_code == 404
    assert client.get(f"/api/school-management/students/{other['id']}/progress", headers=headers).status_code == 404
    assert client.get(f"/api/school-management/classes/{other_class['id']}/summary", headers=headers).status_code == 404


def test_admin_school_transfer_removes_old_class_and_preserves_history(client, admin_headers, school_setup):
    setup, headers = school_setup, school_setup["headers"]
    account = student(client, admin_headers, setup["units"][0]["id"]).json()["usuario"]
    group = classroom(client, setup).json()["turma"]
    client.patch(f"/api/school-management/students/{account['id']}/class", headers=headers, json={"class_id": group["id"]})
    updated = client.patch(f"/api/admin/users/{account['id']}", headers=admin_headers, json={"school_id": setup["units"][1]["id"], "registration_number": "0002"})
    assert updated.status_code == 200, updated.text
    assert updated.json()["usuario"]["class_id"] is None
    assert client.get("/api/school-management/students", headers=headers).json()["alunos"] == []
    assert client.get(f"/api/school-management/students/{account['id']}/progress", headers=headers).status_code == 404
    client.post("/api/school-context", headers=headers, json={"school_id": setup["units"][1]["id"]})
    assert client.get("/api/school-management/students", headers=headers).json()["alunos"][0]["registration_number"] == "0002"


def test_manager_units_visible_to_admin(client, admin_headers, school_setup):
    account = client.get(f"/api/admin/users/{school_setup['manager_id']}", headers=admin_headers).json()["usuario"]
    assert {s["id"] for s in account["linked_schools"]} == {s["id"] for s in school_setup["units"]}


@pytest.mark.parametrize("body", [{"identification": "", "stage_id": 1}, {"identification": "AA", "stage_id": "missing"}, {"identification": "AA", "stage_id": None}, {"identification": "AA", "stage_id": 1, "school_id": 999}])
def test_invalid_classes_rollback(client, school_setup, body):
    assert client.post("/api/school-management/classes", headers=school_setup["headers"], json=body).status_code in [400, 404]
    assert client.get("/api/school-management/classes", headers=school_setup["headers"]).json()["turmas"] == []


def test_concurrent_assignments_preserve_one_class(client, admin_headers, school_setup, db_url):
    setup, headers = school_setup, school_setup["headers"]
    account = student(client, admin_headers, setup["units"][0]["id"]).json()["usuario"]
    groups = [classroom(client, setup, name).json()["turma"] for name in ["A1", "A2"]]
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda c: client.patch(f"/api/school-management/students/{account['id']}/class", headers=headers, json={"class_id": c["id"]}), groups))
    assert all(result.status_code == 200 for result in results)
    with connection(db_url) as db:
        membership = db.execute("SELECT class_id FROM student_school_memberships WHERE student_id=%s", (account["id"],)).fetchall()
        assert len(membership) == 1 and membership[0]["class_id"] in [c["id"] for c in groups]


def test_no_implicit_membership_from_school_text_or_public_registration(client, admin_headers, school_setup):
    setup, headers = school_setup, school_setup["headers"]
    account = student(client, admin_headers, None, escola="Escola Um", registration_number="000one").json()["usuario"]
    assert account["linked_schools"] == []
    assert client.get("/api/school-management/students", headers=headers).json()["alunos"] == []
    assert client.post("/api/admin/users", headers=headers, json={}).status_code == 403
    assert client.post("/api/auth/register", headers=headers, json={}).status_code == 403


def test_missing_scope_and_read_only_profile_are_enforced(client, admin_headers, school_setup, db_url):
    setup, headers = school_setup, school_setup["headers"]
    profile = client.post("/api/admin/profiles", headers=admin_headers, json={"name": "Gestor consulta", "base_role": "GESTOR_ESCOLAR", "permissions": ["school_units.read", "classes.read", "enrollments.read"]}).json()["perfil"]
    with connection(db_url) as db:
        db.execute("UPDATE users SET access_profile_id=%s WHERE id=%s", (profile["id"], setup["manager_id"]))
    assert client.get("/api/school-management/classes", headers=headers).status_code == 200
    assert classroom(client, setup).status_code == 403
    assert client.patch("/api/school-management/students/missing/class", headers=headers, json={"class_id": 1}).status_code == 403
    new_session = client.post("/api/auth/login", json={"cpf": "88123456789", "senha": "segredo123"}).json()["token"]
    assert client.get("/api/school-management/classes", headers={"Authorization": "Bearer " + new_session}).status_code == 409
