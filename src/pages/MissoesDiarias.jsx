import { useEffect, useMemo, useState } from "react";
import { Check, ClipboardList, Leaf, Loader2, Target, Trophy, Waves } from "lucide-react";
import PageShell from "../components/PageShell";
import { missoes as missoesAPI } from "../services/api";
import { can } from "../services/permissions";
import { useAuth } from "../context/AuthContext";
import useContentAnchor from "../hooks/useContentAnchor";

export default function MissoesDiarias() {
  const { user, atualizarUsuario } = useAuth();
  const [missoes, setMissoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  useContentAnchor(!carregando);
  const [concluindo, setConcluindo] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [respostas, setRespostas] = useState({});

  const carregarMissoes = async () => {
    setCarregando(true);
    const { missoes: lista } = await missoesAPI.listar();
    setMissoes(lista);
    setCarregando(false);
  };

  useEffect(() => {
    carregarMissoes().catch(() => {
      setFeedback("Não foi possível carregar as missões.");
      setCarregando(false);
    });
  }, []);

  const resumo = useMemo(() => {
    const concluidas = missoes.filter((missao) => missao.concluida).length;
    const totalXP = missoes
      .filter((missao) => missao.concluida)
      .reduce((total, missao) => total + missao.xpRecompensa, 0);
    const totalPossivel = missoes.reduce((total, missao) => total + missao.xpRecompensa, 0);

    return {
      concluidas,
      totalXP,
      totalPossivel,
      percentual: missoes.length ? Math.round((concluidas / missoes.length) * 100) : 0,
    };
  }, [missoes]);

  const handleRespostaChange = (missionId, value) => {
    setRespostas((current) => ({
      ...current,
      [missionId]: value,
    }));
  };

  const handleConcluir = async (id) => {
    setConcluindo(id);
    setFeedback("");

    try {
      const result = await missoesAPI.concluir(id, respostas[id] || {});
      atualizarUsuario(result.usuario);
      const { missoes: lista } = await missoesAPI.listar();
      setMissoes(lista);
      setRespostas((current) => ({ ...current, [id]: {} }));

      if (result.xpGanho > 0) {
        const levelMessage = result.levelUp ? ` Você chegou ao nível ${result.novoNivel}.` : "";
        const achievementMessage = result.novasConquistas?.length
          ? ` Nova conquista: ${result.novasConquistas[0].titulo}.`
          : "";
        setFeedback(`+${result.xpGanho} XP conquistados.${levelMessage}${achievementMessage}`);
      }
    } catch (error) {
      setFeedback(error.message || "Não foi possível concluir a missão.");
    } finally {
      setConcluindo(null);
    }
  };

  return (
    <PageShell
      title="Missões diárias"
      description="Desafios rápidos para observar, aprender e agir em favor das praias, lagoas e vida marinha."
    >
      {feedback ? (
        <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
          {feedback}
        </div>
      ) : null}

      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-500 p-6 text-white shadow-sm">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/15" />
        <div className="relative grid gap-5 sm:grid-cols-3">
          <SummaryItem icon={Target} label="Missões" value={`${resumo.concluidas}/${missoes.length || 0}`} />
          <SummaryItem icon={Leaf} label="XP de hoje" value={`${resumo.totalXP}/${resumo.totalPossivel}`} />
          <SummaryItem icon={Waves} label="Sequência" value={`${user?.sequenciaDias || 0} dias`} />
        </div>
        <div className="relative mt-5 h-3 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white transition-all" style={{ width: `${resumo.percentual}%` }} />
        </div>
      </section>

      {carregando ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-3xl bg-white/70" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {missoes.map((missao) => (
            <article
              key={missao.id}
              id={`missao-${missao.id}`} tabIndex={-1}
              className={`sea-card rounded-3xl p-5 transition ${
                missao.concluida ? "bg-emerald-50" : "bg-white"
              }`}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 gap-3">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    missao.concluida ? "bg-emerald-600 text-white" : "bg-sky-50 text-sky-700"
                  }`}>
                    {missao.concluida ? <Check size={20} aria-hidden="true" /> : <Target size={20} aria-hidden="true" />}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-950">{missao.titulo}</p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                        {missao.categoria}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-600">{missao.descricao}</p>
                    <div className="adaptive-card-grid mt-3 grid gap-2">
                      <MissionDetail icon={ClipboardList} label="Aprendizado" text={missao.aprendizado} />
                      <MissionDetail icon={Leaf} label="Impacto" text={missao.impacto} />
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:flex-row xl:flex-col">
                  <span className="inline-flex items-center justify-center rounded-2xl bg-amber-100 px-4 py-2 text-sm font-black text-amber-800">
                    +{missao.xpRecompensa} XP
                  </span>
                  <button
                    type="button"
                    onClick={() => handleConcluir(missao.id)}
                    disabled={!can(user, "missions.submit") || missao.concluida || concluindo === missao.id}
                    className="inline-flex min-w-36 items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                  >
                    {concluindo === missao.id ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : null}
                    {missao.concluida ? "Concluída" : "Concluir"}
                  </button>
                </div>
              </div>
              {!missao.concluida ? (
                <MissionValidationForm
                  mission={missao}
                  value={respostas[missao.id] || {}}
                  onChange={(value) => handleRespostaChange(missao.id, value)}
                  disabled={concluindo === missao.id}
                />
              ) : null}
            </article>
          ))}
        </div>
      )}

      {resumo.concluidas === missoes.length && missoes.length > 0 ? (
        <div className="mt-6 flex items-center gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <Trophy size={22} aria-hidden="true" />
          <p className="text-sm font-bold">Todas as missões do dia foram concluídas.</p>
        </div>
      ) : null}
    </PageShell>
  );
}

function SummaryItem({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
        <Icon size={20} aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-blue-50">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}

function MissionDetail({ icon: Icon, label, text }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2">
      <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-sky-800">
        <Icon size={14} aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">{text}</p>
    </div>
  );
}

function MissionValidationForm({ mission, value, onChange, disabled }) {
  const validacao = mission.validacao;
  if (!validacao) return null;

  if (validacao.type === "list") {
    return (
      <div className="mt-4 rounded-2xl bg-white/80 p-4">
        <p className="mb-3 text-sm font-black text-slate-800">{validacao.title}</p>
        <div className="grid gap-3 md:grid-cols-3">
          {validacao.fields.map((field, index) => (
            <input
              key={field}
              value={value[field] || ""}
              onChange={(event) => onChange({ ...value, [field]: event.target.value })}
              disabled={disabled}
              placeholder={`Residuo ${index + 1}`}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100"
            />
          ))}
        </div>
      </div>
    );
  }

  if (validacao.type === "quiz") {
    const respostas = value.respostas || {};

    return (
      <div className="mt-4 space-y-3 rounded-2xl bg-white/80 p-4">
        <p className="text-sm font-black text-slate-800">{validacao.title}</p>
        {validacao.questions.map((question) => (
          <fieldset key={question.id} className="rounded-2xl border border-slate-200 p-3">
            <legend className="px-1 text-sm font-bold text-slate-700">{question.pergunta}</legend>
            <div className="mt-2 grid gap-2">
              {question.options.map((option) => (
                <label key={option.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                  <input
                    type="radio"
                    name={`${mission.id}-${question.id}`}
                    checked={respostas[question.id] === option.id}
                    onChange={() => onChange({
                      ...value,
                      respostas: {
                        ...respostas,
                        [question.id]: option.id,
                      },
                    })}
                    disabled={disabled}
                    className="h-4 w-4"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl bg-white/80 p-4">
      <label className="block">
        <span className="mb-2 block text-sm font-black text-slate-800">{validacao.title}</span>
        <textarea
          value={value.resposta || ""}
          onChange={(event) => onChange({ ...value, resposta: event.target.value })}
          disabled={disabled}
          minLength={validacao.minLength}
          rows={3}
          className="w-full resize-none rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100"
        />
      </label>
    </div>
  );
}
