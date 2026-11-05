import { useEffect, useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import AdminDialog from "./admin/AdminDialog";
import { gestaoEscolar } from "../services/api";

export default function SchoolReportDialog({ report, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null); setError("");
    const request = report.type === "student" ? gestaoEscolar.progressoAluno(report.id) : gestaoEscolar.resumoTurma(report.id);
    request.then(result => { if (active) setData(result.progresso || result.resumo); }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [report.id, report.type, attempt]);
  const fields = data ? report.type === "student" ? [["Matrícula", data.registration_number], ["Turma", data.class_name || "Aguardando turma"], ["XP acumulado", data.xp], ["Nível", data.level], ["Missões concluídas", data.missions_completed], ["Aulas concluídas", data.lessons_completed], ["Conquistas", data.achievements.length]] : [["Etapa", data.stage_name], ["Alunos ativos", data.student_count], ["XP total", data.total_xp], ["Média de XP por aluno", data.average_xp], ["Missões concluídas", data.missions_completed], ["Aulas concluídas", data.lessons_completed]] : [];
  return <AdminDialog title={report.type === "student" ? "Progresso do aluno" : "Consolidado da turma"} description={report.name} icon={BarChart3} onClose={onClose}>
    <div className="p-5">{error ? <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error} <button type="button" onClick={() => setAttempt(value => value + 1)} className="font-bold underline">Tentar novamente</button></div> : !data ? <p role="status" className="flex items-center gap-2 text-sm"><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Carregando progresso...</p> : <><dl className="grid gap-4 min-[400px]:grid-cols-2 text-sm">{fields.map(([label, value]) => <div key={label}><dt className="text-xs font-bold text-slate-500">{label}</dt><dd className="mt-1 break-words font-bold text-slate-950">{value}</dd></div>)}</dl>{report.type === "student" && <><h3 className="mt-5 text-sm font-bold">Conquistas desbloqueadas</h3><ul className="mt-2 space-y-1 text-sm text-slate-600">{data.achievements.map(item => <li key={item.achievement_id}>{item.title || item.achievement_id}</li>)}</ul>{!data.achievements.length && <p className="mt-1 text-sm text-slate-500">Nenhuma conquista desbloqueada.</p>}<h3 className="mt-5 text-sm font-bold">Atividades recentes</h3><ul className="mt-2 space-y-2">{data.activities.map((item, index) => <li key={`${item.created_at}-${index}`} className="rounded-xl bg-slate-50 p-3 text-sm"><p className="text-slate-700">{item.descricao}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.created_at).toLocaleString("pt-BR")} · {item.xp_ganho} XP</p></li>)}</ul>{!data.activities.length && <p className="mt-1 text-sm text-slate-500">Nenhuma atividade registrada.</p>}</>}<p className="mt-5 rounded-xl bg-sky-50 p-3 text-xs text-sky-800">Consulta somente de leitura. Pontuação, níveis, conquistas e histórico não podem ser alterados pela Gestão Escolar.</p></>}
      <div className="mt-5 flex justify-end border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Fechar</button></div>
    </div>
  </AdminDialog>;
}
