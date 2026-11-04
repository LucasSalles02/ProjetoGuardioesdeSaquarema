import pytest

from gds.database import connection


@pytest.mark.parametrize("actor", ["anonymous", "user", "admin"])
def test_public_registration_is_disabled(client, auth_headers, admin_headers, db_url, actor):
    headers = {"anonymous": {}, "user": auth_headers, "admin": admin_headers}[actor]
    with connection(db_url) as db:
        before = {table: db.execute(f"SELECT COUNT(*) AS n FROM {table}").fetchone()["n"]
                  for table in ["users", "sessions", "registration_requests"]}
    result = client.post("/api/auth/register", headers=headers, json={
        "nome": "Cadastro Externo", "username": "externo", "email": "externo@example.com",
        "cpf": "01234567890", "birth_date": "01/01/2000", "role": "ADMIN",
    })
    assert result.status_code == 403
    assert "administrador" in result.json()["erro"]
    assert "token" not in result.json()
    with connection(db_url) as db:
        for table, count in before.items():
            assert db.execute(f"SELECT COUNT(*) AS n FROM {table}").fetchone()["n"] == count


@pytest.mark.parametrize("method,path", [
    ("GET", "/api/admin/registration-requests"),
    ("POST", "/api/admin/registration-requests/missing/approve"),
    ("POST", "/api/admin/registration-requests/missing/reject"),
])
def test_request_moderation_is_removed(client, admin_headers, method, path):
    assert client.request(method, path, headers=admin_headers).status_code == 404


def test_administrator_can_still_create_user(client, admin_headers, db_url):
    data = {"nome": "Aluno Administrado", "username": "aluno.admin", "email": "novo@example.com",
            "cpf": "01234567890", "birth_date": "01/01/2000", "role": "USER"}
    result = client.post("/api/admin/users", headers=admin_headers, json=data)
    assert result.status_code == 200
    user = result.json()["usuario"]
    assert user["must_change_password"] is True
    assert user["cpf"] == data["cpf"]
    with connection(db_url) as db:
        assert db.execute("SELECT COUNT(*) AS n FROM registration_requests").fetchone()["n"] == 0
    login = client.post("/api/auth/login", json={"email": data["email"], "senha": data["cpf"]})
    assert login.status_code == 200
    assert login.json()["usuario"]["id"] == user["id"]
