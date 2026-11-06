import { useEffect, useState } from "react";
import { Activity, BarChart3, BookOpen, Flame, Gamepad2, Leaf, Loader2, Target, Trophy } from "lucide-react";
import AdminDialog from "./admin/AdminDialog";
import LevelBadge from "./LevelBadge";
import { gestaoEscolar } from "../services/api";

const number = value => (Number(value) || 0).toLocaleString("pt-BR");

export default function SchoolReportDialog({ report, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    const request = report.type === "student"
      ? gestaoEscolar.progressoAluno(report.id)
      : gestaoEscolar.resumoTurma(report.id);
    request.then(result => {
      if (active) setData(result.progresso || result.resumo);
    }).catch(err => {
      if (active) setError(err.message);
    });
    return () => { active = false; };
  }, [report.id, report.type, attempt]);

  return (
    <AdminDialog
      title={report.type === "student" ? "Progresso do aluno" : "Consolidado da turma"}
      description={report.name}
      icon={BarChart3}
      onClose={onClose}
    >
      <div className="p-5">
        {error ? (
          <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error} <button type="button" onClick={() => setAttempt(value => value + 1)} className="rounded font-bold underline">Tentar novamente</button>
          </div>
        ) : !data ? (
          <p role="status" className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 size={18} className="motion-safe:animate-spin" aria-hidden="true" />Carregando progresso…
          </p>
        ) : (
          <>
            {report.type === "student" ? <StudentProgress data={data} /> : <ClassSummary data={data} />}
            <p className="mt-5 rounded-xl bg-sky-50 p-3 text-xs text-sky-800">Consulta de acompanhamento pedagógico da unidade escolar ativa.</p>
          </>
        )}
        <footer className="mt-5 flex justify-end border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Fechar</button>
        </footer>
      </div>
    </AdminDialog>
  );
}

