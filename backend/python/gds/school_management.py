"""School-scoped classes and single-class memberships, RF15-17 and RN03-06/14-15."""
from .progression import progression, level_name
from .errors import ApiError
from .schools import _id
from .access import require


def text(value, label, maximum=80, minimum=2):
    if not isinstance(value, str) or not minimum <= len(" ".join(value.split())) <= maximum:
        raise ApiError(f"Informe {label} entre {minimum} e {maximum} caracteres.")
    return " ".join(value.split())


def numeric(value):
    if isinstance(value, bool) or not isinstance(value, (int, str)):
        raise ApiError("Selecione um registro valido.")
    return _id(str(value))


def stages(service, actor_id, admin=False):
    if admin:
        service.require_admin(actor_id)
    return {"etapas": service.all("SELECT id,name,sort_order,active FROM school_stages " + ("" if admin else "WHERE active=TRUE ") + "ORDER BY sort_order,lower(name),id")}


def save_stage(service, actor_id, data, stage_id=None):
    service.require_admin(actor_id)
    if set(data) - {"name", "sort_order", "active"}:
        raise ApiError("Informe somente nome, ordem e situacao da etapa.")
    name = text(data.get("name"), "um nome de etapa")
    order, active = data.get("sort_order", 0), data.get("active", True)
    if isinstance(order, bool) or not isinstance(order, int) or not 0 <= order <= 999 or not isinstance(active, bool):
        raise ApiError("Informe uma ordem de 0 a 999 e uma situacao valida.")
    stage_id = numeric(stage_id) if stage_id is not None else None
    if stage_id and not service.one("SELECT id FROM school_stages WHERE id=%s FOR UPDATE", (stage_id,)):
        raise ApiError("Etapa nao encontrada.", 404)
    if service.one("SELECT id FROM school_stages WHERE lower(name)=lower(%s) AND (%s::bigint IS NULL OR id<>%s)", (name, stage_id, stage_id)):
        raise ApiError("Ja existe uma etapa com esse nome.")
    if stage_id:
        service.db.execute("UPDATE school_stages SET name=%s,sort_order=%s,active=%s WHERE id=%s", (name, order, active, stage_id))
    else:
        stage_id = service.one("INSERT INTO school_stages(name,sort_order,active) VALUES (%s,%s,%s) RETURNING id", (name, order, active))["id"]
    return {"etapa": service.one("SELECT id,name,sort_order,active FROM school_stages WHERE id=%s", (stage_id,))}


def scoped_school(service, actor_id):
    actor = service.one("SELECT role FROM users WHERE id=%s", (actor_id,))
    if not actor or actor["role"] not in ["GESTOR_ESCOLAR", "ADMIN"] or not getattr(service, "school_id", None):
        raise ApiError("Selecione uma unidade autorizada para acessar a Gestao.", 403)
    return service.school_id


def classes(service, actor_id):
    school_id = scoped_school(service, actor_id)
    return {"turmas": service.all("SELECT c.id,c.school_id,c.identification,c.stage_id,s.name AS stage_name,s.active AS stage_active,COUNT(m.student_id) FILTER (WHERE u.active AND u.role='USER') AS student_count FROM school_classes c JOIN school_stages s ON s.id=c.stage_id LEFT JOIN student_school_memberships m ON m.class_id=c.id LEFT JOIN users u ON u.id=m.student_id WHERE c.school_id=%s GROUP BY c.id,s.id ORDER BY s.sort_order,lower(c.identification),c.id", (school_id,))}


def save_class(service, actor_id, data, class_id=None):
    require_manager_write(service, actor_id)
    school_id = scoped_school(service, actor_id)
    if set(data) - {"identification", "stage_id"}:
        raise ApiError("Informe somente identificacao e etapa. A unidade e definida pela sessao.")
    name = text(data.get("identification"), "uma identificacao de turma")
    stage_id = numeric(data.get("stage_id"))
    current = None
    if class_id is not None:
        class_id = numeric(class_id)
        current = service.one("SELECT id,stage_id FROM school_classes WHERE id=%s AND school_id=%s FOR UPDATE", (class_id, school_id))
        if not current:
            raise ApiError("Turma nao encontrada nesta unidade.", 404)
    stage = service.one("SELECT id,active FROM school_stages WHERE id=%s FOR SHARE", (stage_id,))
    if not stage or (not stage["active"] and (not current or current["stage_id"] != stage_id)):
        raise ApiError("Selecione uma etapa escolar ativa.")
    if service.one("SELECT id FROM school_classes WHERE school_id=%s AND lower(identification)=lower(%s) AND (%s::bigint IS NULL OR id<>%s)", (school_id, name, class_id, class_id)):
        raise ApiError("Ja existe uma turma com essa identificacao na unidade.")
    if current:
        service.db.execute("UPDATE school_classes SET identification=%s,stage_id=%s,updated_at=CURRENT_TIMESTAMP WHERE id=%s AND school_id=%s", (name, stage_id, class_id, school_id))
    else:
        class_id = service.one("INSERT INTO school_classes(school_id,stage_id,identification) VALUES (%s,%s,%s) RETURNING id", (school_id, stage_id, name))["id"]
    return {"turma": next(row for row in classes(service, actor_id)["turmas"] if row["id"] == class_id)}


