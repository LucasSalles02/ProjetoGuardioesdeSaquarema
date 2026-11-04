"""School units and explicit manager authorizations (RF10, RN02 and RN14)."""
from .errors import ApiError
from .access import require
from psycopg.types.json import Jsonb


def _id(value):
    if not isinstance(value, str) or len(value) > 19 or not value.isascii() or not value.isdigit() or not 0 < int(value) < 2**63:
        raise ApiError("Unidade escolar nao encontrada.", 404)
    return int(value)


def managers(service, actor_id):
    service.require_admin(actor_id)
    return {"gestores": service.all("SELECT id,nome,email,active FROM users WHERE role='GESTOR_ESCOLAR' ORDER BY lower(nome),id")}


def admin_list(service, actor_id):
    service.require_admin(actor_id)
    return {"unidades": service.all("SELECT s.id,s.name,s.active,s.deactivated_at::text AS deactivated_at,COUNT(l.id) FILTER (WHERE l.authorized AND u.active AND u.role='GESTOR_ESCOLAR') AS manager_count FROM schools s LEFT JOIN school_manager_links l ON l.school_id=s.id LEFT JOIN users u ON u.id=l.manager_id GROUP BY s.id ORDER BY lower(s.name),s.id")}


def admin_get(service, actor_id, school_id):
    service.require_admin(actor_id)
    school = service.one("SELECT id,name,active,deactivated_at::text AS deactivated_at FROM schools WHERE id=%s", (_id(school_id),))
    if not school:
        raise ApiError("Unidade escolar nao encontrada.", 404)
    links = service.all("SELECT l.id,l.manager_id,l.authorized,u.nome,u.email,u.active,u.role FROM school_manager_links l JOIN users u ON u.id=l.manager_id WHERE l.school_id=%s ORDER BY lower(u.nome),l.id", (school["id"],))
    return {"unidade": {**school, "gestores": links}}


def save(service, actor_id, data, school_id=None):
    service.require_admin(actor_id)
    if set(data) - {"name", "manager_ids"}:
        raise ApiError("Informe somente o nome e os gestores da unidade.")
    name, manager_ids = data.get("name"), data.get("manager_ids", [])
    if not isinstance(name, str) or not 2 <= len(" ".join(name.split())) <= 160:
        raise ApiError("Informe um nome de unidade entre 2 e 160 caracteres.")
    name = " ".join(name.split())
    if not isinstance(manager_ids, list) or len(manager_ids) > 500 or any(not isinstance(value, str) or not value for value in manager_ids):
        raise ApiError("Selecione gestores escolares validos.")
    manager_ids = sorted(set(manager_ids))
    if manager_ids:
        require(service, actor_id, "institutions.update")
    school_id = _id(school_id) if school_id is not None else None
    if school_id is not None:
        current = service.one("SELECT id,active FROM schools WHERE id=%s FOR UPDATE", (school_id,))
        if not current:
            raise ApiError("Unidade escolar nao encontrada.", 404)
        if not current["active"]:
            raise ApiError("Unidade desativada. O cadastro esta disponivel somente para consulta.")
    if service.one("SELECT id FROM schools WHERE lower(name)=lower(%s) AND (%s::bigint IS NULL OR id<>%s)", (name, school_id, school_id)):
        raise ApiError("Ja existe uma unidade escolar com este nome.")
    if manager_ids:
        candidates = service.all("SELECT id FROM users WHERE id=ANY(%s) AND role='GESTOR_ESCOLAR' AND active=TRUE FOR UPDATE", (manager_ids,))
        if {row["id"] for row in candidates} != set(manager_ids):
            raise ApiError("Vincule somente usuarios ativos com o perfil de Gestao Escolar.")
    if school_id is None:
        school_id = service.one("INSERT INTO schools(name) VALUES (%s) RETURNING id", (name,))["id"]
    else:
        service.db.execute("UPDATE schools SET name=%s,updated_at=CURRENT_TIMESTAMP WHERE id=%s", (name, school_id))
    # Retain link identifiers and the authorization flag when a grant is revoked.
    service.db.execute("UPDATE school_manager_links SET authorized=FALSE,authorized_by=%s,updated_at=CURRENT_TIMESTAMP WHERE school_id=%s AND authorized=TRUE AND NOT (manager_id=ANY(%s::text[]))", (actor_id, school_id, manager_ids))
    for manager_id in manager_ids:
        service.db.execute("INSERT INTO school_manager_links(school_id,manager_id,authorized_by) VALUES (%s,%s,%s) ON CONFLICT(school_id,manager_id) DO UPDATE SET authorized=TRUE,authorized_by=EXCLUDED.authorized_by,updated_at=CURRENT_TIMESTAMP", (school_id, manager_id, actor_id))
    return admin_get(service, actor_id, str(school_id))


