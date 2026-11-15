import { AUTH_TOKEN_KEY, SESSION_EXPIRED_EVENT } from "../config/auth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
export const SCHOOL_CONTEXT_EVENT = "guardioes:school-context-changed";
let activeSchoolId = null;
export function setActiveSchoolId(id) { activeSchoolId = id == null ? null : String(id); }

export function getAuthToken() {
  try {
    return sessionStorage.getItem(AUTH_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setAuthToken(token) {
  if (!token) return;
  setActiveSchoolId(null);
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  setActiveSchoolId(null);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
}

export async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const requestSchoolId = activeSchoolId;

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(activeSchoolId ? { "X-School-Id": activeSchoolId } : {}),
    ...(options.headers || {}),
  };

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error("Nao foi possivel conectar a API. Verifique se o backend esta em execucao.");
  }

  const payload = await response.json().catch(() => null);

  if (requestSchoolId !== activeSchoolId && !path.startsWith("/school-context")) {
    throw new Error("A unidade ativa foi alterada. Tente novamente.");
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthToken();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    if (["UNIDADE_OBRIGATORIA", "UNIDADE_DESATUALIZADA"].includes(payload?.codigo)) {
      window.dispatchEvent(new Event(SCHOOL_CONTEXT_EVENT));
    }
    throw new Error(payload?.erro || payload?.message || (response.status >= 500 ? "API indisponivel. Tente novamente em instantes." : `HTTP ${response.status}`));
  }

  return payload;
}
