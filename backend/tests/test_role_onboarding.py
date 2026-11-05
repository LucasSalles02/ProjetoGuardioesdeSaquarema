import pytest

from gds.database import connection, migrate
from gds.security import hash_password, token, verify_password
from gds.service import Service


def student(client, headers, **changes):
    payload = {"nome": "Aluno Matricula", "username": "aluno.matricula", "role": "USER", "registration_number": "00001234", **changes}
    result = client.post("/api/admin/users", headers=headers, json=payload)
    assert result.status_code == 200, result.text
    return result.json()["usuario"]


def sign_in(client, registration_number, password):
    return client.post("/api/auth/login", json={"registration_number": registration_number, "senha": password})


def test_student_without_cpf_or_email_and_guardian_privacy(client, admin_headers, db_url):
    contact = {"name": "Responsavel Ficticio", "relationship": "Responsavel legal", "email": "familia@example.com", "phone": "(22) 99999-0000"}
    created = student(client, admin_headers, guardians=[contact])
    assert created["cpf"] is None and created["email"] is None
    assert created["registration_number"] == "00001234" and created["guardians"] == [contact]
    assert created["school_id"] is None  # Enrollment survives temporary lack of a school.
    assert sign_in(client, created["registration_number"], "1234").status_code == 401
    login = sign_in(client, created["registration_number"], "00001234")
    assert login.status_code == 200 and login.json()["usuario"]["must_change_password"]
    assert "guardians" not in login.json()["usuario"]
    headers = {"Authorization": "Bearer " + login.json()["token"]}
    assert client.get(f"/api/admin/users/{created['id']}", headers=headers).status_code == 403
    setup = client.post("/api/auth/first-access/password", headers=headers, json={"novaSenha": "Pessoal1234", "confirmarSenha": "Pessoal1234"})
    assert setup.status_code == 200
    assert client.get(f"/api/admin/users/{created['id']}", headers={"Authorization": "Bearer " + setup.json()["token"]}).status_code == 403
    assert all("guardians" not in row for row in client.get("/api/admin/users", headers=admin_headers).json()["usuarios"])
    with connection(db_url) as db:
        assert db.execute("SELECT COUNT(*) AS n FROM users").fetchone()["n"] == 2  # No account for the guardian.
        row = db.execute("SELECT * FROM users WHERE id=%s", (created["id"],)).fetchone()
        assert verify_password("Pessoal1234", row["password_salt"], row["password_hash"])
        assert row["password_hash"].startswith("scrypt$")


def test_student_reset_uses_enrollment_and_revokes_sessions(client, admin_headers):
    created = student(client, admin_headers)
    login = sign_in(client, created["registration_number"], "00001234").json()
    headers = {"Authorization": "Bearer " + login["token"]}
    assert client.post("/api/auth/first-access/password", headers=headers, json={"novaSenha": "00001234", "confirmarSenha": "00001234"}).status_code == 400
    setup = client.post("/api/auth/first-access/password", headers=headers, json={"novaSenha": "Pessoal1234", "confirmarSenha": "Pessoal1234"}).json()
    assert sign_in(client, created["registration_number"], "Pessoal1234").status_code == 200
    assert client.post(f"/api/admin/users/{created['id']}/reset-password", headers=admin_headers).status_code == 200
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer " + setup["token"]}).status_code == 401
    assert sign_in(client, created["registration_number"], "Pessoal1234").status_code == 401
    assert sign_in(client, created["registration_number"], "00001234").json()["usuario"]["must_change_password"]


def test_edit_enrollment_pending_and_personal_passwords(client, admin_headers):
    created = student(client, admin_headers)
    path = f"/api/admin/users/{created['id']}"
    assert client.patch(path, headers=admin_headers, json={"registration_number": "00005678"}).status_code == 200
    assert sign_in(client, created["registration_number"], "00001234").status_code == 401
    login = sign_in(client, "00005678", "00005678").json()
    setup = client.post("/api/auth/first-access/password", headers={"Authorization": "Bearer " + login["token"]}, json={"novaSenha": "Pessoal1234", "confirmarSenha": "Pessoal1234"})
    assert setup.status_code == 200
    assert client.patch(path, headers=admin_headers, json={"registration_number": "00009999"}).status_code == 200
    assert sign_in(client, "00009999", "Pessoal1234").status_code == 200
    assert sign_in(client, "00009999", "00009999").status_code == 401
    assert client.post(path + "/reset-password", headers=admin_headers).status_code == 200
    assert sign_in(client, "00009999", "00009999").status_code == 200


