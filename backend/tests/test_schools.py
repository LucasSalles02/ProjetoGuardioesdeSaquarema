import pytest

from gds.database import connection
from gds.service import Service


def actor(db_url, role, suffix):
    with connection(db_url) as db:
        result = Service(db).register({"nome": "Gestor " + suffix, "email": suffix + "@example.com", "senha": "segredo123"})
        db.execute("UPDATE users SET role=%s WHERE id=%s", (role, result["usuario"]["id"]))
    return result["usuario"]["id"], {"Authorization": "Bearer " + result["token"]}


def create_school(client, admin_headers, name="Escola do Mar", managers=None):
    return client.post("/api/admin/schools", headers=admin_headers, json={"name": name, "manager_ids": managers or []})


def test_school_fields_managers_and_scoped_home(client, admin_headers, db_url):
    manager, headers = actor(db_url, "GESTOR_ESCOLAR", "first")
    second, second_headers = actor(db_url, "GESTOR_ESCOLAR", "second")
    first = create_school(client, admin_headers, managers=[manager, second])
    assert first.status_code == 200, first.text
    unit = first.json()["unidade"]
    assert isinstance(unit["id"], int) and unit["name"] == "Escola do Mar"
    assert len(unit["gestores"]) == 2
    assert all(isinstance(link["id"], int) and link["authorized"] is True for link in unit["gestores"])
    third = create_school(client, admin_headers, "Escola da Praia", [manager]).json()["unidade"]
    other = create_school(client, admin_headers, "Outra Escola").json()["unidade"]
    mine = client.get("/api/school-units", headers=headers).json()["unidades"]
    assert {row["id"] for row in mine} == {unit["id"], third["id"]}
    spoofed = client.get("/api/school-units", headers=headers, params={"manager_id": second}).json()["unidades"]
    assert {row["id"] for row in spoofed} == {unit["id"], third["id"]}
    assert {row["id"] for row in client.get("/api/school-units", headers=second_headers).json()["unidades"]} == {unit["id"]}
    assert all(set(row) == {"id", "name", "link_id", "authorized"} for row in mine)
    assert client.post("/api/school-context", headers=headers, json={"school_id": unit["id"]}).status_code == 200
    assert client.get(f"/api/school-units/{unit['id']}", headers=headers).status_code == 200
    assert client.get(f"/api/school-units/{other['id']}", headers=headers).status_code == 404
    assert client.get(f"/api/admin/schools/{other['id']}", headers=headers).status_code == 403
    listed = client.get("/api/admin/schools", headers=admin_headers).json()["unidades"]
    assert next(row for row in listed if row["id"] == unit["id"])["manager_count"] == 2


def test_revoke_and_reauthorize_preserve_link_id(client, admin_headers, db_url):
    manager, headers = actor(db_url, "GESTOR_ESCOLAR", "manager")
    unit = create_school(client, admin_headers, managers=[manager]).json()["unidade"]
    path = f"/api/admin/schools/{unit['id']}"
    revoked = client.patch(path, headers=admin_headers, json={"name": "Escola Renomeada", "manager_ids": []})
    assert revoked.status_code == 200
    assert revoked.json()["unidade"]["gestores"][0]["authorized"] is False
    assert client.get("/api/school-units", headers=headers).json()["unidades"] == []
    assert client.get(f"/api/school-units/{unit['id']}", headers=headers).status_code == 409
    restored = client.patch(path, headers=admin_headers, json={"name": "Escola Renomeada", "manager_ids": [manager, manager]})
    links = restored.json()["unidade"]["gestores"]
    assert len(links) == 1 and links[0]["id"] == unit["gestores"][0]["id"] and links[0]["authorized"] is True


@pytest.mark.parametrize("payload", [{"name": ""}, {"name": "x"}, {"name": "x" * 161}, {"name": 7}, {"name": "Unidade", "manager_ids": "all"}, {"name": "Unidade", "manager_ids": [3]}, {"name": "Unidade", "manager_ids": ["missing"]}, {"name": "Unidade", "id": 88}])
def test_invalid_unit_input_is_rejected(client, admin_headers, payload):
    assert client.post("/api/admin/schools", headers=admin_headers, json=payload).status_code == 400
    assert client.get("/api/admin/schools", headers=admin_headers).json()["unidades"] == []


