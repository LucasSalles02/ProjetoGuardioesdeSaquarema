import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import PageShell from "../components/PageShell";
import UserForm from "../components/admin/UserForm";
import { admin } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function AdminUserForm() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const [account, setAccount] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(userId));
  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    admin.obterUsuario(userId).then(data => { if (active) setAccount(data.usuario); })
      .catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId]);

  async function save(data) {
    if (userId) {
      await admin.editarUsuario(userId, data);
      // Identity edits revoke sessions, including the administrator's own session.
      if (userId === user.id && (data.cpf !== account.cpf || data.email !== account.email || data.username.toLowerCase() !== account.username)) {
        await logout();
        navigate("/admin/login", { replace: true });
        return;
      }
      if (userId === user.id) await refreshUser();
    } else { await admin.cadastrarUsuario(data); }
    navigate("/admin/dashboard", { replace: true, state: { userManagementMessage: userId ? "Cadastro atualizado." : "Usuário cadastrado. O primeiro acesso será com o CPF e a troca de senha será obrigatória." } });
  }

  return <PageShell title={userId ? "Editar usuário" : "Cadastrar usuário"} description="Administração de contas de Guardiões de Saquarema.">
    <Link to="/admin/dashboard" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-sky-700"><ArrowLeft size={17} aria-hidden="true" /> Voltar ao painel</Link>
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
    {loading ? <p role="status" className="flex items-center gap-2"><Loader2 className="animate-spin" size={18} aria-hidden="true" /> Carregando cadastro...</p> : (!userId || account) && <UserForm key={userId || "new"} onSave={save} initialData={account} ownAccount={userId === user?.id} />}
  </PageShell>;
}
