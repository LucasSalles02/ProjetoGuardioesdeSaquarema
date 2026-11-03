import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Gamepad2,
  Leaf,
  Medal,
  Recycle,
  School,
  Target,
  Waves,
} from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { aprendizado, conquistas, missoes, progresso } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [dados, setDados] = useState({
    missoes: [],
    modulos: [],
    conquistas: [],
    stats: null,
  });
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([
      missoes.listar(),
      aprendizado.listarModulos(),
      conquistas.listar(),
      progresso.obter(),
    ])
      .then(([missoesRes, modulosRes, conquistasRes, progressoRes]) => {
        if (!active) return;
        setDados({
          missoes: missoesRes.missoes,
          modulos: modulosRes.modulos,
          conquistas: conquistasRes.conquistas,
          stats: progressoRes.stats,
        });
      })
      .finally(() => {
        if (active) setCarregando(false);
      });

    return () => {
      active = false;
    };
  }, [user?.xp, user?.missoesConcluidas, user?.aulasConcluidas]);

  const stats = dados.stats || user || {};
  const missoesPendentes = useMemo(() => (
    dados.missoes.filter((missao) => !missao.concluida)
  ), [dados.missoes]);
  const missaoDoDia = missoesPendentes[0] || dados.missoes[0];
  const conquistasObtidas = dados.conquistas.filter((item) => item.obtida).length;
  const aulasConcluidas = stats.aulasConcluidas || 0;

  return (
    <PageShell
      title="Início"
      description="Seu painel de aprendizagem ambiental e proteção das praias."
    >
      <section className="sea-hero relative overflow-hidden rounded-3xl border border-white/80 p-6 shadow-sm sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-wide text-sky-800">
              <Waves size={15} aria-hidden="true" />
              Guardiões de Saquarema
            </span>
            <h2 className="mt-5 max-w-xl text-4xl font-black leading-tight text-blue-950 sm:text-5xl">
              Bem-vindo de volta, {user?.nome || "guardião"}!
            </h2>
            <p className="mt-4 max-w-lg text-base font-semibold text-slate-700">
              Vamos juntos cuidar das nossas praias, lagoas e da vida marinha com desafios curtos, aulas práticas e atitudes reais.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/missoes"
                className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 text-sm font-black text-white shadow-sm shadow-sky-200 hover:bg-sky-600"
              >
                Começar missão
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link
                to="/aprender"
                className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-white/80 px-5 py-3 text-sm font-black text-sky-800 hover:bg-white"
              >
                Ver trilhas
                <BookOpen size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <SaquaremaHeroArt />
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pontos" value={stats.xp?.toLocaleString("pt-BR") || "0"} icon={Leaf} tone="sky" />
        <StatCard label="Atividades concluídas" value={(stats.missoesConcluidas || 0) + aulasConcluidas} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Nível atual" value={stats.nivel || 1} icon={Medal} tone="blue" />
        <StatCard label="Conquistas" value={conquistasObtidas} icon={BarChart3} tone="violet" />
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <ActionCard
          to="/jogos"
          icon={Gamepad2}
          title="Jogos"
          description="Divirta-se e aprenda enquanto joga."
          accent="from-sky-500 to-blue-600"
        />
        <ActionCard
          to="/aprender"
          icon={BookOpen}
          title="Aprender"
          description="Descubra curiosidades sobre o meio ambiente."
          accent="from-emerald-500 to-teal-600"
        />
        <ActionCard
          to="/conquistas"
          icon={Medal}
          title="Conquistas"
          description="Ganhe medalhas, badges e suba de nível."
          accent="from-amber-400 to-orange-500"
        />
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="sea-card rounded-3xl p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <Target size={30} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black uppercase tracking-wide text-sky-700">Missão do dia</p>
              {carregando ? (
                <div className="mt-2 h-16 animate-pulse rounded-2xl bg-slate-100" />
              ) : missaoDoDia ? (
                <>
                  <h3 className="mt-1 text-xl font-black text-slate-950">{missaoDoDia.titulo}</h3>
                  <p className="mt-1 text-sm text-slate-600">{missaoDoDia.impacto || missaoDoDia.descricao}</p>
                </>
              ) : (
                <p className="mt-1 text-sm font-semibold text-slate-500">Você concluiu todas as missões de hoje.</p>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-sky-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all"
                style={{
                  width: `${dados.missoes.length ? ((dados.missoes.length - missoesPendentes.length) / dados.missoes.length) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-sm font-black text-slate-700">
              {dados.missoes.length - missoesPendentes.length}/{dados.missoes.length || 0}
            </span>
            <Link
              to="/missoes"
              className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-5 py-2.5 text-sm font-black text-white hover:bg-sky-600"
            >
              Começar
            </Link>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-700 p-5 text-white shadow-sm">
          <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/15" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <Recycle size={30} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-cyan-100">Pequenas atitudes</p>
              <h3 className="mt-2 text-2xl font-black">Oceano protegido</h3>
              <p className="mt-2 text-sm font-semibold text-cyan-50">
                Cada aula e missão conecta ciência, território e hábitos de cuidado com Saquarema.
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="sea-card sea-floor relative mt-6 overflow-hidden rounded-3xl p-5">
        <h2 className="text-xl font-black text-blue-950">Meu Progresso</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MiniMetric label="Pontos" value={stats.xp?.toLocaleString("pt-BR") || "0"} icon={Leaf} />
          <MiniMetric label="Missões" value={stats.missoesConcluidas || 0} icon={Target} />
          <MiniMetric label="Aulas" value={aulasConcluidas} icon={BookOpen} />
          <MiniMetric label="Sequência" value={`${stats.sequenciaDias || 0}d`} icon={School} />
        </div>
        <div className="mt-5">
          <div className="h-3 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500" style={{ width: `${stats.percentualNivel || 0}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-sm font-bold text-slate-600">
            <span>Você está indo muito bem. Continue assim.</span>
            <span>{stats.percentualNivel || 0}%</span>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function SaquaremaHeroArt() {
  return (
    <div className="relative min-h-72 overflow-hidden rounded-[2rem] bg-gradient-to-b from-sky-200 via-cyan-100 to-emerald-100 p-5">
      <div className="absolute left-0 top-24 h-16 w-1/2 rounded-r-full bg-sky-300/60" />
      <div className="absolute bottom-0 left-0 h-24 w-full bg-emerald-300/80 [clip-path:polygon(0_50%,45%_18%,100%_40%,100%_100%,0_100%)]" />
      <div className="absolute bottom-0 left-0 h-16 w-full bg-emerald-600/25 [clip-path:polygon(0_70%,60%_28%,100%_55%,100%_100%,0_100%)]" />

      <div className="absolute right-6 top-8 flex h-28 w-28 items-center justify-center rounded-full border-[12px] border-white/70 text-white">
        <Leaf size={58} aria-hidden="true" />
      </div>

      <div className="absolute bottom-14 left-1/2 w-32 -translate-x-1/2 rounded-t-3xl border-4 border-slate-100 bg-white p-4 shadow-sm">
        <div className="mx-auto h-9 w-9 rounded-t-full bg-sky-600" />
        <div className="mt-4 grid grid-cols-3 gap-2">
          <span className="h-8 rounded-t-full bg-sky-100" />
          <span className="h-8 rounded-t-full bg-sky-100" />
          <span className="h-8 rounded-t-full bg-sky-100" />
        </div>
        <div className="absolute -top-12 left-1/2 h-14 w-10 -translate-x-1/2 rounded-t-full border-4 border-slate-100 bg-white">
          <div className="mx-auto mt-4 h-6 w-3 rounded-t-full bg-sky-600" />
        </div>
      </div>

      <div className="absolute bottom-0 left-1/2 h-24 w-48 -translate-x-1/2 bg-stone-200/80 [clip-path:polygon(42%_0,58%_0,100%_100%,0_100%)]" />
      <span className="absolute left-8 top-20 h-2 w-8 rounded-full bg-sky-500/50" />
      <span className="absolute left-16 top-24 h-2 w-8 rounded-full bg-sky-500/40" />
      <span className="absolute right-20 top-32 h-2 w-8 rounded-full bg-sky-500/40" />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }) {
  const tones = {
    sky: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
  };

  return (
    <div className="sea-card rounded-3xl p-5">
      <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${tones[tone]}`}>
        <Icon size={22} aria-hidden="true" />
      </div>
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black text-blue-950">{value}</p>
    </div>
  );
}

function ActionCard({ to, icon: Icon, title, description, accent }) {
  return (
    <Link to={to} className="sea-card group rounded-3xl p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`mb-4 flex h-20 w-full items-center justify-center rounded-3xl bg-gradient-to-br ${accent} text-white`}>
        <Icon size={42} aria-hidden="true" />
      </div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-blue-950">{title}</h3>
          <p className="mt-2 text-sm font-semibold text-slate-600">{description}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white transition group-hover:bg-sky-600">
          <ArrowRight size={18} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

function MiniMetric({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 border-cyan-100 sm:border-r sm:last:border-r-0">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
        <Icon size={22} aria-hidden="true" />
      </div>
      <div>
        <p className="text-xl font-black text-blue-950">{value}</p>
        <p className="text-sm font-semibold text-slate-600">{label}</p>
      </div>
    </div>
  );
}
