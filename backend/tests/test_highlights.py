import base64

from psycopg.types.json import Jsonb

from gds.database import connection


def draft(target, **changes):
    return {"title": "Descobertas do oceano", "description": "Uma atividade ecológica", "target_kind": target["kind"], "target_id": target["id"], "module_id": target["module_id"], "active": False, "sort_order": 0, "color": "green", **changes}


def test_empty_catalog_crud_and_real_destinations(client, admin_headers):
    result = client.get("/api/admin/highlights", headers=admin_headers)
    assert result.status_code == 200
    assert result.json()["destaques"] == []
    assert client.get("/api/highlights", headers=admin_headers).json() == {"destaques": [], "interval_seconds": 8}
    targets = result.json()["conteudos"]
    assert {t["kind"] for t in targets} == {"game", "mission", "module", "lesson"}
    for index, kind in enumerate(["game", "mission", "module", "lesson"]):
        target = next(t for t in targets if t["kind"] == kind and t["active"])
        payload = draft(target, sort_order=10-index)
        created = client.post("/api/admin/highlights", headers=admin_headers, json=payload)
        assert created.status_code == 200, created.text
        item_id = created.json()["id"]
        assert client.get("/api/highlights", headers=admin_headers).json()["destaques"] == []
        updated = client.patch(f"/api/admin/highlights/{item_id}", headers=admin_headers, json={**payload, "active": True, "title": "Novo título"})
        assert updated.status_code == 200, updated.text
        item = next(h for h in client.get("/api/highlights", headers=admin_headers).json()["destaques"] if h["id"] == item_id)
        assert item["title"] == "Novo título"
        if kind == "lesson":
            assert item["href"] == f"/aprender/{target['module_id']}#aula-{target['id']}"
        elif kind == "module":
            assert item["href"] == f"/aprender/{target['id']}"
        elif kind == "game":
            assert item["href"] == f"/jogos#jogo-{target['id']}"
        else:
            assert item["href"] == f"/missoes#missao-{target['id']}"
        assert client.delete(f"/api/admin/highlights/{item_id}", headers=admin_headers).status_code == 200
        assert client.delete(f"/api/admin/highlights/{item_id}", headers=admin_headers).status_code == 404
        assert target in client.get("/api/admin/highlights", headers=admin_headers).json()["conteudos"]


def test_publication_order_visibility_and_inactive_content(client, admin_headers, db_url):
    targets = client.get("/api/admin/highlights", headers=admin_headers).json()["conteudos"]
    mission = next(t for t in targets if t["kind"] == "mission")
    module = next(t for t in targets if t["kind"] == "module")
    for target, order in [(mission, 9), (module, 2)]:
        assert client.post("/api/admin/highlights", headers=admin_headers, json=draft(target, active=True, sort_order=order)).status_code == 200
    rows = client.get("/api/highlights", headers=admin_headers).json()["destaques"]
    assert [h["target_kind"] for h in rows] == ["module", "mission"]
    with connection(db_url) as db:
        db.execute("UPDATE modules SET active=0 WHERE id=%s", (module["id"],))
    assert [h["target_kind"] for h in client.get("/api/highlights", headers=admin_headers).json()["destaques"]] == ["mission"]
    assert any(not h["available"] for h in client.get("/api/admin/highlights", headers=admin_headers).json()["destaques"])
    assert client.post("/api/admin/highlights", headers=admin_headers, json=draft(module, active=True)).status_code == 400
    assert client.post("/api/admin/highlights", headers=admin_headers, json=draft(module)).status_code == 200


def test_permissions_are_enforced_and_reader_only_sees_authorized_content(client, admin_headers, account, db_url):
    targets = client.get("/api/admin/highlights", headers=admin_headers).json()["conteudos"]
    mission = next(t for t in targets if t["kind"] == "mission")
    created = client.post("/api/admin/highlights", headers=admin_headers, json=draft(mission, active=True)).json()["id"]
    with connection(db_url) as db:
        db.execute("INSERT INTO access_profiles(id,name,base_role,permissions) VALUES ('limited','Administrador limitado','ADMIN',%s)", (Jsonb(["highlights.read"]),))
        db.execute("UPDATE users SET access_profile_id='limited' WHERE id=%s", (account["usuario"]["id"],))
    assert client.get("/api/admin/highlights", headers=admin_headers).status_code == 200
    assert client.get("/api/highlights", headers=admin_headers).json()["destaques"] == []
    assert client.post("/api/admin/highlights", headers=admin_headers, json=draft(mission)).status_code == 403
    assert client.patch(f"/api/admin/highlights/{created}", headers=admin_headers, json=draft(mission)).status_code == 403
    assert client.delete(f"/api/admin/highlights/{created}", headers=admin_headers).status_code == 403
    with connection(db_url) as db:
        db.execute("UPDATE users SET role='USER',access_profile_id=NULL WHERE id=%s", (account["usuario"]["id"],))
    assert len(client.get("/api/highlights", headers=admin_headers).json()["destaques"]) == 1
    assert client.get("/api/admin/highlights", headers=admin_headers).status_code == 403
    assert client.delete(f"/api/admin/highlights/{created}", headers=admin_headers).status_code == 403
    assert client.get("/api/highlights").status_code == 401


