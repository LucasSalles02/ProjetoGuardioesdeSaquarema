import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import AdminDialog from "../components/admin/AdminDialog";
import { SESSION_EXPIRED_EVENT } from "../config/auth";
import { auth } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoutPrompt, setLogoutPrompt] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const logoutRequest = useRef(null);

  const finishLogoutRequest = useCallback(confirmed => {
    const pending = logoutRequest.current;
    logoutRequest.current = null;
    setLogoutPrompt(false);
    setLogoutError("");
    pending?.resolve(confirmed);
  }, []);

  const requestLogout = useCallback(() => {
    if (!user) return Promise.resolve(false);
    if (logoutRequest.current) return logoutRequest.current.promise;
    let resolveRequest;
    const promise = new Promise(resolve => { resolveRequest = resolve; });
    logoutRequest.current = { promise, resolve: resolveRequest };
    setLogoutError(""); setLogoutPrompt(true);
    return promise;
  }, [user]);

  useEffect(() => {
    if (!user && !logoutBusy && logoutRequest.current) finishLogoutRequest(false);
  }, [user, logoutBusy, finishLogoutRequest]);

  useEffect(() => {
    const request = logoutRequest;
    return () => { request.current?.resolve(false); request.current = null; };
  }, []);

  const refreshUser = useCallback(async () => {
    const { usuario } = await auth.me();
    setUser(usuario);
    return usuario;
  }, []);

  useEffect(() => {
    const expire = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, expire);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expire);
  }, []);

  useEffect(() => {
    refreshUser()
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (credentials) => {
    const { usuario } = await auth.login(credentials);
    setUser(usuario);
    return usuario;
  }, []);

  const adminLogin = useCallback(async (credentials) => {
    const { usuario } = await auth.adminLogin(credentials);
    setUser(usuario);
    return usuario;
  }, []);
  const definirSenhaInicial = useCallback(async (data) => {
    const { usuario } = await auth.definirSenhaInicial(data);
    setUser(usuario);
    return usuario;
  }, []);

  const atualizarPerfil = useCallback(async (dados) => {
    const { usuario } = await auth.atualizarPerfil(dados);
    setUser(usuario);
    return usuario;
  }, []);

  const atualizarUsuario = useCallback((dadosNovos) => {
    setUser((current) => (current ? { ...current, ...dadosNovos } : current));
  }, []);

  const logout = useCallback(async () => {
    await auth.logout();
    setUser(null);
  }, []);

  async function confirmLogout() {
    if (logoutBusy) return;
    setLogoutBusy(true); setLogoutError("");
    try { await logout(); finishLogoutRequest(true); }
    catch { setLogoutError("Não foi possível sair. Tente novamente."); }
    finally { setLogoutBusy(false); }
  }

  const value = useMemo(() => ({
    user,
    loading,
    login,
    adminLogin,
    definirSenhaInicial,
    atualizarPerfil,
    atualizarUsuario,
    refreshUser,
    logout,
    requestLogout,
  }), [adminLogin, atualizarPerfil, atualizarUsuario, definirSenhaInicial, loading, login, logout, requestLogout, refreshUser, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      {logoutPrompt && <AdminDialog title="Deseja sair do sistema?" description="Você precisará entrar novamente para continuar." icon={LogOut} busy={logoutBusy} onClose={() => finishLogoutRequest(false)}>
        <div className="p-5">{logoutError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{logoutError}</p>}<p className="text-sm text-slate-600">Confirme para encerrar sua sessão.</p><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={logoutBusy} onClick={() => finishLogoutRequest(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Cancelar</button><button type="button" disabled={logoutBusy} onClick={confirmLogout} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{logoutBusy ? "Saindo..." : "Sair do sistema"}</button></div></div>
      </AdminDialog>}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }

  return context;
}
