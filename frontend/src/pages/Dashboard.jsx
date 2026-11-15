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
} from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { aprendizado, conquistas, missoes, progresso } from "../services/api";
import AccessHome from "./AccessHome";
import HomeWelcome from "../components/HomeWelcome";
import HomeHighlights from "../components/HomeHighlights";
import { can } from "../services/permissions";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  return ["missions.read", "missions.submit", "learning.read", "learning.complete", "games.read", "games.play", "achievements.read", "progress.read"].every(permission => can(user, permission)) ? <StudentDashboard /> : <AccessHome />;
}

function StudentDashboard() {
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
      <div className="home-top-grid"><div><HomeWelcome
        title={"Bem-vindo de volta, " + (user?.nome || "guardião") + "!"}
        description="Vamos juntos cuidar das nossas praias, lagoas e da vida marinha com desafios curtos, aulas práticas e atitudes reais."
        playful={user?.role === "USER"}
      >
        <Link to="/missoes" className="home-primary-button inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white">Começar missão<ArrowRight size={17} aria-hidden="true" /></Link>
        <Link to="/aprender" className="home-secondary-button inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-black text-ocean-700">Ver trilhas<BookOpen size={17} aria-hidden="true" /></Link>
      </HomeWelcome>

      <div className="adaptive-metric-grid mt-6 grid gap-4">
        <StatCard label="Pontos" value={stats.xp?.toLocaleString("pt-BR") || "0"} icon={Leaf} tone="sky" />
        <StatCard label="Atividades concluídas" value={(stats.missoesConcluidas || 0) + aulasConcluidas} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Nível atual" value={stats.nivel || 1} icon={Medal} tone="blue" />
        <StatCard label="Conquistas" value={conquistasObtidas} icon={BarChart3} tone="yellow" />
      </div>
      </div><HomeHighlights /></div>

      <section className="adaptive-card-grid mt-6 grid gap-4">
        <ActionCard
          to="/jogos"
          icon={Gamepad2}
          title="Jogos"
          description="Divirta-se e aprenda enquanto joga."
          accent="from-rose-100 to-orange-50"
        />
        <ActionCard
          to="/aprender"
          icon={BookOpen}
          title="Aprender"
          description="Descubra curiosidades sobre o meio ambiente."
          accent="from-emerald-100 to-teal-50"
        />
        <ActionCard
          to="/conquistas"
          icon={Medal}
          title="Conquistas"
          description="Ganhe medalhas, badges e suba de nível."
          accent="from-amber-100 to-yellow-50"
        />
      </section>

      <div className="adaptive-wide-grid mt-6 grid gap-4">
        <section className="home-card sea-card rounded-3xl p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <Target size={30} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black uppercase tracking-wide text-sky-700">Missão do dia</p>
              {carregando ? (
                <div className="mt-2 h-16 motion-safe:animate-pulse rounded-2xl bg-slate-100" />
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
                className="home-progress-fill h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all"
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
              className="inline-flex items-center justify-center rounded-2xl bg-cyan-700 px-5 py-2.5 text-sm font-black text-white hover:bg-cyan-800"
            >
              Começar
            </Link>
          </div>
        </section>

        <section className="home-eco-card relative overflow-hidden rounded-3xl p-5 text-white shadow-sm">
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

      <section className="home-progress-card sea-card sea-floor relative mt-6 overflow-hidden rounded-3xl p-5">
        <h2 className="text-xl font-black text-blue-950">Meu Progresso</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MiniMetric label="Pontos" value={stats.xp?.toLocaleString("pt-BR") || "0"} icon={Leaf} />
          <MiniMetric label="Missões" value={stats.missoesConcluidas || 0} icon={Target} />
          <MiniMetric label="Aulas" value={aulasConcluidas} icon={BookOpen} />
          <MiniMetric label="Sequência" value={`${stats.sequenciaDias || 0}d`} icon={School} />
        </div>
        <div className="mt-5">
          <div role="progressbar" aria-label="Progresso do nível atual" aria-valuenow={stats.percentualNivel || 0} aria-valuemin={0} aria-valuemax={100} className="h-3 overflow-hidden rounded-full bg-white">
            <div className="home-progress-fill h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500" style={{ width: `${stats.percentualNivel || 0}%` }} />
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

function StatCard({ label, value, icon: Icon, tone }) {
  const tones = {
    sky: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    aqua: "bg-cyan-50 text-cyan-800",
    yellow: "bg-amber-100 text-amber-800",
  };

  return (
    <div className="home-stat home-card sea-card rounded-3xl p-5">
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
    <Link to={to} className="home-action-card home-card sea-card group rounded-3xl p-5">
      <div className={`mb-4 flex h-20 w-full items-center justify-center home-action-icon rounded-3xl bg-gradient-to-br ${accent} text-ocean-700`}>
        <Icon size={42} aria-hidden="true" />
      </div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-blue-950">{title}</h3>
          <p className="mt-2 text-sm font-semibold text-slate-600">{description}</p>
        </div>
        <span className="home-card-arrow flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-ocean-700">
          <ArrowRight size={18} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

function MiniMetric({ label, value, icon: Icon }) {
  return (
    <div className="home-mini-metric flex items-center gap-3 border-cyan-100 sm:border-r sm:last:border-r-0">
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
