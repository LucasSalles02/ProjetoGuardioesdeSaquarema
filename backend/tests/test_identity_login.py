from concurrent.futures import ThreadPoolExecutor
import pytest
import psycopg
from gds.admin import provision_admin
from gds.database import connection
from gds.service import Service


def create_student(client, headers, number="00001234", **changes):
    result = client.post("/api/admin/users", headers=headers, json={"nome": "Nome Completo Ficticio", "role": "USER", "registration_number": number, **changes})
    assert result.status_code == 200, result.text
    return result.json()["usuario"]


def test_no_username_required_and_enrollment_is_the_student_login(client, admin_headers):
    account = create_student(client, admin_headers)
    assert account["username"] is None
    result = client.post("/api/auth/login", json={"registration_number": "00001234", "senha": "00001234"})
    assert result.status_code == 200
    assert result.json()["usuario"]["nome"] == "Nome Completo Ficticio"
    assert result.json()["usuario"]["must_change_password"]
    assert client.post("/api/auth/login", json={"registration_number": "1234", "senha": "00001234"}).status_code == 401
    assert client.post("/api/auth/admin/login", json={"registration_number": "00001234", "senha": "00001234"}).status_code == 401


def test_legacy_username_email_and_full_name_are_not_login_identifiers(client, admin_headers):
    account = create_student(client, admin_headers, username="legado.aluno", email="legado@example.com")
    for field, value in [("username", "legado.aluno"), ("email", "legado@example.com"), ("registration_number", "legado.aluno"), ("registration_number", account["nome"])]:
        assert client.post("/api/auth/login", json={field: value, "senha": "00001234"}).status_code == 401
    assert client.post("/api/auth/login", json={"registration_number": "00001234", "senha": "00001234"}).status_code == 200


def test_same_full_names_allowed_but_enrollment_unique_across_schools_and_inactive_accounts(client, admin_headers):
    first = create_student(client, admin_headers)
    second = create_student(client, admin_headers, "00005678")
    assert first["nome"] == second["nome"] and first["id"] != second["id"]
    school = client.post("/api/admin/schools", headers=admin_headers, json={"name": "Outra Unidade", "manager_ids": []}).json()["unidade"]
    assert client.patch(f"/api/admin/users/{first['id']}/deactivate", headers=admin_headers).status_code == 200
    duplicate = client.post("/api/admin/users", headers=admin_headers, json={"nome": "Outro Aluno", "role": "USER", "registration_number": "00001234", "school_id": school["id"]})
    assert duplicate.status_code == 400


def test_staff_cpf_does_not_conflict_with_student_enrollment(client, admin_headers):
    number = "00123456789"
    child = create_student(client, admin_headers, number)
    data = {"nome": "Profissional Ficticio", "cpf": number, "email": "gestor@example.com", "role": "GESTOR_ESCOLAR"}
    staff = client.post("/api/admin/users", headers=admin_headers, json=data)
    assert staff.status_code == 200, staff.text
    assert staff.json()["usuario"]["username"] is None
    student_login = client.post("/api/auth/login", json={"registration_number": number, "senha": number})
    staff_login = client.post("/api/auth/login", json={"cpf": number, "senha": number})
    assert student_login.json()["usuario"]["id"] == child["id"]
    assert staff_login.json()["usuario"]["id"] == staff.json()["usuario"]["id"]
    assert client.post("/api/auth/admin/login", json={"cpf": number, "senha": number}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "gestor@example.com", "senha": number}).status_code == 401


def test_concurrent_registration_cannot_duplicate_login(client, admin_headers):
    payload = {"nome": "Aluno Concorrente", "role": "USER", "registration_number": "00001234"}
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: client.post("/api/admin/users", headers=admin_headers, json=payload), range(2)))
    assert sorted(result.status_code for result in results) == [200, 400]


def test_database_also_rejects_duplicate_enrollment(client, admin_headers, db_url):
    create_student(client, admin_headers)
    with pytest.raises(psycopg.errors.UniqueViolation), connection(db_url) as db:
        other = Service(db).register({"nome": "Outro Aluno", "email": "outro@example.com", "senha": "Pessoal1234"})
        db.execute("UPDATE users SET registration_number='00001234' WHERE id=%s", (other["usuario"]["id"],))


def test_legacy_admin_cpf_completion_preserves_password(client, admin_headers, db_url, monkeypatch):
    with connection(db_url) as db:
        legacy = Service(db).register({"nome": "Administrador Legado", "email": "adminlegado@example.com", "senha": "Pessoal1234"})
        db.execute("UPDATE users SET role='ADMIN' WHERE id=%s", (legacy["usuario"]["id"],))
    for key, value in {"ADMIN_CPF": "88123456789", "ADMIN_EMAIL": "adminlegado@example.com", "ADMIN_NAME": "Administrador Legado", "ADMIN_PASSWORD": "Configurada1234"}.items():
        monkeypatch.setenv("GUARDIOES_DE_SAQUAREMA_" + key, value)
    with connection(db_url) as db:
        provision_admin(db)
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer " + legacy["token"]}).status_code == 401
    login = client.post("/api/auth/admin/login", json={"cpf": "88123456789", "senha": "Pessoal1234"})
    assert login.status_code == 200 and login.json()["usuario"]["id"] == legacy["usuario"]["id"]
    assert client.post("/api/auth/admin/login", json={"cpf": "88123456789", "senha": "Configurada1234"}).status_code == 401
