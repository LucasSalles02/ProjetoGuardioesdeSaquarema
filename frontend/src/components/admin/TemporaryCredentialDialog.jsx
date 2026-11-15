import { KeyRound } from "lucide-react";
import AdminDialog from "./AdminDialog";

export default function TemporaryCredentialDialog({ credential, onClose }) {
  return <AdminDialog title="Senha temporária emitida" description={credential.name} icon={KeyRound} onClose={onClose} dismissible={false}>
    <div className="space-y-4 p-5">
      <p className="text-sm text-slate-700">Entregue esta senha ao usuário pelo procedimento autorizado da instituição. Ela será exibida apenas nesta janela.</p>
      <p className="text-sm font-bold text-sky-900">Login {credential.login}</p>
      <code className="block select-all break-all rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-xl font-bold text-sky-950">{credential.password}</code>
      <p className="text-sm text-slate-700">Válida até {new Date(credential.expires_at).toLocaleString("pt-BR")}, por 24 horas a partir da emissão. A troca no primeiro acesso é obrigatória.</p>
      <p className="text-xs text-slate-600">Após fechar, uma nova senha deverá ser emitida caso seja necessário recuperar o acesso.</p>
      <button type="button" onClick={onClose} className="w-full rounded-xl bg-sky-600 px-4 py-3 font-bold text-white hover:bg-sky-700">Concluir entrega e fechar</button>
    </div>
  </AdminDialog>;
}
