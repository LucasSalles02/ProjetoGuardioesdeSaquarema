import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRightLeft,
  Check,
  CircleAlert,
  Clock3,
  Eye,
  FileCheck2,
  Loader2,
  Plus,
  RefreshCw,
  School,
  Search,
  Send,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import AdminDialog from "../components/admin/AdminDialog";
import { transferencias } from "../services/api";
import { can } from "../services/permissions";
import { useAuth } from "../context/AuthContext";
import { useSchool } from "../context/SchoolContext";

const statuses = {
  PENDENTE: { label: "Pendente", style: "bg-amber-100 text-amber-900", Icon: Clock3 },
  APROVADA: { label: "Aprovada", style: "bg-sky-100 text-sky-900", Icon: Check },
  REJEITADA: { label: "Rejeitada", style: "bg-red-100 text-red-900", Icon: X },
  EXECUTADA: { label: "Executada", style: "bg-emerald-100 text-emerald-900", Icon: FileCheck2 },
};
const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-100";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-white px-3 py-2.5 text-sm font-bold text-sky-800 disabled:opacity-50";
const primaryClass =
  "home-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50";
const date = (value) => (value ? new Date(value).toLocaleString("pt-BR") : "");

export default function SchoolTransfers() {
  const { user } = useAuth();
  const { activeUnit } = useSchool();
  const adminMode = user?.role === "ADMIN";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [options, setOptions] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [action, setAction] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems((await transferencias.listar(adminMode)).solicitacoes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminMode]);
  useEffect(() => {
    setSelected(null);
    setOptions(null);
    load();
  }, [load, activeUnit?.id]);

  async function openRequest() {
    setPreparing(true);
    setError("");
    setDialogError("");
    try {
      setOptions(await transferencias.opcoes());
    } catch (err) {
      setError(err.message);
    } finally {
      setPreparing(false);
    }
  }
  async function details(id) {
    setPreparing(true);
    setError("");
    setDialogError("");
    setAction("");
    setNote("");
    try {
      setSelected((await transferencias.obter(adminMode, id)).solicitacao);
    } catch (err) {
      setError(err.message);
    } finally {
      setPreparing(false);
    }
  }
  async function create(data) {
    if (busy) return;
    setBusy(true);
    setDialogError("");
    try {
      await transferencias.criar(data);
      setOptions(null);
      setNotice("Solicitação enviada para análise da administração.");
      await load();
    } catch (err) {
      setDialogError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function decide(event) {
    event.preventDefault();
    if (!selected || !action || busy) return;
    setBusy(true);
    setDialogError("");
    try {
      const result =
        action === "execute"
          ? await transferencias.executar(selected.id)
          : await transferencias.decidir(selected.id, action === "approve", note);
      setSelected(result.solicitacao);
      setAction("");
      setNote("");
      setNotice(
        action === "execute"
          ? "Transferência executada. O aluno está vinculado ao destino e aguarda alocação em turma."
          : "Decisão registrada no histórico da solicitação.",
      );
      await load();
    } catch (err) {
      setDialogError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const term = query.trim().toLocaleLowerCase("pt-BR");
  const visible = items.filter(
    (item) =>
      (!status || item.status === status) &&
      [item.student_name, item.registration_number, item.source_name, item.destination_name].some(
        (value) => value.toLocaleLowerCase("pt-BR").includes(term),
      ),
  );

  return (
    <PageShell
      title="Transferências entre unidades"
      description={
        adminMode
          ? "Analise as solicitações dos gestores e execute as transferências aprovadas."
          : activeUnit?.name
      }
    >
      <Link
        to={adminMode ? "/admin/dashboard" : "/gestao-escolar"}
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-sky-800"
      >
        <ArrowLeft size={17} aria-hidden="true" />
        {adminMode ? "Voltar à Administração" : "Voltar à Gestão"}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-cyan-100 bg-cyan-50 p-5">
        <p className="max-w-2xl text-sm leading-relaxed text-sky-900">
          {adminMode
            ? "Aprovar registra a autorização. Execute a transferência para atualizar o vínculo escolar. O aluno chega ao destino sem turma, mantendo seu progresso."
            : "Solicite a transferência de um aluno desta unidade, informando destino e justificativa. A administração analisará o pedido."}
        </p>
        {!adminMode && can(user, "transfers.create") && (
          <button
            type="button"
            onClick={openRequest}
            disabled={preparing || loading || busy}
            className={primaryClass}
          >
            {preparing ? (
              <Loader2 className="animate-spin" size={18} aria-hidden="true" />
            ) : (
              <Plus size={18} aria-hidden="true" />
            )}
            Solicitar transferência
          </button>
        )}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Object.entries(statuses).map(([key, meta]) => (
          <div key={key} className="rounded-2xl border border-cyan-100 bg-white p-4">
            <span
              className={`inline-flex items-center gap-2 rounded-xl px-2 py-1 text-xs font-bold ${meta.style}`}
            >
              <meta.Icon size={15} aria-hidden="true" />
              {meta.label}
            </span>
            <p className="mt-3 text-2xl font-black text-sky-950">
              {loading ? "…" : items.filter((item) => item.status === key).length}
            </p>
          </div>
        ))}
      </div>
      {notice && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900"
        >
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-900">
          {error}
        </p>
      )}
      <div className="my-5 flex flex-wrap items-center gap-3 rounded-2xl border border-cyan-100 bg-white p-4">
        <label className="relative min-w-0 flex-1 basis-60">
          <span className="sr-only">Pesquisar solicitações</span>
          <Search size={17} className="absolute left-3 top-4 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Aluno, matrícula ou unidade"
            className={`${inputClass} pl-10`}
          />
        </label>
        <label>
          <span className="sr-only">Filtrar situação</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={inputClass}
          >
            <option value="">Todas as situações</option>
            {Object.entries(statuses).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={load} disabled={loading} className={buttonClass}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          Atualizar
        </button>
      </div>
      {loading ? (
        <p role="status" className="flex items-center gap-2 p-5 text-sm text-slate-600">
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          Carregando solicitações…
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => (
            <article key={item.id} className="rounded-2xl border border-cyan-100 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words font-black text-sky-950">{item.student_name}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Matrícula {item.registration_number} · {date(item.created_at)}
                  </p>
                </div>
                <Status state={item.status} />
              </div>
              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
                <School size={17} className="text-cyan-700" aria-hidden="true" />
                <span>{item.source_name}</span>
                <ArrowRightLeft size={16} className="text-cyan-700" aria-hidden="true" />
                <span>{item.destination_name}</span>
              </p>
              <button
                type="button"
                onClick={() => details(item.id)}
                disabled={preparing}
                className={`${buttonClass} mt-4`}
              >
                <Eye size={16} aria-hidden="true" />
                {adminMode && item.status === "PENDENTE"
                  ? "Analisar solicitação"
                  : "Visualizar solicitação"}
              </button>
            </article>
          ))}
          {!visible.length && (
            <p className="rounded-3xl border border-dashed border-cyan-200 bg-white p-8 text-center text-sm text-slate-600">
              Nenhuma solicitação encontrada.
            </p>
          )}
        </div>
      )}
      {options && (
        <TransferForm
          options={options}
          schoolName={activeUnit?.name}
          busy={busy}
          error={dialogError}
          onClose={() => {
            if (!busy) setOptions(null);
          }}
          onSave={create}
        />
      )}
      {selected && (
        <AdminDialog
          title="Solicitação de transferência"
          description={selected.student_name}
          icon={ArrowRightLeft}
          busy={busy}
          onClose={() => {
            if (!busy) {
              setSelected(null);
              setAction("");
            }
          }}
        >
          <div className="space-y-4 p-5">
            <Status state={selected.status} />
            <p className="text-xs text-slate-500">
              Matrícula {selected.registration_number} · Solicitação {selected.id}
            </p>
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm">
              <p className="font-bold text-sky-950">{selected.source_name}</p>
              <p className="my-2 text-xs text-cyan-800">Unidade de destino</p>
              <p className="font-bold text-sky-950">{selected.destination_name}</p>
            </div>
            <section>
              <h3 className="text-sm font-bold text-sky-950">Justificativa</h3>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">
                {selected.justification}
              </p>
            </section>
            <section>
              <h3 className="text-sm font-bold text-sky-950">Histórico da solicitação</h3>
              <ol className="mt-3 space-y-3">
                {selected.events.map((item, index) => (
                  <li
                    key={`${item.status}-${index}`}
                    className="rounded-xl border border-cyan-100 p-3"
                  >
                    <p className="text-sm font-bold text-sky-900">
                      {statuses[item.status].label} · {item.actor_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{date(item.created_at)}</p>
                    {item.note && (
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">
                        {item.note}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
            {selected.status === "EXECUTADA" && (
              <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
                O vínculo com o destino foi atualizado. A alocação em turma cabe ao gestor
                autorizado da unidade de destino.
              </p>
            )}
            {dialogError && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-900">
                {dialogError}
              </p>
            )}
            {adminMode && !action && (
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                {selected.status === "PENDENTE" && can(user, "transfers.review") && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setAction("approve");
                      setDialogError("");
                    }}
                    className={primaryClass}
                  >
                    <Check size={17} aria-hidden="true" />
                    Aprovar
                  </button>
                )}
                {["PENDENTE", "APROVADA"].includes(selected.status) &&
                  can(user, "transfers.review") && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setAction("reject");
                        setDialogError("");
                      }}
                      className="rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-800"
                    >
                      Rejeitar
                    </button>
                  )}
                {selected.status === "APROVADA" && can(user, "transfers.execute") && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setAction("execute");
                      setDialogError("");
                    }}
                    className={primaryClass}
                  >
                    <ArrowRightLeft size={17} aria-hidden="true" />
                    Executar transferência
                  </button>
                )}
              </div>
            )}
            {action && (
              <form
                onSubmit={decide}
                className="space-y-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4"
              >
                <p className="text-sm font-bold text-sky-950">
                  {action === "execute"
                    ? "Confirmar a execução da transferência?"
                    : action === "approve"
                      ? "Registrar aprovação desta solicitação?"
                      : "Registrar rejeição desta solicitação?"}
                </p>
                {action === "execute" ? (
                  <p className="text-sm leading-relaxed text-slate-600">
                    O aluno sairá de {selected.source_name} e será vinculado a{" "}
                    {selected.destination_name}, sem turma. Matrícula, dados, histórico, XP, nível e
                    conquistas serão preservados.
                  </p>
                ) : (
                  <label className="block text-sm font-bold text-slate-700">
                    Parecer administrativo (opcional)
                    <textarea
                      disabled={busy}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      maxLength={2000}
                      rows={3}
                      className={inputClass}
                    />
                  </label>
                )}
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setAction("")}
                    className={buttonClass}
                  >
                    Cancelar
                  </button>
                  <button type="submit" disabled={busy} className={primaryClass}>
                    {busy && <Loader2 size={17} className="animate-spin" aria-hidden="true" />}
                    {action === "execute"
                      ? "Confirmar execução"
                      : action === "approve"
                        ? "Confirmar aprovação"
                        : "Confirmar rejeição"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </AdminDialog>
      )}
    </PageShell>
  );
}

