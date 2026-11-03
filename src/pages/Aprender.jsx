import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, Compass, Lightbulb, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { aprendizado } from "../services/api";

export default function Aprender() {
  const [modulos, setModulos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let active = true;

    aprendizado.listarModulos()
      .then(({ modulos: lista }) => {
        if (active) setModulos(lista);
      })
      .finally(() => {
        if (active) setCarregando(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <PageShell
      title="Aprender"
      description="Trilhas curtas com objetivo pedagógico, pergunta-guia e ação local para aplicar na escola ou na cidade."
    >
      <section className="mb-6 rounded-3xl border border-emerald-100 bg-white/80 p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <InfoBlock icon={Compass} title="Investigar" text="Entenda o problema ambiental antes de agir." />
          <InfoBlock icon={Lightbulb} title="Aprender" text="Conecte conceitos de ciência, território e cidadania." />
          <InfoBlock icon={MapPin} title="Aplicar" text="Transforme a aula em uma atitude local." />
        </div>
      </section>

      {carregando ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-56 animate-pulse rounded-3xl bg-white/70" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {modulos.map((modulo) => {
            const completo = modulo.percentual === 100;

            return (
              <article key={modulo.id} className="sea-card overflow-hidden rounded-3xl">
                <div className={`bg-gradient-to-r ${modulo.accent} p-5 text-white`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                        {completo ? <CheckCircle2 size={22} aria-hidden="true" /> : <BookOpen size={22} aria-hidden="true" />}
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-white/80">{modulo.tema}</p>
                        <h2 className="text-xl font-black">{modulo.titulo}</h2>
                      </div>
                    </div>
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-black">
                      {modulo.concluidas}/{modulo.aulas}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <p className="text-sm font-semibold text-slate-600">{modulo.descricao}</p>

                  <div className="mt-4 space-y-3">
                    <LearningDetail label="Objetivo" text={modulo.objetivo} />
                    <LearningDetail label="Pergunta-guia" text={modulo.perguntaGuia} />
                    <LearningDetail label="Ação local" text={modulo.acaoLocal} />
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex justify-between text-xs font-bold text-slate-500">
                      <span>Progresso</span>
                      <span>{modulo.percentual}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${modulo.accent} transition-all`}
                        style={{ width: `${modulo.percentual}%` }}
                      />
                    </div>
                  </div>

                  <Link
                    to={`/aprender/${modulo.id}`}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-200 px-4 py-2.5 text-sm font-black text-sky-800 hover:bg-sky-50"
                  >
                    {completo ? "Revisar módulo" : modulo.concluidas ? "Continuar trilha" : "Começar trilha"}
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

function InfoBlock({ icon: Icon, title, text }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-cyan-50 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sky-700">
        <Icon size={20} aria-hidden="true" />
      </div>
      <div>
        <p className="font-black text-blue-950">{title}</p>
        <p className="mt-1 text-sm font-semibold text-slate-600">{text}</p>
      </div>
    </div>
  );
}

function LearningDetail({ label, text }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-black uppercase tracking-wide text-emerald-700">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{text}</p>
    </div>
  );
}