function StudentProgress({ data }) {
  const awards = data.achievements || [];
  const activities = data.activities || [];
  const progress = data.progress || {};
  const currentAward = awards.find(item => item.level === data.level || item.achievement_id === `nivel-${data.level}`);
  const levelName = data.level_name || currentAward?.title || `Nível ${data.level}`;
  const percentage = Math.max(0, Math.min(100, Number(progress.percentualNivel) || 0));
  const categories = [
    { label: "Missões", value: data.missions_completed || 0, icon: Target, color: "bg-sky-500" },
    { label: "Aulas", value: data.lessons_completed || 0, icon: BookOpen, color: "bg-teal-500" },
    { label: "Jogos", value: data.games_completed || 0, icon: Gamepad2, color: "bg-emerald-500" },
  ];
  const total = categories.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-5">
      <section aria-label="Nível atual" className="rounded-3xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-emerald-50 p-4">
        <div className="flex items-center gap-4">
          <LevelBadge level={data.level} size="profile" className="!h-16 !w-16 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-teal-800">Nível {data.level}</p>
            <h3 className="mt-1 text-lg font-black text-sky-950">{levelName}</h3>
            <p className="mt-1 text-xs text-slate-600">{data.nome}</p>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
          <div><dt className="font-bold text-slate-500">Matrícula</dt><dd className="mt-1 break-words text-sky-950">{data.registration_number}</dd></div>
          <div><dt className="font-bold text-slate-500">Turma</dt><dd className="mt-1 break-words text-sky-950">{data.class_name || "Aguardando turma"}</dd></div>
        </dl>
        {data.progress && <div className="mt-4">
          <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs font-bold text-sky-900">
            <span>{progress.nivelMaximo ? "Nível máximo alcançado!" : `Evolução para o nível ${data.level + 1}`}</span><span>{percentage}%</span>
          </div>
          <div role="progressbar" aria-label="Evolução no nível atual" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} className="h-3 overflow-hidden rounded-full bg-white">
            <div className="home-progress-fill h-full rounded-full bg-gradient-to-r from-sky-600 to-emerald-500" style={{ width: `${percentage}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-600">{progress.nivelMaximo ? "O aluno continua acumulando XP." : `Faltam ${number(progress.xpFaltante)} XP para o próximo nível.`}</p>
        </div>}
      </section>

      <div className="grid grid-cols-2 gap-3" aria-label="Indicadores de progresso">
        <Metric label="XP acumulado" value={data.xp} icon={Leaf} tone="border-sky-100 bg-sky-50 text-sky-800" />
        <Metric label="Atividades concluídas" value={total} icon={Activity} tone="border-teal-100 bg-teal-50 text-teal-800" />
        <Metric label="Conquistas" value={awards.length} icon={Trophy} tone="border-amber-100 bg-amber-50 text-amber-800" />
        <Metric label="Dias de sequência" value={data.streak_days} icon={Flame} tone="border-rose-100 bg-rose-50 text-rose-800" />
      </div>

      <section className="rounded-2xl border border-cyan-100 p-4">
        <h3 className="text-sm font-black text-sky-950">Atividades por categoria</h3>
        <p className="mt-1 text-xs text-slate-500">Distribuição das atividades concluídas.</p>
        <div className="mt-4 space-y-4">{categories.map(({ label, value, icon: Icon, color }) => (
          <div key={label}>
            <div className="mb-2 flex justify-between gap-3 text-xs font-bold text-slate-700"><span className="flex items-center gap-2"><Icon size={16} aria-hidden="true" />{label}</span><span>{number(value)}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`home-progress-fill h-full rounded-full ${color}`} style={{ width: `${total ? value * 100 / total : 0}%` }} /></div>
          </div>
        ))}</div>
        {!total && <p className="mt-3 text-xs text-slate-500">Nenhuma atividade concluída ainda.</p>}
      </section>

      <section>
        <h3 className="text-sm font-black text-sky-950">Conquistas desbloqueadas</h3>
        <ul className="mt-3 grid grid-cols-2 gap-3">{awards.map(item => (
          <li key={item.achievement_id} className="flex flex-col items-center gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/40 p-3 text-center">
            <LevelBadge level={item.level || Number(item.achievement_id.replace("nivel-", ""))} size="profile" className="!h-10 !w-10" />
            <span className="text-xs font-bold text-sky-900">{item.title || item.achievement_id}</span>
          </li>
        ))}</ul>
        {!awards.length && <p className="mt-2 text-sm text-slate-500">Nenhuma conquista desbloqueada.</p>}
      </section>

      <section>
        <h3 className="text-sm font-black text-sky-950">Atividades recentes</h3>
        <ul className="mt-3 space-y-2">{activities.map((item, index) => (
          <li key={`${item.created_at}-${index}`} className="flex gap-3 rounded-2xl border border-slate-100 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-800"><Activity size={18} aria-hidden="true" /></span>
            <div className="min-w-0"><p className="text-sm text-slate-700">{item.descricao}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.created_at).toLocaleString("pt-BR")}</p><span className="mt-1 inline-flex rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">{item.xp_ganho > 0 ? "+" : ""}{number(item.xp_ganho)} XP</span></div>
          </li>
        ))}</ul>
        {!activities.length && <p className="mt-2 text-sm text-slate-500">Nenhuma atividade registrada.</p>}
      </section>
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone }) {
  return <div className={`rounded-2xl border p-3 ${tone}`}><Icon size={21} aria-hidden="true" /><p className="mt-2 text-2xl font-black">{number(value)}</p><p className="mt-1 text-xs font-bold">{label}</p></div>;
}

function ClassSummary({ data }) {
  const fields = [["Etapa", data.stage_name], ["Alunos ativos", data.student_count], ["XP total", data.total_xp], ["Média de XP por aluno", data.average_xp], ["Missões concluídas", data.missions_completed], ["Aulas concluídas", data.lessons_completed]];
  return <dl className="grid grid-cols-2 gap-4 text-sm">{fields.map(([label, value]) => <div key={label}><dt className="text-xs font-bold text-slate-500">{label}</dt><dd className="mt-1 break-words font-bold text-slate-950">{value}</dd></div>)}</dl>;
}
