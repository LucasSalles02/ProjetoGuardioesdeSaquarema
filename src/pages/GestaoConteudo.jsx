import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Gamepad2, Layers3, Loader2, Megaphone, Plus, Save, Target } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { can } from "../services/permissions";
import PageShell from "../components/PageShell";
import { admin as adminAPI } from "../services/api";

import AdminHighlights from "./AdminHighlights";

const emptyMission = {
  titulo: "",
  descricao: "",
  aprendizado: "",
  impacto: "",
  categoria: "Geral",
  xpRecompensa: 10,
  validationType: "text",
  active: true,
};

const emptyModule = {
  titulo: "",
  descricao: "",
  tema: "Ambiental",
  objetivo: "",
  acaoLocal: "",
  perguntaGuia: "",
  accent: "from-sky-600 to-emerald-500",
  active: true,
};

const emptyLesson = {
  moduleId: "",
  titulo: "",
  resumo: "",
  habilidade: "",
  atividade: "",
  xp: 50,
  active: true,
};

export default function GestaoConteudo() {
  const [conteudo, setConteudo] = useState({ missoes: [], modulos: [], jogos: [] });
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get("aba");
  const aba = requestedTab === "destaques" ? (can(user, "highlights.read") ? "destaques" : "missoes") : can(user, "content.read") ? (["missoes", "modulos", "aulas", "jogos"].includes(requestedTab) ? requestedTab : "missoes") : "destaques";
  const setAba = value => setParams({ aba: value });
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [missionId, setMissionId] = useState("");
  const [missionForm, setMissionForm] = useState(emptyMission);
  const [moduleId, setModuleId] = useState("");
  const [moduleForm, setModuleForm] = useState(emptyModule);
  const [lessonId, setLessonId] = useState("");
  const [lessonForm, setLessonForm] = useState(emptyLesson);
  const [gameId, setGameId] = useState("");
  const [gameForm, setGameForm] = useState({ titulo: "", descricao: "", xpRecompensa: 70, enabled: true });

  const carregar = async () => {
    const data = await adminAPI.listarConteudo();
    setConteudo(data);
    setLessonForm((current) => ({
      ...current,
      moduleId: current.moduleId || data.modulos[0]?.id || "",
    }));
  };

  useEffect(() => {
    if (!can(user, "content.read")) { setCarregando(false); return; }
    carregar()
      .catch((error) => setFeedback(error.message || "Nao foi possivel carregar a gestao."))
      .finally(() => setCarregando(false));
  }, [user]);

  const aulas = useMemo(() => (
    conteudo.modulos.flatMap((modulo) => (
      (modulo.lessons || []).map((lesson) => ({ ...lesson, moduleId: modulo.id, moduleTitle: modulo.titulo }))
    ))
  ), [conteudo.modulos]);

  const salvarMissao = async (event) => {
    event.preventDefault();
    await salvar(async () => {
      await adminAPI.salvarMissao(missionId, missionForm);
      setMissionId("");
      setMissionForm(emptyMission);
      setFeedback("Missao salva.");
    });
  };

  const salvarModulo = async (event) => {
    event.preventDefault();
    await salvar(async () => {
      await adminAPI.salvarModulo(moduleId, moduleForm);
      setModuleId("");
      setModuleForm(emptyModule);
      setFeedback("Modulo salvo.");
    });
  };

  const salvarAula = async (event) => {
    event.preventDefault();
    await salvar(async () => {
      await adminAPI.salvarAula(lessonForm.moduleId, lessonId, lessonForm);
      setLessonId("");
      setLessonForm({ ...emptyLesson, moduleId: lessonForm.moduleId });
      setFeedback("Aula salva.");
    });
  };

  const salvarJogo = async (event) => {
    event.preventDefault();
    await salvar(async () => {
      await adminAPI.salvarJogo(gameId, gameForm);
      setGameId("");
      setGameForm({ titulo: "", descricao: "", xpRecompensa: 70, enabled: true });
      setFeedback("Jogo salvo.");
    });
  };

  const salvar = async (action) => {
    setSalvando(true);
    setFeedback("");
    try {
      await action();
      await carregar();
    } catch (error) {
      setFeedback(error.message || "Nao foi possivel salvar.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <PageShell
      title="Gerenciar missões, aulas e jogos"
      description="Organize o conteúdo e as atividades de Guardiões de Saquarema."
    >
      <Link to="/admin/dashboard" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-sky-700 hover:text-sky-900"><ArrowLeft size={17} aria-hidden="true" /> Voltar à Administração</Link>
      {feedback ? (
        <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
          {feedback}
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-2">
        {can(user, "content.read") && <><TabButton active={aba === "missoes"} icon={Target} label="Missoes" onClick={() => setAba("missoes")} />
        <TabButton active={aba === "modulos"} icon={Layers3} label="Modulos" onClick={() => setAba("modulos")} />
        <TabButton active={aba === "aulas"} icon={BookOpen} label="Aulas" onClick={() => setAba("aulas")} />
        <TabButton active={aba === "jogos"} icon={Gamepad2} label="Jogos" onClick={() => setAba("jogos")} /></>}
        {can(user, "highlights.read") && <TabButton active={aba === "destaques"} icon={Megaphone} label="Destaques" onClick={() => setAba("destaques")} />}
      </div>

      {aba === "destaques" ? <AdminHighlights embedded /> : carregando ? (
        <div className="h-80 animate-pulse rounded-3xl bg-white/70" />
      ) : (
        <>
          {aba === "missoes" ? (
            <ContentGrid
              form={(
                <MissionForm
                  value={missionForm}
                  editing={Boolean(missionId)}
                  saving={salvando}
                  onChange={setMissionForm}
                  onSubmit={salvarMissao}
                  onNew={() => {
                    setMissionId("");
                    setMissionForm(emptyMission);
                  }}
                />
              )}
              items={conteudo.missoes.map((missao) => (
                <ContentItem
                  key={missao.id}
                  title={missao.titulo}
                  meta={`${missao.categoria} - ${missao.xpRecompensa} XP`}
                  active={missao.active}
                  onEdit={() => {
                    setMissionId(missao.id);
                    setMissionForm(missao);
                  }}
                />
              ))}
            />
          ) : null}

          {aba === "modulos" ? (
            <ContentGrid
              form={(
                <ModuleForm
                  value={moduleForm}
                  editing={Boolean(moduleId)}
                  saving={salvando}
                  onChange={setModuleForm}
                  onSubmit={salvarModulo}
                  onNew={() => {
                    setModuleId("");
                    setModuleForm(emptyModule);
                  }}
                />
              )}
              items={conteudo.modulos.map((modulo) => (
                <ContentItem
                  key={modulo.id}
                  title={modulo.titulo}
                  meta={`${modulo.tema} - ${(modulo.lessons || []).length} aulas`}
                  active={modulo.active}
                  onEdit={() => {
                    setModuleId(modulo.id);
                    setModuleForm(modulo);
                  }}
                />
              ))}
            />
          ) : null}

          {aba === "aulas" ? (
            <ContentGrid
              form={(
                <LessonForm
                  value={lessonForm}
                  modules={conteudo.modulos}
                  editing={Boolean(lessonId)}
                  saving={salvando}
                  onChange={setLessonForm}
                  onSubmit={salvarAula}
                  onNew={() => {
                    setLessonId("");
                    setLessonForm({ ...emptyLesson, moduleId: conteudo.modulos[0]?.id || "" });
                  }}
                />
              )}
              items={aulas.map((aula) => (
                <ContentItem
                  key={`${aula.moduleId}-${aula.id}`}
                  title={aula.titulo}
                  meta={`${aula.moduleTitle} - ${aula.xp} XP`}
                  active={aula.active}
                  onEdit={() => {
                    setLessonId(aula.id);
                    setLessonForm(aula);
                  }}
                />
              ))}
            />
          ) : null}

          {aba === "jogos" ? (
            <ContentGrid
              form={(
                <GameForm
                  value={gameForm}
                  games={conteudo.jogos}
                  editing={Boolean(gameId)}
                  saving={salvando}
                  onChange={setGameForm}
                  onSubmit={salvarJogo}
                  onSelect={(jogo) => {
                    setGameId(jogo.id);
                    setGameForm(jogo);
                  }}
                />
              )}
              items={conteudo.jogos.map((jogo) => (
                <ContentItem
                  key={jogo.id}
                  title={jogo.titulo}
                  meta={`${jogo.id} - ${jogo.xpRecompensa} XP`}
                  active={jogo.enabled}
                  onEdit={() => {
                    setGameId(jogo.id);
                    setGameForm(jogo);
                  }}
                />
              ))}
            />
          ) : null}
        </>
      )}
    </PageShell>
  );
}

function ContentGrid({ form, items }) {
  return (
    <div className="adaptive-wide-grid grid items-start gap-6">
      {form}
      <div className="adaptive-card-grid grid content-start gap-3">
        {items}
      </div>
    </div>
  );
}

function TabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black transition ${
        active ? "bg-sky-500 text-white" : "bg-white text-slate-700 hover:bg-sky-50"
      }`}
    >
      <Icon size={16} aria-hidden="true" />
      {label}
    </button>
  );
}

function ContentItem({ title, meta, active, onEdit }) {
  return (
    <article className="rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-base font-black text-blue-950">{title}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">{meta}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          {active ? "Ativo" : "Inativo"}
        </span>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-sky-200 px-3 py-2 text-sm font-black text-sky-800 hover:bg-sky-50"
      >
        Editar
      </button>
    </article>
  );
}

function FormShell({ title, editing, saving, onNew, onSubmit, children }) {
  const { user } = useAuth();
  const key = title === "Missao" ? "mission_admin" : title === "Jogo" ? "game_admin" : "content";
  const allowed = can(user, `${key}.${title === "Jogo" || editing ? "update" : "create"}`);
  return (
    <form onSubmit={onSubmit} className="sea-card rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-blue-950">{title}</h2>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
          title="Novo"
        >
          <Plus size={17} aria-hidden="true" />
        </button>
      </div>
      {!allowed && <p className="mb-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Seu perfil permite consulta, mas não permite salvar esta operação.</p>}
      <fieldset disabled={!allowed || saving} className="space-y-3">{children}</fieldset>
      <button
        type="submit"
        disabled={saving || !allowed}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-black text-white hover:bg-sky-600 disabled:opacity-60"
      >
        {saving ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
        {editing ? "Salvar alteracoes" : "Cadastrar"}
      </button>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Input(props) {
  return <input {...props} className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-sky-600 focus:ring-4 focus:ring-sky-100" />;
}

function TextArea(props) {
  return <textarea {...props} className="w-full resize-none rounded-2xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-sky-600 focus:ring-4 focus:ring-sky-100" />;
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4" />
      {label}
    </label>
  );
}

function MissionForm({ value, editing, saving, onChange, onSubmit, onNew }) {
  return (
    <FormShell title="Missao" editing={editing} saving={saving} onSubmit={onSubmit} onNew={onNew}>
      <Field label="Titulo"><Input value={value.titulo} onChange={(event) => onChange({ ...value, titulo: event.target.value })} required /></Field>
      <Field label="Descricao"><TextArea rows={3} value={value.descricao} onChange={(event) => onChange({ ...value, descricao: event.target.value })} required /></Field>
      <Field label="Aprendizado"><Input value={value.aprendizado} onChange={(event) => onChange({ ...value, aprendizado: event.target.value })} required /></Field>
      <Field label="Impacto"><TextArea rows={3} value={value.impacto} onChange={(event) => onChange({ ...value, impacto: event.target.value })} required /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Categoria"><Input value={value.categoria} onChange={(event) => onChange({ ...value, categoria: event.target.value })} required /></Field>
        <Field label="Dificuldade e XP"><select value={value.xpRecompensa} onChange={(event) => onChange({ ...value, xpRecompensa: Number(event.target.value) })} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5" required><option value={10}>Fácil - 10 XP</option><option value={20}>Média - 20 XP</option><option value={30}>Difícil - 30 XP</option></select></Field>
      </div>
      <Field label="Validacao">
        <select value={value.validationType} onChange={(event) => onChange({ ...value, validationType: event.target.value })} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-100">
          <option value="text">Resposta textual</option>
          <option value="list">Lista de tres itens</option>
          <option value="quiz">Quiz fixo</option>
        </select>
      </Field>
      <Toggle checked={Boolean(value.active)} onChange={(active) => onChange({ ...value, active })} label="Ativo" />
    </FormShell>
  );
}

function ModuleForm({ value, editing, saving, onChange, onSubmit, onNew }) {
  return (
    <FormShell title="Modulo" editing={editing} saving={saving} onSubmit={onSubmit} onNew={onNew}>
      <Field label="Titulo"><Input value={value.titulo} onChange={(event) => onChange({ ...value, titulo: event.target.value })} required /></Field>
      <Field label="Tema"><Input value={value.tema} onChange={(event) => onChange({ ...value, tema: event.target.value })} required /></Field>
      <Field label="Descricao"><TextArea rows={3} value={value.descricao} onChange={(event) => onChange({ ...value, descricao: event.target.value })} required /></Field>
      <Field label="Objetivo"><TextArea rows={3} value={value.objetivo} onChange={(event) => onChange({ ...value, objetivo: event.target.value })} required /></Field>
      <Field label="Acao local"><Input value={value.acaoLocal} onChange={(event) => onChange({ ...value, acaoLocal: event.target.value })} required /></Field>
      <Field label="Pergunta guia"><Input value={value.perguntaGuia} onChange={(event) => onChange({ ...value, perguntaGuia: event.target.value })} required /></Field>
      <Field label="Cor"><Input value={value.accent} onChange={(event) => onChange({ ...value, accent: event.target.value })} required /></Field>
      <Toggle checked={Boolean(value.active)} onChange={(active) => onChange({ ...value, active })} label="Ativo" />
    </FormShell>
  );
}

function LessonForm({ value, modules, editing, saving, onChange, onSubmit, onNew }) {
  return (
    <FormShell title="Aula" editing={editing} saving={saving} onSubmit={onSubmit} onNew={onNew}>
      <Field label="Modulo">
        <select value={value.moduleId} onChange={(event) => onChange({ ...value, moduleId: event.target.value })} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-100" required>
          {modules.map((module) => <option key={module.id} value={module.id}>{module.titulo}</option>)}
        </select>
      </Field>
      <Field label="Titulo"><Input value={value.titulo} onChange={(event) => onChange({ ...value, titulo: event.target.value })} required /></Field>
      <Field label="Resumo"><TextArea rows={3} value={value.resumo} onChange={(event) => onChange({ ...value, resumo: event.target.value })} required /></Field>
      <Field label="Habilidade"><Input value={value.habilidade} onChange={(event) => onChange({ ...value, habilidade: event.target.value })} required /></Field>
      <Field label="Atividade"><TextArea rows={3} value={value.atividade} onChange={(event) => onChange({ ...value, atividade: event.target.value })} required /></Field>
      <Field label="XP"><Input type="number" min="5" max="500" value={value.xp} onChange={(event) => onChange({ ...value, xp: event.target.value })} required /></Field>
      <Toggle checked={Boolean(value.active)} onChange={(active) => onChange({ ...value, active })} label="Ativo" />
    </FormShell>
  );
}

function GameForm({ value, games, editing, saving, onChange, onSubmit, onSelect }) {
  return (
    <FormShell title="Jogo" editing={editing} saving={saving} onSubmit={onSubmit} onNew={() => games[0] && onSelect(games[0])}>
      <Field label="Motor">
        <select value={value.id || ""} onChange={(event) => {
          const game = games.find((item) => item.id === event.target.value);
          if (game) onSelect(game);
        }} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-100" required>
          <option value="">Selecione</option>
          {games.map((game) => <option key={game.id} value={game.id}>{game.id}</option>)}
        </select>
      </Field>
      <Field label="Titulo"><Input value={value.titulo} onChange={(event) => onChange({ ...value, titulo: event.target.value })} required /></Field>
      <Field label="Descricao"><TextArea rows={3} value={value.descricao} onChange={(event) => onChange({ ...value, descricao: event.target.value })} required /></Field>
      <Field label="XP"><Input type="number" min="5" max="500" value={value.xpRecompensa} onChange={(event) => onChange({ ...value, xpRecompensa: event.target.value })} required /></Field>
      <Toggle checked={Boolean(value.enabled)} onChange={(enabled) => onChange({ ...value, enabled })} label="Ativo" />
    </FormShell>
  );
}
