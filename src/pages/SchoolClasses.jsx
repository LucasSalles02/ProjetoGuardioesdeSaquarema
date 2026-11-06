import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowRightLeft, BarChart3, Eye, GraduationCap, Loader2, Pencil, Plus, RefreshCw, Search, UserMinus, Users } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import PageShell from "../components/PageShell";
import LevelBadge from "../components/LevelBadge";
import SchoolReportDialog from "../components/SchoolReportDialog";
import StudentRecordDialog from "../components/StudentRecordDialog";
import AdminDialog from "../components/admin/AdminDialog";
import { gestaoEscolar } from "../services/api";
import { useSchool } from "../context/SchoolContext";
import { useAuth } from "../context/AuthContext";
import { can } from "../services/permissions";

const inputClass = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl border border-sky-100 bg-white px-3 py-2.5 text-sm font-bold text-sky-800 focus-visible:outline-sky-600 disabled:opacity-40";
const primaryClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white focus-visible:outline-sky-600 disabled:opacity-40";

export default function SchoolClasses() {
  const { activeUnit } = useSchool();
  const { user } = useAuth();
  const { classId } = useParams();
  const { pathname } = useLocation();
  const allStudents = pathname.endsWith("/alunos");
  const [data, setData] = useState({ turmas: [], alunos: [], etapas: [] });
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [editor, setEditor] = useState(null);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [assignment, setAssignment] = useState(null);
  const [destination, setDestination] = useState("");
  const [adding, setAdding] = useState(false);
  const [selection, setSelection] = useState([]);
  const [candidateQuery, setCandidateQuery] = useState("");
  const [report, setReport] = useState(null);
  const [record, setRecord] = useState(null);
  const canWrite = user.role === "GESTOR_ESCOLAR" && can(user, "enrollments.update");
  const selectedClass = data.turmas.find(item => String(item.id) === classId);
  useEffect(() => { setQuery(""); setNotice(""); setClassFilter(""); }, [pathname]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    Promise.all([
      can(user, "classes.read") ? gestaoEscolar.turmas() : Promise.resolve({ turmas: [] }),
      can(user, "enrollments.read") ? gestaoEscolar.alunos() : Promise.resolve({ alunos: [] }),
      can(user, "classes.read") ? gestaoEscolar.etapas() : Promise.resolve({ etapas: [] }),
    ]).then(([classes, students, stages]) => { if (active) setData({ ...classes, ...students, ...stages }); })
      .catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeUnit.id, attempt, user]);

  function updateStudent(aluno) {
    setData(current => {
      const previous = current.alunos.find(item => item.id === aluno.id);
      return { ...current, alunos: current.alunos.map(item => item.id === aluno.id ? aluno : item), turmas: current.turmas.map(item => ({ ...item, student_count: Number(item.student_count) - (previous?.class_id === item.id ? 1 : 0) + (aluno.class_id === item.id ? 1 : 0) })) };
    });
  }
  async function saveClass(event) {
    event.preventDefault();
    if (busy || user.role !== "GESTOR_ESCOLAR") return;
    setBusy(true); setFormError("");
    try {
      const { turma } = await gestaoEscolar.salvarTurma(editor.id, { identification: editor.identification, stage_id: editor.stage_id });
      setNotice(`Turma ${turma.identification} salva em ${activeUnit.name}.`); setEditor(null); setAttempt(value => value + 1);
    } catch (err) { setFormError(err.message); }
    finally { setBusy(false); }
  }
  async function saveAssignment(event) {
    event.preventDefault();
    if (busy || !canWrite) return;
    setBusy(true); setFormError("");
    try {
      const { aluno } = await gestaoEscolar.vincularAluno(assignment.student.id, assignment.remove ? null : destination, assignment.student.class_id);
      updateStudent(aluno);
      setNotice(assignment.remove ? `${aluno.nome} foi removido da turma e permanece na unidade escolar.` : `${aluno.nome} alocado na turma ${aluno.class_name}.`);
      setAssignment(null);
    } catch (err) { setFormError(err.message); }
    finally { setBusy(false); }
  }
  async function allocate(event) {
    event.preventDefault();
    if (busy || !canWrite || !selectedClass || !selection.length) return;
    setBusy(true); setFormError("");
    try {
      const result = await gestaoEscolar.alocarAlunos(selectedClass.id, selection);
      setData(current => ({ ...current, ...result })); setAdding(false);
      setNotice(`${selection.length} aluno(s) alocado(s) na turma ${selectedClass.identification}.`);
    } catch (err) { setFormError(err.message); }
    finally { setBusy(false); }
  }
  function openAssignment(student, remove = false) { setAssignment({ student, remove }); setDestination(""); setFormError(""); }
  function openEditor(item) { setEditor(item ? { ...item } : { identification: "", stage_id: "" }); setFormError(""); }
  const term = query.trim().toLocaleLowerCase("pt-BR");
  const matches = item => `${item.nome} ${item.registration_number}`.toLocaleLowerCase("pt-BR").includes(term);
  const classes = data.turmas.filter(item => `${item.identification} ${item.stage_name}`.toLocaleLowerCase("pt-BR").includes(term));
  const students = data.alunos.filter(item => matches(item) && (classId ? String(item.class_id) === classId : !classFilter || (classFilter === "unassigned" ? !item.class_id : String(item.class_id) === classFilter)));
  const candidates = data.alunos.filter(item => !item.class_id && `${item.nome} ${item.registration_number}`.toLocaleLowerCase("pt-BR").includes(candidateQuery.trim().toLocaleLowerCase("pt-BR")));
  const viewingStudents = allStudents || Boolean(classId);
  const canReadScreen = viewingStudents ? can(user, "enrollments.read") && (!classId || can(user, "classes.read")) : can(user, "classes.read");
  const title = allStudents ? "Todos os alunos" : classId ? selectedClass?.identification || "Alunos da turma" : "Turmas da unidade";

  return <PageShell title={title} description={activeUnit.name}>
    <Link to={classId ? "/gestao-escolar/turmas" : "/gestao-escolar"} className="inline-flex items-center gap-2 text-sm font-bold text-sky-700"><ArrowLeft size={17} aria-hidden="true" />{classId ? "Voltar às turmas" : "Voltar à Gestão"}</Link>
    <nav aria-label="Gerenciamentos da unidade" className="mt-5 flex flex-wrap gap-2">
      {[
        ["/gestao-escolar/turmas", "Turmas", "classes.read"],
        ["/gestao-escolar/alunos", "Todos os alunos", "enrollments.read"],
      ].filter(([, , permission]) => can(user, permission)).map(([to, label]) => {
        const active = allStudents ? to.endsWith("alunos") : to.endsWith("turmas");
        const colors = active
          ? "border-sky-700 bg-sky-700 text-white hover:bg-sky-800"
          : "border-sky-100 bg-white text-sky-800 hover:bg-sky-50";
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold focus-visible:outline-sky-600 ${colors}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
    <section className="mt-5 rounded-3xl border border-cyan-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black text-sky-950">{title}</h2>{selectedClass && <p className="mt-1 text-sm text-slate-600">{selectedClass.stage_name}{!selectedClass.stage_active ? " · Etapa inativa" : ""} · {selectedClass.student_count} aluno(s)</p>}</div><div className="flex flex-wrap gap-2"><button type="button" disabled={loading || busy} onClick={() => setAttempt(value => value + 1)} aria-label="Atualizar turmas e alunos" className={buttonClass}><RefreshCw size={18} aria-hidden="true" /></button>{!viewingStudents && user.role === "GESTOR_ESCOLAR" && can(user, "classes.create") && <button type="button" disabled={loading || Boolean(error)} onClick={() => openEditor()} className={primaryClass}><Plus size={17} aria-hidden="true" />Cadastrar turma</button>}{classId && selectedClass && canWrite && <button type="button" disabled={loading || busy || Boolean(error)} onClick={() => { setSelection([]); setCandidateQuery(""); setFormError(""); setAdding(true); }} className={primaryClass}><Plus size={17} aria-hidden="true" />Acrescentar alunos à turma</button>}</div></div>
      {user.admin && <p className="mt-4 rounded-xl bg-sky-50 p-3 text-sm text-sky-800">Acesso somente para consulta. O cadastro, a edição de turmas e os vínculos de alunos são exclusivos do gestor escolar.</p>}
      {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}{error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error} Use Atualizar para tentar novamente.</p>}
      {!canReadScreen ? <p role="alert" className="mt-5 text-sm text-slate-600">Seu perfil não permite consultar esta listagem.</p> : <>
        <div className="mt-5 flex flex-wrap gap-3"><label className="relative min-w-0 basis-48 flex-1"><span className="sr-only">{viewingStudents ? "Buscar aluno ou matrícula" : "Buscar turma ou etapa"}</span><Search size={18} className="absolute left-3 top-3.5 text-slate-400" aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={viewingStudents ? "Buscar aluno ou matrícula" : "Buscar turma ou etapa"} className={`${inputClass} pl-10`} /></label>{allStudents && can(user, "classes.read") && <label><span className="sr-only">Filtrar alunos por turma</span><select value={classFilter} onChange={event => setClassFilter(event.target.value)} className={inputClass}><option value="">Todas as turmas</option><option value="unassigned">Aguardando turma</option>{data.turmas.map(item => <option key={item.id} value={item.id}>{item.identification}</option>)}</select></label>}</div>
        {loading ? <p role="status" className="mt-5 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={18} className="motion-safe:animate-spin" aria-hidden="true" />Carregando dados da unidade…</p> : classId && !selectedClass ? <p role="alert" className="mt-5 text-sm text-slate-600">Turma não encontrada nesta unidade.</p> : !viewingStudents ? <ul className="mt-5 space-y-3" aria-label="Turmas da unidade">{classes.map(item => <li key={item.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-cyan-100 bg-cyan-50/30 p-4"><GraduationCap size={28} className="shrink-0 text-sky-700" aria-hidden="true" /><div className="min-w-0 flex-1"><h3 className="font-bold text-sky-950">{can(user, "enrollments.read") ? <Link to={`/gestao-escolar/turmas/${item.id}`} className="rounded hover:underline focus-visible:outline-sky-600">{item.identification}</Link> : item.identification}</h3><p className="mt-1 text-sm text-slate-600">{item.stage_name}{!item.stage_active ? " · Etapa inativa" : ""} · {item.student_count} aluno(s)</p></div><div className="flex flex-wrap gap-2">{can(user, "enrollments.read") && <Link to={`/gestao-escolar/turmas/${item.id}`} aria-label={`Ver alunos da turma ${item.identification}`} className={buttonClass}>Ver alunos<ArrowRight size={16} aria-hidden="true" /></Link>}{can(user, "school_progress.reports") && <button type="button" onClick={() => setReport({ type: "class", id: item.id, name: item.identification })} className={buttonClass}><BarChart3 size={16} aria-hidden="true" />Consolidado</button>}{user.role === "GESTOR_ESCOLAR" && can(user, "classes.update") && <button type="button" onClick={() => openEditor(item)} aria-label={`Editar turma ${item.identification}`} className={buttonClass}><Pencil size={15} aria-hidden="true" />Editar</button>}</div></li>)}{!classes.length && !error && <li className="py-5 text-sm text-slate-500">Nenhuma turma encontrada nesta unidade.</li>}</ul> : <>
          {selectedClass && can(user, "school_progress.reports") && <button type="button" onClick={() => setReport({ type: "class", id: selectedClass.id, name: selectedClass.identification })} className={`${buttonClass} mt-4`}><BarChart3 size={16} aria-hidden="true" />Consolidado da turma</button>}
          <div className="table-frame mt-5 overflow-x-auto" tabIndex={0} role="region" aria-label="Lista de alunos"><table role="table" className="responsive-table w-full text-left text-sm"><caption className="sr-only">{selectedClass ? `Alunos da turma ${selectedClass.identification}` : "Todos os alunos da unidade ativa"}</caption><thead role="rowgroup" className="border-b bg-slate-50 text-slate-500"><tr role="row">{["Aluno", "Matrícula", "Turma", "Etapa", "Ações"].map(label => <th role="columnheader" key={label} scope="col" className="px-3 py-3">{label}</th>)}</tr></thead><tbody role="rowgroup">{students.map(item => <tr role="row" key={item.id} className="border-b border-slate-100 last:border-0"><td role="cell" data-label="Aluno" className="px-3 py-4 font-bold">{allStudents ? <span className="inline-flex items-center gap-3"><span className="shrink-0" title={`Nível ${item.level}: ${item.level_name}`}><LevelBadge level={item.level} size="profile" /></span><span className="min-w-0 break-words">{item.nome}</span></span> : item.nome}</td><td role="cell" data-label="Matrícula" className="px-3 py-4">{item.registration_number}</td><td role="cell" data-label="Turma" className="px-3 py-4">{item.class_name || "Aguardando turma"}</td><td role="cell" data-label="Etapa" className="px-3 py-4">{item.stage_name || "—"}</td><td role="cell" data-label="Ações" className="px-3 py-4"><div className="flex flex-wrap gap-2">{allStudents ? <><button type="button" onClick={() => setRecord(item)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-3 py-2.5 text-sm font-bold text-white hover:bg-blue-800 focus-visible:outline-blue-600" aria-label={`Visualizar cadastro de ${item.nome}`}><Eye size={17} aria-hidden="true" />Visualizar cadastro</button>{can(user, "school_progress.read") && <button type="button" onClick={() => setReport({ type: "student", id: item.id, name: item.nome })} aria-label={`Visualizar progresso de ${item.nome}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-3 py-2.5 text-sm font-bold text-white hover:bg-teal-800 focus-visible:outline-teal-600"><BarChart3 size={17} aria-hidden="true" />Progresso</button>}</> : canWrite ? <><button type="button" disabled={busy || Boolean(error) || !data.turmas.some(group => group.id !== item.class_id)} onClick={() => openAssignment(item)} aria-label={`Transferir ${item.nome} de turma`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-3 py-2.5 text-sm font-bold text-white hover:bg-blue-800 focus-visible:outline-blue-600 disabled:opacity-40"><ArrowRightLeft size={17} aria-hidden="true" />Transferir de turma</button><button type="button" disabled={busy || Boolean(error)} onClick={() => openAssignment(item, true)} aria-label={`Remover ${item.nome} da turma`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-3 py-2.5 text-sm font-bold text-white hover:bg-red-800 focus-visible:outline-red-600 disabled:opacity-40"><UserMinus size={17} aria-hidden="true" />Remover da turma</button></> : <span className="text-xs text-slate-500">Somente consulta</span>}</div></td></tr>)}</tbody></table>{!students.length && !error && <p className="py-6 text-center text-sm text-slate-500">{classId ? "Nenhum aluno encontrado nesta turma." : "Nenhum aluno encontrado na unidade escolar."}</p>}</div>
        </>}
      </>}
    </section>
    {report && <SchoolReportDialog report={report} onClose={() => setReport(null)} />}
    {record && <StudentRecordDialog student={record} onClose={() => setRecord(null)} />}
    {user.role === "GESTOR_ESCOLAR" && editor && <AdminDialog title={editor.id ? "Editar turma" : "Cadastrar turma"} description={`Unidade: ${activeUnit.name}`} icon={GraduationCap} busy={busy} onClose={() => setEditor(null)}><form onSubmit={saveClass} className="space-y-4 p-5"><FormError error={formError} /><fieldset disabled={busy} className="space-y-4"><label className="block text-sm font-bold">Unidade Escolar<input value={activeUnit.name} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} /></label><label className="block text-sm font-bold">Identificação da turma<input required minLength={2} maxLength={80} value={editor.identification} onChange={event => setEditor({ ...editor, identification: event.target.value })} placeholder="Ex.: 2º ano A" className={inputClass} /></label><label className="block text-sm font-bold">Etapa Escolar<select required value={editor.stage_id} onChange={event => setEditor({ ...editor, stage_id: event.target.value })} className={inputClass}><option value="">Selecione a etapa</option>{editor.id && !data.etapas.some(item => item.id === Number(editor.stage_id)) && <option value={editor.stage_id}>{editor.stage_name} (inativa)</option>}{data.etapas.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{!data.etapas.length && <p className="text-xs text-amber-800">Solicite à administração a ativação ou o cadastro de uma etapa.</p>}</fieldset><DialogActions busy={busy} onClose={() => setEditor(null)} label="Salvar turma" /></form></AdminDialog>}
    {canWrite && assignment && <AdminDialog title={assignment.remove ? "Remover aluno da turma?" : assignment.student.class_id ? "Transferir de turma" : "Alocar na turma"} description={activeUnit.name} icon={Users} busy={busy} onClose={() => setAssignment(null)}><form onSubmit={saveAssignment} className="space-y-4 p-5"><p className="font-bold">{assignment.student.nome}</p><p className="text-sm text-slate-500">Matrícula: {assignment.student.registration_number} · Turma atual: {assignment.student.class_name || "Aguardando turma"}</p><FormError error={formError} />{assignment.remove ? <p className="text-sm text-slate-600">O aluno ficará sem turma e continuará vinculado a esta unidade escolar. Seu progresso e seus dados cadastrais serão preservados.</p> : <label className="block text-sm font-bold">Turma de destino<select required disabled={busy} value={destination} onChange={event => setDestination(event.target.value)} className={inputClass}><option value="">Selecione a turma</option>{data.turmas.filter(item => item.id !== assignment.student.class_id).map(item => <option key={item.id} value={item.id}>{item.identification} · {item.stage_name}</option>)}</select></label>}<p className="text-xs text-slate-500">Cada aluno pode ter somente uma turma, sempre dentro da unidade ativa. Pontuação, conquistas e histórico serão preservados.</p><DialogActions busy={busy} onClose={() => setAssignment(null)} label={assignment.remove ? "Confirmar remoção" : "Confirmar alocação"} disabled={!assignment.remove && !destination} /></form></AdminDialog>}
    {canWrite && adding && selectedClass && <AdminDialog title="Acrescentar alunos à turma" description={`${selectedClass.identification} · ${activeUnit.name}`} icon={Users} busy={busy} onClose={() => setAdding(false)}><form onSubmit={allocate} className="space-y-4 p-5"><p className="text-sm text-slate-600">Selecione os alunos desta unidade que ainda não possuem turma. Para alunos já alocados, utilize Transferir de turma.</p><FormError error={formError} /><label className="block text-sm font-bold">Pesquisar aluno<input disabled={busy} value={candidateQuery} onChange={event => setCandidateQuery(event.target.value)} placeholder="Nome ou matrícula" className={inputClass} /></label><p className="text-xs font-bold text-sky-800" role="status">{selection.length} aluno(s) selecionado(s) · máximo de 200 por operação</p><fieldset disabled={busy} className="max-h-64 space-y-2 overflow-y-auto"><legend className="sr-only">Alunos sem turma</legend>{candidates.map(item => <label key={item.id} className="flex items-center gap-3 rounded-xl border border-cyan-100 p-3"><input type="checkbox" checked={selection.includes(item.id)} disabled={!selection.includes(item.id) && selection.length >= 200} onChange={event => setSelection(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))} className="h-5 w-5 shrink-0 accent-sky-700" /><span className="min-w-0 text-sm"><span className="block break-words font-bold">{item.nome}</span><span className="text-xs text-slate-500">Matrícula: {item.registration_number}</span></span></label>)}{!candidates.length && <p className="py-4 text-sm text-slate-500">Nenhum aluno sem turma encontrado nesta unidade.</p>}</fieldset><DialogActions busy={busy} onClose={() => setAdding(false)} label="Alocar na turma" disabled={!selection.length} /></form></AdminDialog>}
  </PageShell>;
}

function FormError({ error }) { return error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error} Se a listagem mudou, feche a janela e use Atualizar.</p> : null; }
function DialogActions({ busy, onClose, label, disabled = false }) { return <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={busy} onClick={onClose} className={buttonClass}>Cancelar</button><button type="submit" disabled={busy || disabled} className={primaryClass}>{busy ? "Salvando…" : label}</button></div>; }
