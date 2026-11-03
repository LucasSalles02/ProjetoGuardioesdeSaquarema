import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, KeyRound, Loader2, Pencil, RefreshCw, Search, UserPlus, UserX, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { admin } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { formatCpf } from "../../services/identity";

const roles = { USER: "Aluno", GESTOR_ESCOLAR: "Gestor Escolar", ADMIN: "Administrador" };
const selectClass = "rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-100";
const formatDate = value => value ? new Date(value).toLocaleString("pt-BR") : "—";

export default function UsersPanel() {
  const { user: currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(location.state?.userManagementMessage || "");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState(null);
  const [pending, setPending] = useState(null);
  const [pendingAction, setPendingAction] = useState("deactivate");
  const [busy, setBusy] = useState("");
  const detailRequest = useRef(0);

  useEffect(() => {
    let active = true;
    admin.listarUsuarios()
      .then(data => { if (active) setUsers(data.usuarios); })
      .catch(err => { if (active) setLoadError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function reload() {
    setLoading(true);
    setLoadError("");
    try { setUsers((await admin.listarUsuarios()).usuarios); }
    catch (err) { setLoadError(err.message); }
    finally { setLoading(false); }
  }

  async function showDetails(account) {
    const requestId = ++detailRequest.current;
    setBusy(`read:${account.id}`);
    setError("");
    try {
      const { usuario } = await admin.obterUsuario(account.id);
      if (requestId === detailRequest.current) setSelected(usuario);
    } catch (err) {
      if (requestId === detailRequest.current) setError(err.message);
    } finally {
      if (requestId === detailRequest.current) setBusy("");
    }
  }

  async function executeAction() {
    if (!pending) return;
    setBusy(`${pendingAction}:${pending.id}`);
    setError("");
    setFeedback("");
    try {
      const { usuario } = await (pendingAction === "reset" ? admin.resetarSenha(pending.id) : admin.desativarUsuario(pending.id));
      setUsers(items => items.map(item => item.id === usuario.id ? usuario : item));
      setSelected(value => value?.id === usuario.id ? usuario : value);
      setFeedback(pendingAction === "reset" ? `Senha de ${usuario.nome} resetada para o CPF. A troca no próximo acesso é obrigatória.` : `Usuário ${usuario.nome} desativado. O acesso foi bloqueado e as sessões foram encerradas.`);
      setPending(null);
      if (pendingAction === "reset" && usuario.id === currentUser.id) {
        await logout();
        navigate("/admin/login", { replace: true, state: { notice: "Sua senha foi resetada. Entre com o CPF como senha inicial e defina uma nova senha." } });
      }
    } catch (err) { setError(err.message); }
    finally { setBusy(""); }
  }

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return users.filter(account => (!role || account.role === role)
      && (!status || (account.active !== false) === (status === "active"))
      && (!term || [account.nome, account.email, account.username, account.cpf, formatCpf(account.cpf || "")].some(value => value?.toLocaleLowerCase("pt-BR").includes(term))));
  }, [users, query, role, status]);

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-3xl border border-cyan-100 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="users-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="users-title" className="text-xl font-black text-slate-950">Gerenciamento de usuários</h2>
            <p className="mt-1 text-sm text-slate-600">{users.length} cadastrados · {users.filter(account => account.active !== false).length} ativos</p>
          </div>
          <div className="flex flex-wrap gap-2"><Link to="/admin/usuarios/novo" className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"><UserPlus size={16} aria-hidden="true" /> Cadastrar usuário</Link><button type="button" onClick={reload} disabled={loading || Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-sky-700 hover:bg-sky-50 disabled:opacity-50"><RefreshCw size={16} aria-hidden="true" /> Atualizar</button></div>
        </div>
        {feedback && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{feedback}</p>}
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loadError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{loadError} Use Atualizar para tentar novamente.</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <label className="relative min-w-52 flex-1"><span className="sr-only">Buscar por nome, CPF, email ou usuário</span><Search className="absolute left-3 top-3 text-slate-400" size={18} aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} className={`${selectClass} w-full pl-10`} placeholder="Buscar nome, CPF, email ou usuário" /></label>
          <label><span className="sr-only">Filtrar por perfil</span><select className={selectClass} value={role} onChange={event => setRole(event.target.value)}><option value="">Todos os perfis</option>{Object.entries(roles).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label><span className="sr-only">Filtrar por situação</span><select className={selectClass} value={status} onChange={event => setStatus(event.target.value)}><option value="">Todas as situações</option><option value="active">Ativos</option><option value="inactive">Desativados</option></select></label>
        </div>
        {pending && <section role="alert" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="font-bold text-amber-950">{pendingAction === "reset" ? "Resetar senha de" : "Desativar"} {pending.nome}?</h3>
          <p className="mt-1 text-sm text-amber-900">{pendingAction === "reset" ? "A senha inicial voltará a ser o CPF cadastrado. Todas as sessões serão encerradas e a definição de uma nova senha será obrigatória no próximo acesso." : "O login será bloqueado e as sessões serão encerradas. Os dados e o histórico serão preservados."}</p>
          <div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={() => setPending(null)} disabled={Boolean(busy)} className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-bold disabled:opacity-50">Cancelar</button><button type="button" onClick={executeAction} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{Boolean(busy) && <Loader2 className="animate-spin" size={16} aria-hidden="true" />} Confirmar {pendingAction === "reset" ? "reset" : "desativação"}</button></div>
        </section>}
        {loading ? <p role="status" className="mt-5 flex items-center gap-2 text-sm text-slate-600"><Loader2 className="animate-spin" size={18} aria-hidden="true" /> Carregando usuários...</p> :
          <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm">
            <caption className="sr-only">Usuários cadastrados com perfil, situação e ações administrativas</caption>
            <thead className="border-b text-slate-600"><tr>{["Nome", "Email e usuário", "Perfil", "Situação", "Ações"].map(label => <th key={label} scope="col" className="whitespace-nowrap px-3 py-3 font-bold">{label}</th>)}</tr></thead>
            <tbody>{visible.map(account => <tr key={account.id} className="border-b border-slate-100 last:border-0">
              <td className="px-3 py-4 font-bold text-slate-950">{account.nome}{account.id === currentUser?.id && <span className="ml-2 text-xs font-medium text-sky-700">Você</span>}<span className="mt-1 block text-xs font-normal text-slate-500">{account.cpf ? formatCpf(account.cpf) : "CPF não informado"}</span></td>
              <td className="px-3 py-4"><span className="block text-slate-700">{account.email}</span><span className="text-xs text-slate-500">{account.username || "Usuário não informado"}</span></td>
              <td className="whitespace-nowrap px-3 py-4 text-slate-700">{roles[account.role] || account.role}</td>
              <td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${account.active !== false ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{account.active !== false ? "Ativo" : "Desativado"}</span>{account.must_change_password && <span className="mt-2 block text-xs font-semibold text-amber-800">Troca de senha pendente</span>}</td>
              <td className="px-3 py-4"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => showDetails(account)} disabled={Boolean(busy)} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 px-3 py-2 font-bold text-sky-700 hover:bg-sky-50 disabled:opacity-50" aria-label={`Visualizar ${account.nome}`}><Eye size={15} aria-hidden="true" /> Visualizar</button><Link to={`/admin/usuarios/${account.id}/editar`} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 px-3 py-2 font-bold text-sky-700"><Pencil size={15} aria-hidden="true" /> Editar</Link><button type="button" disabled={Boolean(busy) || !account.cpf} title={!account.cpf ? "Preencha o CPF na edição antes de resetar." : undefined} onClick={() => { setPendingAction("reset"); setPending(account); setError(""); setFeedback(""); }} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 px-3 py-2 font-bold text-amber-800 disabled:opacity-40"><KeyRound size={15} aria-hidden="true" /> Resetar senha</button><button type="button" onClick={() => { setPendingAction("deactivate"); setPending(account); setError(""); setFeedback(""); }} disabled={Boolean(busy) || account.active === false || account.id === currentUser?.id} title={account.id === currentUser?.id ? "Você não pode desativar sua própria conta." : undefined} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Desativar ${account.nome}`}><UserX size={15} aria-hidden="true" /> Desativar</button></div></td>
            </tr>)}</tbody>
          </table>{!visible.length && !loadError && <p className="py-8 text-center text-sm text-slate-500">Nenhum usuário encontrado.</p>}</div>}
        {busy.startsWith("read:") && <p role="status" className="mt-3 text-sm text-sky-700">Carregando detalhes...</p>}
      </section>
      {selected && <section className="rounded-3xl border border-cyan-100 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="user-details-title" aria-live="polite">
        <div className="flex items-center justify-between gap-3"><h2 id="user-details-title" className="text-xl font-black text-slate-950">Detalhes do usuário</h2><button type="button" onClick={() => setSelected(null)} aria-label="Fechar detalhes" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={20} aria-hidden="true" /></button></div>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">{[["Nome", selected.nome], ["CPF", selected.cpf ? formatCpf(selected.cpf) : "—"], ["Nascimento", selected.birth_date || "—"], ["Email", selected.email], ["Usuário", selected.username || "—"], ["Perfil", roles[selected.role]], ["Situação", selected.active ? "Ativo" : "Desativado"], ["Cadastro", formatDate(selected.created_at)], ["Última atualização", formatDate(selected.updated_at)], ["Desativação", formatDate(selected.deactivated_at)]].map(([label, value]) => <div key={label}><dt className="font-bold text-slate-500">{label}</dt><dd className="mt-1 break-words text-slate-950">{value}</dd></div>)}</dl>
      </section>}
    </div>
  );
}
