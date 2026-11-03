import { useState } from "react";
import { Loader2, Save, UserPlus } from "lucide-react";
import { cpfDigits, formatBirthDate, formatCpf } from "../../services/identity";

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-100";

export default function UserForm({ onSave, initialData, ownAccount = false }) {
  const editing = Boolean(initialData);
  const [form, setForm] = useState(() => ({ nome: initialData?.nome || "", username: initialData?.username || "", email: initialData?.email || "", role: initialData?.role || "USER", cpf: formatCpf(initialData?.cpf || ""), birth_date: initialData?.birth_date || "", turma: initialData?.turma || "", escola: initialData?.escola || "" }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function change(event) {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: name === "cpf" ? formatCpf(value) : name === "birth_date" ? formatBirthDate(value) : value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (cpfDigits(form.cpf).length !== 11) { setError("Informe os 11 dígitos do CPF."); return; }
    setBusy(true);
    try { await onSave({ ...form, cpf: cpfDigits(form.cpf) }); }
    catch (err) { setError(err.message || "Não foi possível salvar o cadastro."); }
    finally { setBusy(false); }
  }

  return (
    <section className="rounded-3xl border border-cyan-100 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-black text-slate-950">{editing ? "Editar informações cadastrais" : "Dados do novo usuário"}</h2>
      <p className="mt-2 text-sm text-slate-600">{editing ? "A edição não define uma senha. Para reiniciar o acesso, utilize Resetar senha na listagem." : "Não há definição de senha no cadastro. O primeiro acesso utiliza o CPF com 11 dígitos e exige a criação de uma nova senha."}</p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <form onSubmit={submit} className="mt-5"><fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2 disabled:opacity-70">
        <label className="text-sm font-bold text-slate-700">Nome completo<input className={inputClass} name="nome" value={form.nome} onChange={change} minLength={2} maxLength={80} autoComplete="name" required /></label>
        <label className="text-sm font-bold text-slate-700">Usuário<input className={inputClass} name="username" value={form.username} onChange={change} minLength={3} maxLength={40} pattern="[a-zA-Z0-9_.\-]{3,40}" title="Use letras, números, ponto, hífen ou sublinhado." autoComplete="off" required /></label>
        <label className="text-sm font-bold text-slate-700">CPF<input className={inputClass} name="cpf" value={form.cpf} onChange={change} inputMode="numeric" placeholder="000.000.000-00" maxLength={14} pattern="[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}" autoComplete="off" required /><span className="mt-1 block text-xs font-normal text-slate-500">11 dígitos, incluindo zeros à esquerda.</span></label>
        <label className="text-sm font-bold text-slate-700">Data de nascimento<input className={inputClass} name="birth_date" value={form.birth_date} onChange={change} inputMode="numeric" placeholder="DD/MM/AAAA" maxLength={10} pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" autoComplete="bday" required /></label>
        <label className="text-sm font-bold text-slate-700">Email<input className={inputClass} name="email" type="email" value={form.email} onChange={change} autoComplete="email" required /></label>
        <label className="text-sm font-bold text-slate-700">Perfil<select className={inputClass} name="role" value={form.role} onChange={change} disabled={ownAccount} required><option value="USER">Aluno</option><option value="GESTOR_ESCOLAR">Gestor Escolar</option><option value="ADMIN">Administrador</option></select>{ownAccount && <span className="mt-1 block text-xs font-normal text-slate-500">O próprio perfil administrativo não pode ser alterado.</span>}</label>
        <label className="text-sm font-bold text-slate-700">Turma informada (opcional)<input className={inputClass} name="turma" value={form.turma} onChange={change} maxLength={40} /></label>
        <label className="text-sm font-bold text-slate-700">Escola informada (opcional)<input className={inputClass} name="escola" value={form.escola} onChange={change} maxLength={80} /></label>
        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-black text-white hover:bg-sky-700 disabled:cursor-wait sm:col-span-2 sm:justify-self-start">{busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : editing ? <Save size={18} aria-hidden="true" /> : <UserPlus size={18} aria-hidden="true" />}{busy ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar usuário"}</button>
      </fieldset></form>
    </section>
  );
}
