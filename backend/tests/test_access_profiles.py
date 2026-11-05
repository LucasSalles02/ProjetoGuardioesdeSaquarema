import pytest

from gds.database import connection


def create_profile(client, headers, **changes):
    return client.post("/api/admin/profiles", headers=headers, json={
        "name": "Aluno leitor", "description": "Somente consulta de aulas", "base_role": "USER",
        "permissions": ["learning.read"], **changes,
    })


def test_documented_profiles_and_school_boundaries(client, admin_headers):
    result = client.get("/api/admin/profiles", headers=admin_headers)
    assert result.status_code == 200
    profiles = {p["id"]: p for p in result.json()["perfis"]}
    assert set(profiles) == {"ADMIN", "GESTOR_ESCOLAR", "USER"}
    assert profiles["GESTOR_ESCOLAR"]["name"] == "Gestão Escolar"
    grants = profiles["GESTOR_ESCOLAR"]["permissions"]
    assert "classes.create" in grants and "school_progress.reports" in grants
    assert not any(p.startswith(("users.", "mission_admin.", "content.")) for p in grants)
    assert "progress.read" not in grants  # School reports never imply access to another person's own progress.
    assert "missions.submit" in profiles["USER"]["permissions"]
    assert "users.create" in profiles["ADMIN"]["permissions"]
    assert not {"classes.create", "classes.update", "enrollments.update"} & set(profiles["ADMIN"]["permissions"])
    assert {"classes.create", "classes.update", "enrollments.update"} <= set(grants)
    for module in result.json()["modulos"]:
        if module["scope"] == "school" and module["id"] not in ["school_units", "classes", "enrollments", "school_progress"]:
            assert not any(a["implemented"] for a in module["actions"])


@pytest.mark.parametrize("role", ["USER", "GESTOR_ESCOLAR"])
def test_only_admin_manages_profiles(client, account, auth_headers, db_url, role):
    with connection(db_url) as db:
        db.execute("UPDATE users SET role=%s WHERE id=%s", (role, account["usuario"]["id"]))
    assert client.get("/api/admin/profiles", headers=auth_headers).status_code == 403
    assert create_profile(client, auth_headers).status_code == 403


@pytest.mark.parametrize("changes", [
    {"base_role": "GESTOR_ESCOLAR", "permissions": ["mission_admin.create"]},
    {"permissions": ["users.read"]},
    {"permissions": ["learning.complete"]},
    {"base_role": "ADMIN", "permissions": ["users.read", "users.create"]},
    {"permissions": ["unknown.read"]},
    {"permissions": "learning.read"},
    {"base_role": "ADMIN", "permissions": ["classes.read", "classes.create"]},
    {"base_role": "ADMIN", "permissions": ["classes.read", "classes.update"]},
    {"base_role": "ADMIN", "permissions": ["enrollments.read", "classes.read", "enrollments.update"]},
    {"base_role": "GESTOR_ESCOLAR", "permissions": ["school_progress.read"]},
    {"base_role": "GESTOR_ESCOLAR", "permissions": ["school_progress.reports"]},
    {"name": ""},
])
def test_profile_validation_and_privilege_ceiling(client, admin_headers, changes):
    assert create_profile(client, admin_headers, **changes).status_code == 400


def test_system_profiles_are_preserved_and_duplicate_names_rejected(client, admin_headers):
    assert create_profile(client, admin_headers).status_code == 200
    assert create_profile(client, admin_headers, name=" ALUNO LEITOR ").status_code == 400
    result = client.patch("/api/admin/profiles/ADMIN", headers=admin_headers, json={"name": "Renamed", "base_role": "USER", "permissions": []})
    assert result.status_code == 400


