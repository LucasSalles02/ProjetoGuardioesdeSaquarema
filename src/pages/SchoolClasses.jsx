import { useEffect, useState } from "react";
import { ArrowLeft, BarChart3, GraduationCap, Loader2, Pencil, Plus, RefreshCw, Search, Users } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import SchoolReportDialog from "../components/SchoolReportDialog";
import AdminDialog from "../components/admin/AdminDialog";
import { gestaoEscolar } from "../services/api";
import { useSchool } from "../context/SchoolContext";
import { useAuth } from "../context/AuthContext";
import { can } from "../services/permissions";

const inputClass = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

export default function SchoolClasses() {
  const { activeUnit } = useSchool();
  const { user } = useAuth();
  const [data, setData] = useState({ turmas: [], alunos: [], etapas: [] });
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState(can(user, "classes.read") ? "classes" : "students");
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [editor, setEditor] = useState(null);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [assignment, setAssignment] = useState(null);
  const [destination, setDestination] = useState("");
  const [report, setReport] = useState(null);
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

  function openClass(item) { setEditor(item ? { ...item } : { identification: "", stage_id: "" }); setFormError(""); }
  async function saveClass(event) {
    event.preventDefault();
    if (busy || user.role !== "GESTOR_ESCOLAR") return;
    setBusy(true); setFormError("");
    try {
      const { turma } = await gestaoEscolar.salvarTurma(editor.id, { identification: editor.identification, stage_id: editor.stage_id });
      setData(current => ({ ...current, turmas: [...current.turmas.filter(item => item.id !== turma.id), turma].sort((a, b) => a.identification.localeCompare(b.identification, "pt-BR")) }));
      setNotice(`Turma ${turma.identification} salva em ${activeUnit.name}.`); setEditor(null);
      setAttempt(value => value + 1);
    } catch (err) { setFormError(err.message); }
    finally { setBusy(false); }
  }
  async function saveAssignment(event) {
    event.preventDefault();
    if (busy || user.role !== "GESTOR_ESCOLAR") return;
    setBusy(true); setFormError("");
    try {
      const { aluno } = await gestaoEscolar.vincularAluno(assignment.id, destination);
      setData(current => ({ ...current, alunos: current.alunos.map(item => item.id === aluno.id ? aluno : item) }));
      setNotice(`${aluno.nome} vinculado à turma ${aluno.class_name}.`); setAssignment(null); setAttempt(value => value + 1);
    } catch (err) { setFormError(err.message); }
    finally { setBusy(false); }
  }
  const term = query.trim().toLocaleLowerCase("pt-BR");
  const classes = data.turmas.filter(item => `${item.identification} ${item.stage_name}`.toLocaleLowerCase("pt-BR").includes(term));
  const students = data.alunos.filter(item => `${item.nome} ${item.registration_number}`.toLocaleLowerCase("pt-BR").includes(term) && (!classFilter || (classFilter === "unassigned" ? !item.class_id : String(item.class_id) === classFilter)));

  return <PageShell title="Gestão de Turmas e Alunos" description={activeUnit.name}>
    <Link to="/gestao-escolar" className="inline-flex items-center gap-2 text-sm font-bold text-sky-700"><ArrowLeft size={17} aria-hidden="true" /> Voltar à Gestão</Link>
    <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2" role="group" aria-label="Gerenciamentos da unidade">{[["classes", "Turmas", "classes.read"], ["students", "Alunos", "enrollments.read"]].filter(([, , permission]) => can(user, permission)).map(([key, label]) => <button key={key} type="button" aria-pressed={tab === key} onClick={() => { setTab(key); setQuery(""); }} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${tab === key ? "bg-sky-600 text-white" : "border border-slate-200 text-sky-700"}`}>{label}</button>)}</div><div className="flex gap-2"><button type="button" disabled={loading || busy} onClick={() => setAttempt(value => value + 1)} aria-label="Atualizar turmas e alunos" className="rounded-xl border border-slate-200 p-2.5 text-sky-700 disabled:opacity-40"><RefreshCw size={18} aria-hidden="true" /></button>{tab === "classes" && user.role === "GESTOR_ESCOLAR" && can(user, "classes.create") && <button type="button" disabled={loading || Boolean(error)} onClick={() => openClass()} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Plus size={17} aria-hidden="true" /> Cadastrar turma</button>}</div></div>
      {user.admin && <p className="mt-4 rounded-xl bg-sky-50 p-3 text-sm text-sky-800">Acesso somente para consulta. O cadastro, a edição de turmas e os vínculos de alunos são exclusivos do gestor escolar.</p>}
      {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}{error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error} Use Atualizar para tentar novamente.</p>}
      <div className="mt-5 flex flex-wrap gap-3"><label className="relative min-w-0 basis-48 flex-1"><span className="sr-only">Buscar {tab === "classes" ? "turma ou etapa" : "aluno ou matrícula"}</span><Search size={18} className="absolute left-3 top-3 text-slate-400" aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={tab === "classes" ? "Buscar turma ou etapa" : "Buscar aluno ou matrícula"} className={`${inputClass} pl-10`} /></label>{tab === "students" && <label><span className="sr-only">Filtrar alunos por turma</span><select value={classFilter} onChange={event => setClassFilter(event.target.value)} className={inputClass}><option value="">Todas as turmas</option><option value="unassigned">Aguardando turma</option>{data.turmas.map(item => <option key={item.id} value={item.id}>{item.identification}</option>)}</select></label>}</div>
      {loading ? <p role="status" className="mt-5 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Carregando dados da unidade...</p> : tab === "classes" ? <div className="mt-5 adaptive-card-grid grid gap-4">{classes.map(item => <article key={item.id} className="rounded-2xl border border-slate-200 p-4"><GraduationCap size={26} className="text-sky-700" aria-hidden="true" /><h2 className="mt-3 break-words font-bold">{item.identification}</h2><p className="mt-1 text-sm text-slate-500">{item.stage_name}{!item.stage_active ? " · Etapa inativa" : ""}</p><p className="mt-2 text-sm text-slate-600">{item.student_count} aluno(s)</p><div className="mt-4 flex flex-wrap gap-3">{can(user, "enrollments.read") && <button type="button" onClick={() => { setClassFilter(String(item.id)); setTab("students"); setQuery(""); }} className="inline-flex items-center gap-1.5 text-sm font-bold text-sky-700"><Users size={16} aria-hidden="true" /> Alunos</button>}{can(user, "school_progress.reports") && <button type="button" onClick={() => setReport({ type: "class", id: item.id, name: item.identification })} className="inline-flex items-center gap-1.5 text-sm font-bold text-sky-700"><BarChart3 size={16} aria-hidden="true" /> Consolidado</button>}{user.role === "GESTOR_ESCOLAR" && can(user, "classes.update") && <button type="button" onClick={() => openClass(item)} aria-label={`Editar turma ${item.identification}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-sky-700"><Pencil size={15} aria-hidden="true" /> Editar</button>}</div></article>)}{!classes.length && !error && <p className="py-5 text-sm text-slate-500">Nenhuma turma encontrada nesta unidade.</p>}</div> : <div className="table-frame mt-5 overflow-x-auto" tabIndex={0} role="region" aria-label="Lista de cadastros"><table role="table" className="responsive-table w-full text-left text-sm"><caption className="sr-only">Alunos da unidade ativa e suas turmas</caption><thead role="rowgroup" className="border-b bg-slate-50 text-slate-500"><tr role="row">{["Aluno", "Matrícula", "Turma", "Etapa", "Ações"].map(label => <th role="columnheader" key={label} scope="col" className="px-3 py-3">{label}</th>)}</tr></thead><tbody role="rowgroup">{students.map(item => <tr role="row" key={item.id} className="border-b border-slate-100 last:border-0"><td role="cell" data-label="Aluno" className="px-3 py-4 font-bold">{item.nome}</td><td role="cell" data-label="Matrícula" className="px-3 py-4">{item.registration_number}</td><td role="cell" data-label="Turma" className="px-3 py-4">{item.class_name || "Aguardando turma"}</td><td role="cell" data-label="Etapa" className="px-3 py-4">{item.stage_name || "—"}</td><td role="cell" data-label="Ações" className="px-3 py-4"><div className="flex flex-wrap gap-2">{can(user, "school_progress.read") && <button type="button" onClick={() => setReport({ type: "student", id: item.id, name: item.nome })} className="whitespace-nowrap rounded-lg border border-sky-100 px-3 py-2 text-sm font-bold text-sky-700">Progresso</button>}{user.role === "GESTOR_ESCOLAR" && can(user, "enrollments.update") && <button type="button" disabled={!data.turmas.length} onClick={() => { setAssignment(item); setDestination(item.class_id ? String(item.class_id) : ""); setFormError(""); }} className="whitespace-nowrap rounded-lg bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700 disabled:opacity-40">{item.class_id ? "Transferir turma" : "Vincular à turma"}</button>}</div></td></tr>)}</tbody></table>{!students.length && !error && <p className="py-6 text-center text-sm text-slate-500">Nenhum aluno encontrado. A administração deve cadastrar a conta e vinculá-la a esta unidade.</p>}</div>}
    </section>
    {report && <SchoolReportDialog report={report} onClose={() => setReport(null)} />}
    {user.role === "GESTOR_ESCOLAR" && editor && <AdminDialog title={editor.id ? "Editar turma" : "Cadastrar turma"} description={`Unidade: ${activeUnit.name}`} icon={GraduationCap} busy={busy} onClose={() => { if (!busy) setEditor(null); }}><form onSubmit={saveClass} className="space-y-4 p-5">{formError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</p>}<fieldset disabled={busy} className="space-y-4"><label className="block text-sm font-bold">Unidade Escolar<input value={activeUnit.name} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} /></label><label className="block text-sm font-bold">Identificação da turma<input required minLength={2} maxLength={80} value={editor.identification} onChange={event => setEditor({ ...editor, identification: event.target.value })} placeholder="Ex.: 2º ano A" className={inputClass} /></label><label className="block text-sm font-bold">Etapa Escolar<select required value={editor.stage_id} onChange={event => setEditor({ ...editor, stage_id: event.target.value })} className={inputClass}><option value="">Selecione a etapa</option>{editor.id && !data.etapas.some(item => item.id === Number(editor.stage_id)) && <option value={editor.stage_id}>{editor.stage_name} (inativa)</option>}{data.etapas.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{!data.etapas.length && <p className="text-xs text-amber-800">Solicite à administração a ativação ou o cadastro de uma etapa.</p>}</fieldset><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={busy} onClick={() => setEditor(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Cancelar</button><button type="submit" disabled={busy} className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Salvando..." : "Salvar turma"}</button></div></form></AdminDialog>}
    {user.role === "GESTOR_ESCOLAR" && assignment && <AdminDialog title={assignment.class_id ? "Transferir aluno de turma" : "Vincular aluno à turma"} description={activeUnit.name} icon={Users} busy={busy} onClose={() => { if (!busy) setAssignment(null); }}><form onSubmit={saveAssignment} className="space-y-4 p-5"><p className="font-bold">{assignment.nome}</p><p className="text-sm text-slate-500">Matrícula: {assignment.registration_number}</p>{formError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</p>}<label className="block text-sm font-bold">Turma de destino<select required disabled={busy} value={destination} onChange={event => setDestination(event.target.value)} className={inputClass}><option value="">Selecione a turma</option>{data.turmas.map(item => <option key={item.id} value={item.id}>{item.identification} · {item.stage_name}</option>)}</select></label><p className="text-xs text-slate-500">O aluno terá somente uma turma. Pontuação, conquistas e histórico de atividades serão preservados.</p><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={busy} onClick={() => setAssignment(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Cancelar</button><button type="submit" disabled={busy || !destination} className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Salvando..." : "Confirmar vínculo"}</button></div></form></AdminDialog>}
  </PageShell>;
}