def students(service, actor_id):
    school_id = scoped_school(service, actor_id)
    rows = service.all("SELECT u.id,u.nome,m.registration_number,m.class_id,c.identification AS class_name,s.name AS stage_name,COALESCE(st.xp,0) AS xp FROM student_school_memberships m JOIN users u ON u.id=m.student_id LEFT JOIN stats st ON st.user_id=u.id LEFT JOIN school_classes c ON c.id=m.class_id LEFT JOIN school_stages s ON s.id=c.stage_id WHERE m.school_id=%s AND u.role='USER' AND u.active=TRUE ORDER BY lower(u.nome),u.id", (school_id,))
    for row in rows:
        row["level"] = progression(row.pop("xp"))["nivel"]
        row["level_name"] = level_name(row["level"])
    return {"alunos": rows}


def assign_class(service, actor_id, student_id, data):
    require_manager_write(service, actor_id)
    school_id = scoped_school(service, actor_id)
    if "class_id" not in data or set(data) - {"class_id", "expected_class_id"}:
        raise ApiError("Informe somente a turma. Nao e permitido alterar XP, niveis ou dados cadastrais.")
    class_id = numeric(data["class_id"]) if data["class_id"] is not None else None
    current = service.one("SELECT m.class_id FROM student_school_memberships m JOIN users u ON u.id=m.student_id WHERE m.student_id=%s AND m.school_id=%s AND u.role='USER' AND u.active=TRUE FOR UPDATE OF m", (student_id, school_id))
    if not current:
        raise ApiError("Aluno nao encontrado nesta unidade.", 404)
    if "expected_class_id" in data:
        expected = numeric(data["expected_class_id"]) if data["expected_class_id"] is not None else None
        if expected != current["class_id"]:
            raise ApiError("A turma do aluno foi alterada. Atualize a listagem antes de continuar.", 409)
    if class_id is not None and not service.one("SELECT id FROM school_classes WHERE id=%s AND school_id=%s", (class_id, school_id)):
        raise ApiError("Turma nao encontrada nesta unidade.", 404)
    if current["class_id"] != class_id:
        service.db.execute("UPDATE student_school_memberships SET class_id=%s,updated_at=CURRENT_TIMESTAMP WHERE student_id=%s AND school_id=%s", (class_id, student_id, school_id))
        service.db.execute("INSERT INTO class_enrollment_events(student_id,school_id,from_class_id,to_class_id,actor_id) VALUES (%s,%s,%s,%s,%s)", (student_id, school_id, current["class_id"], class_id, actor_id))
    return {"aluno": next(row for row in students(service, actor_id)["alunos"] if row["id"] == student_id)}


