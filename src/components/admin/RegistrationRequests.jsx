import { useEffect, useState } from "react";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import { admin } from "../../services/api";
import { formatCpf } from "../../services/identity";

const statusLabels = { PENDING: "Pendente", APPROVED: "Aprovada", REJECTED: "Recusada" };

export default function RegistrationRequests() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    admin.listarSolicitacoes().then(data => { if (active) setRequests(data.solicitacoes); })
      .catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function reload() {
    setLoading(true); setError("");
    try { setRequests((await admin.listarSolicitacoes()).solicitacoes); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  async function review() {
    setBusy(true); setError(""); setFeedback("");
    try {
      const { solicitacao } = await (pending.approve ? admin.aprovarSolicitacao(pending.request.id) : admin.recusarSolicitacao(pending.request.id, reason));
      setRequests(items => items.map(item => item.id === solicitacao.id ? solicitacao : item));
      setFeedback(pending.approve ? "Cadastro aprovado como Aluno. O primeiro acesso utilizará o CPF e exigirá uma nova senha." : "Solicitação recusada. Nenhuma conta foi criada.");
      setPending(null); setReason("");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  const visible = requests.filter(item => !filter || item.status === filter);
  return <section className="mt-6 rounded-3xl border border-cyan-100 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="requests-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="requests-title" className="text-xl font-black text-slate-950">Validar solicitações de cadastro</h2><p className="mt-2 text-sm text-slate-600">{requests.filter(item => item.status === "PENDING").length} pendentes. A aprovação cria uma conta de Aluno; o pedido sozinho não libera acesso.</p></div><button type="button" onClick={reload} disabled={loading || busy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-sky-700 disabled:opacity-50"><RefreshCw size={16} aria-hidden="true" /> Atualizar</button></div>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {feedback && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{feedback}</p>}
    <label className="mt-5 block text-sm font-bold text-slate-700">Situação<select value={filter} onChange={event => setFilter(event.target.value)} className="ml-3 rounded-xl border border-slate-300 bg-white px-3 py-2"><option value="">Todas</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    {pending && <section role="alert" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-bold text-amber-950">{pending.approve ? "Aprovar" : "Recusar"} o cadastro de {pending.request.nome}?</h3><p className="mt-2 text-sm text-amber-900">{pending.approve ? "A conta será criada com o CPF como senha inicial e troca obrigatória no primeiro acesso." : "O pedido permanecerá no histórico como recusado, sem criar uma conta."}</p>{!pending.approve && <label className="mt-3 block text-sm font-bold text-amber-950">Motivo (opcional)<textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={500} className="mt-1 w-full rounded-xl border border-amber-200 p-3 font-normal" /></label>}<div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={() => setPending(null)} className="rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-bold disabled:opacity-50">Cancelar</button><button type="button" disabled={busy} onClick={review} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy && <Loader2 className="animate-spin" size={16} aria-hidden="true" />} Confirmar {pending.approve ? "aprovação" : "recusa"}</button></div></section>}
    {loading ? <p role="status" className="mt-5 flex items-center gap-2 text-sm text-slate-600"><Loader2 className="animate-spin" size={18} aria-hidden="true" /> Carregando solicitações...</p> : <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Solicitações externas aguardando validação administrativa</caption><thead className="border-b text-slate-600"><tr>{["Solicitante", "Contato e usuário", "Nascimento", "Situação", "Ações"].map(label => <th key={label} scope="col" className="px-3 py-3 font-bold">{label}</th>)}</tr></thead><tbody>{visible.map(item => <tr key={item.id} className="border-b border-slate-100"><td className="px-3 py-4"><span className="block font-bold text-slate-950">{item.nome}</span><span className="text-xs text-slate-500">{formatCpf(item.cpf)}</span>{(item.escola || item.turma) && <span className="mt-1 block text-xs text-slate-500">{[item.escola, item.turma].filter(Boolean).join(" · ")}</span>}</td><td className="px-3 py-4"><span className="block">{item.email}</span><span className="text-xs text-slate-500">{item.username}</span></td><td className="whitespace-nowrap px-3 py-4">{item.birth_date}</td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === "PENDING" ? "bg-amber-50 text-amber-800" : item.status === "APPROVED" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{statusLabels[item.status]}</span>{item.rejection_reason && <p className="mt-2 text-xs text-slate-500">{item.rejection_reason}</p>}</td><td className="px-3 py-4">{item.status === "PENDING" ? <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => { setPending({ request: item, approve: true }); setReason(""); setError(""); }} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-2 font-bold text-emerald-800"><Check size={15} aria-hidden="true" /> Aprovar</button><button type="button" disabled={busy} onClick={() => { setPending({ request: item, approve: false }); setReason(""); setError(""); }} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 font-bold text-red-700"><X size={15} aria-hidden="true" /> Recusar</button></div> : <span className="text-xs text-slate-500">Analisada em {new Date(item.reviewed_at).toLocaleString("pt-BR")}</span>}</td></tr>)}</tbody></table>{!visible.length && !error && <p className="py-8 text-center text-sm text-slate-500">Nenhuma solicitação nesta situação.</p>}</div>}
  </section>;
}
