import { BookOpen, Compass, Fish, Leaf, Lightbulb, Recycle, Sparkles, Star, Waves } from "lucide-react";

const themes = {
  "vida-marinha": { icon: Fish, soft: "bg-cyan-50 text-cyan-800 border-cyan-200", stripe: "bg-cyan-400" },
  microplasticos: { icon: Waves, soft: "bg-sky-50 text-sky-800 border-sky-200", stripe: "bg-sky-400" },
  sustentabilidade: { icon: Leaf, soft: "bg-emerald-50 text-emerald-800 border-emerald-200", stripe: "bg-emerald-400" },
  reciclagem: { icon: Recycle, soft: "bg-amber-50 text-amber-800 border-amber-200", stripe: "bg-amber-400" },
  "praias-saquarema": { icon: Compass, soft: "bg-teal-50 text-teal-800 border-teal-200", stripe: "bg-teal-400" },
};

export function learningTheme(id) {
  return themes[id] || { icon: BookOpen, soft: "bg-cyan-50 text-cyan-800 border-cyan-200", stripe: "bg-cyan-400" };
}

export function LearningHero({ title, description, icon: Icon = BookOpen, children }) {
  return <section className="learning-hero relative isolate overflow-hidden rounded-[2rem] border border-cyan-200 p-5 sm:p-7">
    <div className="learning-tide" aria-hidden="true" />
    <div className="relative grid items-center gap-5 lg:grid-cols-[1fr_160px]">
      <div className="min-w-0"><h2 className="max-w-xl text-2xl font-black leading-tight text-sky-950 sm:text-3xl">{title}</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-sky-900">{description}</p>{children}</div>
      <div className="learning-emblem relative mx-auto hidden h-40 w-40 items-center justify-center lg:flex" aria-hidden="true"><span className="learning-emblem-ring" /><span className="learning-emblem-core"><Icon size={72} strokeWidth={1.7} /></span><span className="learning-token learning-token--star"><Star size={24} className="fill-amber-300" /></span><span className="learning-token learning-token--leaf"><Leaf size={24} /></span><Sparkles className="learning-spark absolute -left-2 top-3 text-cyan-600" size={24} /></div>
    </div>
  </section>;
}

export function LearningProgress({ completed, total, percent, label = "Seu progresso" }) {
  return <div className="rounded-2xl border border-cyan-100 bg-white/90 p-4"><div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-sky-900"><span>{label}</span><span>{percent}%</span></div><div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-3 overflow-hidden rounded-full bg-cyan-100"><div className="learning-progress h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500" style={{ width: `${percent}%` }} /></div><p className="mt-2 text-xs text-slate-600">{completed} de {total} aulas concluídas</p></div>;
}

export function LearningDetail({ icon: Icon = Lightbulb, title, text }) {
  return <div className="rounded-2xl border border-cyan-100/70 bg-cyan-50/60 p-3.5"><p className="flex items-center gap-2 text-xs font-bold text-sky-800"><Icon size={16} className="shrink-0" aria-hidden="true" />{title}</p><p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p></div>;
}
