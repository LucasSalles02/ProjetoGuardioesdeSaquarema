import { Eye } from "lucide-react";
import { formatCpf } from "../../services/identity";
import AdminDialog from "./AdminDialog";

const roles = { USER: "Aluno", GESTOR_ESCOLAR: "Gestor Escolar", ADMIN: "Administrador" };
const formatDate = value => value ? new Date(value).toLocaleString("pt-BR") : "—";

export default function ViewUserDialog({ account, onClose }) {
  const student = account.role === "USER";
  const fields = [["Nome completo", account.nome], ...(student ? [["Matrícula", account.registration_number || "Pendente de atualização"], ["Turma vinculada", account.class_name]] : [["CPF", account.cpf ? formatCpf(account.cpf) : "Pendente de atualização"], ["E-mail profissional", account.email]]), ["Nascimento", account.birth_date], ["Perfil", account.profile_name || roles[account.role]], ["Situação", account.active !== false ? "Ativo" : "Desativado"], ["Senha inicial após reset", student ? "Matrícula do aluno" : "CPF do profissional"], ["Troca de senha", account.must_change_password ? "Pendente no próximo acesso" : "Sem pendência"], ["Cadastro", formatDate(account.created_at)], ["Última atualização", formatDate(account.updated_at)], ["Desativação", formatDate(account.deactivated_at)]];
  return <AdminDialog title="Visualizar usuário" description="Consulte os dados cadastrais e a situação de acesso." icon={Eye} onClose={onClose}>
    <dl className="grid gap-5 p-5 text-sm sm:grid-cols-2">{fields.map(([label, value]) => <div key={label}><dt className="text-xs font-bold text-slate-500">{label}</dt><dd className="mt-1 break-words font-medium text-slate-950">{value || "—"}</dd></div>)}</dl>
    {student && Boolean(account.guardians?.length) && <section className="border-t border-slate-100 p-5"><h3 className="text-sm font-bold text-slate-700">Contatos dos responsáveis legais</h3><p className="mt-1 text-xs text-slate-500">Uso restrito às finalidades institucionais. Estes contatos não possuem conta de acesso.</p><ul className="mt-3 space-y-3">{account.guardians.map((contact, index) => <li key={index} className="rounded-xl bg-slate-50 p-3 text-sm"><p className="break-words font-bold">{contact.name} · {contact.relationship}</p>{contact.email && <p className="mt-1 break-words text-slate-600">{contact.email}</p>}{contact.phone && <p className="mt-1 text-slate-600">{contact.phone}</p>}</li>)}</ul></section>}
    {["USER", "GESTOR_ESCOLAR"].includes(account.role) && <section className="border-t border-slate-100 px-5 py-4"><h3 className="text-sm font-bold text-slate-700">{account.role === "GESTOR_ESCOLAR" ? "Unidades Escolares autorizadas" : "Unidade Escolar vinculada"}</h3>{account.linked_schools?.length ? <ul className="mt-3 space-y-2">{account.linked_schools.map(school => <li key={school.id} className="rounded-xl bg-sky-50 p-3 text-sm font-semibold text-sky-800">{school.name}<span className="ml-2 text-xs font-normal">#{school.id}</span></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">Sem vínculo institucional autorizado.</p>}</section>}
    <footer className="flex justify-end border-t border-slate-100 p-4"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Fechar</button></footer>
  </AdminDialog>;
}
