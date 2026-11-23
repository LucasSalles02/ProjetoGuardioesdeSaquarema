import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, CircleAlert, ClipboardCheck, Lightbulb, Loader2, MapPin, PlayCircle, ShieldCheck, Sparkles, Star, Target, Trophy } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import PageShell from "../components/PageShell";
import { LearningDetail, LearningHero, LearningProgress, learningTheme } from "../components/LearningElements";
import { aprendizado } from "../services/api";
import { can } from "../services/permissions";
import { useReward } from "../context/RewardContext";
import { useAuth } from "../context/AuthContext";
import { contentIcon } from "../services/contentIcons";
import useContentAnchor from "../hooks/useContentAnchor";

export default function ModuloAprender() {
  const { moduloId } = useParams();
  const { user, atualizarUsuario } = useAuth();
  const { celebrate } = useReward();
  const [modulo, setModulo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [concluindo, setConcluindo] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackKind, setFeedbackKind] = useState("success");
  const [respostas, setRespostas] = useState({});
  const currentModule = useRef(moduloId);
  currentModule.current = moduloId;
  useContentAnchor(!carregando && Boolean(modulo));

  useEffect(() => {
    let active = true;
    setCarregando(true);
    setError(""); setFeedback(""); setRespostas({}); setConcluindo(null);
    aprendizado.obterModulo(moduloId)
      .then(({ modulo: dados }) => { if (active) setModulo(dados); })
      .catch(err => { if (active) { setModulo(null); setError(err.message || "Não foi possível carregar esta trilha."); } })
      .finally(() => { if (active) setCarregando(false); });
    return () => { active = false; };
  }, [moduloId,attempt]);

  async function handleConcluir(lessonId) {
    if (concluindo) return;
    const submittedModule = moduloId;
    setConcluindo(lessonId); setFeedback("");
    try {
      const result = await aprendizado.concluirAula(submittedModule,lessonId,{ resposta: respostas[lessonId] || "" });
      celebrate(result, result.modulo?.percentual === 100 && modulo.percentual < 100 ? "Trilha concluída!" : "Aula concluída!");
      atualizarUsuario(result.usuario);
      if (currentModule.current !== submittedModule) return;
      setModulo(result.modulo);
      setRespostas(current => ({ ...current, [lessonId]: "" }));
      setFeedbackKind("success");
      const levelMessage = result.levelUp ? ` Você chegou ao nível ${result.novoNivel}!` : "";
      const achievementMessage = result.novasConquistas?.length ? ` Nova conquista: ${result.novasConquistas[0].titulo}.` : "";
      setFeedback(result.xpGanho > 0 ? `+${result.xpGanho} XP conquistados!${levelMessage}${achievementMessage}` : "Esta aula já está concluída e sua recompensa foi registrada.");
    } catch (err) {
      if (currentModule.current === submittedModule) { setFeedbackKind("error"); setFeedback(err.message || "Não foi possível concluir a aula."); }
    } finally { if (currentModule.current === submittedModule) setConcluindo(null); }
  }

  const back = <Link to="/aprender" className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-white px-4 py-2.5 text-sm font-bold text-sky-800 hover:bg-cyan-50"><ArrowLeft size={16} aria-hidden="true" />Voltar às trilhas</Link>;
  if (carregando) return <PageShell title="Carregando trilha" actions={back}><div role="status" aria-label="Carregando aulas" className="space-y-4">{[0,1,2].map(index => <div key={index} className="h-44 rounded-3xl border border-cyan-100 bg-white/70 motion-safe:animate-pulse" />)}</div></PageShell>;
  if (!modulo) return <PageShell title="Vamos encontrar sua trilha?" actions={back}><div role="alert" className="rounded-3xl border border-red-200 bg-white p-6 text-center"><CircleAlert size={40} className="mx-auto text-red-500" aria-hidden="true" /><p className="mt-3 text-sm text-slate-700">{error || "Esta trilha não está disponível."}</p><button type="button" onClick={() => setAttempt(value => value + 1)} className="mt-4 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white">Tentar novamente</button></div></PageShell>;

  const theme = learningTheme(modulo.id);
  const complete = modulo.aulas > 0 && modulo.percentual === 100;
  const next = modulo.lessons.find(lesson => !lesson.concluida);
  const remainingXp = modulo.lessons.filter(lesson => !lesson.concluida).reduce((sum,lesson) => sum + lesson.xp,0);
  const FeedbackIcon = feedbackKind === "error" ? CircleAlert : Sparkles;

  return <PageShell title={modulo.titulo} description={modulo.descricao} actions={back}>
    <div className="learning-space space-y-6">
      <LearningHero icon={theme.icon} title={complete ? "Trilha concluída, guardião!" : "Cada aula abre uma nova descoberta"} description={complete ? "Você concluiu todas as aulas desta trilha. Volte sempre para revisar o que aprendeu!" : "Aprenda, registre sua descoberta e veja seu progresso crescer."}>
        <div className="mt-4 flex flex-wrap gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${theme.soft}`}><BookOpen size={14} aria-hidden="true" />{modulo.tema}</span>{remainingXp > 0 && <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900"><Star size={14} className="fill-amber-300" aria-hidden="true" />{remainingXp} XP disponíveis nas aulas</span>}</div>
        <div className="mt-4"><LearningProgress completed={modulo.concluidas} total={modulo.aulas} percent={modulo.percentual} label="Seu progresso nesta trilha" /></div>
        {next && <Link to={`#aula-${next.id}`} className="learning-action mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-800">{modulo.concluidas ? "Continuar descobrindo" : "Explorar a primeira aula"}<ArrowRight size={17} aria-hidden="true" /></Link>}
      </LearningHero>

      <section aria-label="Sobre esta trilha" className="grid gap-3 lg:grid-cols-3"><LearningDetail icon={Target} title="Objetivo" text={modulo.objetivo} /><LearningDetail icon={Lightbulb} title="Pergunta-guia" text={modulo.perguntaGuia} /><LearningDetail icon={MapPin} title="Ação local" text={modulo.acaoLocal} /></section>
      {feedback && <div key={feedback} role={feedbackKind === "error" ? "alert" : "status"} className={`learning-feedback flex items-start gap-3 rounded-2xl border p-4 text-sm font-bold ${feedbackKind === "error" ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}><FeedbackIcon size={24} className="shrink-0" aria-hidden="true" /><p className="leading-relaxed">{feedback}</p></div>}
      <section aria-labelledby="learning-lessons-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="learning-lessons-title" className="inline-flex items-center gap-2 text-xl font-black text-sky-950"><Sparkles size={23} className="text-cyan-600" aria-hidden="true" />Suas aulas</h2><p className="text-xs font-semibold text-slate-600">O XP de cada aula é recebido uma vez.</p></div>
        {modulo.lessons.length > 0 && <nav aria-label="Navegar pelas aulas" className="mb-5 flex flex-wrap gap-2">{modulo.lessons.map((lesson,index) => <Link key={lesson.id} to={`#aula-${lesson.id}`} aria-label={`Aula ${index + 1}, ${lesson.titulo}${lesson.concluida ? ', concluída' : ''}`} className={`flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-bold ${lesson.concluida ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-cyan-200 bg-white text-sky-800 hover:bg-cyan-50"}`}>{lesson.concluida && <Check size={15} aria-hidden="true" />}Aula {index + 1}</Link>)}</nav>}
        <div className="space-y-5">{modulo.lessons.map((lesson,index) => {
          const LessonIcon = contentIcon(lesson.icon, lesson.concluida ? ShieldCheck : PlayCircle);
          return <article key={lesson.id} id={`aula-${lesson.id}`} tabIndex={-1} className="learning-card overflow-hidden rounded-[1.75rem] border border-cyan-200 bg-white" data-completed={lesson.concluida} style={{ "--learning-delay": `${Math.min(index,5) * 55}ms` }}>
          <div className={`h-1.5 ${lesson.concluida ? "bg-emerald-400" : `bg-gradient-to-r ${modulo.accent || "from-cyan-400 to-emerald-400"}`}`} /><div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3"><span className={`learning-card-icon flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border ${lesson.concluida ? "border-emerald-200 bg-emerald-50 text-emerald-700" : theme.soft}`}><LessonIcon size={35} aria-hidden="true" /></span><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${lesson.concluida ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>{lesson.concluida ? <CheckCircle2 size={15} aria-hidden="true" /> : <Star size={15} className="fill-amber-300" aria-hidden="true" />}{lesson.concluida ? "Recompensa já recebida" : `+${lesson.xp} XP`}</span></div>
            <p className="mt-4 text-xs font-bold text-cyan-700">Aula {index + 1} de {modulo.aulas}</p><h3 className="mt-1 text-xl font-black text-sky-950">{lesson.titulo}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{lesson.resumo}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2"><LearningDetail icon={Sparkles} title="Você desenvolve" text={lesson.habilidade} /><LearningDetail icon={ClipboardCheck} title="Sua atividade" text={lesson.atividade} /></div>
            {lesson.concluida ? <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><ShieldCheck size={27} className="shrink-0" aria-hidden="true" /><div><p className="text-sm font-black">Boa descoberta, guardião!</p><p className="mt-1 text-xs leading-relaxed">Aula concluída e recompensa registrada. Você pode revisar este conteúdo sempre que quiser.</p></div></div> : <form className="mt-4 border-t border-cyan-100 pt-4" onSubmit={event => { event.preventDefault(); handleConcluir(lesson.id); }}>
              <label className="block rounded-2xl bg-cyan-50/60 p-4"><span className="block text-sm font-bold text-sky-900">Conte sua descoberta</span><span className="mt-1 block text-xs leading-relaxed text-slate-600">Responda à atividade com suas palavras. Use pelo menos 20 caracteres.</span><textarea value={respostas[lesson.id] || ""} onChange={event => setRespostas(current => ({ ...current, [lesson.id]: event.target.value }))} required minLength={20} maxLength={700} rows={3} disabled={!can(user,"learning.complete") || concluindo === lesson.id} placeholder="O que você aprendeu e como pode colocar em prática?" className="mt-3 w-full resize-y rounded-2xl border border-cyan-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none focus:border-sky-500 disabled:bg-slate-100" /></label>
              <button type="submit" disabled={!can(user,"learning.complete") || Boolean(concluindo)} className="learning-action mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 px-4 py-3 text-sm font-black text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600">{concluindo === lesson.id ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}{concluindo === lesson.id ? "Registrando descoberta…" : "Concluir aula"}{!concluindo && <ArrowRight size={17} aria-hidden="true" />}</button>
            </form>}
          </div>
        </article>; })}</div>
        {!modulo.lessons.length && <div className="rounded-3xl border border-dashed border-cyan-300 bg-white p-8 text-center"><BookOpen size={44} className="mx-auto text-teal-600" aria-hidden="true" /><p className="mt-3 text-sm font-bold text-sky-900">As aulas desta trilha aparecerão aqui quando estiverem disponíveis.</p></div>}
      </section>
      {complete && <div className="learning-feedback flex items-center gap-4 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950"><Trophy size={38} className="shrink-0 text-amber-600" aria-hidden="true" /><div><p className="font-black">Mais uma trilha explorada!</p><p className="mt-1 text-sm">Continue aprendendo e leve suas descobertas para o dia a dia.</p><Link to="/aprender" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-sky-800">Explorar outras trilhas<ArrowRight size={16} aria-hidden="true" /></Link></div></div>}
    </div>
  </PageShell>;
}
