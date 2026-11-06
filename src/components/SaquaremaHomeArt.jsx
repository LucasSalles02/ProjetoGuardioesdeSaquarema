import { useId } from "react";
import { Recycle } from "lucide-react";

export default function SaquaremaHomeArt({ playful = false }) {
  const id = useId();
  return <figure className="home-illustration relative mx-auto w-full max-w-lg overflow-hidden rounded-[2rem] border-2 border-white bg-cyan-50 shadow-lg shadow-cyan-900/10">
    <svg viewBox="0 0 600 400" role="img" aria-labelledby={`${id}-title ${id}-description`} className="block h-auto w-full">
      <title id={`${id}-title`}>Igreja de Nossa Senhora de Nazareth, em Saquarema</title>
      <desc id={`${id}-description`}>{playful ? "Ilustração colorida da igreja branca e sua torre no alto do morro, com escadaria, árvores, tartaruga marinha, peixes e símbolo de reciclagem." : "Ilustração colorida da igreja branca e sua torre no alto de um morro verde, com escadaria, árvores e o mar de Saquarema."}</desc>
      <defs><linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor="#dff6ff" /><stop offset="1" stopColor="#f0fdfa" /></linearGradient><linearGradient id={`${id}-sea`} x2="0" y2="1"><stop stopColor="#22d3ee" /><stop offset="1" stopColor="#0891b2" /></linearGradient></defs>
      <path fill={`url(#${id}-sky)`} d="M0 0h600v400H0z" />
      <circle className="home-sun" cx="98" cy="62" r="29" fill="white" opacity="0.9" /><circle cx="98" cy="62" r="39" fill="none" stroke="white" strokeWidth="2" opacity="0.6" />
      <g className="home-clouds" fill="white" opacity="0.9" aria-hidden="true"><path d="M379 54a15 15 0 0 1 28-8 18 18 0 0 1 33 8h-61zM133 118a12 12 0 0 1 22-5 14 14 0 0 1 26 5z" /><path d="M460 105a10 10 0 0 1 18-5 12 12 0 0 1 23 5z" /></g>
      <path className="home-birds" d="m164 67 6-4 6 4m269 88 6-4 6 4" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M0 263q90-24 182 0t196 0 222 0v137H0z" fill="#a5f3fc" />
      <path d="M22 305q83-66 194-80 168-39 322 72l40 60H0z" fill="#a7f3d0" />
      <path d="M61 298q115-83 259-67 107 10 219 77l-41 40H40z" fill="#6ee7b7" />
      <path d="M40 322q110-48 198-42t199 26l107 29-83 42H18z" fill="#34d399" opacity="0.65" />
      <path d="M12 340q54-22 122-11l82 20 100-10 135 5 108 28-5 28H0z" fill="#0f766e" opacity="0.65" />
      <g stroke="#0e7490" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
        <path d="m370 158 82 34v45l-81-14z" fill="#e0f2fe" /><path d="m370 153 88 38-6 5-82-32z" fill="#94a3b8" />
        <path d="M211 124h126v112H211z" fill="#fff" /><path d="M211 124h13v112h-13z" fill="#ecfeff" />
        <path d="m202 124 72-48 70 48z" fill="#f8fafc" /><path d="m213 118 61-38 59 38z" fill="#e0f2fe" /><path d="M205 125h138v7H205z" fill="#fff" />
        <path d="M274 73V56m-7 7h14" fill="none" strokeWidth="2.4" /><path d="M271 100q4-5 8 0" fill="none" />
        <path d="M337 79h52v158h-52z" fill="#f8fafc" /><path d="M378 82h11v155h-11z" fill="#e0f2fe" />
        <path d="M332 77h62v7h-62zM343 60h40v17h-40z" fill="#fff" /><path d="M340 60q5-15 23-21 19 6 23 21z" fill="#cbd5e1" /><path d="M363 39q-4-7 0-21 5 14 0 21z" fill="#f8fafc" />
        <path d="M334 131h58v6h-58z" fill="#fff" /><path d="M354 119v-18q9-14 18 0v18z" fill="#075985" /><path d="M358 115h10l-2-6v-6h-6v6z" fill="#a5f3fc" strokeWidth="1" />
        <path d="M229 162v-15q7-10 14 0v15zm31 0v-15q7-10 14 0v15zm31 0v-15q7-10 14 0v15zM355 173v-19q7-10 14 0v19z" fill="#67e8f9" />
        <path d="M236 147v13m31-13v13m31-13v13m64-6v17" fill="none" strokeWidth="1" /><path d="M225 166h22m9 0h22m9 0h22M209 183h128" fill="none" stroke="#a5d9e6" />
        <path d="M257 236v-30q14-19 28 0v30zM351 237v-29q11-16 22 0v29z" fill="#0284c7" /><path d="M253 201q18-23 36 0m58 0q15-21 30 0" fill="none" stroke="#cbd5e1" strokeWidth="4" />
        <path d="M268 211v23m91-22v23" stroke="#075985" /><path d="M270 225h2m89 1h2" stroke="white" /><path d="M206 238h138m2 1h35" stroke="white" strokeWidth="4" />
      </g>
      <g className="home-tree" stroke="#0f766e" strokeWidth="2" strokeLinecap="round"><path d="M171 244v-30m0 14-10-10m10 5 11-11" /><path d="M149 209q-10-19 9-25 9-23 27-9 24-3 22 19 9 18-14 24-30 15-44-9" fill="#14b8a6" /><path d="m167 201 15-8m-11 15 18-4" stroke="#99f6e4" /></g>
      <path d="M261 240q-11 18-35 31l42 22q-8 15-30 26l22 8q28-17 32-37l-42-22q21-13 29-28z" fill="#f8fafc" stroke="#99b8c5" strokeWidth="1.5" strokeLinejoin="round" />
      <g stroke="#bad6e1" strokeWidth="1.5"><path d="m257 246 16 1m-22 5 19 1m-24 5 20 1m-28 6 24 3m-28 5 23 5m-12 0 23 6m-14 0 23 5m-14 4 21 3m-25 3 20 4m-25 3 20 4m-27 4 20 5" /></g>
      <g fill="white" stroke="#0e7490" strokeWidth="1.3"><path d="M254 245v-13m-17 26v-13m52 48v-13m-26 39v-13" /><circle cx="254" cy="230" r="3" /><circle cx="237" cy="243" r="3" /><circle cx="289" cy="278" r="3" /><circle cx="263" cy="304" r="3" /></g>
      <path d="M0 336q56-18 112 0t112 0 112 0 112 0 152 0v64H0z" fill={`url(#${id}-sea)`} />
      <g className="home-sea-ripples" fill="none" stroke="white" strokeWidth="2" opacity="0.45"><path d="M25 349q20-7 40 0t40 0m292-3q20-7 40 0t40 0M299 385q20-7 40 0t40 0" /></g>
      {playful && <>
        <g className="home-turtle" aria-hidden="true"><g transform="translate(194 365)">
          <g fill="#6ee7b7" stroke="#0f766e" strokeWidth="1.5"><path d="M12-12q11-20 23-11l-12 21zM-14-10q-18-10-23 1l19 12zM11 11q11 18 23 10l-13-20zM-16 11q-15 15-24 3l20-12z" /><circle cx="34" cy="-2" r="11" /></g><ellipse rx="28" ry="19" fill="#0f766e" stroke="#065f46" strokeWidth="2" /><path d="m-10-9 17-3 12 10-7 13-18 1-12-10zm-16 5 8 6m36-4 8-6M-7 12l-4 5m18-29 1-5" fill="none" stroke="#5eead4" strokeWidth="1.5" /><circle cx="39" cy="-5" r="2" fill="#083344" /><path d="m41 1-4 2" stroke="#0f766e" strokeLinecap="round" />
        </g></g>
        <g className="home-fish" fill="#e0f7fa" stroke="#0e7490" strokeWidth="1.5" aria-hidden="true"><path d="M422 370q17-17 34 0-17 17-34 0zm34 0 12-10v20z" /><circle cx="431" cy="369" r="1.5" fill="#0e7490" /><path d="M486 352q10-11 22 0-12 11-22 0zm22 0 8-7v14z" /><circle cx="492" cy="351" r="1" fill="#0e7490" /></g>
        <g className="home-recycle-token" transform="translate(72 269)" aria-hidden="true"><circle r="26" fill="white" stroke="#a7f3d0" strokeWidth="3" /><Recycle x="-16" y="-16" width="32" height="32" stroke="#0f766e" strokeWidth="2" /></g>
        <g className="home-sea-plants" fill="none" stroke="#99f6e4" strokeWidth="4" strokeLinecap="round" aria-hidden="true"><path d="M39 400v-29m0 12-12-12m12 5 10-16M552 400q-10-26 4-41m-8 25-12-8m15-5 11-3" /></g>
        <g className="home-sea-bubbles" fill="none" stroke="#cffafe" strokeWidth="1.5" opacity="0.8" aria-hidden="true"><circle cx="258" cy="359" r="3" /><circle cx="268" cy="348" r="2" /><circle cx="408" cy="353" r="3" /></g>
      </>}
    </svg>
    <figcaption className="border-t border-cyan-100 bg-white/90 px-3 py-2 text-center text-[10px] font-semibold tracking-wide text-ocean-700">Nossa Senhora de Nazareth · Cultura e natureza de Saquarema</figcaption>
  </figure>;
}