def test_assignment_enforcement_and_session_revocation(client, admin_headers, db_url):
    profile = create_profile(client, admin_headers).json()["perfil"]
    data = {"nome": "Aluno Perfil", "username": "perfil.aluno", "email": "perfil@example.com",
            "cpf": "00123456789", "birth_date": "01/02/2000", "role": "USER", "registration_number": "000001", "profile_id": profile["id"]}
    created = client.post("/api/admin/users", headers=admin_headers, json=data)
    assert created.status_code == 200, created.text
    assert created.json()["usuario"]["profile_name"] == profile["name"]
    login = client.post("/api/auth/login", json={"registration_number": data["registration_number"], "senha": data["registration_number"]})
    initial_headers = {"Authorization": "Bearer " + login.json()["token"]}
    password = "NovaSenha12345"
    setup = client.post("/api/auth/first-access/password", headers=initial_headers, json={"novaSenha": password, "confirmarSenha": password})
    headers = {"Authorization": "Bearer " + setup.json()["token"]}
    assert setup.json()["usuario"]["permissions"] == ["learning.read"]
    assert client.get("/api/learning/modules", headers=headers).status_code == 200
    assert client.get("/api/missions", headers=headers).status_code == 403
    assert client.post("/api/learning/modules/vida-marinha/lessons/ecossistemas-costeiros/submit", headers=headers, json={}).status_code == 403
    assert client.get("/api/admin/users", headers=headers).status_code == 403
    result = client.patch(f"/api/admin/profiles/{profile['id']}", headers=admin_headers,
                          json={**profile, "permissions": []})
    assert result.status_code == 200
    assert client.get("/api/auth/me", headers=headers).status_code == 401
    login = client.post("/api/auth/login", json={"registration_number": data["registration_number"], "senha": password})
    assert login.json()["usuario"]["permissions"] == []
    assert client.get("/api/learning/modules", headers={"Authorization": "Bearer " + login.json()["token"]}).status_code == 403
    with connection(db_url) as db:
        assert db.execute("SELECT role FROM users WHERE id=%s", (created.json()["usuario"]["id"],)).fetchone()["role"] == "USER"


def test_custom_admin_cannot_bypass_actions_or_replace_last_full_admin(client, admin_headers, account, db_url):
    profile = create_profile(client, admin_headers, name="Consulta administrativa", base_role="ADMIN", permissions=["users.read"]).json()["perfil"]
    data = {"nome": "Consulta", "username": "consulta", "email": "consulta@example.com", "cpf": "11234567890", "birth_date": "01/01/2000", "role": "ADMIN", "profile_id": profile["id"]}
    created = client.post("/api/admin/users", headers=admin_headers, json=data)
    assert created.status_code == 200
    with connection(db_url) as db:
        db.execute("UPDATE users SET must_change_password=FALSE WHERE id=%s", (created.json()["usuario"]["id"],))
        from gds.service import Service
        token = Service(db).create_session(created.json()["usuario"]["id"])
    headers = {"Authorization": "Bearer " + token}
    assert client.get("/api/admin/users", headers=headers).status_code == 200
    assert client.post("/api/admin/users", headers=headers, json=data).status_code == 403
    assert client.get("/api/admin/content", headers=headers).status_code == 403
    own_edit = client.patch(f"/api/admin/users/{account['usuario']['id']}", headers=admin_headers,
                           json={"profile_id": profile["id"], "role": "ADMIN"})
    assert own_edit.status_code == 400


def test_limited_admin_cannot_delegate_or_reset_superior_profile(client, admin_headers, account, db_url):
    grants = ["users.read", "users.create", "users.update", "users.reset", "users.deactivate", "profiles.read", "profiles.create"]
    profile = create_profile(client, admin_headers, name="Administrador limitado", base_role="ADMIN", permissions=grants).json()["perfil"]
    data = {"nome": "Limitado", "username": "limitado", "email": "limitado@example.com", "cpf": "21234567890", "birth_date": "01/01/2000", "role": "ADMIN", "profile_id": profile["id"]}
    created = client.post("/api/admin/users", headers=admin_headers, json=data).json()["usuario"]
    with connection(db_url) as db:
        db.execute("UPDATE users SET must_change_password=FALSE WHERE id=%s", (created["id"],))
        from gds.service import Service
        token = Service(db).create_session(created["id"])
    headers = {"Authorization": "Bearer " + token}
    assert create_profile(client, headers, name="Escalada", base_role="ADMIN", permissions=["content.read"]).status_code == 403
    assert client.post("/api/admin/users", headers=headers, json={**data, "profile_id": "ADMIN"}).status_code == 403
    target = account["usuario"]["id"]
    assert client.post(f"/api/admin/users/{target}/reset-password", headers=headers).status_code == 403
    assert client.patch(f"/api/admin/users/{target}/deactivate", headers=headers).status_code == 403
