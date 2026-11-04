import { useEffect, useState } from "react";
import { Loader2, Save, UserPlus } from "lucide-react";
import { cpfDigits, formatBirthDate, formatCpf } from "../../services/identity";

import { useAuth } from "../../context/AuthContext";
import { can } from "../../services/permissions";
import { admin } from "../../services/api";

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-100";

export default function UserForm({ onSave, initialData, ownAccount = false, compact = false, onCancel }) {
  const editing = Boolean(initialData);
  const { user } = useAuth();
  const [schools, setSchools] = useState([]);
  const [schoolError, setSchoolError] = useState("");
  const readSchools = can(user, "institutions.read");
  const manageSchools = can(user, "institutions.update");
  useEffect(() => {
    if (!readSchools) return;
    let active = true;
    admin.listarUnidades().then(data => { if (active) setSchools(data.unidades.filter(item => item.active !== false)); }).catch(err => { if (active) setSchoolError(err.message); });
    return () => { active = false; };
  }, [readSchools]);
  const [profiles, setProfiles] = useState([]);
  const [profileError, setProfileError] = useState("");
  useEffect(() => {
    let active = true;
    admin.listarPerfis().then(data => { if (active) setProfiles(data.perfis); }).catch(err => { if (active) setProfileError(err.message); });
    return () => { active = false; };
  }, []);
  const [form, setForm] = useState(() => ({ nome: initialData?.nome || "", username: initialData?.username || "", email: initialData?.email || "", role: initialData?.role || "USER", profile_id: initialData?.profile_id || initialData?.role || "USER", cpf: formatCpf(initialData?.cpf || ""), birth_date: initialData?.birth_date || "", school_id: initialData?.school_id || "", registration_number: initialData?.registration_number || "", turma: initialData?.turma || "", escola: initialData?.escola || "" }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function change(event) {
    const { name, value } = event.target;
    if (name === "profile_id") {
      const selected = profiles.find(p => p.id === value);
      setForm(current => ({ ...current, profile_id: value, role: selected.base_role }));
      return;
    }
    setForm(current => ({ ...current, [name]: name === "cpf" ? formatCpf(value) : name === "birth_date" ? formatBirthDate(value) : value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (cpfDigits(form.cpf).length !== 11) { setError("Informe os 11 dígitos do CPF."); return; }
    setBusy(true);
    try {
      const { school_id, registration_number, ...data } = form;
      await onSave({ ...data, cpf: cpfDigits(form.cpf), ...(form.role === "USER" && manageSchools ? { school_id: school_id || null, registration_number } : {}) });
    }
    catch (err) { setError(err.message || "Não foi possível salvar o cadastro."); }
    finally { setBusy(false); }
  }

  return (
    <section className={compact ? "p-5" : "rounded-3xl border border-cyan-100 bg-white p-5 shadow-sm sm:p-6"}>
      {!compact && <h2 className="text-xl font-black text-slate-950">{editing ? "Editar informações cadastrais" : "Dados do novo usuário"}</h2>}
      <p className="mt-2 text-sm text-slate-600">{editing ? "A edição não define uma senha. Para reiniciar o acesso, utilize Resetar senha na listagem." : "Não há definição de senha no cadastro. O primeiro acesso utiliza o CPF com 11 dígitos e exige a criação de uma nova senha."}</p>
      {profileError && <p role="alert" className="mt-3 text-sm text-red-700">{profileError} Reabra o cadastro para tentar novamente.</p>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <form onSubmit={submit} className="mt-5"><fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2 disabled:opacity-70">
        <label className="text-sm font-bold text-slate-700">Nome completo<input className={inputClass} name="nome" value={form.nome} onChange={change} minLength={2} maxLength={80} autoComplete="name" required /></label>
        <label className="text-sm font-bold text-slate-700">Usuário<input className={inputClass} name="username" value={form.username} onChange={change} minLength={3} maxLength={40} pattern="[a-zA-Z0-9_.\-]{3,40}" title="Use letras, números, ponto, hífen ou sublinhado." autoComplete="off" required /></label>
        <label className="text-sm font-bold text-slate-700">CPF<input className={inputClass} name="cpf" value={form.cpf} onChange={change} inputMode="numeric" placeholder="000.000.000-00" maxLength={14} pattern="[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}" autoComplete="off" required /><span className="mt-1 block text-xs font-normal text-slate-500">11 dígitos, incluindo zeros à esquerda.</span></label>
        <label className="text-sm font-bold text-slate-700">Data de nascimento<input className={inputClass} name="birth_date" value={form.birth_date} onChange={change} inputMode="numeric" placeholder="DD/MM/AAAA" maxLength={10} pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" autoComplete="bday" required /></label>
        <label className="text-sm font-bold text-slate-700">Email<input className={inputClass} name="email" type="email" value={form.email} onChange={change} autoComplete="email" required /></label>
        <label className="text-sm font-bold text-slate-700">Perfil<select className={inputClass} name="profile_id" value={form.profile_id} onChange={change} disabled={ownAccount || !profiles.length} required>{!profiles.length && <option value={form.profile_id}>Carregando perfis...</option>}{profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>{ownAccount && <span className="mt-1 block text-xs font-normal text-slate-500">O próprio perfil administrativo não pode ser alterado.</span>}</label>
        {form.role === "USER" && manageSchools && <>
          <label className="text-sm font-bold text-slate-700">Unidade Escolar<select className={inputClass} name="school_id" value={form.school_id} onChange={change} disabled={Boolean(schoolError)}><option value="">Aguardando vínculo institucional</option>{schools.map(school => <option key={school.id} value={school.id}>{school.name}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">O gestor verá o aluno somente nesta unidade e definirá a turma.</span></label>
          <label className="text-sm font-bold text-slate-700">Matrícula<input className={inputClass} name="registration_number" value={form.registration_number} onChange={change} required={Boolean(form.school_id)} maxLength={40} /></label>
          {schoolError && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{schoolError} Reabra o cadastro para carregar as unidades.</p>}
          {initialData?.school_id && String(initialData.school_id) !== String(form.school_id) && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 sm:col-span-2">A troca da unidade retirará o aluno da turma atual. O gestor da unidade de destino deverá definir a nova turma.</p>}
        </>}
        {form.role === "GESTOR_ESCOLAR" && <p className="text-xs text-slate-500 sm:col-span-2">As unidades deste gestor são autorizadas em Administração → Gerenciar Unidades Escolares.</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 sm:col-span-2">{onCancel && <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>}<button type="submit" disabled={!profiles.length || Boolean(profileError)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-black text-white hover:bg-sky-700 disabled:cursor-wait sm:col-span-2 sm:justify-self-start">{busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : editing ? <Save size={18} aria-hidden="true" /> : <UserPlus size={18} aria-hidden="true" />}{busy ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar usuário"}</button></div>
      </fieldset></form>
    </section>
  );
}
