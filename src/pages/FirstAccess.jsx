import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { KeyRound, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function FirstAccess() {
  const { user, loading, definirSenhaInicial, requestLogout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ novaSenha: "", confirmarSenha: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (loading) return <p role="status" className="p-8">Carregando...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.must_change_password) return <Navigate to={user.admin ? "/admin/dashboard" : "/"} replace />;
  async function submit(event) {
    event.preventDefault(); setError("");
    if (form.novaSenha !== form.confirmarSenha) { setError("As senhas precisam ser iguais."); return; }
    setBusy(true);
    try { const updated = await definirSenhaInicial(form); navigate(updated.admin ? "/admin/dashboard" : updated.role === "GESTOR_ESCOLAR" ? "/selecionar-unidade" : "/", { replace: true }); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <main className="marine-app-bg flex min-h-screen items-center justify-center px-5 py-10"><section className="w-full max-w-lg rounded-3xl border border-cyan-100 bg-white p-6 shadow-sm sm:p-8">
    <KeyRound className="text-sky-600" size={30} aria-hidden="true" /><h1 className="mt-4 text-2xl font-black text-slate-950">Defina sua senha</h1>
    <p className="mt-3 text-sm text-slate-600">Antes de continuar, substitua a senha inicial por uma senha pessoal diferente do CPF. Essa etapa é obrigatória após cadastro ou reset administrativo.</p>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <form onSubmit={submit} className="mt-5 space-y-4"><fieldset disabled={busy} className="space-y-4">
      {[["novaSenha", "Nova senha"], ["confirmarSenha", "Confirmar nova senha"]].map(([name, label]) => <label key={name} className="block text-sm font-bold text-slate-700">{label}<input name={name} type="password" autoComplete="new-password" value={form[name]} onChange={event => setForm(value => ({ ...value, [name]: event.target.value }))} minLength={user.admin ? 12 : 8} maxLength={256} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-100" required /></label>)}
      <p className="text-xs text-slate-500">Use entre {user.admin ? 12 : 8} e 256 caracteres.</p>
      <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 font-bold text-white disabled:opacity-60">{busy && <Loader2 className="animate-spin" size={17} aria-hidden="true" />}{busy ? "Salvando..." : "Definir senha e continuar"}</button>
    </fieldset></form>
    <button type="button" disabled={busy} onClick={async () => { if (await requestLogout()) navigate("/login", { replace: true }); }} className="mt-4 w-full py-2 text-sm font-bold text-slate-600">Sair</button>
  </section></main>;
}