def my_units(service, actor_id, school_id=None):
    actor = service.one("SELECT role FROM users WHERE id=%s", (actor_id,))
    if not actor or actor["role"] != "GESTOR_ESCOLAR":
        raise ApiError("Acesso exclusivo da Gestao Escolar.", 403)
    query = "SELECT s.id,s.name,l.id AS link_id,l.authorized FROM schools s JOIN school_manager_links l ON l.school_id=s.id WHERE l.manager_id=%s AND l.authorized=TRUE AND s.active=TRUE"
    params = [actor_id]
    if school_id is not None:
        query += " AND s.id=%s"
        params.append(_id(school_id))
    rows = service.all(query + " ORDER BY lower(s.name),s.id", params)
    if school_id is not None:
        if not rows:
            raise ApiError("Unidade escolar nao encontrada ou nao autorizada.", 404)
        return {"unidade": rows[0]}
    return {"unidades": rows}


def available_units(service, actor_id):
    actor = service.one("SELECT role FROM users WHERE id=%s", (actor_id,))
    if actor and actor["role"] == "ADMIN":
        service.require_admin(actor_id)
        require(service, actor_id, "institutions.read")
        return service.all("SELECT id,name,NULL::bigint AS link_id,TRUE AS authorized FROM schools WHERE active=TRUE ORDER BY lower(name),id")
    require(service, actor_id, "school_units.read")
    return my_units(service, actor_id)["unidades"]


def context(service, actor_id, bearer):
    units = available_units(service, actor_id)
    session = service.one("SELECT school_id FROM sessions WHERE token=%s AND user_id=%s AND revoked_at IS NULL", (bearer, actor_id))
    selected = next((unit for unit in units if unit["id"] == session["school_id"]), None) if session else None
    if session and session["school_id"] and selected is None:
        service.db.execute("UPDATE sessions SET school_id=NULL WHERE token=%s AND user_id=%s", (bearer, actor_id))
    return {"unidade": selected, "unidades": units}


def select_context(service, actor_id, bearer, data):
    if set(data) != {"school_id"} or isinstance(data.get("school_id"), bool):
        raise ApiError("Selecione uma unidade escolar valida.")
    value = data["school_id"]
    if not isinstance(value, (str, int)):
        raise ApiError("Selecione uma unidade escolar valida.")
    school_id = _id(str(value))
    unit = next((item for item in available_units(service, actor_id) if item["id"] == school_id), None)
    if not unit:
        raise ApiError("Unidade escolar nao encontrada ou nao autorizada.", 404)
    service.db.execute("UPDATE sessions SET school_id=%s WHERE token=%s AND user_id=%s AND revoked_at IS NULL", (unit["id"], bearer, actor_id))
    return context(service, actor_id, bearer)