def allocate_students(service, actor_id, class_id, data):
    """Allocate unassigned students atomically; transfers use the individual endpoint."""
    require_manager_write(service, actor_id)
    require(service, actor_id, "enrollments.update")
    school_id = scoped_school(service, actor_id)
    class_id = numeric(class_id)
    ids = data.get("student_ids")
    if set(data) != {"student_ids"} or not isinstance(ids, list) or not 1 <= len(ids) <= 200 or any(not isinstance(i, str) or not i for i in ids) or len(set(ids)) != len(ids):
        raise ApiError("Selecione de 1 a 200 alunos diferentes para alocar.")
    if not service.one("SELECT id FROM school_classes WHERE id=%s AND school_id=%s", (class_id, school_id)):
        raise ApiError("Turma nao encontrada nesta unidade.", 404)
    members = service.all("SELECT m.student_id,m.class_id FROM student_school_memberships m JOIN users u ON u.id=m.student_id WHERE m.student_id=ANY(%s) AND m.school_id=%s AND u.role='USER' AND u.active=TRUE ORDER BY m.student_id FOR UPDATE OF m", (ids, school_id))
    if len(members) != len(ids):
        raise ApiError("Um ou mais alunos não estão disponíveis nesta unidade. Atualize a lista.", 404)
    if any(m["class_id"] is not None for m in members):
        raise ApiError("Um ou mais alunos já possuem turma. Atualize a lista ou utilize Transferir de turma.", 409)
    for member in members:
        service.db.execute("UPDATE student_school_memberships SET class_id=%s,updated_at=CURRENT_TIMESTAMP WHERE student_id=%s AND school_id=%s", (class_id, member["student_id"], school_id))
        service.db.execute("INSERT INTO class_enrollment_events(student_id,school_id,from_class_id,to_class_id,actor_id) VALUES (%s,%s,NULL,%s,%s)", (member["student_id"], school_id, class_id, actor_id))
    return {**students(service, actor_id), **classes(service, actor_id)}


def student_record(service, actor_id, student_id):
    school_id = scoped_school(service, actor_id)
    # Explicit fields: never expose authentication credentials or other schools' records.
    record = service.one("SELECT u.id,u.nome,u.role,u.active,TO_CHAR(u.birth_date,'DD/MM/YYYY') AS birth_date,u.guardians,u.created_at,u.updated_at,u.deactivated_at,COALESCE(u.access_profile_id,u.role) AS profile_id,p.name AS profile_name,m.registration_number,m.school_id,sch.name AS school_name,m.class_id,c.identification AS class_name,s.name AS stage_name FROM student_school_memberships m JOIN users u ON u.id=m.student_id JOIN schools sch ON sch.id=m.school_id JOIN access_profiles p ON p.id=COALESCE(u.access_profile_id,u.role) LEFT JOIN school_classes c ON c.id=m.class_id LEFT JOIN school_stages s ON s.id=c.stage_id WHERE m.school_id=%s AND m.student_id=%s AND u.role='USER' AND u.active=TRUE", (school_id, student_id))
    if not record:
        raise ApiError("Aluno nao encontrado nesta unidade.", 404)
    return {"aluno": record}


def require_manager_write(service, actor_id):
    actor = service.one("SELECT role FROM users WHERE id=%s", (actor_id,))
    if not actor or actor["role"] != "GESTOR_ESCOLAR":
        raise ApiError("Somente gestores escolares podem cadastrar ou alterar turmas e organizar alunos nas turmas.", 403)


def admin_membership(service, actor_id, student_id, role, data):
    current = service.one("SELECT * FROM student_school_memberships WHERE student_id=%s FOR UPDATE", (student_id,))
    if role != "USER":
        if current:
            require(service, actor_id, "institutions.update")
            service.db.execute("DELETE FROM student_school_memberships WHERE student_id=%s", (student_id,))
        return
    if "school_id" not in data and "registration_number" not in data:
        return
    school_id = data.get("school_id", current["school_id"] if current else None)
    if not current and school_id in (None, ""):
        return
    require(service, actor_id, "institutions.update")
    if school_id in [None, ""]:
        if current:
            raise ApiError("Um aluno vinculado deve permanecer em uma unidade. Selecione a unidade de destino.")
        return
    school_id = numeric(school_id)
    registration = text(data.get("registration_number", current["registration_number"] if current else ""), "uma matricula", 40, 1)
    if not service.one("SELECT id FROM schools WHERE id=%s AND active=TRUE", (school_id,)):
        raise ApiError("Unidade escolar nao encontrada.", 404)
    if service.one("SELECT student_id FROM student_school_memberships WHERE school_id=%s AND registration_number=%s AND student_id<>%s", (school_id, registration, student_id)):
        raise ApiError("Ja existe um aluno com essa matricula na unidade.")
    class_id = current["class_id"] if current and current["school_id"] == school_id else None
    if current and current["class_id"] and class_id is None:
        service.db.execute("INSERT INTO class_enrollment_events(student_id,school_id,from_class_id,to_class_id,actor_id) VALUES (%s,%s,%s,NULL,%s)", (student_id, current["school_id"], current["class_id"], actor_id))
    service.db.execute("INSERT INTO student_school_memberships(student_id,school_id,registration_number,class_id) VALUES (%s,%s,%s,%s) ON CONFLICT(student_id) DO UPDATE SET school_id=EXCLUDED.school_id,registration_number=EXCLUDED.registration_number,class_id=EXCLUDED.class_id,updated_at=CURRENT_TIMESTAMP", (student_id, school_id, registration, class_id))


