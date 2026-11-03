import { apiRequest, clearAuthToken, setAuthToken } from "./apiClient";

function jsonOptions(method, body) {
  return {
    method,
    body: body ? JSON.stringify(body) : undefined,
  };
}

function storeSession(payload) {
  if (payload?.token) {
    setAuthToken(payload.token);
  }
  return payload;
}

export const auth = {
  async cadastrar(dados) {
    return storeSession(await apiRequest("/auth/register", jsonOptions("POST", dados)));
  },

  async login(credentials) {
    return storeSession(await apiRequest("/auth/login", jsonOptions("POST", credentials)));
  },

  async adminLogin(credentials) {
    return storeSession(await apiRequest("/auth/admin/login", jsonOptions("POST", credentials)));
  },
  async definirSenhaInicial(dados) {
    return storeSession(await apiRequest("/auth/first-access/password", jsonOptions("POST", dados)));
  },

  async me() {
    return apiRequest("/auth/me");
  },

  async atualizarPerfil(dados) {
    return apiRequest("/account/profile", jsonOptions("PATCH", dados));
  },

  async alterarSenha(dados) {
    return apiRequest("/account/password", jsonOptions("PATCH", dados));
  },

  async logout() {
    try {
      await apiRequest("/auth/logout", jsonOptions("POST"));
    } catch {
      // A sessao local ja foi limpa; logout tambem deve funcionar offline.
    } finally {
      clearAuthToken();
    }
  },
};

export const missoes = {
  async listar() {
    return apiRequest("/missions");
  },

  async concluir(id, evidencias = {}) {
    return apiRequest(`/missions/${encodeURIComponent(id)}/submit`, jsonOptions("POST", evidencias));
  },
};

export const aprendizado = {
  async listarModulos() {
    return apiRequest("/learning/modules");
  },

  async obterModulo(moduleId) {
    return apiRequest(`/learning/modules/${encodeURIComponent(moduleId)}`);
  },

  async concluirAula(moduleId, lessonId, evidencias = {}) {
    return apiRequest(
      `/learning/modules/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(lessonId)}/submit`,
      jsonOptions("POST", evidencias),
    );
  },
};

export const progresso = {
  async obter() {
    return apiRequest("/progress");
  },

  async historico() {
    return apiRequest("/progress/history");
  },
};

export const conquistas = {
  async listar() {
    return apiRequest("/achievements");
  },
};

export const conta = {
  async atualizar(dados) {
    return auth.atualizarPerfil(dados);
  },

  async alterarSenha(dados) {
    return auth.alterarSenha(dados);
  },
};

export const jogos = {
  async listar() {
    return apiRequest("/games");
  },

  async iniciarMemoria() {
    return apiRequest("/games/memory/sessions", jsonOptions("POST"));
  },

  async virarCarta(sessionId, cardId) {
    return apiRequest(
      `/games/memory/sessions/${encodeURIComponent(sessionId)}/flip`,
      jsonOptions("POST", { cardId }),
    );
  },

  async iniciarPuzzle() {
    return apiRequest("/games/puzzle/sessions", jsonOptions("POST"));
  },

  async moverPeca(sessionId, tile) {
    return apiRequest(
      `/games/puzzle/sessions/${encodeURIComponent(sessionId)}/move`,
      jsonOptions("POST", { tile }),
    );
  },
};

export const admin = {
  async listarUsuarios() { return apiRequest("/admin/users"); },
  async obterUsuario(id) {
    return apiRequest(`/admin/users/${encodeURIComponent(id)}`);
  },
  async cadastrarUsuario(dados) {
    return apiRequest("/admin/users", jsonOptions("POST", dados));
  },
  async desativarUsuario(id) {
    return apiRequest(`/admin/users/${encodeURIComponent(id)}/deactivate`, jsonOptions("PATCH"));
  },
  async editarUsuario(id, dados) {
    return apiRequest(`/admin/users/${encodeURIComponent(id)}`, jsonOptions("PATCH", dados));
  },
  async resetarSenha(id) {
    return apiRequest(`/admin/users/${encodeURIComponent(id)}/reset-password`, jsonOptions("POST"));
  },
  async listarSolicitacoes() {
    return apiRequest("/admin/registration-requests");
  },
  async aprovarSolicitacao(id) {
    return apiRequest(`/admin/registration-requests/${encodeURIComponent(id)}/approve`, jsonOptions("POST"));
  },
  async recusarSolicitacao(id, motivo) {
    return apiRequest(`/admin/registration-requests/${encodeURIComponent(id)}/reject`, jsonOptions("POST", { motivo }));
  },
  async listarConteudo() {
    return apiRequest("/admin/content");
  },

  async salvarMissao(id, dados) {
    return apiRequest(
      id ? `/admin/missions/${encodeURIComponent(id)}` : "/admin/missions",
      jsonOptions(id ? "PATCH" : "POST", dados),
    );
  },

  async salvarModulo(id, dados) {
    return apiRequest(
      id ? `/admin/modules/${encodeURIComponent(id)}` : "/admin/modules",
      jsonOptions(id ? "PATCH" : "POST", dados),
    );
  },

  async salvarAula(moduleId, lessonId, dados) {
    return apiRequest(
      lessonId
        ? `/admin/modules/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(lessonId)}`
        : `/admin/modules/${encodeURIComponent(moduleId)}/lessons`,
      jsonOptions(lessonId ? "PATCH" : "POST", dados),
    );
  },

  async salvarJogo(id, dados) {
    return apiRequest(`/admin/games/${encodeURIComponent(id)}`, jsonOptions("PATCH", dados));
  },
};
