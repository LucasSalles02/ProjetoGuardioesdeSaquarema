from concurrent.futures import ThreadPoolExecutor

import pytest

from gds.database import connection
from gds.service import Service


@pytest.fixture
def setup(client,admin_headers,db_url):
    with connection(db_url) as db:
        manager = Service(db).register({"nome": "Gestor Transferencias", "email": "gestor-transfer@example.com", "senha": "Pessoal1234"})
        db.execute("UPDATE users SET role='GESTOR_ESCOLAR' WHERE id=%s",(manager["usuario"]["id"],))
    units = []
    for index,name in enumerate(["Escola Origem","Escola Destino","Escola Externa"]):
        result = client.post("/api/admin/schools",headers=admin_headers,json={"name":name,"manager_ids":[manager["usuario"]["id"]] if index==0 else []})
        assert result.status_code == 200,result.text
        units.append(result.json()["unidade"])
    headers = {"Authorization": "Bearer " + manager["token"]}
    assert client.post("/api/school-context",headers=headers,json={"school_id":units[0]["id"]}).status_code == 200
    student = client.post("/api/admin/users",headers=admin_headers,json={"nome":"Aluno Transferencia","role":"USER","registration_number":"000-transfer","school_id":units[0]["id"]})
    assert student.status_code == 200,student.text
    student_id = student.json()["usuario"]["id"]
    stage = client.get("/api/school-management/stages",headers=headers).json()["etapas"][0]["id"]
    group = client.post("/api/school-management/classes",headers=headers,json={"identification":"Turma Origem","stage_id":stage}).json()["turma"]
    assert client.patch(f"/api/school-management/students/{student_id}/class",headers=headers,json={"class_id":group["id"]}).status_code == 200
    with connection(db_url) as db:
        Service(db).reward(student_id,200,"aula","Aprendizagem anterior",{"lesson":1})
    return {"headers":headers,"manager_id":manager["usuario"]["id"],"units":units,"student_id":student_id,"class_id":group["id"]}


def request(client,setup,**changes):
    body = {"student_id":setup["student_id"],"destination_school_id":setup["units"][1]["id"],"justification":"Mudanca de unidade por motivo institucional.",**changes}
    return client.post("/api/school-management/transfers",headers=setup["headers"],json=body)


def test_complete_transfer_preserves_progress_and_history(client,admin_headers,setup,db_url):
    result = request(client,setup)
    assert result.status_code == 200,result.text
    row = result.json()["solicitacao"]
    identifier = row["id"]
    assert row["status"] == "PENDENTE" and len(row["events"]) == 1
    assert client.post(f"/api/admin/transfers/{identifier}/execute",headers=admin_headers,json={"confirm":True}).status_code == 409
    assert client.post(f"/api/admin/transfers/{identifier}/approve",headers=admin_headers,json={"note":"Justificativa analisada"}).json()["solicitacao"]["status"] == "APROVADA"
    assert client.get("/api/school-management/students",headers=setup["headers"]).json()["alunos"][0]["class_id"] == setup["class_id"]
    response = client.post(f"/api/admin/transfers/{identifier}/execute",headers=admin_headers,json={"confirm":True})
    assert response.status_code == 200,response.text
    assert response.json()["solicitacao"]["status"] == "EXECUTADA"
    assert [event["status"] for event in response.json()["solicitacao"]["events"]] == ["PENDENTE","APROVADA","EXECUTADA"]
    assert client.get("/api/school-management/students",headers=setup["headers"]).json()["alunos"] == []
    with connection(db_url) as db:
        member = db.execute("SELECT * FROM student_school_memberships WHERE student_id=%s",(setup["student_id"],)).fetchone()
        assert member["school_id"] == setup["units"][1]["id"] and member["class_id"] is None
        assert member["registration_number"] == "000-transfer"
        history = db.execute("SELECT * FROM school_transfer_membership_history WHERE transfer_id=%s",(identifier,)).fetchone()
        assert history["school_id"] == setup["units"][0]["id"] and history["class_id"] == setup["class_id"]
        assert db.execute("SELECT xp FROM stats WHERE user_id=%s",(setup["student_id"],)).fetchone()["xp"] == 200
        assert db.execute("SELECT COUNT(*) AS n FROM activities WHERE user_id=%s",(setup["student_id"],)).fetchone()["n"] == 1
        assert db.execute("SELECT COUNT(*) AS n FROM achievement_awards WHERE user_id=%s",(setup["student_id"],)).fetchone()["n"] == 3
    assert client.post(f"/api/admin/transfers/{identifier}/execute",headers=admin_headers,json={"confirm":True}).status_code == 200
    assert len(client.get(f"/api/admin/transfers/{identifier}",headers=admin_headers).json()["solicitacao"]["events"]) == 3