def admin_links(service, account):
    if account["role"] == "GESTOR_ESCOLAR":
        units = service.all("SELECT s.id,s.name FROM schools s JOIN school_manager_links l ON l.school_id=s.id WHERE l.manager_id=%s AND l.authorized=TRUE AND s.active=TRUE ORDER BY lower(s.name)", (account["id"],))
        return {"linked_schools": units}
    if account["role"] == "USER":
        item = service.one("SELECT m.school_id,s.name,m.registration_number,m.class_id,c.identification AS class_name FROM student_school_memberships m JOIN schools s ON s.id=m.school_id LEFT JOIN school_classes c ON c.id=m.class_id WHERE m.student_id=%s", (account["id"],))
        return {"linked_schools": [{"id": item["school_id"], "name": item["name"]}] if item else [], "school_id": item["school_id"] if item else None, "registration_number": account.get("registration_number") or (item["registration_number"] if item else ""), "class_id": item["class_id"] if item else None, "class_name": item["class_name"] if item else None}
    return {"linked_schools": []}


def student_progress(service, actor_id, student_id):
    school_id = scoped_school(service, actor_id)
    student = service.one("SELECT u.id,u.nome,m.registration_number,c.identification AS class_name,COALESCE(s.xp,0) AS xp,COALESCE(s.missoes_concluidas,0) AS missions_completed,COALESCE(s.aulas_concluidas,0) AS lessons_completed FROM student_school_memberships m JOIN users u ON u.id=m.student_id LEFT JOIN stats s ON s.user_id=u.id LEFT JOIN school_classes c ON c.id=m.class_id WHERE m.school_id=%s AND m.student_id=%s AND u.active=TRUE AND u.role='USER'", (school_id, student_id))
    if not student:
        raise ApiError("Aluno nao encontrado nesta unidade.", 404)
    awards = service.all("SELECT achievement_id,created_at FROM achievement_awards WHERE user_id=%s ORDER BY created_at DESC", (student_id,))
    catalog = {item["id"]: item for item in service.achievements(student_id)["conquistas"]}
    dates = {award["achievement_id"]: award["created_at"] for award in awards}
    awards = [{"achievement_id": item["id"], "title": item["titulo"], "level": item["nivelNecessario"], "created_at": dates.get(item["id"])} for item in catalog.values() if item["obtida"]]
    activities = service.all("SELECT tipo,descricao,xp_ganho,created_at FROM activities WHERE user_id=%s ORDER BY created_at DESC,id DESC LIMIT 20", (student_id,))
    current = progression(student["xp"])
    extra = service.one("SELECT COALESCE(jogos_concluidos,0) AS games_completed,COALESCE(sequencia_dias,0) AS streak_days FROM stats WHERE user_id=%s", (student_id,)) or {"games_completed": 0, "streak_days": 0}
    return {"progresso": {**student, **extra, "level": current["nivel"], "level_name": level_name(current["nivel"]), "progress": current, "achievements": awards, "activities": activities}}


def class_summary(service, actor_id, class_id):
    school_id = scoped_school(service, actor_id)
    classroom = service.one("SELECT c.id,c.identification,s.name AS stage_name FROM school_classes c JOIN school_stages s ON s.id=c.stage_id WHERE c.id=%s AND c.school_id=%s", (numeric(class_id), school_id))
    if not classroom:
        raise ApiError("Turma nao encontrada nesta unidade.", 404)
    metrics = service.one("SELECT COUNT(*) AS student_count,COALESCE(SUM(s.xp),0)::bigint AS total_xp,COALESCE(ROUND(AVG(COALESCE(s.xp,0)),1),0)::float AS average_xp,COALESCE(SUM(s.missoes_concluidas),0)::bigint AS missions_completed,COALESCE(SUM(s.aulas_concluidas),0)::bigint AS lessons_completed FROM student_school_memberships m JOIN users u ON u.id=m.student_id LEFT JOIN stats s ON s.user_id=u.id WHERE m.school_id=%s AND m.class_id=%s AND u.active=TRUE AND u.role='USER'", (school_id, classroom["id"]))
    return {"resumo": {**classroom, **metrics}}
