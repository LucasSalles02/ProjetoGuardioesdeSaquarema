import { useEffect, useState } from "react";
import { ArrowUpRight, BookOpen, ClipboardCheck, Gamepad2, ImageOff, Megaphone, ChevronLeft, ChevronRight, Pause, Play, Sparkles, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { destaques } from "../services/api";
import { useAuth } from "../context/AuthContext";

export const highlightTypes = { game: { label: "Jogo", plural: "Jogos", icon: Gamepad2 }, mission: { label: "Missão", plural: "Missões", icon: Target }, module: { label: "Trilha educativa", plural: "Trilhas", icon: BookOpen }, lesson: { label: "Atividade / aula", plural: "Atividades", icon: ClipboardCheck } };
export const highlightColors = { blue: "border-sky-200 bg-sky-50 text-sky-900", green: "border-emerald-200 bg-emerald-50 text-emerald-900", yellow: "border-amber-200 bg-amber-50 text-amber-900", red: "border-rose-200 bg-rose-50 text-rose-900" };

export function HighlightCard({ item, preview = false }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [item.image]);
  const meta = highlightTypes[item.target_kind] || highlightTypes.module;
  const Icon = failed ? ImageOff : meta.icon;
  const contents = <>
    <div className="highlight-image relative aspect-[16/9] overflow-hidden border-b border-inherit">
      {item.image && !failed ? <img src={item.image} alt={item.image_alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center" aria-label={failed ? "Imagem indisponível" : undefined}><Icon size={52} strokeWidth={1.5} aria-hidden="true" /></div>}
      <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-xl border border-white bg-white/95 px-2.5 py-1.5 text-xs font-black text-sky-950"><meta.icon size={15} aria-hidden="true" />{meta.label}</span>
    </div>
    <div className="flex flex-1 flex-col p-5"><h3 className="break-words text-lg font-black leading-snug">{item.title || "Título do destaque"}</h3>{item.description && <p className="mt-2 break-words text-sm leading-relaxed text-slate-700">{item.description}</p>}<div className="mt-auto flex items-center justify-between gap-3 pt-5 text-sm font-bold"><span>Explorar conteúdo</span><ArrowUpRight size={20} aria-hidden="true" /></div></div>
  </>;
  const classes = `highlight-card flex min-w-0 flex-col overflow-hidden rounded-3xl border-2 shadow-sm ${highlightColors[item.color] || highlightColors.blue}`;
  return preview ? <article className={classes}>{contents}</article> : <Link to={item.href} className={`${classes} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600`}>{contents}</Link>;
}

export default function HomeHighlights() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [seconds, setSeconds] = useState(8);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState("loading");
  const [retry, setRetry] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => setPaused(media.matches);
    preference(); media.addEventListener("change", preference);
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => { media.removeEventListener("change", preference); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  useEffect(() => {
    let current = true;
    setStatus("loading");
    destaques.listar().then(result => {
      if (current) { setItems(result.destaques); setSeconds(result.interval_seconds || 8); setIndex(0); setStatus("ready"); }
    }).catch(() => { if (current) setStatus("error"); });
    return () => { current = false; };
  }, [retry, user.id]);
  const stopped = paused || hovered || focused || hidden;
  useEffect(() => {
    if (stopped || items.length < 2 || status !== "ready") return;
    const timer = window.setTimeout(() => setIndex(value => (value + 1) % items.length), seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [stopped, items.length, seconds, index, status]);
  const move = step => setIndex(value => (value + step + items.length) % items.length);
  return <section className="home-highlights min-w-0 rounded-[2rem] border border-cyan-100 bg-white/90 p-4 shadow-sm" aria-label="Destaques da plataforma" aria-roledescription="carrossel"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <div className="mb-3 flex items-center gap-2"><span className="highlight-spark rounded-xl bg-amber-100 p-2 text-amber-800"><Sparkles size={19} aria-hidden="true" /></span><h2 className="text-base font-black text-sky-950">Em destaque</h2>{items.length > 1 && <button type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? "Reproduzir destaques automaticamente" : "Pausar destaques"} aria-pressed={paused} className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl text-cyan-800 hover:bg-cyan-50 focus-visible:outline-sky-600">{paused ? <Play size={17} aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}</button>}</div>
    {status === "loading" ? <p role="status" className="py-6 text-sm text-slate-600">Carregando destaques…</p> : status === "error" ? <div role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-900">Não foi possível carregar os destaques. <button type="button" onClick={() => setRetry(value => value + 1)} className="rounded font-bold underline">Tentar novamente</button></div> : !items.length ? <div className="rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/50 p-4"><Megaphone size={25} className="mb-2 text-cyan-700" aria-hidden="true" /><p className="text-sm text-slate-600">Ainda não há destaques disponíveis para seu perfil. Explore os módulos da plataforma!</p></div> : <>
      <div aria-live={stopped ? "polite" : "off"} aria-atomic="true"><div key={items[index].id} className="highlight-slide" role="group" aria-roledescription="slide" aria-label={`${index + 1} de ${items.length}`}><HighlightCard item={items[index]} /></div></div>
      <div className="mt-2 flex items-center justify-center gap-1">
        {items.length > 1 && <button type="button" onClick={() => move(-1)} aria-label="Destaque anterior" className="flex h-11 w-9 shrink-0 items-center justify-center rounded-xl text-cyan-800 hover:bg-cyan-50 focus-visible:outline-sky-600"><ChevronLeft size={19} aria-hidden="true" /></button>}
        <div className="flex flex-wrap justify-center" aria-label="Escolher destaque">{items.map((item, position) => <button type="button" key={item.id} onClick={() => setIndex(position)} aria-label={`Exibir destaque ${position + 1}: ${item.title}`} aria-current={position === index ? "true" : undefined} className="highlight-dot flex h-11 min-w-8 items-center justify-center rounded-lg px-1 focus-visible:outline-sky-600"><span className="block h-2 rounded-full" /></button>)}</div>
        {items.length > 1 && <button type="button" onClick={() => move(1)} aria-label="Próximo destaque" className="flex h-11 w-9 shrink-0 items-center justify-center rounded-xl text-cyan-800 hover:bg-cyan-50 focus-visible:outline-sky-600"><ChevronRight size={19} aria-hidden="true" /></button>}
      </div>
      <p className="text-center text-[11px] font-semibold text-slate-500">{index + 1} de {items.length} destaques</p>
    </>}
  </section>;
}
