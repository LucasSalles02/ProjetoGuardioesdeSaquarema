from concurrent.futures import ThreadPoolExecutor
import secrets

import pytest

from gds.database import connection


def request_data(suffix="one"):
    return {"nome": "Solicitante Teste", "username": f"pedido_{suffix}", "email": f"pedido_{suffix}@example.com",
            "cpf": f"{secrets.randbelow(10**11):011d}", "birth_date": "05/03/2015", "turma": "5 Ano", "escola": "Escola Teste"}


def test_public_request_requires_approval_and_initial_cpf_password(client, admin_headers, db_url):
    data = request_data()
    response = client.post("/api/auth/register", json={**data, "role": "ADMIN", "active": True})
    assert response.status_code == 202
    assert response.json()["status"] == "PENDING" and "token" not in response.json()
    assert "CPF" in response.json()["mensagem"]
    assert client.post("/api/auth/login", json={"email": data["cpf"], "senha": data["cpf"]}).status_code == 401
    with connection(db_url) as db:
        assert db.execute("SELECT COUNT(*) AS n FROM users WHERE cpf=%s", (data["cpf"],)).fetchone()["n"] == 0
    pending = client.get("/api/admin/registration-requests", headers=admin_headers).json()["solicitacoes"][0]
    assert pending["birth_date"] == "05/03/2015"
    endpoint = f"/api/admin/registration-requests/{pending['id']}/approve"
    approved = client.post(endpoint, headers=admin_headers, json={"role": "ADMIN"})
    assert approved.status_code == 200, approved.text
    user = approved.json()["usuario"]
    assert user["role"] == "USER" and user["must_change_password"] is True and user["escola"] == "Escola Teste"
    assert client.post(endpoint, headers=admin_headers).json()["usuario"]["id"] == user["id"]
    initial = client.post("/api/auth/login", json={"email": data["cpf"], "senha": data["cpf"]})
    assert initial.status_code == 200
    headers = {"Authorization": f"Bearer {initial.json()['token']}"}
    assert client.get("/api/missions", headers=headers).status_code == 403
    password = secrets.token_hex(16)
    finished = client.post("/api/auth/first-access/password", headers=headers, json={"novaSenha": password, "confirmarSenha": password})
    assert finished.status_code == 200
    assert client.get("/api/missions", headers={"Authorization": f"Bearer {finished.json()['token']}"}).status_code == 200


@pytest.mark.parametrize("role", ["USER", "GESTOR_ESCOLAR"])
def test_only_admin_can_read_approve_or_reject(client, account, auth_headers, db_url, role):
    data = request_data()
    assert client.post("/api/auth/register", json=data).status_code == 202
    with connection(db_url) as db:
        db.execute("UPDATE users SET role=%s WHERE id=%s", (role, account["usuario"]["id"]))
        request_id = db.execute("SELECT id FROM registration_requests").fetchone()["id"]
    for method, path in [("GET", "/api/admin/registration-requests"), ("POST", f"/api/admin/registration-requests/{request_id}/approve"), ("POST", f"/api/admin/registration-requests/{request_id}/reject")]:
        assert client.request(method, path, headers=auth_headers).status_code == 403
        assert client.request(method, path).status_code == 401


def test_reject_preserves_request_without_creating_account_and_allows_resubmission(client, admin_headers, db_url):
    data = request_data()
    assert client.post("/api/auth/register", json=data).status_code == 202
    pending = client.get("/api/admin/registration-requests", headers=admin_headers).json()["solicitacoes"][0]
    result = client.post(f"/api/admin/registration-requests/{pending['id']}/reject", headers=admin_headers, json={"motivo": "Conferir dados com a escola"})
    assert result.status_code == 200 and result.json()["solicitacao"]["status"] == "REJECTED"
    assert client.post(f"/api/admin/registration-requests/{pending['id']}/approve", headers=admin_headers).status_code == 400
    with connection(db_url) as db:
        assert db.execute("SELECT COUNT(*) AS n FROM users WHERE cpf=%s", (data["cpf"],)).fetchone()["n"] == 0
    assert client.post("/api/auth/register", json=data).status_code == 202


def test_validation_duplicate_requests_and_existing_accounts(client, admin_headers):
    data = request_data()
    for override in [{"cpf": "123"}, {"birth_date": "03/15/2015"}, {"birth_date": "31/04/2015"}, {"birth_date": "01/01/9999"},
                     {"username": "bad username"}, {"email": "bad"}, {"senha": "nao-permitida"}]:
        assert client.post("/api/auth/register", json={**data, **override}).status_code == 400
    assert client.post("/api/auth/register", json=data).status_code == 202
    for override in [{}, {"email": "other@example.com", "username": "other_name"}, {"cpf": "00123456789", "username": "other_name"}]:
        assert client.post("/api/auth/register", json={**data, **override}).status_code == 400
    assert client.post("/api/admin/registration-requests/missing/approve", headers=admin_headers).status_code == 404


def test_approval_conflict_rolls_back_review(client, admin_headers):
    data = request_data()
    client.post("/api/auth/register", json=data)
    pending = client.get("/api/admin/registration-requests", headers=admin_headers).json()["solicitacoes"][0]
    assert client.post("/api/admin/users", headers=admin_headers, json={**data, "role": "USER"}).status_code == 200
    assert client.post(f"/api/admin/registration-requests/{pending['id']}/approve", headers=admin_headers).status_code == 400
    assert client.get("/api/admin/registration-requests", headers=admin_headers).json()["solicitacoes"][0]["status"] == "PENDING"


def test_concurrent_approval_creates_only_one_account(client, admin_headers, db_url):
    data = request_data()
    client.post("/api/auth/register", json=data)
    request_id = client.get("/api/admin/registration-requests", headers=admin_headers).json()["solicitacoes"][0]["id"]
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: client.post(f"/api/admin/registration-requests/{request_id}/approve", headers=admin_headers), range(2)))
    assert all(result.status_code == 200 for result in results)
    assert results[0].json()["usuario"]["id"] == results[1].json()["usuario"]["id"]
    with connection(db_url) as db:
        assert db.execute("SELECT COUNT(*) AS n FROM users WHERE cpf=%s", (data["cpf"],)).fetchone()["n"] == 1
