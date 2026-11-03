import { AUTH_TOKEN_KEY, SESSION_EXPIRED_EVENT } from "../config/auth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

export function getAuthToken() {
  try {
    return sessionStorage.getItem(AUTH_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setAuthToken(token) {
  if (!token) return;
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
}

export async function apiRequest(path, options = {}) {
  const token = getAuthToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthToken();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw new Error(payload?.erro || payload?.message || (response.status >= 500 ? "API indisponivel. Tente novamente em instantes." : `HTTP ${response.status}`));
  }

  return payload;
}
