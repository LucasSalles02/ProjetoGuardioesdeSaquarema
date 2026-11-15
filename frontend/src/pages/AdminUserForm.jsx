import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import PageShell from "../components/PageShell";
import TemporaryCredentialDialog from "../components/admin/TemporaryCredentialDialog";
import UserForm from "../components/admin/UserForm";
import { admin } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function AdminUserForm() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const [credential, setCredential] = useState(null);
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
    let result;
    if (userId) {
      result = await admin.editarUsuario(userId, data);
      // Identity edits revoke sessions, including the administrator's own session.
      if (userId === user.id && (data.cpf !== account.cpf || data.email !== account.email)) {
        await logout();
        navigate("/admin/login", { replace: true });
        return;
      }
      if (userId === user.id) await refreshUser();
    } else { result = await admin.cadastrarUsuario(data); }
    if (result.temporary_credential) {
      setCredential({ ...result.temporary_credential, name: result.usuario.nome, login: result.usuario.role === "USER" ? result.usuario.registration_number : result.usuario.cpf });
      return;
    }
    navigate("/admin/usuarios", { replace: true, state: { userManagementMessage: "Cadastro atualizado." } });
  }

  return <PageShell title={userId ? "Editar usuário" : "Cadastrar usuário"} description="Administração de contas de Guardiões de Saquarema.">
    {credential && <TemporaryCredentialDialog credential={credential} onClose={() => { setCredential(null); navigate("/admin/usuarios", { replace: true, state: { userManagementMessage: "Cadastro salvo. Senha temporária emitida." } }); }} />}
    <Link to="/admin/usuarios" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-sky-700"><ArrowLeft size={17} aria-hidden="true" /> Voltar aos usuários</Link>
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
    {loading ? <p role="status" className="flex items-center gap-2"><Loader2 className="animate-spin" size={18} aria-hidden="true" /> Carregando cadastro...</p> : !credential && (!userId || account) && <UserForm key={userId || "new"} onSave={save} initialData={account} ownAccount={userId === user?.id} />}
  </PageShell>;
}
