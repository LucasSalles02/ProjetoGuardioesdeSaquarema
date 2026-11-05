import { useEffect, useRef, useState } from "react";
import { ChevronUp, Loader2, LogOut, School } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { can } from "../services/permissions";
import { useSchool } from "../context/SchoolContext";
import LevelBadge from "./LevelBadge";

export default function FloatingProfile() {
  const { user, requestLogout } = useAuth();
  const { activeUnit, units, selectSchool, refreshSchools, switching } = useSchool();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const panel = useRef(null);
  const toggle = useRef(null);
  const closeTimer = useRef(null);

  function cancelClose() {
    clearTimeout(closeTimer.current);
  }

  function close() {
    cancelClose();
    if (!busy) setExpanded(false);
  }

  function enter(event) {
    if (event.pointerType !== "mouse") return;
    cancelClose();
    setExpanded(true);
  }

  function leave(event) {
    if (event.pointerType !== "mouse") return;
    cancelClose();
    closeTimer.current = setTimeout(() => {
      if (!busy && !panel.current?.contains(document.activeElement)) setExpanded(false);
    }, 180);
  }

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!expanded) return;
    function outside(event) {
      if (!busy && !panel.current?.contains(event.target)) {
        clearTimeout(closeTimer.current);
        setExpanded(false);
      }
    }
    function escape(event) {
      if (event.key === "Escape" && !busy) {
        setExpanded(false);
        clearTimeout(closeTimer.current);
        toggle.current?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [expanded, busy]);

  async function signOut() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      if (await requestLogout()) navigate("/login", { replace: true });
    } catch {
      setError("Não foi possível sair. Tente novamente.");
    } finally { setBusy(false); }
  }

  async function switchSchool(event) {
    const id = event.target.value;
    if (!id || switching) return;
    setError(""); setBusy(true);
    try {
      await selectSchool(id);
      navigate(user.admin ? "/gestao-escolar" : "/", { replace: true });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  if (!user) return null;
  const initial = user.nome?.trim().charAt(0).toLocaleUpperCase("pt-BR") || "U";
  return <aside ref={panel} onPointerEnter={enter} onPointerLeave={leave} aria-label="Perfil do usuário" data-expanded={expanded} className="floating-profile relative ml-auto rounded-2xl border border-cyan-100 bg-white/95 shadow-lg shadow-sky-950/10 backdrop-blur">
    <div className="floating-profile-header flex items-center">
      <button ref={toggle} type="button" onClick={() => { cancelClose(); if (!busy) setExpanded(value => !value); }} aria-expanded={expanded} aria-controls="floating-profile-details" aria-label={expanded ? "Minimizar perfil" : `Expandir perfil de ${user.nome}`} title={expanded ? "Minimizar perfil" : "Abrir perfil"} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-emerald-100 text-lg font-black text-emerald-800 outline-none transition-transform duration-200 hover:scale-105 focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 motion-reduce:transform-none">{initial}</button>
      <div className="floating-profile-summary min-w-0 flex-1"><div className="flex min-w-0 items-center gap-2"><div className="min-w-0 flex-1"><p className="whitespace-normal text-sm font-bold leading-snug text-slate-950 [overflow-wrap:anywhere]" title={user.nome}>{user.nome}</p><p className={`${expanded ? "" : "hidden "}mt-0.5 truncate text-xs text-slate-500`}>{user.profile_name || "Minha conta"}</p></div>{user.role === "USER" && <LevelBadge level={user.nivel} size="profile" />}<button type="button" onClick={() => { close(); toggle.current?.focus(); }} disabled={busy} aria-label="Minimizar perfil" title="Minimizar perfil" className={`${expanded ? "" : "hidden "}shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 focus-visible:outline-sky-600 disabled:opacity-50`}><ChevronUp size={18} aria-hidden="true" /></button></div></div>
    </div>
    <div id="floating-profile-details" className="floating-profile-details" aria-hidden={!expanded} inert={expanded ? undefined : ""}><div className="min-h-0 overflow-hidden">
      {(user.role === "GESTOR_ESCOLAR" || (user.admin && can(user, "institutions.read") && (can(user, "classes.read") || can(user, "enrollments.read")))) && <section className="mt-3 rounded-xl border border-sky-100 bg-sky-50 p-3" aria-label="Unidade Escolar ativa">
        <p className="flex items-center gap-1.5 text-xs font-bold text-sky-700"><School size={15} aria-hidden="true" /> Unidade aberta</p>
        <p className="mt-1 break-words text-sm font-bold text-slate-950">{activeUnit?.name || "Selecione uma unidade"}</p>
        <label className="mt-3 block text-xs font-semibold text-slate-600">Trocar Unidade Escolar<select value={activeUnit?.id || ""} onChange={switchSchool} disabled={busy || switching || !units.length} className="mt-1 w-full rounded-lg border border-sky-200 bg-white px-2 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-50"><option value="" disabled>Selecione a unidade</option>{units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
        <button type="button" disabled={busy || switching} onClick={() => refreshSchools()} className="mt-2 text-xs font-bold text-sky-700 hover:underline disabled:opacity-50">Atualizar unidades</button>
      </section>}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">{user.role === "USER" && <span className="text-xs text-slate-500">Nível {user.nivel} · {user.xp} XP</span>}<button type="button" onClick={signOut} disabled={busy} className="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50 focus-visible:outline-red-700 disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <LogOut size={16} aria-hidden="true" />}{busy ? "Saindo..." : "Sair"}</button></div>
      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    </div></div>
  </aside>;
}
