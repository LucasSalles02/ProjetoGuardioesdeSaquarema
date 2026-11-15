import { useEffect, useState } from "react";
import { Check, ChevronRight, LockKeyhole, Sparkles, Star, Trophy, Waves } from "lucide-react";
import PageShell from "../components/PageShell";
import LevelBadge from "../components/LevelBadge";
import { conquistas as conquistasAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Conquistas() {
  const { user } = useAuth();
  const [conquistas, setConquistas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const preview = user?.role === "ADMIN";

  useEffect(() => {
    let active = true;
    setCarregando(true); setError("");
    conquistasAPI.listar()
      .then(({ conquistas: lista }) => { if (active) setConquistas(lista); })
      .catch(() => { if (active) setError("Não foi possível carregar as conquistas."); })
      .finally(() => { if (active) setCarregando(false); });
    return () => { active = false; };
  }, [user?.xp, user?.role, attempt]);

  const obtidas = conquistas.filter(item => item.obtida).length;
  const current = conquistas.find(item => item.nivelNecessario === user?.nivel);
  const next = conquistas.find(item => !item.obtida);
  const ready = !carregando && !error;
  const percent = conquistas.length ? Math.round(obtidas / conquistas.length * 100) : 0;

  return <PageShell title="Meu baú de conquistas" description="Explore, aprenda e colecione medalhas para cuidar de Saquarema!">
    <section className="achievement-hero relative mb-8 overflow-hidden rounded-[2rem] border-2 border-cyan-200 p-5 sm:p-8" aria-label={preview ? "Catálogo de conquistas" : "Sua coleção de conquistas"}>
      <span className="achievement-bubble absolute -right-8 -top-10 h-44 w-44 rounded-full border-[12px] border-white/60" aria-hidden="true" />
      <span className="absolute -bottom-12 left-1/3 h-28 w-28 rounded-full bg-emerald-100/70" aria-hidden="true" />
      <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
        <div className="achievement-hero-medal shrink-0"><LevelBadge level={preview ? 10 : user?.nivel} size="hero" /></div>
        <div className="min-w-0 flex-1">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-white bg-white/90 px-3 py-1.5 text-xs font-black text-ocean-700"><Sparkles size={16} aria-hidden="true" />{preview ? "Uma coleção cheia de descobertas" : "Pequenas ações, grandes conquistas!"}</p>
          <h2 className="text-2xl font-black leading-tight text-sky-950 sm:text-3xl">{preview ? "Conheça todas as medalhas!" : current?.titulo || "Sua aventura de guardião"}</h2>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-sky-900">{preview ? "Todos os ícones estão liberados para você explorar. Esta visualização não concede conquistas nem XP à conta do administrador." : "Cada novo nível traz uma medalha especial. Vamos descobrir qual será a próxima?"}</p>
          {!preview && <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start"><span className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm font-black text-ocean-700">Nível {user?.nivel || 1} de 10</span><span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-black text-amber-900">{(user?.xp || 0).toLocaleString("pt-BR")} XP</span></div>}
        </div>
      </div>
      {ready && !preview && <div className="relative mt-6 rounded-2xl border border-white bg-white/90 p-4">
        <div className="mb-3 flex items-center justify-between gap-3 text-sm font-black text-sky-950"><span className="flex items-center gap-2"><Trophy size={20} className="text-amber-600" aria-hidden="true" />Seu baú está crescendo!</span><span>{obtidas}/{conquistas.length}</span></div>
        <div role="progressbar" aria-label="Conquistas desbloqueadas" aria-valuenow={obtidas} aria-valuemin={0} aria-valuemax={conquistas.length} className="h-4 overflow-hidden rounded-full bg-cyan-100"><div className="achievement-progress h-full rounded-full border-2 border-white/50 bg-gradient-to-r from-cyan-500 to-emerald-500" style={{ width: `${percent}%` }} /></div>
        <p className="mt-3 flex items-start gap-1 text-xs font-bold leading-relaxed text-sky-800"><ChevronRight size={16} className="shrink-0" aria-hidden="true" />{next ? `Próxima descoberta: ${next.titulo}, no nível ${next.nivelNecessario} (${next.xpNecessario.toLocaleString("pt-BR")} XP).` : "Você completou a coleção! Continue aprendendo e somando XP."}</p>
      </div>}
    </section>

    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-black text-sky-950"><Waves className="text-cyan-600" aria-hidden="true" />{preview ? "Todas as conquistas" : "Sua coleção de medalhas"}</h2><p className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600"><LockKeyhole size={14} aria-hidden="true" />{preview ? "Modo de visualização" : "Cinza = ainda falta descobrir"}</p></div>
    {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error} <button type="button" onClick={() => setAttempt(value => value + 1)} className="font-bold underline">Tentar novamente</button></div> : carregando ? <div role="status" aria-label="Carregando conquistas" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 10 }, (_, i) => <div key={i} className="h-80 rounded-[2rem] bg-cyan-100 motion-safe:animate-pulse" />)}</div> : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {conquistas.map((item, index) => {
        const available = preview || item.obtida;
        const isCurrent = !preview && item.nivelNecessario === user?.nivel;
        return <article key={item.id} data-unlocked={available} data-current={isCurrent} className="achievement-card group relative flex flex-col items-center overflow-hidden rounded-[2rem] border-2 p-6 text-center" style={{ "--entry-delay": `${Math.min(index, 6) * 55}ms` }}>
          <div className="mb-5 flex w-full items-center justify-between gap-2"><span className={`rounded-full px-3 py-1.5 text-xs font-black ${available ? "bg-cyan-100 text-ocean-700" : "bg-slate-200 text-slate-700"}`}>Nível {item.nivelNecessario}</span>{isCurrent ? <span className="rounded-full bg-amber-100 px-2.5 py-1.5 text-xs font-black text-amber-900">Você está aqui!</span> : available ? <Star size={22} className="fill-amber-300 text-amber-500" aria-hidden="true" /> : <LockKeyhole size={20} className="text-slate-500" aria-hidden="true" />}</div>
          <div className="achievement-medal relative mb-6"><LevelBadge level={item.nivelNecessario} locked={!available} />{available && <Sparkles className="achievement-sparkle absolute -right-5 top-1 h-6 w-6 text-amber-500" aria-hidden="true" />}</div>
          <h3 className="text-xl font-black leading-tight text-slate-950">{item.titulo}</h3>
          <p className="mt-2 text-sm font-medium text-slate-600">Alcance o nível {item.nivelNecessario}</p>
          <p className={`mt-3 rounded-xl px-3 py-2 text-sm font-black ${available ? "bg-white text-ocean-700" : "bg-white text-slate-700"}`}>{item.xpNecessario.toLocaleString("pt-BR")} XP acumulados</p>
          <p className={`mt-5 flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${available ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-700"}`}>{available ? <Check size={16} aria-hidden="true" /> : <LockKeyhole size={15} aria-hidden="true" />}{preview ? "Liberada para visualizar" : item.obtida ? "Oba! Conquista desbloqueada" : "Ainda bloqueada"}</p>
        </article>;
      })}
    </div>}
    {ready && <p className="mt-6 text-center text-xs font-medium leading-relaxed text-slate-600">As medalhas celebram os níveis que você alcança. Elas não concedem XP adicional.</p>}
  </PageShell>;
}
