from gds.access import allowed
from gds.database import connection
from gds.service import Service
from psycopg.types.json import Jsonb


def test_reset_permission_does_not_expose_guardian_contacts(client, admin_headers, db_url):
    child = client.post("/api/admin/users", headers=admin_headers, json={"nome": "Aluno Contato", "username": "aluno.contato", "role": "USER", "registration_number": "00001234", "guardians": [{"name": "Contato Ficticio", "relationship": "Responsavel", "email": "contato@example.com"}]}).json()["usuario"]
    grants = sorted(allowed("USER") | {"users.reset"})
    response = client.post("/api/admin/profiles", headers=admin_headers, json={"name": "Suporte de senha", "base_role": "ADMIN", "permissions": sorted(set(grants) | {"users.read"})})
    assert response.status_code == 200, response.text
    profile = response.json()["perfil"]
    with connection(db_url) as db:
        # Defense against a stale profile missing the normal read dependency.
        db.execute("UPDATE access_profiles SET permissions=%s WHERE id=%s", (Jsonb(grants), profile["id"]))
        actor = Service(db).register({"nome": "Suporte", "email": "suporte@example.com", "senha": "Pessoal1234"})
        db.execute("UPDATE users SET role='ADMIN',access_profile_id=%s WHERE id=%s", (profile["id"], actor["usuario"]["id"]))
    headers = {"Authorization": "Bearer " + actor["token"]}
    assert client.get(f"/api/admin/users/{child['id']}", headers=headers).status_code == 403
    response = client.post(f"/api/admin/users/{child['id']}/reset-password", headers=headers)
    assert response.status_code == 200, response.text
    assert "guardians" not in response.json()["usuario"]
