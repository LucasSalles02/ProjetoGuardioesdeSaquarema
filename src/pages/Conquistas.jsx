import { useEffect, useMemo, useState } from "react";
import { LockKeyhole, Medal, Trophy } from "lucide-react";
import PageShell from "../components/PageShell";
import { conquistas as conquistasAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Conquistas() {
  const { user } = useAuth();
  const [conquistas, setConquistas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let active = true;

    conquistasAPI.listar()
      .then(({ conquistas: lista }) => {
        if (active) setConquistas(lista);
      })
      .finally(() => {
        if (active) setCarregando(false);
      });

    return () => {
      active = false;
    };
  }, [user?.xp, user?.missoesConcluidas, user?.aulasConcluidas, user?.sequenciaDias]);

  const obtidas = useMemo(() => conquistas.filter((conquista) => conquista.obtida).length, [conquistas]);

  return (
    <PageShell
      title="Conquistas"
      description="Medalhas desbloqueadas a partir do seu progresso em missões, aulas, XP e sequência."
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Desbloqueadas" value={`${obtidas}/${conquistas.length || 0}`} icon={Trophy} />
        <SummaryCard label="Nível atual" value={user?.nivel || 1} icon={Medal} />
        <SummaryCard label="XP total" value={user?.xp?.toLocaleString("pt-BR") || "0"} icon={Trophy} />
      </div>

      {carregando ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-44 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {conquistas.map((conquista) => (
            <article
              key={conquista.id}
              className={`rounded-lg border p-5 shadow-sm ${
                conquista.obtida
                  ? "border-amber-200 bg-amber-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${
                conquista.obtida ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400"
              }`}>
                {conquista.obtida ? <Trophy size={22} aria-hidden="true" /> : <LockKeyhole size={22} aria-hidden="true" />}
              </div>
              <h2 className="font-black text-slate-950">{conquista.titulo}</h2>
              <p className="mt-2 min-h-12 text-sm text-slate-600">{conquista.descricao}</p>
              <span className={`mt-4 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                conquista.obtida ? "bg-white text-amber-800" : "bg-slate-100 text-slate-500"
              }`}>
                {conquista.obtida ? `+${conquista.xp} XP` : "Bloqueada"}
              </span>
            </article>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function SummaryCard({ label, value, icon: Icon }) {
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
