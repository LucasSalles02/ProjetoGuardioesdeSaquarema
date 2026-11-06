import { Waves } from "lucide-react";
import SaquaremaHomeArt from "./SaquaremaHomeArt";

export default function HomeWelcome({ title, description, eyebrow = "Guardiões de Saquarema", playful = false, children }) {
  return <section className="home-welcome relative isolate overflow-hidden rounded-[2rem] border-2 border-white p-5 shadow-sm sm:p-7">
    <div className="home-landmark-background pointer-events-none absolute inset-y-0 right-0" aria-hidden="true"><SaquaremaHomeArt playful={playful} /></div>
    <span className="home-welcome-orbit pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border-[18px] border-white/40" aria-hidden="true" />
    <div className="home-welcome-content relative max-w-2xl"><span className="inline-flex items-center gap-2 rounded-full border border-white bg-white/90 px-3 py-1.5 text-xs font-black text-ocean-700"><Waves size={16} className="shrink-0" aria-hidden="true" />{eyebrow}</span><h2 className="mt-4 text-2xl font-black leading-tight text-sky-950 sm:text-3xl">{title}</h2><p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-sky-900 sm:text-base">{description}</p>{children && <div className="mt-5 flex flex-wrap items-center gap-3">{children}</div>}</div>
  </section>;
}
