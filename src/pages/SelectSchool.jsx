import { useState } from "react";
import { ArrowRight, Check, Loader2, LogOut, RefreshCw, School } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSchool } from "../context/SchoolContext";
import { can } from "../services/permissions";
import Sidebar from "../components/Sidebar";
import PageShell from "../components/PageShell";
import AdminDialog from "../components/admin/AdminDialog";

export default function SelectSchool() {
  const { user, requestLogout } = useAuth();
  const { units, activeUnit, loading, error, switching, refreshSchools, selectSchool } = useSchool();
  const [selectionError, setSelectionError] = useState("");
  const [pending, setPending] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const navigate = useNavigate();
  const destination = user.admin ? "/gestao-escolar" : "/";
  if (user.admin && (!can(user, "institutions.read") || (!can(user, "classes.read") && !can(user, "enrollments.read")))) return <Navigate to="/admin/dashboard" replace />;
  if (user.role !== "GESTOR_ESCOLAR" && !user.admin) return <Navigate to="/" replace />;
  async function choose(id) {
    setSelectionError(""); setPending(id);
    try { await selectSchool(id); navigate(destination, { replace: true }); }
    catch (err) { setSelectionError(err.message); }
    finally { setPending(null); }
  }
  async function leave() {
    setLeaving(true);
    try { if (await requestLogout()) navigate("/login", { replace: true }); }
    catch (err) { setSelectionError(err.message); }
    finally { setLeaving(false); }
  }
  return <>
    <div inert="" aria-hidden="true" className="marine-app-bg min-h-dvh lg:flex"><Sidebar /><main className="min-w-0 flex-1 pt-20"><PageShell title="Gestão Escolar" description="Selecione uma unidade para carregar seus dados."><div className="grid gap-5 sm:grid-cols-2"><div className="h-52 rounded-2xl border border-slate-200 bg-white/80" /><div className="h-52 rounded-2xl border border-slate-200 bg-white/80" /></div></PageShell></main></div>
    <AdminDialog title="Escolha a Unidade Escolar" description={`${user.admin ? "Administração" : "Gestão Escolar"} · ${user.nome}`} icon={School} busy={switching || leaving} dismissible={Boolean(activeUnit) || user.admin} onClose={() => navigate(activeUnit ? destination : "/admin/dashboard", { replace: true })}>
      <div className="p-5"><p className="text-sm leading-relaxed text-slate-600">Escolha a unidade para entrar. Você poderá trocá-la pelo menu do seu perfil.</p>
        {(error || selectionError) && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{selectionError || error}</p>}
        {loading ? <p role="status" className="mt-5 flex items-center gap-2 text-sm text-sky-700"><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Consultando unidades...</p> : <div className="mt-5 max-h-72 space-y-2 overflow-y-auto">{units.map(unit => <button key={unit.id} type="button" onClick={() => choose(unit.id)} disabled={switching || leaving} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-sky-400 hover:bg-sky-50 focus-visible:outline-sky-600 disabled:opacity-50"><School size={23} className="shrink-0 text-sky-700" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block break-words text-sm font-bold">{unit.name}</span><span className="mt-1 block text-xs text-slate-500">Unidade #{unit.id}</span></span>{pending === unit.id ? <Loader2 size={18} className="shrink-0 animate-spin text-sky-700" aria-hidden="true" /> : activeUnit?.id === unit.id ? <Check size={18} className="shrink-0 text-emerald-700" aria-hidden="true" /> : <ArrowRight size={18} className="shrink-0 text-sky-700" aria-hidden="true" />}</button>)}{!units.length && !error && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{user.admin ? "Nenhuma unidade cadastrada. Cadastre uma em Administração > Gerenciar Unidades Escolares." : "Nenhuma unidade está autorizada para sua conta. Solicite o vínculo ao administrador."}</p>}</div>}
        {switching && <p role="status" className="mt-3 text-sm font-bold text-sky-700">Carregando dados da unidade...</p>}
        <footer className="mt-5 flex justify-between gap-3 border-t border-slate-100 pt-4"><button type="button" disabled={switching || leaving} onClick={leave} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-red-700 disabled:opacity-40"><LogOut size={16} aria-hidden="true" /> {leaving ? "Saindo..." : "Sair"}</button><button type="button" disabled={switching || leaving || loading} onClick={() => { setSelectionError(""); refreshSchools(); }} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-sky-700 disabled:opacity-40"><RefreshCw size={16} aria-hidden="true" /> Atualizar unidades</button></footer>
      </div>
    </AdminDialog>
  </>;
}
