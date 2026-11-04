import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { can } from "../services/permissions";
import { useAuth } from "./AuthContext";
import { unidadesEscolares } from "../services/api";
import { SCHOOL_CONTEXT_EVENT, setActiveSchoolId } from "../services/apiClient";

const SchoolContext = createContext(null);
const empty = { owner: null, unit: null, units: [], loading: false, error: "" };

export function SchoolProvider({ children }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [state, setState] = useState(empty);
  const [switching, setSwitching] = useState(false);
  const version = useRef(0);
  const switchInFlight = useRef(false);
  const manager = Boolean(user && !user.must_change_password && (user.role === "GESTOR_ESCOLAR" || (user.role === "ADMIN" && can(user, "institutions.read"))));
  const owner = user?.id;

  const refreshSchools = useCallback(async () => {
    if (!manager || switchInFlight.current) return;
    const request = ++version.current;
    setState(current => ({ ...current, error: "" }));
    try {
      const data = await unidadesEscolares.contexto();
      if (request !== version.current) return;
      setActiveSchoolId(data.unidade?.id);
      setState({ owner, unit: data.unidade, units: data.unidades, loading: false, error: "" });
    } catch (err) {
      if (request !== version.current) return;
      setActiveSchoolId(null);
      setState({ owner, unit: null, units: [], loading: false, error: err.message });
    }
  }, [manager, owner]);

  useEffect(() => {
    version.current++;
    setActiveSchoolId(null);
    setState({ ...empty, loading: manager });
    setSwitching(false);
    const requestVersion = version;
    return () => { requestVersion.current++; };
  }, [manager, refreshSchools]);

  useEffect(() => {
    if (!manager) return;
    refreshSchools();
  }, [manager, pathname, refreshSchools]);

  useEffect(() => {
    if (!manager) return;
    const refresh = () => refreshSchools();
    window.addEventListener(SCHOOL_CONTEXT_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(SCHOOL_CONTEXT_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [manager, refreshSchools]);

  const selectSchool = useCallback(async id => {
    if (!manager) throw new Error("Seu perfil não permite selecionar unidades.");
    if (switchInFlight.current) throw new Error("Aguarde a troca de unidade.");
    switchInFlight.current = true;
    const request = ++version.current;
    setSwitching(true);
    try {
      const data = await unidadesEscolares.selecionar(id);
      if (request !== version.current) throw new Error("O contexto foi atualizado. Selecione a unidade novamente.");
      setActiveSchoolId(data.unidade.id);
      setState({ owner, unit: data.unidade, units: data.unidades, loading: false, error: "" });
      return data.unidade;
    } finally { switchInFlight.current = false; setSwitching(false); }
  }, [manager, owner]);

  const value = useMemo(() => ({
    activeUnit: manager && state.owner === owner ? state.unit : null,
    units: manager && state.owner === owner ? state.units : [],
    loading: manager && (state.loading || state.owner !== owner),
    error: manager && state.owner === owner ? state.error : "",
    switching, refreshSchools, selectSchool,
  }), [manager, owner, state, switching, refreshSchools, selectSchool]);
  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
}

export function useSchool() {
  const context = useContext(SchoolContext);
  if (!context) throw new Error("useSchool requer SchoolProvider.");
  return context;
}
