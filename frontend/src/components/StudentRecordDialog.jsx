import { useEffect, useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import AdminDialog from "./admin/AdminDialog";
import { gestaoEscolar } from "../services/api";

export default function StudentRecordDialog({ student, onClose }) {
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setRecord(null); setError("");
    gestaoEscolar.cadastroAluno(student.id).then(({ aluno }) => { if (current) setRecord(aluno); }).catch(err => { if (current) setError(err.message); });
    return () => { current = false; };
  }, [student.id, attempt]);
  const formatDate = value => value ? new Date(value).toLocaleString("pt-BR") : "—";
  return <AdminDialog title="Visualizar cadastro do aluno" description="Consulta restrita aos alunos da unidade escolar ativa." icon={Eye} onClose={onClose}>
    {error ? <div role="alert" className="p-5 text-sm text-rose-800">{error} <button type="button" onClick={() => setAttempt(value => value + 1)} className="rounded font-bold underline">Tentar novamente</button></div> : !record ? <p role="status" className="flex items-center gap-2 p-5 text-sm text-slate-600"><Loader2 size={18} className="motion-safe:animate-spin" aria-hidden="true" />Carregando cadastro…</p> : <>
      <dl className="grid gap-5 p-5 text-sm sm:grid-cols-2">{[["Nome completo", record.nome], ["Matrícula", record.registration_number], ["Nascimento", record.birth_date], ["Unidade Escolar", record.school_name], ["Turma", record.class_name || "Aguardando turma"], ["Etapa Escolar", record.stage_name], ["Perfil de acesso", record.profile_name], ["Situação", record.active ? "Ativo" : "Desativado"], ["Cadastro", formatDate(record.created_at)], ["Última atualização", formatDate(record.updated_at)]].map(([label, value]) => <div key={label}><dt className="text-xs font-bold text-slate-500">{label}</dt><dd className="mt-1 break-words font-medium text-slate-950">{value || "—"}</dd></div>)}</dl>
      <section className="border-t border-slate-100 p-5"><h3 className="text-sm font-bold text-slate-700">Contatos dos responsáveis legais</h3><p className="mt-1 text-xs text-slate-500">Uso restrito às finalidades institucionais e ao acompanhamento do aluno.</p>{record.guardians?.length ? <ul className="mt-3 space-y-3">{record.guardians.map((contact, index) => <li key={index} className="rounded-xl bg-slate-50 p-3 text-sm"><p className="break-words font-bold">{contact.name} · {contact.relationship}</p>{contact.email && <p className="mt-1 break-words text-slate-600">{contact.email}</p>}{contact.phone && <p className="mt-1 text-slate-600">{contact.phone}</p>}</li>)}</ul> : <p className="mt-3 text-sm text-slate-500">Nenhum contato cadastrado.</p>}</section>
    </>}
    <footer className="flex justify-end border-t border-slate-100 p-4"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Fechar</button></footer>
  </AdminDialog>;
}
