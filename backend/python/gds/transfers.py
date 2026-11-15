"""Formal school transfers, RF22 and RN41/RN42/RN49."""
from .access import require
from .errors import ApiError
from .school_management import numeric, text
from .security import identifier
from .time import now

FIELDS = "r.id,r.student_id,r.student_name,r.registration_number,r.source_school_id,r.source_name,r.destination_school_id,r.destination_name,r.status,r.requested_by,r.created_at,r.decided_by,r.decided_at,r.executed_by,r.executed_at"


def actor(service, actor_id, admin=False):
    account = service.one("SELECT id,nome,role FROM users WHERE id=%s AND active=TRUE",(actor_id,))
    roles = ('ADMIN',) if admin else ('ADMIN','GESTOR_ESCOLAR')
    if not account or account['role'] not in roles:
        raise ApiError("Seu perfil nao permite esta operacao de transferencia.",403)
    return account


def origin(service, actor_id):
    account = actor(service,actor_id)
    if account['role'] != 'GESTOR_ESCOLAR' or not getattr(service,'school_id',None):
        raise ApiError("A solicitacao deve ser iniciada pelo gestor da unidade de origem.",403)
    if not service.one("SELECT s.id FROM schools s JOIN school_manager_links l ON l.school_id=s.id WHERE s.id=%s AND s.active AND l.manager_id=%s AND l.authorized",(service.school_id,actor_id)):
        raise ApiError("Unidade de origem nao autorizada.",403)
    return service.school_id


def read_request(service, actor_id, request_id, lock=False):
    account = actor(service,actor_id)
    query = "SELECT " + FIELDS + ",r.justification,r.decision_note FROM school_transfer_requests r WHERE r.id=%s"
    params = [request_id]
    if account['role'] != 'ADMIN':
        query += " AND r.source_school_id=%s"
        params.append(origin(service,actor_id))
    row = service.one(query + (" FOR UPDATE OF r" if lock else ""),params)
    if not row:
        raise ApiError("Solicitacao nao encontrada.",404)
    return row


def listing(service, actor_id):
    require(service,actor_id,'transfers.read')
    account = actor(service,actor_id)
    condition, params = ("",()) if account['role']=='ADMIN' else (" WHERE r.source_school_id=%s",(origin(service,actor_id),))
    return {"solicitacoes": service.all("SELECT " + FIELDS + " FROM school_transfer_requests r" + condition + " ORDER BY r.created_at DESC,r.id",params)}


def detail(service, actor_id, request_id):
    require(service,actor_id,'transfers.read')
    row = read_request(service,actor_id,request_id)
    row['events'] = service.all("SELECT status,actor_id,actor_name,note,created_at FROM school_transfer_events WHERE request_id=%s ORDER BY id",(request_id,))
    return {'solicitacao': row}


def options(service, actor_id):
    require(service,actor_id,'transfers.create')
    school_id = origin(service,actor_id)
    return {'unidades': service.all("SELECT id,name FROM schools WHERE active=TRUE AND id<>%s ORDER BY lower(name),id",(school_id,)),
            'alunos': service.all("SELECT u.id,u.nome,m.registration_number FROM student_school_memberships m JOIN users u ON u.id=m.student_id WHERE m.school_id=%s AND u.active AND u.role='USER' ORDER BY lower(u.nome),u.id",(school_id,))}


def event(service, request_id, state, account, note=''):
    service.db.execute("INSERT INTO school_transfer_events(request_id,status,actor_id,actor_name,note,created_at) VALUES (%s,%s,%s,%s,%s,%s)",(request_id,state,account['id'],account['nome'],note,now()))


