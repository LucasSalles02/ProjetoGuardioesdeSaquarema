import { useEffect, useState } from "react";
import { GraduationCap, Loader2, Pencil, Plus, RefreshCw } from "lucide-react";
import AdminDialog from "./AdminDialog";
import { admin } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { can } from "../../services/permissions";

export default function SchoolStagesPanel() {
  const { user } = useAuth();
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    admin.listarEtapas().then(data => { if (active) setStages(data.etapas); })
      .catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setFormError("");
    try {
      const { etapa } = await admin.salvarEtapa(form.id, { name: form.name, sort_order: Number(form.sort_order), active: form.active });
      setStages(current => [...current.filter(item => item.id !== etapa.id), etapa].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "pt-BR")));
      setNotice(`Etapa ${etapa.name} salva. ${etapa.active ? "Disponível para novas turmas." : "Turmas existentes foram preservadas."}`);
      setForm(null);
    } catch (err) { setFormError(err.message); }
    finally { setBusy(false); }
  }
  function open(stage) { setFormError(""); setForm(stage ? { ...stage } : { name: "", sort_order: 0, active: true }); }
  return <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="stages-title">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="stages-title" className="text-xl font-black">Etapas Escolares</h2><p className="mt-1 text-sm text-slate-500">Etapas disponíveis no cadastro de turmas de todas as unidades.</p></div><div className="flex gap-2"><button type="button" disabled={loading} onClick={() => setAttempt(value => value + 1)} aria-label="Atualizar etapas" className="rounded-xl border border-slate-200 p-2.5 text-sky-700 disabled:opacity-40"><RefreshCw size={18} aria-hidden="true" /></button>{can(user, "school_stages.create") && <button type="button" disabled={loading || Boolean(error)} onClick={() => open()} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Plus size={17} aria-hidden="true" /> Cadastrar etapa</button>}</div></div>
    {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}{error && <p role="alert" className="mt-4 text-sm text-red-700">{error} Use Atualizar para tentar novamente.</p>}
    {loading ? <p role="status" className="mt-5 flex items-center gap-2 text-sm"><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Carregando etapas...</p> : <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{stages.map(stage => <li key={stage.id} className="rounded-2xl border border-slate-200 p-4"><GraduationCap size={24} className="mb-3 text-sky-700" aria-hidden="true" /><h3 className="font-bold">{stage.name}</h3><p className="mt-1 text-xs text-slate-500">Ordem: {stage.sort_order} · {stage.active ? "Ativa" : "Inativa"}</p>{can(user, "school_stages.update") && <button type="button" onClick={() => open(stage)} aria-label={`Editar etapa ${stage.name}`} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-sky-700"><Pencil size={15} aria-hidden="true" /> Editar</button>}</li>)}</ul>}
    {form && <AdminDialog title={form.id ? "Editar etapa escolar" : "Cadastrar etapa escolar"} description="A desativação preserva as turmas já cadastradas." icon={GraduationCap} busy={busy} onClose={() => { if (!busy) setForm(null); }}><form onSubmit={save} className="space-y-4 p-5">{formError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</p>}<fieldset disabled={busy} className="space-y-4"><label className="block text-sm font-bold">Nome da etapa<input required minLength={2} maxLength={80} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Ex.: 2º ano" className="mt-1 w-full rounded-xl border border-slate-300 p-2.5" /></label><label className="block text-sm font-bold">Ordem de exibição<input type="number" required min={0} max={999} step={1} value={form.sort_order} onChange={event => setForm({ ...form, sort_order: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5" /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })} className="h-4 w-4 accent-sky-600" /> Disponível para novas turmas</label></fieldset><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={busy} onClick={() => setForm(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Cancelar</button><button type="submit" disabled={busy} className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Salvando..." : "Salvar etapa"}</button></div></form></AdminDialog>}
  </section>;
}