function Status({ state }) {
  const meta = statuses[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${meta.style}`}
    >
      <meta.Icon size={15} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function TransferForm({ options, schoolName, busy, error, onClose, onSave }) {
  const [form, setForm] = useState({
    student_id: "",
    destination_school_id: "",
    justification: "",
  });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  return (
    <AdminDialog
      title="Solicitar transferência"
      description={schoolName}
      icon={ArrowRightLeft}
      busy={busy}
      onClose={onClose}
    >
      <form
        className="p-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(form);
        }}
      >
        <fieldset disabled={busy} className="space-y-4">
          <label className="block text-sm font-bold text-slate-700">
            Aluno da unidade de origem
            <select
              required
              value={form.student_id}
              onChange={(event) => update("student_id", event.target.value)}
              className={inputClass}
            >
              <option value="">Selecione o aluno</option>
              {options.alunos.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.nome} · {student.registration_number}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Unidade de destino
            <select
              required
              value={form.destination_school_id}
              onChange={(event) => update("destination_school_id", event.target.value)}
              className={inputClass}
            >
              <option value="">Selecione a unidade</option>
              {options.unidades.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Justificativa
            <textarea
              required
              minLength={2}
              maxLength={2000}
              rows={4}
              value={form.justification}
              onChange={(event) => update("justification", event.target.value)}
              className={inputClass}
            />
          </label>
          <p className="text-xs leading-relaxed text-slate-600">
            O aluno permanece nesta unidade até a execução da transferência pelo administrador. No
            destino, o gestor fará a alocação em turma.
          </p>
          {(!options.alunos.length || !options.unidades.length) && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              É necessário ter um aluno vinculado à origem e outra unidade ativa para solicitar a
              transferência.
            </p>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-900">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className={buttonClass}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={
              busy ||
              !options.alunos.length ||
              !options.unidades.length
            }
            className={primaryClass}
          >
            {busy ? (
              <Loader2 size={17} className="animate-spin" aria-hidden="true" />
            ) : (
              <Send size={17} aria-hidden="true" />
            )}
            Enviar solicitação
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}