def test_validations_images_and_missing_targets(client, admin_headers):
    target = client.get("/api/admin/highlights", headers=admin_headers).json()["conteudos"][0]
    bad = [{"title": ""}, {"title": "x"*101}, {"description": "x"*301}, {"target_kind": "external"}, {"target_id": "missing"}, {"module_id": "wrong-parent"}, {"active": "true"}, {"sort_order": True}, {"sort_order": -1}, {"sort_order": 1.5}, {"sort_order": 10000}, {"color": "pink"}, {"image": "javascript:alert(1)", "image_alt": "Imagem"}, {"image": "http://example.com/a.png", "image_alt": "Imagem"}, {"image": "https://example.com/a.png"}, {"image": "data:image/svg+xml;base64,PHN2Zz4=", "image_alt": "Imagem"}, {"image": "data:image/png;base64,aW52YWxpZA==", "image_alt": "Imagem"}]
    for changes in bad:
        response = client.post("/api/admin/highlights", headers=admin_headers, json=draft(target, **changes))
        assert response.status_code == 400, (changes, response.text)
    # Real tiny PNG; uploaded data is persisted without any image seeding or remote fetch.
    png = "data:image/png;base64," + base64.b64encode(base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT1sAAAAASUVORK5CYII=")).decode()
    response = client.post("/api/admin/highlights", headers=admin_headers, json=draft(target, image=png, image_alt="Mar azul"))
    assert response.status_code == 200, response.text
    saved = client.get("/api/admin/highlights", headers=admin_headers).json()["destaques"][0]
    assert saved["image"] == png and saved["image_alt"] == "Mar azul"
    assert client.post("/api/admin/highlights", headers=admin_headers, json=draft(target, image="https://example.com/oceano.webp", image_alt="Oceano")).status_code == 200
    assert client.patch("/api/admin/highlights/inexistente", headers=admin_headers, json=draft(target)).status_code == 404


def test_large_images_rejected_and_delete_cors(client, admin_headers):
    target = client.get("/api/admin/highlights", headers=admin_headers).json()["conteudos"][0]
    large = "data:image/png;base64," + base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"x"*700_001).decode()
    assert client.post("/api/admin/highlights", headers=admin_headers, json=draft(target, image=large, image_alt="Mar")).status_code == 400
    response = client.options("/api/admin/highlights/id", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "DELETE"})
    assert response.status_code == 200


def test_global_interval_defaults_validation_and_uniform_application(client, admin_headers, db_url):
    catalog = client.get("/api/admin/highlights", headers=admin_headers).json()
    assert catalog["interval_seconds"] == 8
    for target in catalog["conteudos"][:2]:
        assert client.post("/api/admin/highlights", headers=admin_headers, json=draft(target, active=True)).status_code == 200
    for invalid in [None, True, "8", 0, 1, 301, 8.5]:
        assert client.patch("/api/admin/highlights/settings", headers=admin_headers, json={"interval_seconds": invalid}).status_code == 400
    for valid in [2, 15, 300]:
        response = client.patch("/api/admin/highlights/settings", headers=admin_headers, json={"interval_seconds": valid})
        assert response.status_code == 200, response.text
        assert client.get("/api/highlights", headers=admin_headers).json()["interval_seconds"] == valid
        assert client.get("/api/admin/highlights", headers=admin_headers).json()["interval_seconds"] == valid
    with connection(db_url) as db:
        assert db.execute("SELECT COUNT(*) AS n FROM home_highlights").fetchone()["n"] == 2


def test_interval_cannot_be_changed_by_reader_or_student(client, admin_headers, account, db_url):
    with connection(db_url) as db:
        db.execute("INSERT INTO access_profiles(id,name,base_role,permissions) VALUES ('reader','Leitor de destaques','ADMIN',%s)", (Jsonb(["highlights.read"]),))
        db.execute("UPDATE users SET access_profile_id='reader' WHERE id=%s", (account["usuario"]["id"],))
    assert client.patch("/api/admin/highlights/settings", headers=admin_headers, json={"interval_seconds": 10}).status_code == 403
    with connection(db_url) as db:
        db.execute("UPDATE users SET role='USER',access_profile_id=NULL WHERE id=%s", (account["usuario"]["id"],))
    assert client.patch("/api/admin/highlights/settings", headers=admin_headers, json={"interval_seconds": 10}).status_code == 403
    assert client.get("/api/highlights", headers=admin_headers).json()["interval_seconds"] == 8