def test_duplicate_name_and_invalid_managers_roll_back(client, admin_headers, account, db_url):
    manager, _ = actor(db_url, "GESTOR_ESCOLAR", "manager")
    unit = create_school(client, admin_headers, managers=[manager]).json()["unidade"]
    assert create_school(client, admin_headers, "  ESCOLA   DO MAR ").status_code == 400
    student, _ = actor(db_url, "USER", "student")
    assert create_school(client, admin_headers, "Nova Unidade", [student]).status_code == 400
    assert create_school(client, admin_headers, "Nova Unidade", [account["usuario"]["id"]]).status_code == 400
    path = f"/api/admin/schools/{unit['id']}"
    assert client.patch(path, headers=admin_headers, json={"name": "Alteracao Invalida", "manager_ids": ["missing"]}).status_code == 400
    result = client.get(path, headers=admin_headers).json()["unidade"]
    assert result["name"] == unit["name"] and result["gestores"][0]["authorized"] is True


@pytest.mark.parametrize("role", ["USER", "GESTOR_ESCOLAR"])
def test_non_admin_cannot_manage_units(client, admin_headers, db_url, role):
    _, headers = actor(db_url, role, "other")
    unit = create_school(client, admin_headers).json()["unidade"]
    for path in ["/api/admin/schools", "/api/admin/schools/managers", f"/api/admin/schools/{unit['id']}"]:
        assert client.get(path, headers=headers).status_code == 403
    assert create_school(client, headers).status_code == 403
    assert client.patch(f"/api/admin/schools/{unit['id']}", headers=headers, json={"name": "Mudou", "manager_ids": []}).status_code == 403
    if role == "USER":
        assert client.get("/api/school-units", headers=headers).status_code == 403


def test_role_change_and_deactivation_revoke_authorization(client, admin_headers, db_url):
    manager, headers = actor(db_url, "GESTOR_ESCOLAR", "manager")
    second, _ = actor(db_url, "GESTOR_ESCOLAR", "second")
    unit = create_school(client, admin_headers, managers=[manager, second]).json()["unidade"]
    result = client.patch(f"/api/admin/users/{manager}", headers=admin_headers, json={"nome": "Ex Gestor", "username": "exgestor", "email": "manager@example.com", "cpf": "01234567890", "birth_date": "01/01/2000", "role": "USER", "registration_number": "000exgestor"})
    assert result.status_code == 200, result.text
    assert client.get("/api/school-units", headers=headers).status_code == 401
    assert client.patch(f"/api/admin/users/{second}/deactivate", headers=admin_headers).status_code == 200
    detail = client.get(f"/api/admin/schools/{unit['id']}", headers=admin_headers).json()["unidade"]
    assert all(link["authorized"] is False for link in detail["gestores"])
    assert create_school(client, admin_headers, "Inativa", [second]).status_code == 400


def test_permission_required_in_addition_to_school_link(client, admin_headers, db_url):
    manager, headers = actor(db_url, "GESTOR_ESCOLAR", "limited")
    profile = client.post("/api/admin/profiles", headers=admin_headers, json={"name": "Gestor sem unidades", "base_role": "GESTOR_ESCOLAR", "permissions": []}).json()["perfil"]
    create_school(client, admin_headers, managers=[manager])
    with connection(db_url) as db:
        db.execute("UPDATE users SET access_profile_id=%s WHERE id=%s", (profile["id"], manager))
    assert client.get("/api/school-units", headers=headers).status_code == 403
    admin_profile = client.post("/api/admin/profiles", headers=admin_headers, json={"name": "Consulta de unidades", "base_role": "ADMIN", "permissions": ["institutions.read", "institutions.create"]}).json()["perfil"]
    limited, limited_headers = actor(db_url, "ADMIN", "limitedadmin")
    with connection(db_url) as db:
        db.execute("UPDATE users SET access_profile_id=%s WHERE id=%s", (admin_profile["id"], limited))
    assert create_school(client, limited_headers, "Consulta", [manager]).status_code == 403
    assert create_school(client, limited_headers, "Unidade sem gestores").status_code == 200


def test_admin_can_delegate_school_reader_without_becoming_manager(client, admin_headers):
    profile = client.post("/api/admin/profiles", headers=admin_headers, json={"name": "Gestor de unidades", "base_role": "GESTOR_ESCOLAR", "permissions": ["school_units.read"]})
    assert profile.status_code == 200, profile.text
    assert client.get("/api/school-units", headers=admin_headers).status_code == 403


def test_school_access_requires_authentication(client):
    assert client.get("/api/school-units").status_code == 401
    assert client.get("/api/admin/schools").status_code == 401
    assert client.post("/api/admin/schools", json={"name": "Anonima"}).status_code == 401


@pytest.mark.parametrize("school_id", ["0", "-1", "missing", "99999999999999999999999999999999"])
def test_bad_identifiers_return_404(client, admin_headers, school_id):
    assert client.get(f"/api/admin/schools/{school_id}", headers=admin_headers).status_code == 404
