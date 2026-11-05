import { useEffect, useState } from "react";
import { ArrowLeft, Eye, Loader2, Pencil, Plus, RefreshCw, School, Search, ShieldCheck, ShieldOff } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import AdminDialog from "../components/admin/AdminDialog";
import { admin } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSchool } from "../context/SchoolContext";
import { can } from "../services/permissions";

const inputClass = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50";

export default function AdminSchools() {
  const { user } = useAuth();
  const { refreshSchools } = useSchool();
  const [pendingReactivate, setPendingReactivate] = useState(null);
  const [reactivating, setReactivating] = useState(false);
  const [reactivationError, setReactivationError] = useState("");
  const [tab, setTab] = useState("active");
  const [pendingDeactivate, setPendingDeactivate] = useState(null);
  const [deactivationError, setDeactivationError] = useState("");
  const [deactivating, setDeactivating] = useState(false);
  const [schools, setSchools] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({ name: "", manager_ids: [] });
  const [managerQuery, setManagerQuery] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    Promise.all([admin.listarUnidades(), admin.listarGestoresUnidades()])
      .then(([units, people]) => { if (active) { setSchools(units.unidades); setManagers(people.gestores); } })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => {
    if (!dialog?.id) return;
    let active = true;
    setDetailLoading(true); setFormError("");
    admin.obterUnidade(dialog.id).then(({ unidade }) => {
      if (active) setForm({ ...unidade, manager_ids: unidade.gestores.filter(item => item.authorized && item.active && item.role === "GESTOR_ESCOLAR").map(item => item.manager_id) });
    }).catch(err => { if (active) setFormError(err.message); })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [dialog?.id]);

  function open(mode, id) {
    setForm({ name: "", manager_ids: [] });
    setFormError(""); setManagerQuery(""); setDetailLoading(Boolean(id));
    setDialog({ mode, id });
  }
  async function save(event) {
    event.preventDefault();
    if (saving || detailLoading) return;
    setSaving(true); setFormError("");
    try {
      const { unidade } = await admin.salvarUnidade(dialog.id, { name: form.name, manager_ids: form.manager_ids });
      const updated = { id: unidade.id, name: unidade.name, active: unidade.active, deactivated_at: unidade.deactivated_at, manager_count: unidade.gestores.filter(item => item.authorized && item.active && item.role === "GESTOR_ESCOLAR").length };
      setSchools(current => [...current.filter(item => item.id !== updated.id), updated].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setNotice(`Unidade ${unidade.name} salva. Os vínculos de acesso foram atualizados.`);
      setDialog(null);
    } catch (err) { setFormError(err.message); }
    finally { setSaving(false); }
  }
  async function deactivate() {
    if (!pendingDeactivate || deactivating) return;
    setDeactivating(true); setDeactivationError("");
    try {
      const result = await admin.desativarUnidade(pendingDeactivate.id);
      setSchools(current => current.map(item => item.id === result.unidade.id ? { ...result.unidade, manager_count: 0 } : item));
      setNotice(`Unidade ${result.unidade.name} desativada. ${result.alunos_desvinculados} aluno(s) e ${result.gestores_desvinculados} gestor(es) desvinculados.`);
      await refreshSchools();
      setPendingDeactivate(null);
    } catch (err) { setDeactivationError(err.message); }
    finally { setDeactivating(false); }
  }
  async function reactivate() {
    if (!pendingReactivate || reactivating) return;
    setReactivating(true); setReactivationError("");
    try {
      const { unidade } = await admin.reativarUnidade(pendingReactivate.id);
      setSchools(current => current.map(item => item.id === unidade.id ? { ...unidade, manager_count: unidade.gestores.filter(link => link.authorized && link.active && link.role === "GESTOR_ESCOLAR").length } : item));
      setNotice(`Unidade ${unidade.name} reativada. Os vínculos anteriores de gestores e alunos não foram restaurados automaticamente.`);
      setTab("active"); setQuery("");
      await refreshSchools();
      setPendingReactivate(null);
    } catch (err) { setReactivationError(err.message); }
    finally { setReactivating(false); }
  }
  const readonly = dialog?.mode === "view" || form.active === false;
  const term = query.trim().toLocaleLowerCase("pt-BR");
  const visible = schools.filter(item => (item.active !== false) === (tab === "active") && `${item.id} ${item.name}`.toLocaleLowerCase("pt-BR").includes(term));
  const people = managers.filter(item => `${item.nome} ${item.email}`.toLocaleLowerCase("pt-BR").includes(managerQuery.trim().toLocaleLowerCase("pt-BR")));

  return <PageShell title="Gerenciar Unidades Escolares" description="Cadastre unidades e autorize os gestores que poderão consultá-las.">
    <Link to="/admin/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-sky-700"><ArrowLeft size={17} aria-hidden="true" /> Voltar à Administração</Link>
    <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="schools-title">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="schools-title" className="text-xl font-black">Unidades Escolares</h2><p className="mt-1 text-sm text-slate-500">{schools.filter(item => item.active !== false).length} ativas · {schools.filter(item => item.active === false).length} desativadas</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={loading} onClick={() => setAttempt(value => value + 1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-sky-700 disabled:opacity-40"><RefreshCw size={16} aria-hidden="true" /> Atualizar</button>{can(user, "institutions.create") && <button type="button" disabled={loading || Boolean(error)} onClick={() => open("create")} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Plus size={17} aria-hidden="true" /> Cadastrar unidade</button>}</div></div>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Situação das unidades">{[["active", "Unidades ativas"], ["inactive", "Unidades desativadas"]].map(([key, label]) => <button key={key} type="button" onClick={() => { setTab(key); setQuery(""); }} aria-pressed={tab === key} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${tab === key ? "bg-sky-600 text-white" : "border border-slate-200 text-sky-700"}`}>{label}</button>)}</div>
      {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error} Use Atualizar para tentar novamente.</p>}
      <label className="relative mt-5 block"><span className="sr-only">Buscar unidade por nome ou ID</span><Search size={18} className="absolute left-3 top-3 text-slate-400" aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar unidade por nome ou ID" className={`${inputClass} pl-10`} /></label>
      {loading ? <p role="status" className="mt-5 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Carregando unidades...</p> : <div className="mt-5 adaptive-card-grid grid gap-4">{visible.map(item => <article key={item.id} className="rounded-2xl border border-slate-200 p-4"><School size={26} className="mb-3 text-sky-700" aria-hidden="true" /><p className="text-xs font-semibold text-slate-500">Unidade #{item.id}</p><h3 className="mt-1 break-words font-bold text-slate-950">{item.name}</h3><p className="mt-2 text-sm text-slate-500">{item.manager_count} gestor(es) autorizado(s)</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => open("view", item.id)} aria-label={`Visualizar ${item.name}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-sky-700"><Eye size={16} aria-hidden="true" /> Visualizar</button>{item.active !== false && can(user, "institutions.update") && <button type="button" onClick={() => open("edit", item.id)} aria-label={`Editar ${item.name}`} className="inline-flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700"><Pencil size={16} aria-hidden="true" /> Editar</button>}{item.active !== false && can(user, "institutions.deactivate") && <button type="button" onClick={() => { setPendingDeactivate(item); setDeactivationError(""); }} aria-label={`Desativar ${item.name}`} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700"><ShieldOff size={16} aria-hidden="true" /> Desativar</button>}{item.active === false && can(user, "institutions.update") && <button type="button" onClick={() => { setPendingReactivate(item); setReactivationError(""); }} aria-label={`Reativar ${item.name}`} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-bold text-emerald-700"><ShieldCheck size={16} aria-hidden="true" /> Reativar</button>}</div></article>)}</div>}
      {!loading && !error && !visible.length && <p className="py-8 text-center text-sm text-slate-500">{query ? "Nenhuma unidade encontrada." : tab === "inactive" ? "Nenhuma unidade desativada." : "Nenhuma unidade ativa cadastrada."}</p>}
    </section>
    {pendingReactivate && <AdminDialog title="Reativar Unidade Escolar?" description={pendingReactivate.name} icon={ShieldCheck} busy={reactivating} onClose={() => { if (!reactivating) setPendingReactivate(null); }}><div className="p-5"><p className="text-sm leading-relaxed text-slate-600">A unidade voltará a ficar ativa, mesmo sem gestores vinculados. Os antigos vínculos de gestores e alunos não serão restaurados automaticamente; você poderá cadastrá-los novamente quando desejar.</p>{reactivationError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{reactivationError}</p>}<div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={reactivating} onClick={() => setPendingReactivate(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Cancelar</button><button type="button" disabled={reactivating} onClick={reactivate} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{reactivating ? "Reativando..." : "Confirmar reativação"}</button></div></div></AdminDialog>}
    {pendingDeactivate && <AdminDialog title="Desativar Unidade Escolar?" description={pendingDeactivate.name} icon={ShieldOff} busy={deactivating} onClose={() => { if (!deactivating) setPendingDeactivate(null); }}><div className="p-5"><p className="text-sm font-bold text-slate-800">Ao confirmar a desativação:</p><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600"><li>Os alunos ficarão sem unidade e sem turma vinculada. O administrador precisará definir uma nova unidade para cada aluno.</li><li>Todos os gestores perderão o vínculo com esta escola.</li><li>A unidade sairá das seleções de acesso e os contextos abertos nesta unidade serão limpos.</li><li>As contas, o XP, as conquistas e o histórico dos alunos serão preservados. A unidade e suas turmas serão preservadas, sem exclusão definitiva.</li></ul>{deactivationError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{deactivationError}</p>}<div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={deactivating} onClick={() => setPendingDeactivate(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Cancelar</button><button type="button" disabled={deactivating} onClick={deactivate} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{deactivating ? "Desativando..." : "Confirmar desativação"}</button></div></div></AdminDialog>}
    {dialog && <AdminDialog title={readonly ? "Visualizar Unidade Escolar" : dialog.id ? "Editar Unidade Escolar" : "Cadastrar Unidade Escolar"} description="Dados da escola e autorizações dos gestores." icon={School} busy={saving} onClose={() => { if (!saving) setDialog(null); }}>
      {detailLoading ? <p role="status" className="flex items-center gap-2 p-5 text-sm"><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Carregando unidade...</p> : <form onSubmit={save} className="p-5">
        {formError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
        {form.id && <p className="mb-4 text-sm font-semibold text-slate-600">Situação: {form.active === false ? "Desativada" : "Ativa"}{form.deactivated_at ? ` · ${new Date(form.deactivated_at).toLocaleString("pt-BR")}` : ""}</p>}
        <fieldset disabled={saving || readonly || Boolean(dialog.id && !form.id)} className="space-y-4">
          <label className="block text-sm font-bold">ID da unidade<input readOnly value={form.id || "Gerado automaticamente ao cadastrar"} className={`${inputClass} bg-slate-50 text-slate-500`} /></label>
          <label className="block text-sm font-bold">Nome da unidade<input required minLength={2} maxLength={160} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} className={inputClass} /></label>
          {!readonly && <fieldset disabled={!can(user, "institutions.update")} className="space-y-3"><legend className="text-sm font-bold">Gestores escolares autorizados</legend><p className="mt-1 text-xs leading-relaxed text-slate-500">Selecione os gestores que podem visualizar esta unidade. Um gestor pode estar vinculado a várias unidades. Desmarcar revoga o acesso.</p><label className="block"><span className="sr-only">Buscar gestor por nome ou email</span><input value={managerQuery} onChange={event => setManagerQuery(event.target.value)} placeholder="Buscar gestor por nome ou email" className={inputClass} /></label><div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-2">{people.map(person => <label key={person.id} className="flex items-start gap-3 rounded-lg p-2 hover:bg-slate-50"><input type="checkbox" checked={form.manager_ids.includes(person.id)} disabled={!person.active} onChange={event => setForm(current => ({ ...current, manager_ids: event.target.checked ? [...current.manager_ids, person.id] : current.manager_ids.filter(id => id !== person.id) }))} className="mt-1 h-4 w-4 accent-sky-600" /><span className="min-w-0"><span className="block break-words text-sm font-semibold">{person.nome}</span><span className="block break-words text-xs text-slate-500">{person.email}{!person.active ? " · Conta desativada" : ""}</span></span></label>)}{!people.length && <p className="p-2 text-sm text-slate-500">{managers.length ? "Nenhum gestor corresponde à busca." : "Cadastre um usuário com perfil de Gestão Escolar para vinculá-lo."}</p>}</div><p className="text-xs text-slate-500">{form.manager_ids.length} gestor(es) selecionado(s)</p></fieldset>}
        </fieldset>
        {readonly && form.id && <section className="mt-5"><h3 className="text-sm font-bold">Vínculos de gestores</h3><div className="mt-3 space-y-2">{form.gestores?.map(link => <div key={link.id} className="rounded-xl border border-slate-200 p-3"><p className="text-sm font-bold">{link.nome}</p><p className="mt-1 break-words text-xs text-slate-500">{link.email} · Vínculo #{link.id}</p><p className={`mt-1 text-xs font-bold ${link.authorized && link.active && link.role === "GESTOR_ESCOLAR" ? "text-emerald-700" : "text-slate-500"}`}>{link.authorized && link.active && link.role === "GESTOR_ESCOLAR" ? "Autorizado" : "Sem acesso autorizado"}</p></div>)}{!form.gestores?.length && <p className="text-sm text-slate-500">Nenhum gestor vinculado.</p>}</div></section>}
        <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={saving} onClick={() => setDialog(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">{readonly ? "Fechar" : "Cancelar"}</button>{!readonly && <button type="submit" disabled={saving || Boolean(dialog.id && !form.id)} className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">{saving ? "Salvando..." : "Salvar unidade"}</button>}</div>
      </form>}
    </AdminDialog>}
  </PageShell>;
}
