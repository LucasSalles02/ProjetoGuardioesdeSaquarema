import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, BookOpen, CheckCircle2, Flame, Medal } from "lucide-react";
import PageShell from "../components/PageShell";
import { progresso as progressoAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function MeuProgresso() {
  const { user } = useAuth();
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([progressoAPI.obter(), progressoAPI.historico()])
      .then(([progresso, historico]) => {
        if (!active) return;
        setDados({
          ...progresso,
          grafico: historico.grafico,
          atividades: historico.atividades,
        });
      })
      .finally(() => {
        if (active) setCarregando(false);
      });

    return () => {
      active = false;
    };
  }, [user?.xp, user?.missoesConcluidas, user?.aulasConcluidas]);

  const maxXP = useMemo(() => {
    const values = dados?.grafico?.map((item) => item.xp) || [1];
    return Math.max(...values, 1);
  }, [dados]);

  const stats = dados?.stats || user || {};

  return (
    <PageShell
      title="Meu progresso"
      description="Acompanhe XP, sequência, nível e atividades recentes."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="XP total" value={stats.xp?.toLocaleString("pt-BR") || "0"} icon={BarChart3} />
        <StatCard label="Nível" value={stats.nivel || 1} icon={Medal} />
        <StatCard label="Missões concluídas" value={stats.missoesConcluidas || 0} icon={CheckCircle2} />
        <StatCard label="Sequência" value={`${stats.sequenciaDias || 0} dias`} icon={Flame} />
      </div>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">Evolução para o próximo nível</h2>
            <p className="text-sm text-slate-600">{stats.xp || 0} de {stats.xpProximoNivel || 500} XP</p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
            {stats.percentualNivel || 0}%
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-700 transition-all" style={{ width: `${stats.percentualNivel || 0}%` }} />
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-5 text-lg font-black text-slate-950">XP da semana</h2>
          {carregando ? (
            <div className="h-44 animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <div className="flex h-44 items-end gap-2">
              {(dados?.grafico || []).map((item) => (
                <div key={item.data} className="flex flex-1 flex-col items-center gap-2">
                  <span className="h-5 text-xs font-bold text-slate-500">{item.xp || ""}</span>
                  <div className="flex h-32 w-full items-end rounded-lg bg-slate-100">
                    <div
                      className="w-full rounded-lg bg-blue-700 transition-all"
                      style={{ height: `${item.xp ? Math.max(8, (item.xp / maxXP) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold capitalize text-slate-500">{item.dia}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-black text-slate-950">Atividades recentes</h2>
          {carregando ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : (dados?.atividades || []).length ? (
            <div className="space-y-3">
              {dados.atividades.slice(0, 8).map((atividade) => (
                <div key={atividade.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    {atividade.tipo === "aula" ? <BookOpen size={16} aria-hidden="true" /> : <Activity size={16} aria-hidden="true" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-950">{atividade.descricao}</p>
                    <p className="text-xs text-slate-500">{new Date(atividade.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <span className="text-xs font-black text-amber-700">+{atividade.xpGanho} XP</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-500">
              Nenhuma atividade registrada ainda.
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
        <Icon size={20} aria-hidden="true" />
      </div>
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}