def create(service, actor_id, data):
    require(service,actor_id,'transfers.create')
    school_id = origin(service,actor_id)
    if set(data)-{'student_id','destination_school_id','justification'}:
        raise ApiError("Informe somente aluno, destino e justificativa.")
    student_id = data.get('student_id')
    if not isinstance(student_id,str) or not student_id:
        raise ApiError("Selecione um aluno desta unidade.")
    destination = numeric(data.get('destination_school_id'))
    if destination == school_id:
        raise ApiError("Escolha uma unidade de destino diferente da origem.")
    student = service.one("SELECT u.nome,m.registration_number FROM student_school_memberships m JOIN users u ON u.id=m.student_id WHERE m.student_id=%s AND m.school_id=%s AND u.active AND u.role='USER' FOR UPDATE OF m",(student_id,school_id))
    if not student:
        raise ApiError("Aluno nao encontrado na unidade de origem.",404)
    target = service.one("SELECT name FROM schools WHERE id=%s AND active=TRUE",(destination,))
    if not target:
        raise ApiError("Selecione uma unidade de destino ativa.",404)
    justification = text(data.get('justification'),'uma justificativa',2000)
    if service.one("SELECT id FROM school_transfer_requests WHERE student_id=%s AND status IN ('PENDENTE','APROVADA')",(student_id,)):
        raise ApiError("Este aluno ja possui uma transferencia pendente ou aprovada.",409)
    request_id = identifier('transfer')
    source = service.one("SELECT name FROM schools WHERE id=%s",(school_id,))
    service.db.execute("INSERT INTO school_transfer_requests(id,student_id,student_name,registration_number,source_school_id,source_name,destination_school_id,destination_name,justification,requested_by,created_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                       (request_id,student_id,student['nome'],student['registration_number'],school_id,source['name'],destination,target['name'],justification,actor_id,now()))
    event(service,request_id,'PENDENTE',actor(service,actor_id),justification)
    return detail(service,actor_id,request_id)


def validate_membership(service, row):
    schools = service.all("SELECT id FROM schools WHERE id IN (%s,%s) AND active=TRUE FOR SHARE",(row['source_school_id'],row['destination_school_id']))
    if len(schools)!=2:
        raise ApiError("Origem e destino devem estar ativos. Revise a solicitacao.",409)
    member = service.one("SELECT m.* FROM student_school_memberships m JOIN users u ON u.id=m.student_id WHERE m.student_id=%s AND m.school_id=%s AND u.active AND u.role='USER' FOR UPDATE OF m",(row['student_id'],row['source_school_id']))
    if not member:
        raise ApiError("O aluno nao possui mais um vinculo ativo com a origem. Revise a solicitacao.",409)
    if service.one("SELECT student_id FROM student_school_memberships WHERE school_id=%s AND registration_number=%s AND student_id<>%s",(row['destination_school_id'],member['registration_number'],row['student_id'])):
        raise ApiError("A matricula ja esta vinculada a outro aluno no destino.",409)
    return member


def review(service, actor_id, request_id, data, approve):
    account = actor(service,actor_id,admin=True)
    require(service,actor_id,'transfers.review')
    if set(data)-{'note'} or not isinstance(data.get('note',''),str) or len(data.get('note','').strip())>2000:
        raise ApiError("Informe um parecer de ate 2000 caracteres.")
    row = read_request(service,actor_id,request_id,lock=True)
    state = 'APROVADA' if approve else 'REJEITADA'
    if row['status']==state:
        return detail(service,actor_id,request_id)
    permitted = ('PENDENTE',) if approve else ('PENDENTE','APROVADA')
    if row['status'] not in permitted:
        raise ApiError("Esta solicitacao nao permite a decisao selecionada.",409)
    if approve:
        validate_membership(service,row)
    note = data.get('note','').strip()
    service.db.execute("UPDATE school_transfer_requests SET status=%s,decided_by=%s,decided_at=%s,decision_note=%s WHERE id=%s",(state,actor_id,now(),note,request_id))
    event(service,request_id,state,account,note)
    return detail(service,actor_id,request_id)


def execute(service, actor_id, request_id, data):
    account = actor(service,actor_id,admin=True)
    require(service,actor_id,'transfers.execute')
    if set(data)!={'confirm'} or data['confirm'] is not True:
        raise ApiError("Confirme a execucao da transferencia aprovada.")
    row = read_request(service,actor_id,request_id,lock=True)
    if row['status']=='EXECUTADA':
        return detail(service,actor_id,request_id)
    if row['status']!='APROVADA':
        raise ApiError("A transferencia deve estar aprovada antes da execucao.",409)
    member = validate_membership(service,row)
    stamp = now()
    service.db.execute("INSERT INTO school_transfer_membership_history(transfer_id,student_id,school_id,registration_number,class_id,membership_updated_at,closed_by,closed_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",(request_id,row['student_id'],member['school_id'],member['registration_number'],member['class_id'],member['updated_at'],actor_id,stamp))
    if member['class_id'] is not None:
        service.db.execute("INSERT INTO class_enrollment_events(student_id,school_id,from_class_id,to_class_id,actor_id) VALUES (%s,%s,%s,NULL,%s)",(row['student_id'],member['school_id'],member['class_id'],actor_id))
    service.db.execute("UPDATE student_school_memberships SET school_id=%s,class_id=NULL,updated_at=CURRENT_TIMESTAMP WHERE student_id=%s",(row['destination_school_id'],row['student_id']))
    target = service.one("SELECT name FROM schools WHERE id=%s",(row['destination_school_id'],))
    service.db.execute("UPDATE users SET escola=%s,turma='',updated_at=%s WHERE id=%s",(target['name'],stamp,row['student_id']))
    service.db.execute("UPDATE school_transfer_requests SET status='EXECUTADA',executed_by=%s,executed_at=%s WHERE id=%s",(actor_id,stamp,request_id))
    event(service,request_id,'EXECUTADA',account,'Vinculo atualizado. A alocacao na turma de destino cabe ao gestor autorizado.')
    return detail(service,actor_id,request_id)