def test_rejection_and_new_request_are_recorded(client,admin_headers,setup):
    row = request(client,setup).json()["solicitacao"]
    response = client.post(f"/api/admin/transfers/{row['id']}/reject",headers=admin_headers,json={"note":"Justificativa insuficiente"})
    assert response.status_code == 200 and response.json()["solicitacao"]["status"] == "REJEITADA"
    assert client.post(f"/api/admin/transfers/{row['id']}/execute",headers=admin_headers,json={"confirm":True}).status_code == 409
    assert client.post(f"/api/admin/transfers/{row['id']}/approve",headers=admin_headers,json={}).status_code == 409
    assert request(client,setup).status_code == 200
    assert len(client.get("/api/school-management/students",headers=setup["headers"]).json()["alunos"]) == 1


def test_scope_permissions_and_direct_edit_bypass(client,admin_headers,setup):
    options = client.get("/api/school-management/transfers/options",headers=setup["headers"])
    assert options.status_code == 200
    assert {school["id"] for school in options.json()["unidades"]} == {school["id"] for school in setup["units"][1:]}
    assert request(client,setup,source_school_id=setup["units"][2]["id"]).status_code == 400
    assert request(client,setup,destination_school_id=setup["units"][0]["id"]).status_code == 400
    assert request(client,setup,student_id="foreign-student").status_code == 404
    row = request(client,setup).json()["solicitacao"]
    assert client.post(f"/api/admin/transfers/{row['id']}/approve",headers=setup["headers"],json={}).status_code == 403
    assert client.get("/api/admin/transfers",headers=setup["headers"]).status_code == 403
    assert client.post("/api/school-management/transfers",headers=admin_headers,json={}).status_code == 403
    assert client.patch(f"/api/admin/users/{setup['student_id']}",headers=admin_headers,json={"school_id":setup["units"][1]["id"]}).status_code == 409
    with_scope = {**setup["headers"],"X-School-Id":str(setup["units"][2]["id"])}
    assert client.get(f"/api/school-management/transfers/{row['id']}",headers=with_scope).status_code == 409


def test_duplicate_requests_and_concurrent_execution_are_idempotent(client,admin_headers,setup,db_url):
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _:request(client,setup),range(2)))
    assert sorted(result.status_code for result in results) == [200,409]
    row = next(result.json()["solicitacao"] for result in results if result.status_code==200)
    assert client.post(f"/api/admin/transfers/{row['id']}/approve",headers=admin_headers,json={}).status_code == 200
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _:client.post(f"/api/admin/transfers/{row['id']}/execute",headers=admin_headers,json={"confirm":True}),range(2)))
    assert all(result.status_code == 200 for result in results)
    with connection(db_url) as db:
        assert db.execute("SELECT COUNT(*) AS n FROM school_transfer_membership_history").fetchone()["n"] == 1
        assert db.execute("SELECT COUNT(*) AS n FROM school_transfer_events WHERE status='EXECUTADA'").fetchone()["n"] == 1


