import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import PageShell from "../components/PageShell";
import { aprendizado } from "../services/api";
import { can } from "../services/permissions";
import { useAuth } from "../context/AuthContext";
import useContentAnchor from "../hooks/useContentAnchor";

export default function ModuloAprender() {
  const { moduloId } = useParams();
  const { user, atualizarUsuario } = useAuth();
  const [modulo, setModulo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  useContentAnchor(!carregando && Boolean(modulo));
  const [concluindo, setConcluindo] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [respostas, setRespostas] = useState({});

  useEffect(() => {
    const carregarModulo = async () => {
      setCarregando(true);
      const { modulo: dados } = await aprendizado.obterModulo(moduloId);
      setModulo(dados);
      setCarregando(false);
    };

    carregarModulo().catch(() => {
      setModulo(null);
      setCarregando(false);
    });
  }, [moduloId]);

  const handleConcluir = async (lessonId) => {
    setConcluindo(lessonId);
    setFeedback("");

    try {
      const result = await aprendizado.concluirAula(moduloId, lessonId, {
        resposta: respostas[lessonId] || "",
      });
      setModulo(result.modulo);
      atualizarUsuario(result.usuario);
      setRespostas((current) => ({ ...current, [lessonId]: "" }));

      if (result.xpGanho > 0) {
        const levelMessage = result.levelUp ? ` Você chegou ao nível ${result.novoNivel}.` : "";
        const achievementMessage = result.novasConquistas?.length
          ? ` Nova conquista: ${result.novasConquistas[0].titulo}.`
          : "";
        setFeedback(`+${result.xpGanho} XP conquistados.${levelMessage}${achievementMessage}`);
      }
    } catch (error) {
      setFeedback(error.message || "Não foi possível concluir a aula.");
    } finally {
      setConcluindo(null);
    }
  };

  if (carregando) {
    return (
      <PageShell title="Carregando módulo">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-3xl bg-white/70" />
          ))}
        </div>
      </PageShell>
    );
  }

  if (!modulo) {
    return (
      <PageShell
        title="Módulo não encontrado"
        actions={(
          <Link to="/aprender" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100">
            <ArrowLeft size={16} aria-hidden="true" />
            Voltar
          </Link>
        )}
      >
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm font-semibold text-slate-500">
          Não encontramos esse módulo.
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={modulo.titulo}
      description={modulo.descricao}
      actions={(
        <Link to="/aprender" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100">
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar
        </Link>
      )}
    >
      {feedback ? (
        <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
          {feedback}
        </div>
      ) : null}

      <section className={`mb-6 rounded-3xl bg-gradient-to-r ${modulo.accent} p-6 text-white`}>
        <p className="text-sm font-bold uppercase tracking-wide text-white/80">{modulo.tema}</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_180px] sm:items-end">
          <div>
            <h2 className="text-2xl font-black">Progresso do módulo</h2>
            <p className="mt-2 text-sm text-white/85">{modulo.concluidas} de {modulo.aulas} aulas concluídas</p>
          </div>
          <p className="text-4xl font-black sm:text-right">{modulo.percentual}%</p>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white transition-all" style={{ width: `${modulo.percentual}%` }} />
        </div>
      </section>

      <section className="adaptive-card-grid mb-6 grid gap-4">
        <ModuleDetail title="Objetivo" text={modulo.objetivo} />
        <ModuleDetail title="Pergunta-guia" text={modulo.perguntaGuia} />
        <ModuleDetail title="Ação local" text={modulo.acaoLocal} />
      </section>

      <div className="space-y-3">
        {modulo.lessons.map((lesson) => (
          <article key={lesson.id} id={`aula-${lesson.id}`} tabIndex={-1} className="sea-card rounded-3xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 flex-1 basis-64 gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  lesson.concluida ? "bg-emerald-100 text-emerald-700" : "bg-blue-50 text-blue-700"
                }`}>
                  {lesson.concluida ? <CheckCircle2 size={20} aria-hidden="true" /> : <PlayCircle size={20} aria-hidden="true" />}
                </div>
                <div>
                  <h3 className="font-black text-slate-950">{lesson.titulo}</h3>
                  <p className="mt-1 text-sm text-slate-600">{lesson.resumo}</p>
                  <div className="adaptive-card-grid mt-3 grid gap-2">
                    <span className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                      <Sparkles size={14} aria-hidden="true" />
                      {lesson.habilidade}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-2xl bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800">
                      <ClipboardCheck size={14} aria-hidden="true" />
                      {lesson.atividade}
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-black text-amber-700">+{lesson.xp} XP</p>
                  {!lesson.concluida ? (
                    <label className="mt-4 block">
                      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-sky-800">
                        Validacao da atividade
                      </span>
                      <textarea
                        value={respostas[lesson.id] || ""}
                        onChange={(event) => setRespostas((current) => ({
                          ...current,
                          [lesson.id]: event.target.value,
                        }))}
                        rows={3}
                        placeholder="Responda a atividade da aula com suas palavras."
                        className="w-full resize-none rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                      />
                    </label>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleConcluir(lesson.id)}
                disabled={!can(user, "learning.complete") || lesson.concluida || concluindo === lesson.id}
                className="inline-flex min-w-40 items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-2.5 text-sm font-black text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
              >
                {concluindo === lesson.id ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : null}
                {lesson.concluida ? "Concluída" : "Marcar como concluída"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function ModuleDetail({ title, text }) {
  return (
    <div className="sea-card rounded-3xl p-4">
      <p className="text-xs font-black uppercase tracking-wide text-emerald-700">{title}</p>
      <p className="mt-2 text-sm font-semibold text-slate-700">{text}</p>
    </div>
  );
}
