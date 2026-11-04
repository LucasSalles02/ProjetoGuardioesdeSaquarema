import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, KeyRound, Loader2, Pencil, RefreshCw, Search, UserPlus, UserX } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { admin } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { formatCpf } from "../../services/identity";

import EditUserDialog from "./EditUserDialog";
import { can } from "../../services/permissions";
import ViewUserDialog from "./ViewUserDialog";

const roles = { USER: "Aluno", GESTOR_ESCOLAR: "Gestão Escolar", ADMIN: "Administrador" };
const selectClass = "rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-100";

export default function UsersPanel() {
  const { user: currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { userId } = useParams();
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

  const profileOptions = useMemo(() => [...new Map([...Object.entries(roles), ...users.map(account => [account.profile_id || account.role, account.profile_name || roles[account.role] || account.role])])], [users]);

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return users.filter(account => (!role || (account.profile_id || account.role) === role)
      && (!status || (account.active !== false) === (status === "active"))
      && (!term || [account.nome, account.email, account.username, account.profile_name, account.cpf, formatCpf(account.cpf || "")].some(value => value?.toLocaleLowerCase("pt-BR").includes(term))));
  }, [users, query, role, status]);

  function savedUser(usuario) {
    setUsers(items => items.map(item => item.id === usuario.id ? usuario : item));
    setSelected(value => value?.id === usuario.id ? usuario : value);
    setFeedback(`Cadastro de ${usuario.nome} atualizado.`);
    setPending(null);
    setError("");
  }

  return (
    <div className="mt-6 space-y-6">
      {userId && <EditUserDialog userId={userId} onSaved={savedUser} />}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumo de usuários">
        {[["Total de usuários", users.length, "text-sky-700 bg-sky-50"], ["Contas ativas", users.filter(item => item.active !== false).length, "text-emerald-700 bg-emerald-50"], ["Contas desativadas", users.filter(item => item.active === false).length, "text-slate-600 bg-slate-100"], ["Primeiro acesso pendente", users.filter(item => item.active !== false && item.must_change_password).length, "text-amber-700 bg-amber-50"]].map(([label, count, style]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">{label}</p><p className={`mt-3 inline-flex min-w-10 justify-center rounded-xl px-3 py-1 text-2xl font-black ${style}`}>{loading ? "…" : count}</p></div>)}
      </div>
      <section className="rounded-3xl border border-cyan-100 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="users-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="users-title" className="text-xl font-black text-slate-950">Gerenciamento de usuários</h2>
            <p className="mt-1 text-sm text-slate-600">{users.length} cadastrados · {users.filter(account => account.active !== false).length} ativos</p>
          </div>
          <div className="flex flex-wrap gap-2">{can(currentUser, "users.create") && <Link to="/admin/usuarios/novo" className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"><UserPlus size={16} aria-hidden="true" /> Cadastrar usuário</Link>}<button type="button" onClick={reload} disabled={loading || Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-sky-700 hover:bg-sky-50 disabled:opacity-50"><RefreshCw size={16} aria-hidden="true" /> Atualizar</button></div>
        </div>
        {feedback && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{feedback}</p>}
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loadError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{loadError} Use Atualizar para tentar novamente.</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <label className="relative min-w-52 flex-1"><span className="sr-only">Buscar por nome, CPF, email ou usuário</span><Search className="absolute left-3 top-3 text-slate-400" size={18} aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} className={`${selectClass} w-full pl-10`} placeholder="Buscar nome, CPF, email ou usuário" /></label>
          <label><span className="sr-only">Filtrar por perfil</span><select className={selectClass} value={role} onChange={event => setRole(event.target.value)}><option value="">Todos os perfis</option>{profileOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label><span className="sr-only">Filtrar por situação</span><select className={selectClass} value={status} onChange={event => setStatus(event.target.value)}><option value="">Todas as situações</option><option value="active">Ativos</option><option value="inactive">Desativados</option></select></label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>{visible.length} de {users.length} usuários{(query || role || status) ? " nos filtros selecionados" : " cadastrados"}</span>{(query || role || status) && <button type="button" onClick={() => { setQuery(""); setRole(""); setStatus(""); }} className="font-bold text-sky-700 hover:underline">Limpar filtros</button>}</div>
        {pending && <section role="alert" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="font-bold text-amber-950">{pendingAction === "reset" ? "Resetar senha de" : "Desativar"} {pending.nome}?</h3>
          <p className="mt-1 text-sm text-amber-900">{pendingAction === "reset" ? "A senha inicial voltará a ser o CPF cadastrado. Todas as sessões serão encerradas e a definição de uma nova senha será obrigatória no próximo acesso." : "O login será bloqueado e as sessões serão encerradas. Os dados e o histórico serão preservados."}</p>
          <div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={() => setPending(null)} disabled={Boolean(busy)} className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-bold disabled:opacity-50">Cancelar</button><button type="button" onClick={executeAction} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{Boolean(busy) && <Loader2 className="animate-spin" size={16} aria-hidden="true" />} Confirmar {pendingAction === "reset" ? "reset" : "desativação"}</button></div>
        </section>}
        {loading ? <p role="status" className="mt-5 flex items-center gap-2 text-sm text-slate-600"><Loader2 className="animate-spin" size={18} aria-hidden="true" /> Carregando usuários...</p> :
          <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm">
            <caption className="sr-only">Usuários cadastrados com perfil, situação e ações administrativas</caption>
            <thead className="border-b bg-slate-50 text-slate-600"><tr>{["Nome", "Email e usuário", "Perfil", "Situação", "Ações"].map(label => <th key={label} scope="col" className="whitespace-nowrap px-3 py-3 font-bold">{label}</th>)}</tr></thead>
            <tbody>{visible.map(account => <tr key={account.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-sky-50/40">
              <td className="px-3 py-4 font-bold text-slate-950">{account.nome}{account.id === currentUser?.id && <span className="ml-2 text-xs font-medium text-sky-700">Você</span>}<span className="mt-1 block text-xs font-normal text-slate-500">{account.cpf ? formatCpf(account.cpf) : "CPF não informado"}</span></td>
              <td className="px-3 py-4"><span className="block text-slate-700">{account.email}</span><span className="text-xs text-slate-500">{account.username || "Usuário não informado"}</span></td>
              <td className="whitespace-nowrap px-3 py-4 text-slate-700">{account.profile_name || roles[account.role] || account.role}</td>
              <td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${account.active !== false ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{account.active !== false ? "Ativo" : "Desativado"}</span>{account.must_change_password && <span className="mt-2 block text-xs font-semibold text-amber-800">Troca de senha pendente</span>}</td>
              <td className="px-3 py-4"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => showDetails(account)} disabled={Boolean(busy)} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 px-3 py-2 font-bold text-sky-700 hover:bg-sky-50 disabled:opacity-50" aria-label={`Visualizar ${account.nome}`}><Eye size={15} aria-hidden="true" /> Visualizar</button>{can(currentUser, "users.update") && <Link aria-label={`Editar ${account.nome}`} to={`/admin/usuarios/${account.id}/editar`} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 px-3 py-2 font-bold text-sky-700"><Pencil size={15} aria-hidden="true" /> Editar</Link>}<button type="button" disabled={Boolean(busy) || !account.cpf || !can(currentUser, "users.reset")} title={!account.cpf ? "Preencha o CPF na edição antes de resetar." : undefined} onClick={() => { setPendingAction("reset"); setPending(account); setError(""); setFeedback(""); }} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 px-3 py-2 font-bold text-amber-800 disabled:opacity-40"><KeyRound size={15} aria-hidden="true" /> Resetar senha</button><button type="button" onClick={() => { setPendingAction("deactivate"); setPending(account); setError(""); setFeedback(""); }} disabled={Boolean(busy) || !can(currentUser, "users.deactivate") || account.active === false || account.id === currentUser?.id} title={account.id === currentUser?.id ? "Você não pode desativar sua própria conta." : undefined} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Desativar ${account.nome}`}><UserX size={15} aria-hidden="true" /> Desativar</button></div></td>
            </tr>)}</tbody>
          </table>{!visible.length && !loadError && <p className="py-8 text-center text-sm text-slate-500">Nenhum usuário encontrado.</p>}</div>}
        {busy.startsWith("read:") && <p role="status" className="mt-3 text-sm text-sky-700">Carregando detalhes...</p>}
      </section>
      {selected && !userId && <ViewUserDialog account={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
