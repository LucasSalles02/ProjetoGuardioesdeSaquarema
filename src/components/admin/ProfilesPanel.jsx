import { useEffect, useState } from "react";
import { Loader2, Plus, ShieldCheck } from "lucide-react";
import { admin } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import AdminDialog from "./AdminDialog";
import { canGrant } from "../../services/permissions";

const roles = { ADMIN: "Administrador", GESTOR_ESCOLAR: "Gestão Escolar", USER: "Aluno" };

export default function ProfilesPanel() {
  const { user } = useAuth();
  const [data, setData] = useState({ perfis: [], modulos: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [formError, setFormError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    admin.listarPerfis().then(result => { if (active) setData(result); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  function open(profile) {
    setForm(profile ? { ...profile, permissions: [...profile.permissions] } : { name: "", description: "", base_role: "USER", permissions: [...(data.perfis.find(p => p.id === "USER")?.permissions || [])].filter(p => canGrant(user, p)) });
    setFormError("");
  }
  function changeGrant(permission, checked) {
    setForm(current => {
      const grants = new Set(current.permissions);
      if (checked) {
        grants.add(permission);
        const key = permission.split(".")[0];
        if (["learning", "games", "missions", "users", "profiles", "content", "institutions", "school_stages", "classes", "enrollments"].includes(key)) grants.add(`${key}.read`);
        if (["mission_admin", "game_admin"].includes(key)) grants.add("content.read");
        if (permission === "enrollments.update") grants.add("classes.read");
        if (permission === "school_progress.read") grants.add("enrollments.read");
        if (permission === "school_progress.reports") grants.add("classes.read");
        if (["users.create", "users.update"].includes(permission)) grants.add("profiles.read");
      } else {
        grants.delete(permission);
        if (permission.endsWith(".read")) {
          const key = permission.split(".")[0];
          for (const item of grants) if (item.startsWith(`${key}.`)) grants.delete(item);
          if (key === "content") for (const item of grants) if (item.startsWith("mission_admin.") || item.startsWith("game_admin.")) grants.delete(item);
          if (key === "classes") { grants.delete("enrollments.update"); grants.delete("school_progress.reports"); }
          if (key === "enrollments") grants.delete("school_progress.read");
          if (key === "profiles") { grants.delete("users.create"); grants.delete("users.update"); }
        }
      }
      return { ...current, permissions: [...grants] };
    });
  }
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setFormError("");
    try {
      const { perfil } = await admin.salvarPerfil(form.id, { name: form.name, description: form.description, base_role: form.base_role, permissions: form.permissions });
      setData(current => ({ ...current, perfis: [...current.perfis.filter(p => p.id !== perfil.id), perfil] }));
      setNotice(`Perfil ${perfil.name} salvo. ${form.id ? "As sessões dos usuários vinculados foram encerradas para renovar o acesso." : "Disponível para atribuição no cadastro e na edição de usuários."}`);
      setForm(null);
    } catch (err) { setFormError(err.message); }
    finally { setBusy(false); }
  }
  const readonly = form && (form.system || !user.permissions?.includes(form.id ? "profiles.update" : "profiles.create"));
  return <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="profiles-title">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="profiles-title" className="text-xl font-black text-slate-950">Perfis de acesso</h2><p className="mt-1 text-sm text-slate-500">Defina os módulos e as ações disponíveis para cada perfil.</p></div><button type="button" onClick={() => open()} disabled={loading || Boolean(error) || !user.permissions?.includes("profiles.create")} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Plus size={17} aria-hidden="true" /> Criar perfil</button></div>
    {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {error && <div role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error} <button type="button" onClick={() => setAttempt(value => value + 1)} className="font-bold underline">Tentar novamente</button></div>}
    {loading ? <p role="status" className="mt-5 flex items-center gap-2 text-sm"><Loader2 size={18} className="animate-spin" /> Carregando perfis...</p> : <div className="mt-5 adaptive-card-grid grid gap-3">{data.perfis.map(profile => <button key={profile.id} type="button" onClick={() => open(profile)} className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-sky-600"><ShieldCheck size={23} className="mb-3 text-sky-700" aria-hidden="true" /><span className="block font-bold text-slate-950">{profile.name}</span><span className="mt-1 block text-xs font-semibold text-sky-700">{profile.system ? "Padrão da documentação" : `Base: ${roles[profile.base_role]}`}</span><span className="mt-2 block text-sm text-slate-500">{profile.description || "Perfil personalizado"}</span><span className="mt-3 block text-xs text-slate-500">{profile.permissions.length} permissões · {profile.system ? "Consultar" : "Consultar / editar"}</span></button>)}</div>}
    {form && <AdminDialog title={form.system ? form.name : form.id ? "Editar perfil" : "Criar perfil de acesso"} description="Permissões organizadas por módulo e ação." icon={ShieldCheck} busy={busy} onClose={() => { if (!busy) setForm(null); }}>
      <form onSubmit={save} className="p-5">
        {formError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
        <fieldset disabled={busy || readonly} className="space-y-4">
          <label className="block text-sm font-bold">Nome do perfil<input required minLength={3} maxLength={60} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 disabled:bg-slate-50" /></label>
          <label className="block text-sm font-bold">Perfil base<select value={form.base_role} disabled={Boolean(form.id)} onChange={event => setForm({ ...form, base_role: event.target.value, permissions: [...(data.perfis.find(p => p.id === event.target.value)?.permissions || [])].filter(p => canGrant(user, p)) })} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5">{Object.entries(roles).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></label>
          <label className="block text-sm font-bold">Descrição<textarea maxLength={300} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5" /></label>
          <p className="rounded-xl bg-sky-50 p-3 text-xs leading-relaxed text-sky-900">O perfil base limita as permissões conforme a documentação. Gestão Escolar exige vínculos institucionais autorizados e nunca permite editar XP, conquistas ou missões. Ações marcadas como previstas aguardam implementação e não liberam acesso a dados.</p>
          {data.modulos.filter(m => m.roles.includes(form.base_role)).map(module => <fieldset key={module.id} className="rounded-xl border border-slate-200 p-3"><legend className="px-1 text-sm font-bold">{module.label}</legend><p className="mb-2 text-xs text-slate-500">{module.reference}{module.scope === "school" ? " · Somente escolas autorizadas" : module.scope === "own" ? " · Somente dados próprios" : ""}</p><div className="space-y-2">{module.actions.filter(action => !action.roles || action.roles.includes(form.base_role)).map(action => <label key={action.id} className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" disabled={!canGrant(user, `${module.id}.${action.id}`)} className="mt-1 h-4 w-4 accent-sky-600" checked={form.permissions.includes(`${module.id}.${action.id}`)} onChange={event => changeGrant(`${module.id}.${action.id}`, event.target.checked)} /><span>{action.label}{!action.implemented && <span className="ml-2 text-xs font-semibold text-amber-700">Previsto</span>}</span></label>)}</div></fieldset>)}
        </fieldset>
        <div className="sticky bottom-0 -mx-5 -mb-5 mt-5 flex justify-end gap-2 border-t bg-white p-4"><button type="button" disabled={busy} onClick={() => setForm(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">{readonly ? "Fechar" : "Cancelar"}</button>{!readonly && <button type="submit" disabled={busy} className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Salvando..." : "Salvar perfil"}</button>}</div>
      </form>
    </AdminDialog>}
  </section>;
}
