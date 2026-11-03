import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { SESSION_EXPIRED_EVENT } from "../config/auth";
import { auth } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const cadastrar = useCallback(async (dados) => {
    return auth.cadastrar(dados);
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

  const value = useMemo(() => ({
    user,
    loading,
    login,
    adminLogin,
    definirSenhaInicial,
    cadastrar,
    atualizarPerfil,
    atualizarUsuario,
    refreshUser,
    logout,
  }), [adminLogin, atualizarPerfil, atualizarUsuario, cadastrar, definirSenhaInicial, loading, login, logout, refreshUser, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
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