def require_context(service, actor_id, bearer, requested_school=""):
    actor = service.one("SELECT role FROM users WHERE id=%s", (actor_id,))
    admin = actor and actor["role"] == "ADMIN"
    if admin:
        service.require_admin(actor_id)
        require(service, actor_id, "institutions.read")
    else:
        require(service, actor_id, "school_units.read")
    session = service.one("SELECT school_id FROM sessions WHERE token=%s AND user_id=%s AND revoked_at IS NULL", (bearer, actor_id))
    unit = None
    if session and session["school_id"]:
        unit = service.one("SELECT id,name,NULL::bigint AS link_id,TRUE AS authorized FROM schools WHERE id=%s AND active=TRUE", (session["school_id"],)) if admin else service.one("SELECT s.id,s.name,l.id AS link_id,l.authorized FROM schools s JOIN school_manager_links l ON l.school_id=s.id WHERE s.id=%s AND l.manager_id=%s AND l.authorized=TRUE AND s.active=TRUE", (session["school_id"], actor_id))
    if not unit:
        raise ApiError("Selecione uma unidade escolar autorizada para continuar.", 409, "UNIDADE_OBRIGATORIA")
    if requested_school and str(unit["id"]) != requested_school:
        raise ApiError("A unidade ativa foi alterada. Atualize o contexto para continuar.", 409, "UNIDADE_DESATUALIZADA")
    return unit


def deactivate(service, actor_id, school_id, data):
    service.require_admin(actor_id)
    if set(data) != {"confirm"} or data.get("confirm") is not True:
        raise ApiError("Confirme a desativacao e a retirada dos vinculos de alunos e gestores.")
    school_id = _id(school_id)
    school = service.one("SELECT id,active FROM schools WHERE id=%s FOR UPDATE", (school_id,))
    if not school:
        raise ApiError("Unidade escolar nao encontrada.", 404)
    if not school["active"]:
        return {**admin_get(service, actor_id, str(school_id)), "alunos_desvinculados": 0, "gestores_desvinculados": 0}
    students = service.all("SELECT student_id,registration_number,class_id FROM student_school_memberships WHERE school_id=%s FOR UPDATE", (school_id,))
    managers = service.all("SELECT manager_id FROM school_manager_links WHERE school_id=%s AND authorized=TRUE", (school_id,))
    service.db.execute("INSERT INTO school_deactivations(school_id,actor_id,student_links,manager_ids) VALUES (%s,%s,%s,%s)", (school_id, actor_id, Jsonb(students), Jsonb([row["manager_id"] for row in managers])))
    service.db.execute("INSERT INTO class_enrollment_events(student_id,school_id,from_class_id,to_class_id,actor_id) SELECT student_id,school_id,class_id,NULL,%s FROM student_school_memberships WHERE school_id=%s", (actor_id, school_id))
    service.db.execute("UPDATE users SET escola='',turma='' WHERE id=ANY(%s::text[])", ([row["student_id"] for row in students],))
    service.db.execute("DELETE FROM student_school_memberships WHERE school_id=%s", (school_id,))
    service.db.execute("UPDATE school_manager_links SET authorized=FALSE,authorized_by=%s,updated_at=CURRENT_TIMESTAMP WHERE school_id=%s AND authorized=TRUE", (actor_id, school_id))
    service.db.execute("UPDATE sessions SET school_id=NULL WHERE school_id=%s", (school_id,))
    service.db.execute("UPDATE schools SET active=FALSE,deactivated_at=CURRENT_TIMESTAMP,deactivated_by=%s,updated_at=CURRENT_TIMESTAMP WHERE id=%s", (actor_id, school_id))
    return {**admin_get(service, actor_id, str(school_id)), "alunos_desvinculados": len(students), "gestores_desvinculados": len(managers)}


def reactivate(service, actor_id, school_id, data):
    service.require_admin(actor_id)
    if set(data) != {"confirm"} or data.get("confirm") is not True:
        raise ApiError("Confirme a reativacao. Os vinculos anteriores nao serao restaurados.")
    school_id = _id(school_id)
    school = service.one("SELECT id,active FROM schools WHERE id=%s FOR UPDATE", (school_id,))
    if not school:
        raise ApiError("Unidade escolar nao encontrada.", 404)
    if not school["active"]:
        service.db.execute("UPDATE schools SET active=TRUE,deactivated_at=NULL,deactivated_by=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=%s", (school_id,))
    return admin_get(service, actor_id, str(school_id))
