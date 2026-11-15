import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, BarChart3, BookOpen, Check, CheckCircle2, Flame, Gamepad2, Leaf, LockKeyhole, RefreshCw, ShieldCheck, Sparkles, Target, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import LevelBadge from "../components/LevelBadge";
import { progresso as progressoAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { can } from "../services/permissions";

const number = value => (Number(value) || 0).toLocaleString("pt-BR");
const percent = value => Math.max(0, Math.min(100, Number(value) || 0));
const types = { missao: ["Missão", Target], aula: ["Aula", BookOpen], jogo: ["Jogo", Gamepad2], conquista: ["Conquista", Trophy] };
const date = value => new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function MeuProgresso() {
  const { user } = useAuth();
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(6);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const admin = user?.role === "ADMIN";

  useEffect(() => {
    let active = true;
    setCarregando(true); setError("");
    Promise.all([progressoAPI.obter(), progressoAPI.historico()])
      .then(([progress, history]) => { if (active) setDados({ ...progress, ...history }); })
      .catch(() => { if (active) setError("Não foi possível carregar o progresso. Tente novamente."); })
      .finally(() => { if (active) setCarregando(false); });
    return () => { active = false; };
  }, [user?.id, user?.role, user?.xp, user?.missoesConcluidas, user?.aulasConcluidas, user?.jogosConcluidos, attempt]);

  const activities = useMemo(() => (dados?.atividades || []).filter(item => filter === "all" || item.tipo === filter), [dados, filter]);
  const stats = dados?.stats || {};
  const awards = dados?.conquistas || [];
  const earned = awards.filter(item => item.obtida).length;
  const level = stats.nivel || 1;
  const maximum = Boolean(stats.nivelMaximo);
  const currentAward = awards.find(item => item.nivelNecessario === level);
  const milestone = awards.find(item => item.nivelNecessario === selectedLevel) || currentAward;
  const missions = stats.missoesConcluidas || 0;
  const lessons = stats.aulasConcluidas || 0;
  const games = stats.jogosConcluidos || 0;
  const total = missions + lessons + games;
  const schoolReports = admin && can(user, "institutions.read") && (can(user, "classes.read") || can(user, "enrollments.read"));

  return <PageShell title="Meu Progresso" description={admin ? "Consulte a atividade desta conta e explore os marcos de evolução." : "Cada descoberta conta. Veja o quanto você já avançou!"} actions={<button type="button" disabled={carregando} onClick={() => setAttempt(value => value + 1)} className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-white px-3 py-2.5 text-sm font-bold text-ocean-700 disabled:opacity-50"><RefreshCw size={16} className={carregando ? "animate-spin" : ""} aria-hidden="true" />Atualizar</button>}>
    {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error} <button type="button" onClick={() => setAttempt(value => value + 1)} className="font-bold underline">Tentar novamente</button></div> : carregando ? <div role="status" aria-label="Carregando seu progresso" className="space-y-5"><div className="h-64 rounded-[2rem] bg-cyan-100 motion-safe:animate-pulse" /><div className="adaptive-metric-grid grid gap-4">{[0, 1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl bg-white motion-safe:animate-pulse" />)}</div></div> : <div className="progress-page space-y-6">
      <section className="progress-hero relative isolate overflow-hidden rounded-[2rem] border-2 border-white p-5 shadow-sm sm:p-7" aria-labelledby="progress-hero-title">
        <span className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border-[16px] border-white/50" aria-hidden="true" />
        <div className="relative flex flex-wrap items-center justify-between gap-4"><div className="min-w-0 flex-1 basis-56">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white bg-white/90 px-3 py-1.5 text-xs font-black text-ocean-700">{admin ? <ShieldCheck size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}{admin ? "Visão da sua conta" : "Seu mapa de descobertas"}</p>
          <h2 id="progress-hero-title" className="text-2xl font-black leading-tight text-sky-950 sm:text-3xl">{admin ? "Acompanhe cada passo." : maximum ? "Você chegou ao nível máximo!" : "Sua jornada está ganhando vida!"}</h2>
          <p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-sky-900">{admin ? "Estes indicadores mostram apenas a atividade desta conta. O acompanhamento dos alunos fica na Gestão, por unidade escolar." : maximum ? "A coleção está completa, mas as descobertas continuam. Você ainda pode aprender e acumular XP!" : `Você está no nível ${level} de 10. Continue aprendendo para descobrir sua próxima medalha.`}</p>
          {schoolReports && <Link to="/selecionar-unidade" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-white px-3 py-2.5 text-xs font-black text-ocean-700 hover:bg-cyan-50">Acompanhar turmas e alunos<ArrowRight size={15} aria-hidden="true" /></Link>}
        </div><ProgressIllustration /></div>
        <div className="relative mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-white bg-white/90 p-4 sm:p-5">
          <div className="progress-current-badge shrink-0">{admin ? <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100 text-ocean-700"><BarChart3 size={30} aria-hidden="true" /></span> : <LevelBadge level={level} size="profile" />}</div>
          <div className="min-w-0 flex-1 basis-48"><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-sm font-black text-sky-950">{maximum ? "Nível 10 · Jornada completa" : `Evolução do nível ${level} para o ${level + 1}`}</h3><span className="text-sm font-black text-emerald-800">{percent(stats.percentualNivel)}%</span></div>
            <ProgressMeter value={stats.percentualNivel} label="Evolução dentro do nível atual" detail={maximum ? "Nível máximo alcançado" : `${number(Math.max(0, (stats.xp || 0) - (stats.xpInicioNivel || 0)))} de ${number(stats.xpProximoNivel - stats.xpInicioNivel)} XP neste nível`} remaining />
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs font-semibold text-slate-600"><span>{number(stats.xp)} XP acumulados</span><span>{maximum ? "Continue somando descobertas" : `Faltam ${number(stats.xpFaltante)} XP para o próximo nível`}</span></div>
          </div>
        </div>
        <div className="relative mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] font-semibold text-sky-900"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />Caminho percorrido neste nível</span>{!maximum && <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-300" aria-hidden="true" />Caminho até o próximo nível</span>}</div>
      </section>

      <div className="adaptive-metric-grid grid gap-4">
        <StatCard label={admin ? "XP desta conta" : "Pontos de experiência"} value={number(stats.xp)} subtitle="XP acumulados" icon={Sparkles} tone="blue" />
        <StatCard label="Missões concluídas" value={number(missions)} subtitle="Ações que fazem a diferença" icon={Target} tone="aqua" />
        <StatCard label="Aulas concluídas" value={number(lessons)} subtitle="Conhecimento para cuidar" icon={BookOpen} tone="green" />
        <StatCard label="Sequência registrada" value={`${number(stats.sequenciaDias)} ${stats.sequenciaDias === 1 ? "dia" : "dias"}`} subtitle="Dias consecutivos no último registro" icon={Flame} tone="blue" />
      </div>

      <div className="adaptive-wide-grid grid items-start gap-5">
        <WeeklyChart data={dados.grafico || []} />
        <section className="progress-panel rounded-3xl p-5 sm:p-6" aria-labelledby="activity-balance-title"><SectionTitle id="activity-balance-title" icon={CheckCircle2} title="Descobertas em ação" description="Distribuição das atividades concluídas nesta conta." /><p className="mb-5 mt-5 text-3xl font-black text-sky-950">{number(total)} <span className="text-sm font-semibold text-slate-500">conclusões</span></p><div className="space-y-4">{[["Missões", missions, Target, "blue"], ["Aulas", lessons, BookOpen, "green"], ["Jogos", games, Gamepad2, "aqua"]].map(([label, count, Icon, tone]) => <div key={label}><div className="mb-1 flex items-center justify-between gap-2 text-xs font-bold text-slate-700"><span className="inline-flex items-center gap-2"><Icon size={16} className="text-ocean-700" aria-hidden="true" />{label}</span><span>{number(count)}</span></div><ProgressMeter value={total ? count / total * 100 : 0} label={`${label}: ${number(count)} de ${number(total)} conclusões`} tone={tone} /></div>)}</div><p className="mt-5 rounded-xl bg-cyan-50 p-3 text-xs leading-relaxed text-ocean-700">{total ? "As barras comparam as conclusões de missões, aulas e jogos." : "As barras vão ganhar cor conforme novas atividades forem concluídas."}</p></section>
      </div>

      <section className="progress-panel rounded-3xl p-5 sm:p-6" aria-labelledby="level-map-title"><div className="flex flex-wrap items-start justify-between gap-3"><SectionTitle id="level-map-title" icon={Trophy} title={admin ? "Explore os níveis e as medalhas" : "Sua trilha de conquistas"} description={admin ? "Catálogo liberado para visualização. A consulta não concede medalhas nem XP." : `${earned} de ${awards.length} medalhas desbloqueadas. Toque em um nível para descobrir mais.`} />{can(user, "achievements.read") && <Link to="/conquistas" className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-50 px-3 py-2.5 text-xs font-black text-ocean-700 hover:bg-cyan-100">Ver conquistas<ArrowRight size={14} aria-hidden="true" /></Link>}</div>
        <div className="progress-level-map mt-5 grid gap-2" role="group" aria-label="Explorar marcos de nível">{awards.map(award => {
          const reached = admin || award.obtida;
          const selected = milestone?.id === award.id;
          return <button key={award.id} type="button" onClick={() => setSelectedLevel(award.nivelNecessario)} aria-pressed={selected} aria-label={`Explorar nível ${award.nivelNecessario}, ${award.titulo}, ${reached ? admin ? "visualização liberada" : "desbloqueado" : "bloqueado"}`} data-reached={reached} className="progress-level-stop relative flex min-h-14 items-center justify-center gap-0.5 rounded-2xl border-2 px-1 py-3 text-sm font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">{award.obtida && !admin && <Check size={13} aria-hidden="true" />}<span>{award.nivelNecessario}</span>{!reached && <LockKeyhole size={12} aria-hidden="true" />}</button>;
        })}</div>
        {milestone && <div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4"><div key={milestone.id} className="progress-collection-badge"><LevelBadge level={milestone.nivelNecessario} size="profile" locked={!admin && !milestone.obtida} /></div><div className="min-w-0 flex-1 basis-44"><p className="text-xs font-bold text-ocean-700">Nível {milestone.nivelNecessario} · {number(milestone.xpNecessario)} XP</p><h3 className="mt-1 text-base font-black text-sky-950">{milestone.titulo}</h3><p className="mt-1 text-xs leading-relaxed text-slate-600">{admin ? "Disponível para visualizar no catálogo do administrador." : milestone.obtida ? "Conquista desbloqueada. Ela celebra a sua evolução!" : `Uma nova descoberta espera por você. Faltam ${number(Math.max(0, milestone.xpNecessario - stats.xp))} XP para este marco.`}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${admin || milestone.obtida ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-600"}`}>{admin ? "Visualização" : milestone.obtida ? "Desbloqueada" : "A descobrir"}</span></div>}
        <p className="mt-4 text-xs text-slate-500">As conquistas são liberadas por nível e não concedem XP adicional.</p>
      </section>

      <section className="progress-panel rounded-3xl p-5 sm:p-6" aria-labelledby="recent-activity-title"><div className="flex flex-wrap items-center justify-between gap-4"><SectionTitle id="recent-activity-title" icon={Activity} title={admin ? "Histórico desta conta" : "Pegadas da sua aventura"} description="Últimos registros disponíveis, no horário de Brasília." /><label className="text-xs font-bold text-slate-600">Filtrar atividade<select value={filter} onChange={event => { setFilter(event.target.value); setLimit(6); }} className="ml-0 mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800"><option value="all">Todas as atividades</option>{Object.entries(types).map(([key, [label]]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
        {activities.length ? <><ol className="mt-5 space-y-3">{activities.slice(0, limit).map(item => {
          const [label, Icon] = types[item.tipo] || ["Atividade", Activity];
          return <li key={item.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 sm:p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-100 bg-white text-ocean-700"><Icon size={20} aria-hidden="true" /></span><div className="min-w-0 flex-1 basis-40"><p className="text-sm font-bold leading-relaxed text-slate-800">{item.descricao}</p><p className="mt-1 text-xs text-slate-500">{label} · <time dateTime={item.createdAt}>{date(item.createdAt)}</time></p></div><span className="ml-auto rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-900">+{number(item.xpGanho)} XP</span></li>;
        })}</ol>{activities.length > limit && <button type="button" onClick={() => setLimit(value => value + 6)} className="mt-4 w-full rounded-xl border border-cyan-200 bg-white px-4 py-3 text-sm font-bold text-ocean-700 hover:bg-cyan-50">Ver mais atividades</button>}</> : <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/40 p-6 text-center"><Leaf size={32} className="mb-3 text-teal-600" aria-hidden="true" /><p className="text-sm font-bold text-sky-950">{filter === "all" ? admin ? "Nenhuma atividade registrada nesta conta." : "Toda aventura tem um primeiro passo." : "Nenhum registro deste tipo no histórico disponível."}</p><p className="mt-2 max-w-md text-xs leading-relaxed text-slate-500">{filter === "all" ? "As próximas atividades concluídas aparecerão aqui." : "Experimente outro filtro para continuar explorando."}</p>{!admin && filter === "all" && can(user, "missions.read") && <Link to="/missoes" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-xs font-black text-white">Descobrir missões<ArrowRight size={15} aria-hidden="true" /></Link>}</div>}
      </section>
    </div>}
  </PageShell>;
}

function StatCard({ label, value, subtitle, icon: Icon, tone }) {
  const colors = { blue: "bg-sky-100 text-sky-800", aqua: "bg-cyan-100 text-ocean-700", green: "bg-emerald-100 text-emerald-800" };
  return <div className="progress-panel progress-stat relative overflow-hidden rounded-3xl p-4 sm:p-5"><span className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl ${colors[tone]}`}><Icon size={23} aria-hidden="true" /></span><p className="text-xs font-bold text-slate-600">{label}</p><p className="mt-1 text-2xl font-black tracking-tight text-sky-950">{value}</p><p className="mt-2 text-[11px] leading-relaxed text-slate-500">{subtitle}</p></div>;
}

function SectionTitle({ id, icon: Icon, title, description }) {
  return <div className="min-w-0"><h2 id={id} className="flex items-center gap-2 text-base font-black text-sky-950"><Icon size={21} className="shrink-0 text-ocean-700" aria-hidden="true" />{title}</h2><p className="mt-1.5 text-xs leading-relaxed text-slate-500">{description}</p></div>;
}

function ProgressMeter({ value, label, detail, tone = "green", remaining = false }) {
  return <div role="progressbar" aria-label={label} aria-valuenow={Math.round(percent(value))} aria-valuemin={0} aria-valuemax={100} aria-valuetext={detail} className={`progress-meter mt-2 h-3 overflow-hidden rounded-full ${remaining ? "bg-red-100" : "bg-slate-100"}`}><div data-tone={tone} className="progress-meter-fill h-full rounded-full" style={{ width: `${percent(value)}%` }} /></div>;
}

function WeeklyChart({ data }) {
  const [selected, setSelected] = useState(null);
  const day = data.find(item => item.data === selected) || data[data.length - 1];
  const max = Math.max(1, ...data.map(item => item.xp));
  const total = data.reduce((sum, item) => sum + item.xp, 0);
  const activeDays = data.filter(item => item.xp > 0).length;
  const dayDate = key => new Date(`${key}T12:00:00-03:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });
  return <section className="progress-chart progress-panel rounded-3xl p-5 sm:p-6" aria-labelledby="weekly-xp-title"><SectionTitle id="weekly-xp-title" icon={BarChart3} title="Uma semana de descobertas" description="Toque em um dia para ver os pontos acumulados." /><div className="mt-5 flex flex-wrap items-end justify-between gap-3"><p className="text-3xl font-black text-sky-950">{number(total)} <span className="text-sm font-semibold text-slate-500">XP</span></p><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">{activeDays} de {data.length} dias com XP</span></div>
    <div className="progress-week-grid mt-5 grid gap-1.5 sm:gap-2" role="group" aria-label="XP por dia nos últimos sete dias">{data.map((item, index) => <button key={item.data} type="button" aria-pressed={item.data === day?.data} aria-label={`${item.dia}, ${dayDate(item.data)}, ${number(item.xp)} XP`} onClick={() => setSelected(item.data)} className="progress-day min-w-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"><span className="progress-day-value font-bold text-slate-600">{Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(item.xp)}</span><span className="progress-day-track relative flex w-full items-end overflow-hidden rounded-lg bg-cyan-50"><span className="progress-day-fill rounded-lg bg-gradient-to-t from-cyan-700 to-teal-400" style={{ "--day-percent": `${item.xp / max * 100}%`, "--bar-delay": `${index * 50}ms` }} /></span><span className="progress-day-label font-bold capitalize text-slate-600">{item.dia}</span></button>)}</div>
    <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50/60 px-3 py-2.5 text-xs font-semibold text-ocean-700" aria-live="polite">{day ? `${dayDate(day.data)} · ${number(day.xp)} XP${day.xp ? " em novas descobertas" : " · Sem XP registrado neste dia"}` : "Sem dados para este período."}</div><p className="mt-3 text-[11px] text-slate-500">Últimos 7 dias · Horário de Brasília</p>
  </section>;
}

function ProgressIllustration() {
  return <div aria-hidden="true" className="progress-illustration mx-auto w-40 shrink-0 sm:w-44"><svg viewBox="0 0 200 140" fill="none" className="h-auto w-full"><circle cx="100" cy="70" r="58" fill="#b2ebf2" opacity="0.6" /><circle cx="150" cy="29" r="9" fill="white" /><path d="M31 55q8-9 16 0m105 26q8-9 16 0" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" /><g className="progress-sailboat" stroke="#006064" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"><path d="M65 90h76l-14 19H78z" fill="white" /><path d="M100 36v53m-8-44L68 79h24zm16-2 27 36h-27z" fill="#5eead4" /><path d="M100 36h18l-6 7h-12" fill="#fff" /></g><g className="progress-water" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round"><path d="M42 115q12-6 24 0t24 0 24 0 24 0 24 0M62 124q12-6 24 0t24 0 24 0" /></g><path d="m43 29 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#14b8a6" /><path d="M147 60q-13-2-10-16 14 2 10 16z" fill="#5eead4" stroke="#0f766e" strokeWidth="2" /></svg></div>;
}