@pytest.mark.parametrize("role", ["GESTOR_ESCOLAR", "ADMIN"])
def test_staff_require_cpf_and_use_it_for_first_access_and_reset(client, admin_headers, role):
    data = {"nome": "Profissional Ficticio", "username": "profissional", "email": "profissional@example.com", "role": role}
    assert client.post("/api/admin/users", headers=admin_headers, json=data).status_code == 400
    data["cpf"] = "00123456789"
    created = client.post("/api/admin/users", headers=admin_headers, json=data).json()["usuario"]
    path = "/api/auth/admin/login" if role == "ADMIN" else "/api/auth/login"
    login = client.post(path, json={"cpf": "001.234.567-89", "senha": "001.234.567-89"})
    assert login.status_code == 200
    assert client.post(f"/api/admin/users/{created['id']}/reset-password", headers=admin_headers).status_code == 200
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer " + login.json()["token"]}).status_code == 401
    assert client.post(path, json={"cpf": "00123456789", "senha": "00123456789"}).status_code == 200


@pytest.mark.parametrize("changes", [
    {"registration_number": ""}, {"registration_number": 123},
    {"guardians": [{"name": "Contato", "relationship": "Responsavel", "email": "invalido"}]},
    {"guardians": [{"name": "Contato", "relationship": "Responsavel"}]},
    {"guardians": [{"name": "Contato", "relationship": "Responsavel", "cpf": "00123456789"}]},
])
def test_validation_rejects_missing_identity_and_excess_guardian_fields(client, admin_headers, changes):
    result = client.post("/api/admin/users", headers=admin_headers, json={"nome": "Aluno Teste", "username": "aluno.teste", "role": "USER", "registration_number": "00001234", **changes})
    assert result.status_code == 400


def test_legacy_pending_upgrade_and_completed_password_preservation(client, admin_headers, db_url):
    school = client.post("/api/admin/schools", headers=admin_headers, json={"name": "Escola Migracao", "manager_ids": []}).json()["unidade"]
    pending = student(client, admin_headers, school_id=school["id"])
    completed = student(client, admin_headers, username="aluno.pessoal", registration_number="00009999")
    with connection(db_url) as db:
        salt = token()
        db.execute("UPDATE users SET registration_number=NULL,cpf='00123456789',password_salt=%s,password_hash=%s,initial_credential_version=0 WHERE id=%s", (salt, hash_password("00123456789", salt), pending["id"]))
        db.execute("UPDATE users u SET registration_number=m.registration_number FROM student_school_memberships m WHERE m.student_id=u.id AND u.registration_number IS NULL")
        session = Service(db).create_session(pending["id"])
        db.execute("UPDATE users SET must_change_password=FALSE,initial_credential_version=0,password_salt=%s,password_hash=%s WHERE id=%s", (salt, hash_password("Pessoal1234", salt), completed["id"]))
        before = db.execute("SELECT password_hash FROM users WHERE id=%s", (completed["id"],)).fetchone()["password_hash"]
    migrate(db_url)
    migrate(db_url)
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer " + session}).status_code == 401
    assert sign_in(client, pending["registration_number"], "00123456789").status_code == 401
    assert sign_in(client, pending["registration_number"], "00001234").status_code == 200
    assert sign_in(client, completed["registration_number"], "Pessoal1234").status_code == 200
    with connection(db_url) as db:
        assert db.execute("SELECT password_hash FROM users WHERE id=%s", (completed["id"],)).fetchone()["password_hash"] == before


def test_legacy_without_enrollment_cannot_reset_until_corrected(client, admin_headers, db_url):
    with connection(db_url) as db:
        legacy = Service(db).register({"nome": "Legado", "email": "legado2@example.com", "senha": "Pessoal1234"})["usuario"]
        db.execute("UPDATE users SET username='legado' WHERE id=%s", (legacy["id"],))
    path = f"/api/admin/users/{legacy['id']}"
    assert client.post(path + "/reset-password", headers=admin_headers).status_code == 400
    assert sign_in(client, "legado", "Pessoal1234").status_code == 401
    assert client.patch(path, headers=admin_headers, json={"registration_number": "00008888"}).status_code == 200
    assert client.post(path + "/reset-password", headers=admin_headers).status_code == 200
    assert sign_in(client, "00008888", "00008888").status_code == 200
