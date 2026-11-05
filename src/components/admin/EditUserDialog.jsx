import { useEffect, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { admin } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import UserForm from "./UserForm";
import AdminDialog from "./AdminDialog";

export default function EditUserDialog({ userId, onSaved }) {
  const navigate = useNavigate();
  const { user, logout, atualizarUsuario } = useAuth();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);

  function close() {
    if (!saving) navigate("/admin/usuarios", { replace: true });
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setAccount(null);
    admin.obterUsuario(userId)
      .then(({ usuario }) => { if (active) setAccount(usuario); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, attempt]);

  async function save(data) {
    if (saving) return;
    setSaving(true);
    try {
      const { usuario } = await admin.editarUsuario(userId, data);
      if (userId === user.id) {
        const identityChanged = data.cpf !== account.cpf || data.email !== account.email;
        if (identityChanged) {
          await logout();
          navigate("/admin/login", { replace: true, state: { notice: "Cadastro atualizado. Entre novamente com seus dados atualizados." } });
          return;
        }
        atualizarUsuario(usuario);
      }
      onSaved(usuario);
      navigate("/admin/usuarios", { replace: true });
    } finally { setSaving(false); }
  }

  return <AdminDialog title="Editar usuário" description="Atualize os dados e o perfil de acesso." icon={Pencil} onClose={close} busy={saving}>
    {loading ? <p role="status" className="flex items-center gap-2 p-6 text-sm text-slate-600"><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Carregando cadastro...</p>
      : error ? <div className="space-y-3 p-5"><p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p><button type="button" onClick={() => setAttempt(value => value + 1)} className="text-sm font-bold text-sky-700">Tentar novamente</button></div>
        : account && <UserForm key={account.id} initialData={account} ownAccount={userId === user?.id} onSave={save} compact onCancel={close} />}
  </AdminDialog>;
}