def test_inactive_destination_blocks_execution_without_partial_changes(client,admin_headers,setup,db_url):
    row = request(client,setup).json()["solicitacao"]
    assert client.post(f"/api/admin/transfers/{row['id']}/approve",headers=admin_headers,json={}).status_code == 200
    assert client.patch(f"/api/admin/schools/{setup['units'][1]['id']}/deactivate",headers=admin_headers,json={"confirm":True}).status_code == 200
    response = client.post(f"/api/admin/transfers/{row['id']}/execute",headers=admin_headers,json={"confirm":True})
    assert response.status_code == 409,response.text
    with connection(db_url) as db:
        assert db.execute("SELECT school_id FROM student_school_memberships WHERE student_id=%s",(setup["student_id"],)).fetchone()["school_id"] == setup["units"][0]["id"]
        assert db.execute("SELECT COUNT(*) AS n FROM school_transfer_membership_history").fetchone()["n"] == 0
    assert client.post(f"/api/admin/transfers/{row['id']}/reject",headers=admin_headers,json={"note":"Destino desativado"}).status_code == 200


def test_request_requires_only_student_destination_and_justification(client,admin_headers,setup):
    response = request(client,setup)
    assert response.status_code == 200
    row = response.json()["solicitacao"]
    assert row["status"] == "PENDENTE"
    assert not any(key.startswith("evidence_") for key in row)
    assert client.get(f"/api/admin/transfers/{row['id']}/attachment",headers=admin_headers).status_code == 404


@pytest.mark.parametrize("changes",[
    {"student_id":""},
    {"justification":""},
    {"destination_school_id":True},
    {"attachment":{"name":"script.html","mime":"text/html","data":"aGVsbG8="}},
    {"attachment":{"name":"bad.pdf","mime":"application/pdf","data":"aGVsbG8="}},
    {"attachment":{"name":"bad.pdf","mime":"application/pdf","data":"invalid!"}},
])
def test_invalid_requests_leave_no_pending_record(client,admin_headers,setup,changes):
    result = request(client,setup,**changes)
    assert result.status_code == 400,result.text
    assert client.get("/api/admin/transfers",headers=admin_headers).json()["solicitacoes"] == []


def test_students_have_no_transfer_access(client,auth_headers):
    for path in ["/api/admin/transfers","/api/school-management/transfers","/api/school-management/transfers/options"]:
        assert client.get(path,headers=auth_headers).status_code == 403


def test_revoked_origin_manager_loses_request_access(client,admin_headers,setup):
    row = request(client,setup).json()["solicitacao"]
    origin = setup["units"][0]
    assert client.patch(f"/api/admin/schools/{origin['id']}",headers=admin_headers,json={"name":origin["name"],"manager_ids":[]}).status_code == 200
    response = client.get(f"/api/school-management/transfers/{row['id']}",headers=setup["headers"])
    assert response.status_code == 409
    assert response.json()["codigo"] == "UNIDADE_OBRIGATORIA"
    assert "solicitacao" not in response.json()
    assert request(client,setup).status_code == 409
    assert client.get(f"/api/admin/transfers/{row['id']}",headers=admin_headers).status_code == 200


def test_transfer_records_responsible_people_and_dates(client,admin_headers,setup,account):
    row = request(client,setup).json()["solicitacao"]
    identifier = row["id"]
    assert row["requested_by"] == setup["manager_id"] and row["created_at"]
    approved = client.post(f"/api/admin/transfers/{identifier}/approve",headers=admin_headers,json={"note":"Justificativa analisada"}).json()["solicitacao"]
    assert approved["decided_by"] == account["usuario"]["id"] and approved["decided_at"]
    executed = client.post(f"/api/admin/transfers/{identifier}/execute",headers=admin_headers,json={"confirm":True}).json()["solicitacao"]
    assert executed["executed_by"] == account["usuario"]["id"] and executed["executed_at"]
    assert [event["actor_id"] for event in executed["events"]] == [setup["manager_id"],account["usuario"]["id"],account["usuario"]["id"]]
    assert all(event["actor_name"] and event["created_at"] for event in executed["events"])
