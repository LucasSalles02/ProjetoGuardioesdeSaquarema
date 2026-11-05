import { useId } from "react";
import { Sparkles, Star } from "lucide-react";
import LevelBadge from "./LevelBadge";

export default function SaquaremaLandmark() {
  const titleId = useId();
  return <div className="landmark-constellation relative mx-auto mt-6 w-full max-w-md px-5 pb-5 pt-4 lg:mx-0 lg:mt-7">
    <div className="pointer-events-none absolute inset-0" aria-hidden="true"><span className="landmark-halo absolute inset-x-2 inset-y-0 rounded-[3rem] border border-cyan-300/70" /><Star className="landmark-tiny-star absolute left-10 top-0 h-5 w-5 fill-amber-200 text-amber-500" /><Sparkles className="landmark-tiny-star absolute bottom-0 right-20 h-5 w-5 text-emerald-600" /></div>
    <figure className="saquarema-landmark relative overflow-hidden rounded-[2rem] border-2 border-white/90 p-3 shadow-xl shadow-cyan-900/15">
    <svg viewBox="0 0 480 290" role="img" aria-labelledby={titleId} className="relative w-full text-white">
      <title id={titleId}>Desenho em linhas brancas da igreja de Saquarema sobre o morro, com torre e escadaria, inspirado na Igreja de Nossa Senhora de Nazareth</title>
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <g className="landmark-sky" opacity="0.5" aria-hidden="true">
          <circle cx="385" cy="56" r="22" />
          <path d="M54 88h44m-22-9h39M365 115h42m-12-8h34" />
          <path d="M108 48v10m-5-5h10M422 166v8m-4-4h8" />
        </g>
        <g className="landmark-architecture">
          <path className="landmark-draw" pathLength="1" d="M180 215V112h118v103M172 112l67-44 66 44M185 104l54-34 51 34M239 66V48m-7 7h14" />
          <path className="landmark-draw" pathLength="1" d="M180 118l-58 35v78m0-78-7 4m7 5 58-34M128 225l52-16M129 175l9-5v16l-9 5zm20-14 9-5v16l-9 5z" />
          <path className="landmark-draw" pathLength="1" d="M298 215V77h47v142M294 77h55l-5-6h-45zm9-6V57h36v14M301 57q2-13 20-17 18 4 20 17zm20-17V25m-3 8h6M305 87h33M298 122h47" />
          <path className="landmark-draw landmark-draw--details" pathLength="1" d="M314 110V94q7-9 14 0v16zm3-4h8m-4-13v12M311 214v-26q9-13 18 0v26M309 182q11-17 22 0" />
          <path className="landmark-draw landmark-draw--details" pathLength="1" d="M226 215v-29q13-13 26 0v29M222 180q17-18 34 0M202 152v-18q7-8 14 0v18zm30 0v-18q7-8 14 0v18zm30 0v-18q7-8 14 0v18zM207 135v13m30-13v13m30-13v13M199 158h20m10 0h20m10 0h20M315 159v-20q7-8 14 0v20zm7-20v16" />
          <path className="landmark-draw landmark-draw--details" pathLength="1" d="M236 91h6m-4-2h2M182 118h114M183 165h112M175 216h129m-79 4h30m-34 5h38" />
        </g>
        <g className="landmark-draw landmark-draw--ground">
          <path pathLength="1" d="M22 257q63-6 112-31t94 3m30-3q61-27 92 0t108 15" />
          <path pathLength="1" d="M257 223q76 11 55 30t66 27M277 221q83 13 60 32t68 27M268 228l21-3m-10 8 25-3m-14 8 27-3m-23 9 27-4m-20 10 28-4m-28 10 31-4m-21 12 32-5m-17 13 33-6m-12 14 33-7" />
          <path pathLength="1" d="M275 220v-8m19 12v-8m19 14v-8m17 17v-8m5 22v-8m13 23v-8m20 20v-8M39 273q25 7 51 0t51 0m-66 10q18 5 36 0" />
        </g>
      </g>
    </svg>
    <figcaption className="relative pb-2 text-center text-xs font-semibold tracking-wide text-cyan-50">Saquarema, nossa inspiração.</figcaption>
    </figure>
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <span className="landmark-reward landmark-reward--wave"><LevelBadge level={1} size="profile" /></span>
      <span className="landmark-reward landmark-reward--fish"><LevelBadge level={5} size="profile" /></span>
      <span className="landmark-reward landmark-reward--leaf"><LevelBadge level={7} size="profile" /></span>
      <span className="landmark-reward landmark-reward--trophy"><LevelBadge level={9} size="profile" /><Sparkles className="absolute -right-2 -top-3 h-4 w-4 text-amber-600" /></span>
    </div>
  </div>;
}
