import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, GraduationCap, IdCard, Leaf, Loader2, LockKeyhole, School, ShieldCheck, Sparkles, Trophy, Waves } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SaquaremaLandmark from "./SaquaremaLandmark";

const accesses = [
  { id: "student", label: "Aluno", path: "/login", icon: GraduationCap, color: "sky" },
  { id: "staff", label: "Gestor", path: "/login?perfil=gestor", icon: School, color: "green" },
  { id: "admin", label: "Admin", path: "/admin/login", icon: ShieldCheck, color: "sand" },
];

export default function LoginScreen({ administrative = false }) {
  const { login, adminLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [search] = useSearchParams();
  const category = administrative ? "admin" : search.get("perfil") === "gestor" ? "staff" : "student";
  const student = category === "student";
  const [form, setForm] = useState({ identity: "", senha: "" });
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setForm({ identity: "", senha: "" });
    setErro("");
    setShowPassword(false);
  }, [category]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (carregando) return;
    setErro(""); setCarregando(true);
    try {
      const credentials = { [student ? "registration_number" : "cpf"]: form.identity, senha: form.senha };
      const account = await (administrative ? adminLogin(credentials) : login(credentials));
      navigate(account.must_change_password ? "/primeiro-acesso" : account.admin ? "/admin/dashboard" : account.role === "GESTOR_ESCOLAR" ? "/selecionar-unidade" : "/", { replace: true });
    } catch (error) { setErro(error.message || "Não foi possível entrar. Tente novamente."); }
    finally { setCarregando(false); }
  }

  const title = student ? "Olá, guardião!" : category === "staff" ? "Olá, gestor!" : "Olá, administrador!";
  return <main className="login-world relative isolate flex min-h-dvh flex-col overflow-hidden text-slate-950">
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="login-glow login-glow--sky" /><div className="login-glow login-glow--green" />
      {[0, 1, 2, 3, 4, 5].map(i => <span key={i} className="login-bubble" style={{ "--bubble-x": `${8 + i * 17}%`, "--bubble-size": `${12 + (i % 3) * 16}px`, "--bubble-delay": `${-i * 3}s` }} />)}
      <div className="login-wave login-wave--back" /><div className="login-wave login-wave--front" />
    </div>

    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8 sm:py-7">
      <Link to="/login" aria-label="Guardiões de Saquarema, início do login" onClick={event => { if (carregando) event.preventDefault(); }} className="inline-flex items-center gap-2.5 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-white bg-cyan-500 text-white shadow-sm"><Waves size={26} aria-hidden="true" /></span>
        <span className="text-sm font-black leading-tight text-sky-950">Guardiões<span className="block text-xs font-bold text-ocean-700">de Saquarema</span></span>
      </Link>
      <span className="hidden items-center gap-1.5 rounded-full border border-white bg-white/70 px-3 py-2 text-xs font-bold text-emerald-800 sm:inline-flex"><Leaf size={15} aria-hidden="true" />Aprender é cuidar.</span>
    </header>

    <div className="relative mx-auto grid w-full max-w-6xl flex-1 items-center gap-8 px-5 pb-14 pt-2 sm:px-8 lg:grid-cols-[1fr_440px] lg:gap-16 lg:pb-20">
      <section className="login-intro text-center lg:text-left" aria-labelledby="login-adventure-title">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/80 px-3 py-1.5 text-xs font-black text-ocean-700"><Sparkles size={15} className="text-amber-600" aria-hidden="true" />Uma aventura que faz a diferença</p>
        <h1 id="login-adventure-title" className="mx-auto max-w-lg text-3xl font-black leading-tight tracking-tight text-sky-950 sm:text-4xl lg:mx-0 lg:text-5xl">Guardiões<br /><span className="text-ocean-600">de Saquarema</span></h1>
        <p className="mx-auto mt-4 max-w-md text-sm font-medium leading-relaxed text-slate-600 sm:text-base lg:mx-0">Pequenos guardiões, grandes descobertas. Aprenda e cuide das praias, lagoas e histórias da nossa cidade!</p>

        <SaquaremaLandmark />
        <div className="mt-5 hidden flex-wrap justify-center gap-2 sm:flex lg:justify-start">{[[Leaf, "Aprenda", "bg-emerald-100 text-emerald-900"], [Waves, "Explore", "bg-cyan-100 text-ocean-700"], [Trophy, "Conquiste", "bg-amber-100 text-amber-900"]].map(([Icon, label, color]) => <span key={label} className={`inline-flex items-center gap-2 rounded-xl border border-white px-3 py-2 text-xs font-black ${color}`}><Icon size={17} aria-hidden="true" />{label}</span>)}</div>
      </section>

      <section className="login-entry rounded-[2rem] border-2 border-white bg-white/95 p-5 shadow-xl shadow-sky-900/10 sm:p-8" aria-labelledby="login-form-title">
        <p className="text-xs font-black uppercase tracking-widest text-ocean-700">Escolha seu acesso</p>
        <nav aria-label="Tipo de login" className="mb-6 mt-3 grid grid-cols-3 gap-2">{accesses.map(({ id, label, path, icon: Icon, color }) => <Link key={id} to={path} aria-label={`Entrar como ${id === "admin" ? "administrador" : id === "staff" ? "gestor escolar" : "aluno"}`} aria-current={category === id ? "page" : undefined} aria-disabled={carregando || undefined} tabIndex={carregando ? -1 : undefined} onClick={event => { if (carregando) event.preventDefault(); }} data-selected={category === id} data-tone={color} className="login-access flex flex-col items-center gap-2 rounded-2xl border-2 px-2 py-3 text-xs font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"><Icon size={25} aria-hidden="true" />{label}</Link>)}</nav>
        <h2 id="login-form-title" className="text-2xl font-black text-sky-950">{title}</h2>
        <p className="mb-6 mt-1.5 text-sm text-slate-600">{student ? "Entre para continuar sua aventura." : "Entre para cuidar de novas descobertas."}</p>
        {location.state?.notice && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{location.state.notice}</p>}
        {erro && <p id="login-error" role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{erro}</p>}
        <form onSubmit={handleSubmit}><fieldset disabled={carregando} className="space-y-4 disabled:opacity-60">
          <label className="block text-sm font-bold text-slate-700">{student ? "Matrícula" : "CPF"}<span className="relative mt-2 block"><IdCard size={19} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-600" aria-hidden="true" /><input name="identity" type="text" value={form.identity} onChange={event => setForm(current => ({ ...current, identity: event.target.value }))} maxLength={student ? 40 : 14} inputMode={student ? "text" : "numeric"} autoComplete="username" placeholder={student ? "Sua matrícula escolar" : "000.000.000-00"} aria-describedby={erro ? "login-error" : undefined} className="login-input w-full rounded-2xl border-2 border-slate-200 bg-slate-50 py-3 pl-11 pr-3 text-sm font-medium text-slate-950 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100" required /></span></label>
          <label className="block text-sm font-bold text-slate-700">Senha<span className="relative mt-2 block"><LockKeyhole size={19} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-600" aria-hidden="true" /><input name="senha" type={showPassword ? "text" : "password"} value={form.senha} onChange={event => setForm(current => ({ ...current, senha: event.target.value }))} autoComplete="current-password" placeholder="Sua senha" aria-describedby={erro ? "login-error" : undefined} className="login-input w-full rounded-2xl border-2 border-slate-200 bg-slate-50 py-3 pl-11 pr-12 text-sm font-medium text-slate-950 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100" required /><button type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-sky-600">{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></span></label>
          <button type="submit" className="login-submit flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-cyan-900 bg-cyan-700 px-4 py-3 text-sm font-black text-white transition hover:bg-cyan-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-wait">{carregando ? <><Loader2 size={19} className="animate-spin" aria-hidden="true" />Entrando...</> : <>{student ? "Vamos explorar!" : "Entrar no sistema"}<ArrowRight size={19} aria-hidden="true" /></>}</button>
        </fieldset></form>
        <details className="mt-5 rounded-xl border border-cyan-100 bg-cyan-50/70 p-3 text-xs text-sky-900"><summary className="cursor-pointer font-bold">Primeiro acesso ou senha resetada?</summary><p className="mt-2 leading-relaxed">{student ? "Use sua matrícula no login e também como senha inicial. Preserve os zeros à esquerda." : "Use seu CPF no login e também como senha inicial, com os 11 dígitos."} Depois, crie uma senha pessoal para continuar.</p></details>
        <p className="mt-5 text-center text-xs leading-relaxed text-slate-500">Precisa de ajuda para entrar?<br /><span className="font-semibold text-slate-600">Procure sua escola ou o administrador.</span></p>
      </section>
    </div>
    <footer className="relative pb-5 text-center text-xs font-medium text-ocean-700">Feito para aprender. Criado para preservar.</footer>
  </main>;
}
