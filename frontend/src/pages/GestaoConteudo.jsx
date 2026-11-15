import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  CircleAlert,
  Eye,
  Gamepad2,
  Layers3,
  Loader2,
  Megaphone,
  Pencil,
  PlayCircle,
  Plus,
  Recycle,
  RefreshCw,
  Save,
  Search,
  Sprout,
  Star,
  Target,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { can } from "../services/permissions";
import { contentIcon } from "../services/contentIcons";
import PageShell from "../components/PageShell";
import AdminDialog from "../components/admin/AdminDialog";
import ContentIconPicker from "../components/admin/ContentIconPicker";
import { admin as adminAPI } from "../services/api";
import AdminHighlights from "./AdminHighlights";

const tabs = {
  missoes: {
    label: "Missões",
    singular: "missão",
    Icon: Target,
    permission: "mission_admin",
    description: "Organize os desafios diários, a dificuldade e a disponibilidade de cada missão.",
  },
  modulos: {
    label: "Trilhas",
    singular: "trilha",
    Icon: Layers3,
    permission: "content",
    description: "Organize os temas, os objetivos pedagógicos e as ações locais das trilhas.",
  },
  aulas: {
    label: "Aulas",
    singular: "aula",
    Icon: BookOpen,
    permission: "content",
    description: "Vincule cada aula a uma trilha e defina sua atividade, ícone e recompensa.",
  },
  jogos: {
    label: "Jogos",
    singular: "jogo",
    Icon: Gamepad2,
    permission: "game_admin",
    description:
      "Configure os jogos disponíveis, o XP fixo e o limite diário de partidas recompensadas.",
  },
};
const emptyMission = {
  titulo: "",
  descricao: "",
  aprendizado: "",
  impacto: "",
  categoria: "Geral",
  xpRecompensa: 10,
  validationType: "text",
  repeatable: true,
  available_from: "",
  available_until: "",
  active: true,
  icon: null,
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
const emptyGame = {
  id: "",
  titulo: "",
  descricao: "",
  xpRecompensa: 70,
  dailyRewardLimit: 1,
  enabled: true,
};
const emptyLesson = {
  moduleId: "",
  titulo: "",
  resumo: "",
  habilidade: "",
  atividade: "",
  xp: 50,
  active: true,
  icon: null,
};
const trailColors = [
  ["from-sky-600 to-emerald-500", "Azul e verde-água"],
  ["from-cyan-500 to-sky-600", "Azul e ciano"],
  ["from-emerald-500 to-teal-600", "Verde e verde-água"],
  ["from-amber-400 to-orange-500", "Amarelo e laranja"],
  ["from-rose-500 to-amber-500", "Vermelho e amarelo"],
];
const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-100";

export default function GestaoConteudo() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const canRead = can(user, "content.read");
  const requested = params.get("aba");
  const aba =
    requested === "destaques" && can(user, "highlights.read")
      ? "destaques"
      : canRead
        ? tabs[requested]
          ? requested
          : "missoes"
        : "destaques";
  const [conteudo, setConteudo] = useState({ missoes: [], modulos: [], jogos: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setConteudo(await adminAPI.listarConteudo());
    } catch (err) {
      setError(err.message || "Não foi possível carregar os conteúdos.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (canRead) load();
    else setLoading(false);
  }, [canRead, load]);

  const lessons = useMemo(
    () =>
      conteudo.modulos.flatMap((module) =>
        (module.lessons || []).map((lesson) => ({
          ...lesson,
          moduleId: module.id,
          moduleTitle: module.titulo,
        })),
      ),
    [conteudo.modulos],
  );
  const items = aba === "aulas" ? lessons : conteudo[aba] || [];
  const tab = tabs[aba];
  const visible = items.filter(
    (item) =>
      (!status ||
        Boolean(aba === "jogos" ? item.enabled : item.active) === (status === "active")) &&
      [item.titulo, item.descricao, item.tema, item.categoria, item.moduleTitle].some((value) =>
        value?.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR")),
      ),
  );

  function openForm(kind, value) {
    const defaults = {
      missoes: emptyMission,
      modulos: emptyModule,
      aulas: { ...emptyLesson, moduleId: conteudo.modulos[0]?.id || "" },
      jogos: emptyGame,
    }[kind];
    setDialogError("");
    const form = Object.fromEntries(
      Object.entries(defaults).map(([key, fallback]) => [key, value?.[key] ?? fallback]),
    );
    setEditing({ kind, id: value?.id || "", value: form });
  }
  function closeForm() {
    if (!busy) setEditing(null);
  }
  function updateForm(value) {
    setEditing((current) => ({ ...current, value }));
  }
  async function save(event) {
    event.preventDefault();
    if (!editing || busy) return;
    setBusy(true);
    setDialogError("");
    const { kind, id, value } = editing;
    try {
      if (kind === "missoes") await adminAPI.salvarMissao(id, value);
      if (kind === "modulos") await adminAPI.salvarModulo(id, value);
      if (kind === "aulas") await adminAPI.salvarAula(value.moduleId, id, value);
      if (kind === "jogos") await adminAPI.salvarJogo(id, value);
      setEditing(null);
      setNotice("Conteúdo salvo com sucesso.");
      await load();
    } catch (err) {
      setDialogError(err.message || "Não foi possível salvar. Revise os campos e tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  const formProps = editing
    ? {
        value: editing.value,
        editing: Boolean(editing.id),
        saving: busy,
        error: dialogError,
        onChange: updateForm,
        onSubmit: save,
        onClose: closeForm,
      }
    : null;

  return (
    <PageShell
      title="Gerenciar missões, trilhas e jogos"
      description="Organize os conteúdos e as atividades de Guardiões de Saquarema."
    >
      <Link
        to="/admin/dashboard"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-sky-700"
      >
        <ArrowLeft size={17} aria-hidden="true" />
        Voltar à Administração
      </Link>
      {notice && (
        <p
          role="status"
          className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900"
        >
          {notice}
        </p>
      )}
      <div
        className="mb-6 flex flex-wrap gap-2"
        role="group"
        aria-label="Gerenciamentos de conteúdo"
      >
        {canRead &&
          Object.entries(tabs).map(([key, meta]) => (
            <TabButton
              key={key}
              active={aba === key}
              icon={meta.Icon}
              label={meta.label}
              onClick={() => {
                setParams({ aba: key });
                setQuery("");
                setStatus("");
              }}
            />
          ))}
        {can(user, "highlights.read") && (
          <TabButton
            active={aba === "destaques"}
            icon={Megaphone}
            label="Destaques"
            onClick={() => setParams({ aba: "destaques" })}
          />
        )}
      </div>
      {aba === "destaques" ? (
        <AdminHighlights embedded />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-cyan-100 bg-cyan-50 p-5">
            <div className="max-w-2xl">
              <h2 className="text-lg font-black text-sky-950">{tab.label}</h2>
              <p className="mt-1 text-sm leading-relaxed text-sky-900">{tab.description}</p>
            </div>
            {aba !== "jogos" && can(user, `${tab.permission}.create`) && (
              <button
                type="button"
                disabled={
                  loading || Boolean(error) || (aba === "aulas" && !conteudo.modulos.length)
                }
                onClick={() => openForm(aba)}
                className="home-primary-button inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                <Plus size={18} aria-hidden="true" />
                Criar {tab.singular}
              </button>
            )}
          </div>
          {aba === "aulas" && !loading && !conteudo.modulos.length && (
            <p className="mt-3 text-sm text-sky-900">
              Cadastre uma trilha para adicionar suas aulas.
            </p>
          )}
          <div className="my-4 flex flex-wrap items-center gap-3 rounded-2xl border border-cyan-100 bg-white p-4">
            <label className="relative min-w-0 flex-1 basis-52">
              <span className="sr-only">Buscar conteúdos</span>
              <Search
                size={17}
                className="absolute left-3 top-3 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por título, tema ou trilha"
                className={`${inputClass} pl-10`}
              />
            </label>
            <label>
              <span className="sr-only">Situação do conteúdo</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className={inputClass}
              >
                <option value="">Todas as situações</option>
                <option value="active">Ativos</option>
                <option value="inactive">Desativados</option>
              </select>
            </label>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              aria-label="Atualizar conteúdos"
              className="rounded-xl border border-cyan-200 p-2.5 text-sky-800 disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} aria-hidden="true" />
            </button>
          </div>
          {error ? (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-900"
            >
              <CircleAlert size={19} aria-hidden="true" />
              {error}
            </div>
          ) : loading ? (
            <p role="status" className="flex items-center gap-2 p-5 text-sm text-slate-600">
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              Carregando conteúdos…
            </p>
          ) : (
            <>
              <p className="mb-3 text-xs text-slate-500">
                {visible.length} de {items.length} conteúdos
              </p>
              {visible.length ? (
                <div className="adaptive-wide-grid grid gap-4">
                  {visible.map((item) => {
                    const Icon = contentIcon(item.icon, tab.Icon);
                    const enabled = aba === "jogos" ? item.enabled : item.active;
                    const editable = can(user, `${tab.permission}.update`);
                    return (
                      <article
                        key={`${item.moduleId || aba}-${item.id}`}
                        className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-100 bg-cyan-50 text-cyan-800">
                            <Icon size={27} aria-hidden="true" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="break-words font-bold text-sky-950">{item.titulo}</h3>
                            <p className="mt-1 text-xs text-slate-600">
                              {aba === "aulas"
                                ? item.moduleTitle
                                : item.tema || item.categoria || "Minigame educativo"}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${enabled ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
                          >
                            {enabled ? "Ativo" : "Desativado"}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-slate-600">
                          {item.descricao || item.resumo}
                        </p>
                        <p className="mt-3 text-xs font-bold text-sky-800">
                          {aba === "modulos"
                            ? `${item.lessons?.length || 0} aulas`
                            : `${item.xpRecompensa ?? item.xp} XP`}
                          {aba === "missoes"
                            ? item.repeatable
                              ? " · Repetível em outros dias"
                              : " · Conclusão única"
                            : aba === "jogos"
                              ? ` · ${item.dailyRewardLimit} partidas recompensadas por dia`
                              : ""}
                        </p>
                        <button
                          type="button"
                          onClick={() => openForm(aba, item)}
                          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-sky-200 px-3 py-2.5 text-sm font-bold text-sky-800 hover:bg-sky-50"
                        >
                          {editable ? (
                            <Pencil size={16} aria-hidden="true" />
                          ) : (
                            <Eye size={16} aria-hidden="true" />
                          )}
                          {editable ? "Editar" : "Visualizar"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-cyan-200 bg-white p-8 text-center text-sm text-slate-600">
                  {items.length
                    ? "Nenhum conteúdo corresponde à pesquisa."
                    : "Os conteúdos cadastrados aparecerão aqui."}
                </div>
              )}
            </>
          )}
        </>
      )}
      {editing?.kind === "missoes" && <MissionForm {...formProps} />}
      {editing?.kind === "modulos" && <ModuleForm {...formProps} />}
      {editing?.kind === "aulas" && <LessonForm {...formProps} modules={conteudo.modulos} />}
      {editing?.kind === "jogos" && (
        <GameForm
          {...formProps}
          games={conteudo.jogos}
          onSelect={(item) => openForm("jogos", item)}
        />
      )}
    </PageShell>
  );
}

function TabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${active ? "border-sky-700 bg-sky-700 text-white" : "border-cyan-100 bg-white text-slate-700 hover:bg-cyan-50"}`}
    >
      <Icon size={17} aria-hidden="true" />
      {label}
    </button>
  );
}

function FormShell({ kind, editing, saving, error, onClose, onSubmit, children }) {
  const { user } = useAuth();
  const meta = tabs[kind];
  const allowed = can(
    user,
    `${meta.permission}.${kind === "jogos" || editing ? "update" : "create"}`,
  );
  return (
    <AdminDialog
      title={`${allowed ? (editing ? "Editar" : "Criar") : "Visualizar"} ${meta.singular}`}
      description={meta.description}
      icon={meta.Icon}
      onClose={onClose}
      busy={saving}
    >
      <form onSubmit={onSubmit} className="p-5">
        <fieldset disabled={saving || !allowed} className="space-y-5 disabled:opacity-75">
          {children}
        </fieldset>
        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-900">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-50"
          >
            {allowed ? "Cancelar" : "Fechar"}
          </button>
          {allowed && (
            <button
              type="submit"
              disabled={saving}
              className="home-primary-button inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={17} className="animate-spin" aria-hidden="true" />
              ) : (
                <Save size={17} aria-hidden="true" />
              )}
              {saving ? "Salvando…" : `Salvar ${meta.singular}`}
            </button>
          )}
        </div>
      </form>
    </AdminDialog>
  );
}
function FormSection({ title, children, description }) {
  return (
    <section className="space-y-3 rounded-2xl border border-cyan-100 bg-cyan-50/30 p-4">
      <h3 className="text-sm font-black text-sky-950">{title}</h3>
      {description && <p className="text-xs leading-relaxed text-slate-600">{description}</p>}
      {children}
    </section>
  );
}
function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs leading-relaxed text-slate-500">{hint}</span>}
    </label>
  );
}
function Input(props) {
  return <input {...props} className={inputClass} />;
}
function TextArea(props) {
  return <textarea {...props} className={`${inputClass} resize-y`} />;
}
function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-bold text-emerald-900">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 shrink-0 accent-emerald-700"
      />
      {label}
    </label>
  );
}
function Preview({ value, fallback, subtitle, xp }) {
  const Icon = contentIcon(value.icon, fallback);
  return (
    <section aria-label="Prévia do conteúdo">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Prévia</h3>
      <div className="rounded-2xl border border-cyan-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-800">
            <Icon size={32} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="break-words font-bold text-sky-950">
              {value.titulo || "Título do conteúdo"}
            </p>
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <p className="mt-3 break-words text-sm leading-relaxed text-slate-600">
          {value.descricao || value.resumo || "A descrição do conteúdo aparecerá aqui."}
        </p>
        {xp != null && (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900">
            <Star size={14} aria-hidden="true" />
            {xp} XP
          </span>
        )}
      </div>
    </section>
  );
}

function MissionForm(props) {
  const { value, onChange } = props;
  const update = (key, next) => onChange({ ...value, [key]: next });
  const fallback =
    value.validationType === "quiz" ? Brain : value.validationType === "list" ? Recycle : Sprout;
  return (
    <FormShell {...props} kind="missoes">
      <FormSection title="Sobre a missão">
        <Field label="Título">
          <Input
            required
            maxLength={100}
            value={value.titulo}
            onChange={(event) => update("titulo", event.target.value)}
          />
        </Field>
        <Field label="Descrição">
          <TextArea
            required
            maxLength={500}
            rows={3}
            value={value.descricao}
            onChange={(event) => update("descricao", event.target.value)}
          />
        </Field>
        <Field label="Categoria">
          <Input
            required
            maxLength={80}
            value={value.categoria}
            onChange={(event) => update("categoria", event.target.value)}
          />
        </Field>
      </FormSection>
      <ContentIconPicker
        value={value.icon}
        fallback={fallback}
        onChange={(icon) => update("icon", icon)}
      />
      <FormSection title="Aprendizagem e atividade">
        <Field label="O que o aluno aprende">
          <Input
            required
            maxLength={120}
            value={value.aprendizado}
            onChange={(event) => update("aprendizado", event.target.value)}
          />
        </Field>
        <Field label="Impacto ambiental">
          <TextArea
            required
            maxLength={500}
            rows={3}
            value={value.impacto}
            onChange={(event) => update("impacto", event.target.value)}
          />
        </Field>
        <Field
          label="Como registrar a descoberta"
          hint={
            value.validationType === "quiz"
              ? "Este quiz utiliza as perguntas já definidas na plataforma."
              : "A resposta será validada antes da concessão de XP."
          }
        >
          <select
            value={value.validationType}
            onChange={(event) => update("validationType", event.target.value)}
            disabled={value.validationType === "quiz"}
            className={inputClass}
          >
            {value.validationType === "quiz" && (
              <option value="quiz">Quiz ambiental existente</option>
            )}
            <option value="text">Resposta escrita</option>
            <option value="list">Lista de três itens observados</option>
          </select>
        </Field>
      </FormSection>
      <FormSection title="Disponibilidade e recompensa">
        <Field label="Dificuldade e XP">
          <select
            value={value.xpRecompensa}
            onChange={(event) => update("xpRecompensa", Number(event.target.value))}
            className={inputClass}
          >
            <option value={10}>Fácil · 10 XP</option>
            <option value={20}>Média · 20 XP</option>
            <option value={30}>Difícil · 30 XP</option>
          </select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Disponível a partir de">
            <Input
              type="date"
              value={value.available_from || ""}
              onChange={(event) => update("available_from", event.target.value)}
            />
          </Field>
          <Field label="Disponível até">
            <Input
              type="date"
              min={value.available_from || undefined}
              value={value.available_until || ""}
              onChange={(event) => update("available_until", event.target.value)}
            />
          </Field>
        </div>
        <p className="text-xs leading-relaxed text-slate-600">
          Sem datas, a missão participa diariamente enquanto ativa. A renovação acontece à
          meia-noite de Brasília.
        </p>
        <Toggle
          checked={value.repeatable !== false}
          onChange={(next) => update("repeatable", next)}
          label="Permitir repetir em outros dias"
        />
        <p className="text-xs leading-relaxed text-slate-600">
          Missões repetíveis concedem XP uma vez por dia disponível. Com a repetição desativada, o
          aluno pode concluir a missão uma única vez.
        </p>
        <Toggle
          checked={Boolean(value.active)}
          onChange={(next) => update("active", next)}
          label="Missão ativa no catálogo"
        />
      </FormSection>
      <Preview
        value={value}
        fallback={fallback}
        xp={value.xpRecompensa}
        subtitle={value.categoria}
      />
    </FormShell>
  );
}
function ModuleForm(props) {
  const { value, onChange } = props;
  const update = (key, next) => onChange({ ...value, [key]: next });
  return (
    <FormShell {...props} kind="modulos">
      <FormSection title="Sobre a trilha">
        <Field label="Título">
          <Input
            required
            maxLength={100}
            value={value.titulo}
            onChange={(event) => update("titulo", event.target.value)}
          />
        </Field>
        <Field label="Tema">
          <Input
            required
            maxLength={80}
            value={value.tema}
            onChange={(event) => update("tema", event.target.value)}
          />
        </Field>
        <Field label="Descrição">
          <TextArea
            required
            maxLength={500}
            rows={3}
            value={value.descricao}
            onChange={(event) => update("descricao", event.target.value)}
          />
        </Field>
      </FormSection>
      <FormSection title="Planejamento pedagógico">
        <Field label="Objetivo">
          <TextArea
            required
            maxLength={500}
            rows={3}
            value={value.objetivo}
            onChange={(event) => update("objetivo", event.target.value)}
          />
        </Field>
        <Field label="Pergunta-guia">
          <TextArea
            required
            maxLength={500}
            rows={2}
            value={value.perguntaGuia}
            onChange={(event) => update("perguntaGuia", event.target.value)}
          />
        </Field>
        <Field label="Ação local">
          <TextArea
            required
            maxLength={500}
            rows={2}
            value={value.acaoLocal}
            onChange={(event) => update("acaoLocal", event.target.value)}
          />
        </Field>
      </FormSection>
      <FormSection title="Apresentação">
        <Field label="Cor da trilha">
          <select
            value={value.accent}
            onChange={(event) => update("accent", event.target.value)}
            className={inputClass}
          >
            {!trailColors.some(([id]) => id === value.accent) && (
              <option value={value.accent}>Cor atual personalizada</option>
            )}
            {trailColors.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <div className={`h-3 rounded-full bg-gradient-to-r ${value.accent}`} aria-hidden="true" />
        <Toggle
          checked={Boolean(value.active)}
          onChange={(next) => update("active", next)}
          label="Trilha ativa para os alunos"
        />
      </FormSection>
      <Preview value={value} fallback={BookOpen} subtitle={value.tema} />
    </FormShell>
  );
}
function LessonForm(props) {
  const { value, onChange, modules, editing } = props;
  const update = (key, next) => onChange({ ...value, [key]: next });
  return (
    <FormShell {...props} kind="aulas">
      <FormSection title="Sobre a aula">
        <Field
          label="Trilha vinculada"
          hint={
            editing
              ? "O vínculo desta aula é mantido durante a edição."
              : "Escolha a trilha em que esta aula será apresentada."
          }
        >
          <select
            required
            disabled={editing}
            value={value.moduleId}
            onChange={(event) => update("moduleId", event.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              Selecione uma trilha
            </option>
            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.titulo}
                {!module.active ? " (desativada)" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Título">
          <Input
            required
            maxLength={100}
            value={value.titulo}
            onChange={(event) => update("titulo", event.target.value)}
          />
        </Field>
        <Field label="Resumo">
          <TextArea
            required
            maxLength={500}
            rows={3}
            value={value.resumo}
            onChange={(event) => update("resumo", event.target.value)}
          />
        </Field>
      </FormSection>
      <ContentIconPicker
        value={value.icon}
        fallback={PlayCircle}
        onChange={(icon) => update("icon", icon)}
      />
      <FormSection title="Aprendizagem e recompensa">
        <Field label="Habilidade desenvolvida">
          <Input
            required
            maxLength={160}
            value={value.habilidade}
            onChange={(event) => update("habilidade", event.target.value)}
          />
        </Field>
        <Field label="Atividade proposta">
          <TextArea
            required
            maxLength={300}
            rows={3}
            value={value.atividade}
            onChange={(event) => update("atividade", event.target.value)}
          />
        </Field>
        <Field
          label="XP pela primeira conclusão"
          hint="A recompensa é concedida uma vez por aluno. Alterações preservam os pontos já recebidos."
        >
          <Input
            required
            type="number"
            min={5}
            max={500}
            step={1}
            value={value.xp}
            onChange={(event) => update("xp", event.target.value)}
          />
        </Field>
        <Toggle
          checked={Boolean(value.active)}
          onChange={(next) => update("active", next)}
          label="Aula ativa"
        />
        <p className="text-xs text-slate-600">
          A aula fica disponível quando ela e sua trilha estão ativas.
        </p>
      </FormSection>
      <Preview
        value={value}
        fallback={PlayCircle}
        xp={value.xp}
        subtitle={modules.find((module) => module.id === value.moduleId)?.titulo}
      />
    </FormShell>
  );
}
function GameForm(props) {
  const { value, onChange, games, onSelect } = props;
  const update = (key, next) => onChange({ ...value, [key]: next });
  return (
    <FormShell {...props} kind="jogos">
      <FormSection title="Sobre o jogo">
        <Field label="Jogo disponível">
          <select
            value={value.id}
            onChange={(event) => onSelect(games.find((item) => item.id === event.target.value))}
            className={inputClass}
          >
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.titulo}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Título">
          <Input
            required
            maxLength={100}
            value={value.titulo}
            onChange={(event) => update("titulo", event.target.value)}
          />
        </Field>
        <Field label="Descrição">
          <TextArea
            required
            maxLength={300}
            rows={3}
            value={value.descricao}
            onChange={(event) => update("descricao", event.target.value)}
          />
        </Field>
      </FormSection>
      <FormSection
        title="Recompensas diárias"
        description="A pontuação é fixa por partida válida, independentemente do desempenho do aluno."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="XP por partida">
            <Input
              required
              type="number"
              min={5}
              max={500}
              step={1}
              value={value.xpRecompensa}
              onChange={(event) => update("xpRecompensa", event.target.value)}
            />
          </Field>
          <Field label="Partidas com XP por dia">
            <Input
              required
              type="number"
              min={0}
              max={2147483647}
              step={1}
              value={value.dailyRewardLimit}
              onChange={(event) => update("dailyRewardLimit", Number(event.target.value))}
            />
          </Field>
        </div>
        <p className="text-xs leading-relaxed text-slate-600">
          O limite é individual por aluno e jogo, no horário de Brasília. O aluno continua jogando
          após atingir o limite. Zero permite jogar sem receber XP.
        </p>
        <p className="text-xs leading-relaxed text-slate-600">
          O XP de sessões iniciadas é preservado. O limite vigente é verificado na conclusão e
          alterações valem para novas conclusões.
        </p>
        <Toggle
          checked={Boolean(value.enabled)}
          onChange={(next) => update("enabled", next)}
          label="Jogo ativo para os alunos"
        />
      </FormSection>
      <Preview
        value={value}
        fallback={Gamepad2}
        xp={value.xpRecompensa}
        subtitle={`${value.dailyRewardLimit} partidas recompensadas por dia`}
      />
    </FormShell>
  );
}
