import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, CircleAlert, Compass, Lightbulb, MapPin, Sparkles, Target, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { LearningDetail, LearningHero, LearningProgress, learningTheme } from "../components/LearningElements";
import { aprendizado } from "../services/api";

export default function Aprender() {
  const [modulos, setModulos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let active = true;
    setCarregando(true);
    setError("");
    aprendizado.listarModulos()
      .then(({ modulos: lista }) => { if (active) setModulos(lista); })
      .catch(err => { if (active) setError(err.message || "Não foi possível carregar as trilhas."); })
      .finally(() => { if (active) setCarregando(false); });
    return () => { active = false; };
  }, [attempt]);

  const completedLessons = modulos.reduce((sum, module) => sum + module.concluidas, 0);
  const totalLessons = modulos.reduce((sum, module) => sum + module.aulas, 0);
  const completedModules = modulos.filter(module => module.aulas > 0 && module.percentual === 100).length;
  const percent = totalLessons ? Math.round(completedLessons / totalLessons * 100) : 0;
  const filters = [{ id: "all", label: "Todas" }, { id: "new", label: "Para começar" }, { id: "started", label: "Em andamento" }, { id: "done", label: "Concluídas" }];
  const visible = modulos.filter(module => filter === "all" || (filter === "new" && module.concluidas === 0)
    || (filter === "started" && module.concluidas > 0 && module.percentual < 100)
    || (filter === "done" && module.aulas > 0 && module.percentual === 100));

  return <PageShell title="Aprender" description="Trilhas de descobertas para conhecer e proteger a natureza de Saquarema.">
    <div className="learning-space space-y-6">
      <LearningHero title="Uma descoberta de cada vez!" description="Investigue, aprenda e transforme cada aula em uma atitude para cuidar do nosso planeta.">
        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">{[[Compass,"Trilhas",modulos.length,"bg-sky-100 text-sky-700"],[BookOpen,"Aulas concluídas",completedLessons,"bg-emerald-100 text-emerald-700"],[Trophy,"Trilhas concluídas",completedModules,"bg-amber-100 text-amber-700"]].map(([Icon,label,value,color]) => <div key={label} className="min-w-0 rounded-2xl border border-white bg-white/90 p-3 sm:p-4"><span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${color}`}><Icon size={18} aria-hidden="true" /></span><p className="mt-2 text-2xl font-black text-sky-950">{carregando ? "…" : value}</p><p className="mt-1 text-[11px] font-semibold text-sky-900 sm:text-xs">{label}</p></div>)}</div>
        <div className="mt-4"><LearningProgress completed={completedLessons} total={totalLessons} percent={percent} label="Suas descobertas nas trilhas" /></div>
      </LearningHero>

      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="inline-flex items-center gap-2 text-xl font-black text-sky-950"><Sparkles className="text-cyan-600" size={23} aria-hidden="true" />Escolha sua trilha</h2><div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar trilhas">{filters.map(item => <button type="button" key={item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${filter === item.id ? "border-sky-700 bg-sky-700 text-white" : "border-cyan-200 bg-white text-sky-900 hover:bg-cyan-50"}`}>{item.label}</button>)}</div></div>

      {error ? <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900"><CircleAlert size={22} aria-hidden="true" /><p className="min-w-0 flex-1">{error}</p><button type="button" onClick={() => setAttempt(value => value + 1)} className="rounded-xl border border-red-200 bg-white px-3 py-2 font-bold">Tentar novamente</button></div>
        : carregando ? <div role="status" aria-label="Carregando trilhas" className="learning-catalog-grid grid gap-5">{[0,1,2,3].map(index => <div key={index} className="h-96 rounded-[1.75rem] border border-cyan-100 bg-white/70 motion-safe:animate-pulse" />)}</div>
          : visible.length ? <div className="learning-catalog-grid grid items-start gap-5">{visible.map((modulo,index) => {
            const complete = modulo.aulas > 0 && modulo.percentual === 100;
            const theme = learningTheme(modulo.id);
            const Icon = theme.icon;
            return <article key={modulo.id} className="learning-card overflow-hidden rounded-[1.75rem] border border-cyan-200 bg-white" data-completed={complete} style={{ "--learning-delay": `${Math.min(index,5) * 60}ms` }}>
              <div className={`h-1.5 bg-gradient-to-r ${modulo.accent || "from-cyan-400 to-emerald-400"}`} /><div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3"><span className={`learning-card-icon flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-3xl border ${theme.soft}`}><Icon size={39} strokeWidth={1.8} aria-hidden="true" /></span><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${complete ? "bg-emerald-100 text-emerald-900" : "bg-sky-50 text-sky-800"}`}>{complete ? <CheckCircle2 size={15} aria-hidden="true" /> : <BookOpen size={15} aria-hidden="true" />}{complete ? "Trilha concluída" : `${modulo.aulas} aulas`}</span></div>
                <p className="mt-4 text-xs font-bold text-cyan-700">{modulo.tema}</p><h3 className="mt-1 text-xl font-black text-sky-950">{modulo.titulo}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{modulo.descricao}</p>
                <div className="mt-4 space-y-2"><LearningDetail icon={Target} title="Objetivo" text={modulo.objetivo} /><LearningDetail icon={Lightbulb} title="Pergunta-guia" text={modulo.perguntaGuia} /><LearningDetail icon={MapPin} title="Ação local" text={modulo.acaoLocal} /></div>
                <div className="mt-4"><LearningProgress completed={modulo.concluidas} total={modulo.aulas} percent={modulo.percentual} label={`Progresso em ${modulo.titulo}`} /></div>
                <Link to={`/aprender/${modulo.id}`} className="learning-action mt-4 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-sky-700 px-4 py-3 text-sm font-black text-white transition hover:bg-sky-800">{complete ? "Revisar trilha" : modulo.concluidas ? "Continuar trilha" : "Começar trilha"}<ArrowRight size={18} aria-hidden="true" /></Link>
              </div>
            </article>;
          })}</div> : <div className="rounded-3xl border border-dashed border-cyan-300 bg-white p-8 text-center"><Compass className="mx-auto text-teal-600" size={50} aria-hidden="true" /><h3 className="mt-4 text-lg font-black text-sky-950">{filter === "all" ? "Novas descobertas vêm por aí!" : "Nenhuma trilha neste filtro"}</h3><p className="mt-2 text-sm text-slate-600">{filter === "all" ? "As trilhas publicadas aparecerão aqui." : "Explore todas as trilhas para escolher sua próxima descoberta."}</p>{filter !== "all" && <button type="button" onClick={() => setFilter("all")} className="mt-4 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white">Ver todas as trilhas</button>}</div>}
    </div>
  </PageShell>;
}
