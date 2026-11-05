import { useEffect, useState } from "react";
import { BookOpen, BriefcaseBusiness, GraduationCap, KeyRound, Loader2, Plus, Save, School, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { cpfDigits, formatBirthDate, formatCpf } from "../../services/identity";
import { useAuth } from "../../context/AuthContext";
import { can } from "../../services/permissions";
import { admin } from "../../services/api";
import PrivacyNotice from "../PrivacyNotice";

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-950 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-50";
const categories = [["USER", "Aluno", GraduationCap], ["GESTOR_ESCOLAR", "Gestor escolar", BookOpen], ["ADMIN", "Administrador", ShieldCheck]];

export default function UserForm({ onSave, initialData, ownAccount = false, compact = false, onCancel }) {
  const editing = Boolean(initialData);
  const { user } = useAuth();
  const readSchools = can(user, "institutions.read");
  const manageSchools = can(user, "institutions.update");
  const [schools, setSchools] = useState([]);
  const [schoolError, setSchoolError] = useState("");
  const [profiles, setProfiles] = useState([]);
  const [profileError, setProfileError] = useState("");
  const [form, setForm] = useState(() => ({ nome: initialData?.nome || "", email: initialData?.email || "", role: initialData?.role || "USER", profile_id: initialData?.profile_id || initialData?.role || "USER", cpf: formatCpf(initialData?.cpf || ""), birth_date: initialData?.birth_date || "", school_id: initialData?.school_id || "", registration_number: initialData?.registration_number || "", guardians: initialData?.guardians || [] }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const student = form.role === "USER";
  const availableProfiles = profiles.filter(profile => profile.base_role === form.role);

  useEffect(() => {
    if (!readSchools) return;
    let active = true;
    admin.listarUnidades().then(data => { if (active) setSchools(data.unidades.filter(item => item.active !== false)); }).catch(err => { if (active) setSchoolError(err.message); });
    return () => { active = false; };
  }, [readSchools]);

  useEffect(() => {
    let active = true;
    admin.listarPerfis().then(data => { if (active) setProfiles(data.perfis); }).catch(err => { if (active) setProfileError(err.message); });
    return () => { active = false; };
  }, []);

  function change(event) {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: name === "cpf" ? formatCpf(value) : name === "birth_date" ? formatBirthDate(value) : value }));
  }

  function chooseRole(role) {
    const selected = profiles.find(profile => profile.base_role === role && profile.system) || profiles.find(profile => profile.base_role === role);
    if (selected) setForm(current => ({ ...current, role, profile_id: selected.id }));
  }

  function contactChange(index, name, value) {
    setForm(current => ({ ...current, guardians: current.guardians.map((contact, i) => i === index ? { ...contact, [name]: value } : contact) }));
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (!student && cpfDigits(form.cpf).length !== 11) { setError("Informe os 11 dígitos do CPF do profissional."); return; }
    if (student && !form.registration_number.trim()) { setError("Informe a matrícula do aluno. Ela será usada como senha inicial após cadastro ou reset."); return; }
    setBusy(true);
    try {
      const data = { nome: form.nome, birth_date: form.birth_date, role: form.role, profile_id: form.profile_id };
      await onSave(student ? { ...data, registration_number: form.registration_number.trim(), guardians: form.guardians, ...(manageSchools && !schoolError ? { school_id: form.school_id || null } : {}) } : { ...data, cpf: cpfDigits(form.cpf), email: form.email });
    } catch (err) { setError(err.message || "Não foi possível salvar o cadastro."); }
    finally { setBusy(false); }
  }

  return <section className={compact ? "p-5" : "rounded-3xl border border-cyan-100 bg-white p-5 shadow-sm sm:p-7"}>
    <form onSubmit={submit} className="space-y-6"><fieldset disabled={busy} className="space-y-6 disabled:opacity-70">
      <div><h2 className="text-xl font-black text-slate-950">{editing ? "Atualizar cadastro" : "Quem você vai cadastrar?"}</h2><p className="mt-1 text-sm text-slate-600">Selecione a categoria para preencher apenas os dados necessários.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3" role="group" aria-label="Categoria do usuário">{categories.map(([role, label, Icon]) => <button key={role} type="button" aria-pressed={form.role === role} disabled={ownAccount || !profiles.some(profile => profile.base_role === role)} onClick={() => chooseRole(role)} className={`flex items-center gap-2 rounded-2xl border-2 px-3 py-4 text-left text-sm font-bold transition focus-visible:outline-sky-600 disabled:cursor-not-allowed ${form.role === role ? "border-sky-500 bg-sky-50 text-sky-900" : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300"}`}><Icon size={23} className="shrink-0" aria-hidden="true" />{label}</button>)}</div>
        {ownAccount && <p className="mt-2 text-xs text-slate-500">O próprio perfil administrativo não pode ser alterado.</p>}
      </div>
      <div className="flex items-start gap-3 rounded-2xl border border-cyan-100 bg-cyan-50 p-4"><KeyRound size={22} className="shrink-0 text-sky-700" aria-hidden="true" /><div><h3 className="text-sm font-black text-sky-950">{student ? "Acesso do aluno" : "Acesso do profissional"}</h3><p className="mt-1 text-sm leading-relaxed text-sky-900">{student ? "O aluno entra com a matrícula e senha. A senha inicial também é a matrícula, incluindo os zeros à esquerda." : "O profissional entra com o CPF e senha. A senha inicial é o CPF com 11 dígitos."} A troca por uma senha pessoal é obrigatória após cadastro ou reset.</p>{editing && <p className="mt-2 text-xs text-sky-800">Senhas pessoais já definidas são preservadas. Use Resetar senha para reiniciar o acesso. Alterar a categoria exige novo primeiro acesso.</p>}</div></div>
      {profileError && <p role="alert" className="text-sm text-red-700">{profileError} Reabra o cadastro para tentar novamente.</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section aria-label="Identificação e acesso" className="space-y-4"><h3 className="flex items-center gap-2 text-sm font-black text-slate-900"><BriefcaseBusiness size={19} className="text-sky-700" aria-hidden="true" />Identificação e acesso</h3><div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo"><input className={inputClass} name="nome" value={form.nome} onChange={change} minLength={2} maxLength={80} autoComplete="off" required /></Field>
        {student ? <Field label="Matrícula" hint="Identificador único de login. Preserve os zeros à esquerda, mesmo sem unidade ativa."><input className={inputClass} name="registration_number" value={form.registration_number} onChange={change} maxLength={40} autoComplete="off" required /></Field> : <><Field label="CPF do profissional" hint="Identificador de acesso e senha temporária após reset."><input className={inputClass} name="cpf" value={form.cpf} onChange={change} inputMode="numeric" placeholder="000.000.000-00" maxLength={14} pattern="[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}" autoComplete="off" required /></Field><Field label="E-mail profissional"><input className={inputClass} name="email" type="email" maxLength={254} value={form.email} onChange={change} autoComplete="off" required /></Field></>}
        <Field label="Data de nascimento (opcional)" hint="Preencha apenas quando necessária à identificação escolar ou institucional."><input className={inputClass} name="birth_date" value={form.birth_date} onChange={change} inputMode="numeric" placeholder="DD/MM/AAAA" maxLength={10} pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" autoComplete="off" /></Field>
        <Field label="Perfil de acesso"><select className={inputClass} name="profile_id" value={form.profile_id} onChange={change} disabled={ownAccount || !availableProfiles.length} required>{!availableProfiles.length && <option value={form.profile_id}>Carregando perfis...</option>}{availableProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></Field>
      </div>{student && <p className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">Não é necessário informar CPF nem e-mail pessoal da criança. A matrícula identifica o cadastro escolar e o acesso à plataforma, devendo ser única no sistema.</p>}</section>

      {student ? <>
        <section aria-label="Vínculo escolar" className="space-y-3 border-t border-slate-100 pt-5"><h3 className="flex items-center gap-2 text-sm font-black text-slate-900"><School size={19} className="text-sky-700" aria-hidden="true" />Vínculo escolar</h3>{manageSchools ? <Field label="Unidade Escolar"><select className={inputClass} name="school_id" value={form.school_id} onChange={change} disabled={Boolean(schoolError) || !readSchools}><option value="">Aguardando vínculo institucional</option>{schools.map(school => <option key={school.id} value={school.id}>{school.name}</option>)}</select></Field> : <p className="text-sm text-slate-600">{initialData?.linked_schools?.[0]?.name || "O vínculo deve ser definido por um administrador com permissão de gerenciamento institucional."}</p>}
          {schoolError && <p role="alert" className="text-sm text-red-700">{schoolError} O vínculo atual será preservado.</p>}
          <p className="text-xs leading-relaxed text-slate-500">O gestor da unidade autorizada organiza a turma. {initialData?.class_name ? `Turma atual: ${initialData.class_name}.` : "A turma será definida na Gestão Escolar."}</p>
          {initialData?.school_id && String(initialData.school_id) !== String(form.school_id) && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">A troca de unidade retira o aluno da turma atual, preservando o histórico. Selecione a unidade de destino após a verificação institucional da transferência.</p>}
        </section>
        <section aria-label="Responsáveis legais" className="space-y-4 border-t border-slate-100 pt-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 text-sm font-black text-slate-900"><Users size={19} className="text-sky-700" aria-hidden="true" />Responsáveis legais (opcional)</h3><p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">Registre somente contatos necessários às finalidades educacionais e à representação do aluno. Estes dados não criam contas ou permissões de acesso.</p></div><button type="button" disabled={form.guardians.length >= 3} onClick={() => setForm(current => ({ ...current, guardians: [...current.guardians, { name: "", relationship: "", email: "", phone: "" }] }))} className="inline-flex items-center gap-1 rounded-xl border border-sky-200 px-3 py-2 text-xs font-bold text-sky-700 disabled:opacity-40"><Plus size={15} aria-hidden="true" />Adicionar responsável</button></div>
          {form.guardians.map((contact, index) => <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="mb-3 flex items-center justify-between"><h4 className="text-sm font-bold text-slate-700">Responsável {index + 1}</h4><button type="button" aria-label={`Remover responsável ${index + 1}`} onClick={() => setForm(current => ({ ...current, guardians: current.guardians.filter((_, i) => i !== index) }))} className="rounded-lg p-2 text-red-700 hover:bg-red-50"><Trash2 size={16} aria-hidden="true" /></button></div><div className="grid gap-3 sm:grid-cols-2">{[["name", "Nome completo", "text", 80], ["relationship", "Parentesco ou vínculo legal", "text", 60], ["email", "E-mail de contato", "email", 254], ["phone", "Telefone de contato", "tel", 24]].map(([name, label, type, max]) => <Field key={name} label={label}><input className={inputClass} type={type} value={contact[name]} onChange={event => contactChange(index, name, event.target.value)} maxLength={max} required={name === "name" || name === "relationship"} autoComplete="off" /></Field>)}</div><p className="mt-2 text-xs text-slate-500">Informe ao menos um contato: e-mail ou telefone.</p></div>)}
        </section>
      </> : <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><h3 className="text-sm font-black text-slate-800">{form.role === "GESTOR_ESCOLAR" ? "Autorizações institucionais" : "Responsabilidade administrativa"}</h3><p className="mt-1 text-sm leading-relaxed text-slate-600">{form.role === "GESTOR_ESCOLAR" ? "Autorize as escolas em Administração → Gerenciar Unidades Escolares. O gestor só acessa os dados das unidades vinculadas à sua conta individual." : "Use uma conta individual e um perfil compatível com as atribuições do profissional. As permissões são configuradas em Perfis de acesso."}</p></section>}

      <PrivacyNotice />
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">{onCancel && <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Cancelar</button>}<button type="submit" disabled={!profiles.length || Boolean(profileError)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-black text-white hover:bg-sky-700 disabled:opacity-50">{busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : editing ? <Save size={18} aria-hidden="true" /> : <UserPlus size={18} aria-hidden="true" />}{busy ? "Salvando..." : editing ? "Salvar alterações" : student ? "Cadastrar aluno" : "Cadastrar profissional"}</button></div>
    </fieldset></form>
  </section>;
}

function Field({ label, hint, children }) {
  return <label className="block text-sm font-bold text-slate-700">{label}{children}{hint && <span className="mt-1 block text-xs font-normal leading-relaxed text-slate-500">{hint}</span>}</label>;
}
