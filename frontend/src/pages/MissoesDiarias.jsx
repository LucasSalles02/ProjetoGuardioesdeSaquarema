import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Brain, CalendarDays, Check, CheckCheck, CircleAlert, Clock3, Flame, Leaf, Loader2, Recycle, RefreshCw, Repeat2, ShieldCheck, Sparkles, Sprout, Star, Target, Trophy, Turtle, Waves } from "lucide-react";
import PageShell from "../components/PageShell";
import { missoes as missoesAPI } from "../services/api";
import { can } from "../services/permissions";
import { useReward } from "../context/RewardContext";
import { useAuth } from "../context/AuthContext";
import { contentIcon } from "../services/contentIcons";
import useContentAnchor from "../hooks/useContentAnchor";

export default function MissoesDiarias() {
  const { user, atualizarUsuario } = useAuth();
  const { celebrate } = useReward();
  const [catalogDate, setCatalogDate] = useState("");
  const [earnedToday, setEarnedToday] = useState(0);
  const currentCatalog = useRef("");
  const refreshing = useRef(false);
  const [missoes, setMissoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  useContentAnchor(!carregando);
  const [concluindo, setConcluindo] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackKind, setFeedbackKind] = useState("info");
  const [filter, setFilter] = useState("all");
  const [respostas, setRespostas] = useState({});

  const carregarMissoes = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      const data = await missoesAPI.listar();
      if (currentCatalog.current && currentCatalog.current !== data.catalogDate) {
        setRespostas({});
        setFeedbackKind("info");
        setFilter("all");
        setFeedback("Um novo dia começou! Confira as missões de hoje.");
      }
      currentCatalog.current = data.catalogDate;
      setCatalogDate(data.catalogDate);
      setEarnedToday(data.xpGanhoHoje);
      setMissoes(data.missoes);
    } finally { refreshing.current = false; setCarregando(false); }
  }, []);

  useEffect(() => {
    const refresh = () => carregarMissoes().catch(error => { setFeedbackKind("error"); setFeedback(error.message); });
    const checkDate = () => {
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      if (today !== currentCatalog.current) refresh();
    };
    refresh();
    const timer = setInterval(checkDate, 1000);
    window.addEventListener("focus", checkDate);
    return () => { clearInterval(timer); window.removeEventListener("focus", checkDate); };
  }, [carregarMissoes]);

  const resumo = useMemo(() => {
    const total = missoes.filter(missao => !missao.concluidaAnteriormente).length;
    const concluidas = missoes.filter((missao) => missao.concluidaHoje).length;
    const totalXP = earnedToday;
    const totalPossivel = earnedToday + missoes.filter(missao => !missao.concluida).reduce((total,missao) => total + missao.xpRecompensa,0);

    return {
      concluidas,
      total,
      totalXP,
      totalPossivel,
      percentual: total ? Math.round((concluidas / total) * 100) : 0,
    };
  }, [missoes, earnedToday]);

  const handleRespostaChange = (missionId, value) => {
    setRespostas((current) => ({
      ...current,
      [missionId]: value,
    }));
  };

  const handleConcluir = async (id) => {
    setConcluindo(id);
    setFeedback("");

    try {
      const result = await missoesAPI.concluir(id, { ...(respostas[id] || {}), catalogDate });
      celebrate(result, "Missão cumprida!");
      atualizarUsuario(result.usuario);
      await carregarMissoes();
      setRespostas((current) => ({ ...current, [id]: {} }));

      if (result.xpGanho > 0) {
        const levelMessage = result.levelUp ? ` Você chegou ao nível ${result.novoNivel}.` : "";
        const achievementMessage = result.novasConquistas?.length
          ? ` Nova conquista: ${result.novasConquistas[0].titulo}.`
          : "";
        setFeedbackKind("success");
        setFeedback(`+${result.xpGanho} XP conquistados.${levelMessage}${achievementMessage}`);
      }
    } catch (error) {
      await carregarMissoes().catch(() => {});
      setFeedbackKind("error");
      setFeedback(error.message || "Não foi possível concluir a missão.");
    } finally {
      setConcluindo(null);
    }
  };

  const filters = [
    { id: "all", label: "Todas", count: missoes.length },
    { id: "available", label: "Para explorar", count: missoes.filter(item => !item.concluida).length },
    { id: "today", label: "Concluídas hoje", count: resumo.concluidas },
    { id: "previous", label: "Já realizadas", count: missoes.filter(item => item.concluidaAnteriormente).length },
  ];
  const visibleMissions = missoes.filter(item => filter === "all"
    || (filter === "available" && !item.concluida)
    || (filter === "today" && item.concluidaHoje)
    || (filter === "previous" && item.concluidaAnteriormente));
  const complete = resumo.total > 0 && resumo.concluidas === resumo.total;
  const FeedbackIcon = feedbackKind === "error" ? CircleAlert : feedbackKind === "success" ? Sparkles : RefreshCw;
  const dateLabel = catalogDate ? new Date(`${catalogDate}T12:00:00-03:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }) : "Carregando o dia";

  return <PageShell title="Missões diárias" description="Explore, descubra e cuide da natureza de Saquarema.">
    <div className="daily-missions space-y-6">
      <section className="mission-hero relative isolate overflow-hidden rounded-[2rem] border border-cyan-200 p-5 sm:p-7" aria-labelledby="mission-adventure-title">
        <div className="mission-sea-wave" aria-hidden="true" />
        <div className="relative grid items-center gap-5 lg:grid-cols-[1fr_190px]">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-white bg-white/90 px-3 py-1.5 text-xs font-bold text-sky-900"><CalendarDays size={15} aria-hidden="true" />{dateLabel}</p>
            <h2 id="mission-adventure-title" className="mt-4 max-w-xl text-2xl font-black leading-tight text-sky-950 sm:text-3xl">{complete ? "Missão cumprida, guardião!" : "Vamos cuidar de Saquarema?"}</h2>
            <p className="mt-2 max-w-lg text-sm font-medium leading-relaxed text-sky-900">{complete ? "Suas descobertas de hoje já fazem parte da sua aventura." : "Escolha um desafio, faça sua descoberta e ganhe XP para evoluir!"}</p>
            <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
              <SummaryItem icon={Target} label="Missões de hoje" value={carregando ? "…" : `${resumo.concluidas}/${resumo.total}`} color="blue" />
              <SummaryItem icon={Star} label="XP de hoje" value={carregando ? "…" : `+${resumo.totalXP}`} color="yellow" />
              <SummaryItem icon={Flame} label="Dias em sequência" value={user?.sequenciaDias || 0} color="green" />
            </div>
          </div>
          <div className="mission-mascot relative mx-auto hidden h-44 w-44 items-center justify-center lg:flex" aria-hidden="true">
            <div className="mission-mascot-orbit" />
            <span className="mission-mascot-body"><Turtle size={94} strokeWidth={1.7} /></span>
            <span className="mission-float mission-token mission-token--star"><Star size={24} className="fill-amber-300" /></span>
            <span className="mission-float mission-token mission-token--leaf"><Leaf size={25} /></span>
            <span className="mission-float mission-token mission-token--wave"><Waves size={24} /></span>
          </div>
        </div>
        <div className="relative mt-5 rounded-2xl border border-white/90 bg-white/90 p-4">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-sky-900"><span>{complete ? "Você completou os desafios de hoje!" : "Sua aventura de hoje"}</span><span>{resumo.percentual}%</span></div>
          <div role="progressbar" aria-label="Missões concluídas hoje" aria-valuemin={0} aria-valuemax={100} aria-valuenow={resumo.percentual} className="h-3.5 overflow-hidden rounded-full bg-cyan-100"><div className="mission-progress h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500" style={{ width: `${resumo.percentual}%` }} /></div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-600"><span className="inline-flex items-center gap-1.5"><Clock3 size={14} aria-hidden="true" />Renova à meia-noite · Brasília</span><span>{resumo.totalPossivel - resumo.totalXP > 0 ? `${resumo.totalPossivel - resumo.totalXP} XP ainda disponíveis hoje` : "Cada descoberta conta!"}</span></div>
        </div>
      </section>

      {feedback && <div key={feedback} role={feedbackKind === "error" ? "alert" : "status"} className={`mission-feedback flex items-start gap-3 rounded-2xl border p-4 text-sm font-bold ${feedbackKind === "error" ? "border-red-200 bg-red-50 text-red-900" : feedbackKind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-cyan-200 bg-cyan-50 text-sky-900"}`}><FeedbackIcon size={24} className="shrink-0" aria-hidden="true" /><span className="flex-1 leading-relaxed">{feedback}</span>{feedbackKind === "error" && <button type="button" onClick={() => carregarMissoes().then(() => setFeedback("")).catch(error => setFeedback(error.message))} className="shrink-0 rounded-lg p-1 text-current" aria-label="Atualizar missões"><RefreshCw size={18} aria-hidden="true" /></button>}</div>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-xl font-black text-sky-950"><Sparkles size={23} className="text-cyan-600" aria-hidden="true" />Seus desafios</h2>
        <div className="flex max-w-full flex-wrap gap-2" role="group" aria-label="Filtrar missões">{filters.filter(item => item.id !== "previous" || item.count > 0).map(item => <button type="button" key={item.id} disabled={carregando} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={`mission-filter inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${filter === item.id ? "border-sky-700 bg-sky-700 text-white shadow-sm" : "border-cyan-200 bg-white text-sky-900 hover:bg-cyan-50"}`}>{item.label}<span className={`rounded-full px-1.5 py-0.5 text-[10px] ${filter === item.id ? "bg-white/20 text-white" : "bg-cyan-50 text-sky-800"}`}>{item.count}</span></button>)}</div>
      </div>

      {carregando ? <div role="status" aria-label="Carregando missões" className="grid gap-5 xl:grid-cols-2">{[0,1,2,3].map(index => <div key={index} className="h-80 rounded-[1.75rem] border border-cyan-100 bg-white/70 motion-safe:animate-pulse" />)}</div>
        : visibleMissions.length ? <div className="grid items-start gap-5 xl:grid-cols-2">{visibleMissions.map((missao,index) => {
          const theme = missionThemes[missao.xpRecompensa] || missionThemes[10];
          const Icon = contentIcon(missao.icon, missao.validacao?.type === "quiz" ? Brain : missao.validacao?.type === "list" ? Recycle : Sprout);
          const StatusIcon = missao.concluida ? ShieldCheck : Repeat2;
          return <article key={missao.id} id={`missao-${missao.id}`} tabIndex={-1} data-completed={missao.concluida} className={`mission-card relative overflow-hidden rounded-[1.75rem] border bg-white ${theme.border}`} style={{ "--mission-delay": `${Math.min(index,5) * 60}ms` }}>
            <div className={`h-1.5 ${missao.concluida ? "bg-emerald-400" : theme.accent}`} />
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <span className={`mission-card-icon flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-3xl border ${theme.icon}`}><Icon size={39} strokeWidth={1.8} aria-hidden="true" /></span>
                <div className="flex min-w-0 flex-col items-end gap-2 text-right">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${missao.concluida ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>{missao.concluida ? <CheckCheck size={16} aria-hidden="true" /> : <Star size={16} className="fill-amber-300" aria-hidden="true" />}{missao.concluidaHoje && missao.xpRecebido != null ? `+${missao.xpRecebido} XP recebidos` : missao.concluida ? "XP já recebido" : `+${missao.xpRecompensa} XP`}</span>
                  <span className={`inline-flex items-center gap-1 text-xs font-bold ${theme.text}`}>{Array.from({length: theme.stars},(_,star) => <Star key={star} size={12} className="fill-current" aria-hidden="true" />)}<span className="ml-1">{missao.dificuldade || theme.label}</span></span>
                </div>
              </div>
              <p className="mt-4 text-xs font-bold text-cyan-700">{missao.categoria}</p>
              <h3 className="mt-1 text-lg font-black leading-snug text-sky-950">{missao.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{missao.descricao}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2"><MissionDetail icon={Brain} label="Você aprende" text={missao.aprendizado} /><MissionDetail icon={Leaf} label="A natureza ganha" text={missao.impacto} /></div>
              <p className={`mt-4 flex items-center gap-2 text-xs font-bold ${missao.concluida ? "text-emerald-800" : "text-sky-800"}`}><StatusIcon size={16} className="shrink-0" aria-hidden="true" />{missao.concluidaAnteriormente ? "Já realizada · missão de conclusão única" : missao.concluidaHoje ? missao.repeatable ? "Concluída hoje · pode voltar em outro dia" : "Concluída · sua descoberta ficou registrada" : missao.repeatable ? "Uma recompensa por dia disponível" : "Esta missão pode ser realizada uma vez"}</p>
              {!missao.concluida ? <form className="mt-4 border-t border-cyan-100 pt-4" onSubmit={event => { event.preventDefault(); handleConcluir(missao.id); }}>
                <MissionValidationForm mission={missao} value={respostas[missao.id] || {}} onChange={value => handleRespostaChange(missao.id,value)} disabled={concluindo === missao.id || !can(user,"missions.submit")} />
                <button type="submit" disabled={!can(user,"missions.submit") || Boolean(concluindo)} className="mission-submit mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 px-4 py-3 text-sm font-black text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600">{concluindo === missao.id ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}{concluindo === missao.id ? "Registrando descoberta…" : "Concluir missão"}{!concluindo && <ArrowRight size={17} aria-hidden="true" />}</button>
              </form> : <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white"><ShieldCheck size={25} aria-hidden="true" /></span><div><p className="text-sm font-black">{missao.concluidaAnteriormente ? "Descoberta já registrada" : "Boa, guardião! Missão cumprida."}</p><p className="mt-1 text-xs leading-relaxed">{missao.concluidaAnteriormente ? "Explore os outros desafios disponíveis." : "Sua ação já faz parte do seu progresso."}</p></div></div>}
            </div>
          </article>;
        })}</div> : <div className="rounded-[1.75rem] border border-dashed border-cyan-300 bg-white p-8 text-center"><Turtle size={54} className="mx-auto text-teal-600" aria-hidden="true" /><h3 className="mt-4 text-lg font-black text-sky-950">{filter === "today" ? "Sua primeira descoberta está esperando!" : filter === "available" && complete ? "Você completou os desafios de hoje!" : "Nenhuma missão por aqui agora"}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">{filter === "today" ? "Escolha uma missão disponível para começar." : "Confira os outros desafios ou volte para o próximo catálogo diário."}</p>{filter !== "all" && <button type="button" onClick={() => setFilter("all")} className="mt-4 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white">Ver todas as missões</button>}</div>}

      {complete && <div className="mission-celebration flex items-center gap-4 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600"><Trophy size={34} aria-hidden="true" /></span><div><p className="font-black">Um dia cheio de boas ações!</p><p className="mt-1 text-sm leading-relaxed">Todas as missões disponíveis de hoje foram concluídas. O próximo catálogo chega à meia-noite.</p></div></div>}
    </div>
  </PageShell>;
}

const missionThemes = {
  10: { stars: 1, label: "Fácil", border: "border-emerald-200", accent: "bg-emerald-400", icon: "border-emerald-200 bg-emerald-50 text-emerald-700", text: "text-emerald-800" },
  20: { stars: 2, label: "Média", border: "border-cyan-200", accent: "bg-cyan-400", icon: "border-cyan-200 bg-cyan-50 text-cyan-700", text: "text-sky-800" },
  30: { stars: 3, label: "Difícil", border: "border-amber-200", accent: "bg-amber-400", icon: "border-amber-200 bg-amber-50 text-amber-700", text: "text-amber-900" },
};

function SummaryItem({ icon: Icon, label, value, color }) {
  const colors = { blue: "bg-sky-100 text-sky-700", yellow: "bg-amber-100 text-amber-700", green: "bg-emerald-100 text-emerald-700" };
  return <div className="min-w-0 rounded-2xl border border-white bg-white/90 p-3 sm:p-4"><span className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl ${colors[color]}`}><Icon size={18} aria-hidden="true" /></span><p className="text-xl font-black text-sky-950 sm:text-3xl">{value}</p><p className="mt-1 text-[11px] font-semibold leading-relaxed text-sky-900 sm:text-xs">{label}</p></div>;
}

function MissionDetail({ icon: Icon, label, text }) {
  return <div className="rounded-2xl bg-cyan-50/60 p-3"><p className="flex items-center gap-1.5 text-[11px] font-bold text-sky-800"><Icon size={14} className="shrink-0" aria-hidden="true" />{label}</p><p className="mt-1.5 text-xs leading-relaxed text-slate-600">{text}</p></div>;
}

function MissionValidationForm({ mission, value, onChange, disabled }) {
  const validacao = mission.validacao;
  if (!validacao) return null;

  if (validacao.type === "list") {
    return (
      <div className="mission-validation rounded-2xl bg-cyan-50/50 p-4">
        <p className="mb-3 text-sm font-black text-slate-800">{validacao.title}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {validacao.fields.map((field, index) => (
            <input
              key={field}
              value={value[field] || ""}
              onChange={(event) => onChange({ ...value, [field]: event.target.value })}
              disabled={disabled}
              aria-label={`Resíduo observado ${index + 1}`}
              placeholder={`Resíduo ${index + 1}`}
              minLength={3} maxLength={80} required
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100"
            />
          ))}
        </div>
      </div>
    );
  }

  if (validacao.type === "quiz") {
    const respostas = value.respostas || {};

    return (
      <div className="mission-validation space-y-3 rounded-2xl bg-cyan-50/50 p-4">
        <p className="text-sm font-black text-slate-800">{validacao.title}</p>
        {validacao.questions.map((question) => (
          <fieldset key={question.id} className="rounded-2xl border border-slate-200 p-3">
            <legend className="px-1 text-sm font-bold text-slate-700">{question.pergunta}</legend>
            <div className="mt-2 grid gap-2">
              {question.options.map((option) => (
                <label key={option.id} className="mission-answer flex cursor-pointer items-start gap-2 rounded-xl border border-cyan-100 bg-white px-3 py-3 text-sm font-semibold text-slate-700">
                  <input
                    type="radio" required
                    name={`${mission.id}-${question.id}`}
                    checked={respostas[question.id] === option.id}
                    onChange={() => onChange({
                      ...value,
                      respostas: {
                        ...respostas,
                        [question.id]: option.id,
                      },
                    })}
                    disabled={disabled}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-sky-700"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    );
  }

  return (
    <div className="mission-validation rounded-2xl bg-cyan-50/50 p-4">
      <label className="block">
        <span className="mb-2 block text-sm font-black text-slate-800">{validacao.title}</span>
        <textarea
          value={value.resposta || ""}
          onChange={(event) => onChange({ ...value, resposta: event.target.value })}
          disabled={disabled}
          minLength={validacao.minLength || 20} maxLength={500} required
          rows={3}
          className="w-full resize-none rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100"
        />
      </label>
    </div>
  );
}
