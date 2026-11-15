from datetime import datetime, timedelta, timezone

import pytest

from gds.admin import provision_admin
from gds.database import connection, migrate
from gds.security import verify_password


@pytest.mark.parametrize("role", ["USER", "GESTOR_ESCOLAR", "ADMIN"])
def test_individual_random_secret_expiry_setup_and_private_delivery(client, admin_headers, db_url, role):
    payload = {"nome": "Conta Temporaria", "role": role}
    identity = {"registration_number": "00001234"} if role == "USER" else {"cpf": "00123456789"}
    if role != "USER":
        payload["email"] = "temporario@example.com"
    issued_at = datetime.now(timezone.utc)
    response = client.post("/api/admin/users", headers=admin_headers, json={**payload, **identity})
    assert response.status_code == 200, response.text
    assert response.headers["cache-control"] == "no-store"
    result = response.json()
    credential, account = result["temporary_credential"], result["usuario"]
    secret = credential["password"]
    expires = datetime.fromisoformat(credential["expires_at"])
    assert timedelta(hours=23, minutes=59) < expires - issued_at <= timedelta(hours=24, seconds=10)
    assert len(secret) == 24 and secret != next(iter(identity.values()))
    migrate(db_url)
    path = "/api/auth/admin/login" if role == "ADMIN" else "/api/auth/login"
    assert client.post(path, json={**identity, "senha": next(iter(identity.values()))}).status_code == 401
    login = client.post(path, json={**identity, "senha": secret})
    assert login.status_code == 200
    headers = {"Authorization": "Bearer " + login.json()["token"]}
    assert client.get("/api/progress", headers=headers).status_code == 403
    assert "temporary_credential" not in client.get("/api/auth/me", headers=headers).json()
    for endpoint in ["/api/admin/users", f"/api/admin/users/{account['id']}"]:
        assert secret not in client.get(endpoint, headers=admin_headers).text
    assert client.post("/api/auth/first-access/password", headers=headers,
                       json={"novaSenha": secret, "confirmarSenha": secret}).status_code == 400
    with connection(db_url) as db:
        row = db.execute("SELECT * FROM users WHERE id=%s", (account["id"],)).fetchone()
        assert verify_password(secret, row["password_salt"], row["password_hash"])
        assert secret not in str(row)
        db.execute("UPDATE users SET temporary_password_expires_at=CURRENT_TIMESTAMP - INTERVAL '1 second' WHERE id=%s", (account["id"],))
    assert client.post(path, json={**identity, "senha": secret}).status_code == 401
    assert client.get("/api/auth/me", headers=headers).status_code == 401
    assert client.post("/api/auth/first-access/password", headers=headers,
                       json={"novaSenha": "PessoalSegura1234", "confirmarSenha": "PessoalSegura1234"}).status_code == 401
    reset = client.post(f"/api/admin/users/{account['id']}/reset-password", headers=admin_headers).json()
    replacement = reset["temporary_credential"]["password"]
    assert secret != replacement
    assert client.get("/api/auth/me", headers=headers).status_code == 401
    login = client.post(path, json={**identity, "senha": replacement})
    assert login.status_code == 200
    headers = {"Authorization": "Bearer " + login.json()["token"]}
    setup = client.post("/api/auth/first-access/password", headers=headers,
                        json={"novaSenha": "PessoalSegura1234", "confirmarSenha": "PessoalSegura1234"})
    assert setup.status_code == 200
    assert client.post(path, json={**identity, "senha": replacement}).status_code == 401
    assert client.post(path, json={**identity, "senha": "PessoalSegura1234"}).status_code == 200
    with connection(db_url) as db:
        assert db.execute("SELECT temporary_password_expires_at FROM users WHERE id=%s", (account["id"],)).fetchone()["temporary_password_expires_at"] is None
    migrate(db_url)
    assert client.post(path, json={**identity, "senha": "PessoalSegura1234"}).status_code == 200


def test_local_admin_provisioning_issues_random_once(db_url, monkeypatch):
    for key, value in {"ADMIN_CPF": "88123456789", "ADMIN_EMAIL": "bootstrap@example.com", "ADMIN_NAME": "Admin Inicial", "ADMIN_PASSWORD": "SenhaAntiga1234"}.items():
        monkeypatch.setenv("GUARDIOES_DE_SAQUAREMA_" + key, value)
    with connection(db_url) as db:
        credential = provision_admin(db)
        row = db.execute("SELECT * FROM users WHERE cpf='88123456789'").fetchone()
        assert row["must_change_password"] and row["temporary_password_expires_at"]
        assert verify_password(credential["password"], row["password_salt"], row["password_hash"])
        assert not verify_password("SenhaAntiga1234", row["password_salt"], row["password_hash"])
        assert provision_admin(db) is None
        replacement = provision_admin(db, reset=True)
        assert replacement["password"] != credential["password"]
        row = db.execute("SELECT * FROM users WHERE cpf='88123456789'").fetchone()
        assert verify_password(replacement["password"], row["password_salt"], row["password_hash"])


def test_temporary_secret_uses_secure_generator(monkeypatch):
    import gds.onboarding as onboarding
    calls = []

    def secure_token(size):
        calls.append(size)
        return "credencial-ficticia-unica"

    monkeypatch.setattr(onboarding.secrets,"token_urlsafe",secure_token)
    assert onboarding.initial_secret() == "credencial-ficticia-unica"
    assert calls == [18]


def test_login_limiter_expires_window_and_separates_addresses(monkeypatch):
    from gds.app import LoginLimiter
    from gds.errors import ApiError

    stamp = [1000.0]
    monkeypatch.setattr("gds.app.time.monotonic",lambda:stamp[0])
    limiter = LoginLimiter()
    for _ in range(30):
        limiter.check("ficticio-a")
    with pytest.raises(ApiError) as error:
        limiter.check("ficticio-a")
    assert error.value.status == 429
    limiter.check("ficticio-b")
    stamp[0] += 900
    limiter.check("ficticio-a")
    assert limiter.attempts["ficticio-a"][0] == 1
