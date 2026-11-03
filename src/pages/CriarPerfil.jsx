import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cpfDigits, formatCpf, formatBirthDate } from "../services/identity";

const input = "mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-100";
const empty = { nome: "", username: "", email: "", cpf: "", birth_date: "", turma: "", escola: "" };

export default function CriarPerfil() {
  const { cadastrar } = useAuth();
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  function change(event) {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: name === "cpf" ? formatCpf(value) : name === "birth_date" ? formatBirthDate(value) : value }));
  }
  async function submit(event) {
    event.preventDefault(); setError(""); setBusy(true);
    try { await cadastrar({ ...form, cpf: cpfDigits(form.cpf) }); setSubmitted(true); setForm(empty); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <main className="marine-app-bg flex min-h-screen items-center justify-center px-5 py-10"><section className="w-full max-w-2xl rounded-3xl border border-cyan-100 bg-white p-6 shadow-sm sm:p-8">
    <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-sky-700"><ArrowLeft size={16} aria-hidden="true" /> Voltar ao login</Link>
    <h1 className="mt-5 text-3xl font-black text-slate-950">Solicitar cadastro</h1>
    <p className="mt-3 text-sm text-slate-600">O cadastro será analisado por um administrador. Após a aprovação, entre com seu CPF e use o CPF de 11 dígitos como primeira senha. Em seguida, você deverá definir sua senha pessoal.</p>
    {submitted ? <div role="status" className="mt-6 rounded-2xl bg-emerald-50 p-5 text-emerald-900"><h2 className="font-black">Solicitação enviada</h2><p className="mt-2 text-sm">Aguarde a validação da administração. O acesso ainda não está liberado. Após a aprovação, a primeira senha será o CPF cadastrado.</p><Link to="/login" className="mt-4 inline-block font-bold text-sky-700">Ir para o login</Link></div> : <>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <form onSubmit={submit} className="mt-6"><fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">Nome completo<input name="nome" className={input} value={form.nome} onChange={change} minLength={2} maxLength={80} autoComplete="name" required /></label>
        <label className="text-sm font-bold text-slate-700">Usuário<input name="username" className={input} value={form.username} onChange={change} minLength={3} maxLength={40} pattern="[a-zA-Z0-9_.\-]{3,40}" title="Use letras, números, ponto, hífen ou sublinhado." autoComplete="username" required /></label>
        <label className="text-sm font-bold text-slate-700">CPF<input name="cpf" className={input} value={form.cpf} onChange={change} inputMode="numeric" maxLength={14} placeholder="000.000.000-00" pattern="[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}" required /></label>
        <label className="text-sm font-bold text-slate-700">Data de nascimento<input name="birth_date" className={input} value={form.birth_date} onChange={change} inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" autoComplete="bday" required /></label>
        <label className="text-sm font-bold text-slate-700 sm:col-span-2">Email<input name="email" type="email" className={input} value={form.email} onChange={change} autoComplete="email" required /></label>
        <label className="text-sm font-bold text-slate-700">Turma informada (opcional)<input name="turma" className={input} value={form.turma} onChange={change} maxLength={40} /></label>
        <label className="text-sm font-bold text-slate-700">Escola informada (opcional)<input name="escola" className={input} value={form.escola} onChange={change} maxLength={80} /></label>
        <button type="submit" className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 font-black text-white disabled:opacity-60 sm:col-span-2">{busy && <Loader2 className="animate-spin" size={18} aria-hidden="true" />}{busy ? "Enviando..." : "Enviar solicitação"}</button>
      </fieldset></form>
    </>}
  </section></main>;
}
