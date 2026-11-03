import { useState } from "react";
import { KeyRound, LogOut, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import { conta } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Conta() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [senhas, setSenhas] = useState({
    senhaAtual: "",
    novaSenha: "",
  });
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  const handleSenhaChange = (event) => {
    const { name, value } = event.target;
    setSenhas((current) => ({ ...current, [name]: value }));
  };

  const alterarSenha = async (event) => {
    event.preventDefault();
    setMensagem("");
    setErro("");
    setSalvandoSenha(true);

    try {
      await conta.alterarSenha(senhas);
      setSenhas({ senhaAtual: "", novaSenha: "" });
      await logout();
      navigate("/login", { replace: true, state: { notice: "Senha atualizada. Entre com a nova senha." } });
    } catch (error) {
      setErro(error.message || "Não foi possível alterar a senha.");
    } finally {
      setSalvandoSenha(false);
    }
  };

  const sair = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <PageShell
      title="Conta"
      description="Consulte sua conta. Dados cadastrais são editados somente pela administração."
      actions={(
        <button
          type="button"
          onClick={sair}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100"
        >
          <LogOut size={16} aria-hidden="true" />
          Sair
        </button>
      )}
    >
      {mensagem ? (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {mensagem}
        </div>
      ) : null}
      {erro ? (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {erro}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3"><UserRound className="text-sky-700" size={24} aria-hidden="true" /><h2 className="font-black text-slate-950">Dados cadastrais</h2></div>
          <dl className="space-y-4 text-sm">{[["Nome", user?.nome], ["Email", user?.email], ["Turma", user?.turma || "—"], ["Escola", user?.escola || "—"]].map(([label, value]) => <div key={label}><dt className="font-bold text-slate-500">{label}</dt><dd className="mt-1 text-slate-950">{value}</dd></div>)}</dl>
          <p className="mt-5 text-sm text-slate-600">Alterações cadastrais e reset de senha devem ser solicitados a um administrador.</p>
        </section>

        <form onSubmit={alterarSenha} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <KeyRound size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-black text-slate-950">Senha</h2>
              <p className="text-sm text-slate-600">Use pelo menos 8 caracteres.</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-slate-700">Senha atual</span>
              <input
                name="senhaAtual"
                type="password"
                value={senhas.senhaAtual}
                onChange={handleSenhaChange}
                autoComplete="current-password"
                className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-slate-700">Nova senha</span>
              <input
                name="novaSenha"
                type="password"
                value={senhas.novaSenha}
                onChange={handleSenhaChange}
                autoComplete="new-password"
                minLength={8}
                className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                required
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={salvandoSenha}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <KeyRound size={18} aria-hidden="true" />
            {salvandoSenha ? "Alterando..." : "Alterar senha"}
          </button>
        </form>
      </div>
    </PageShell>
  );
}
