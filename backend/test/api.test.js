import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createGuardioesDeSaquaremaServer } from "../src/httpApp.js";

let server;
let baseUrl;
let tempDir;

beforeEach(async () => {
  tempDir = mkdtempSync(join(tmpdir(), "guardioes-de-saquarema-test-"));
  server = createGuardioesDeSaquaremaServer({ dbPath: join(tempDir, "test.sqlite") });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}/api`;
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  server.service.close();
  rmSync(tempDir, { recursive: true, force: true });
});

describe("auth", () => {
  it("cadastra, autentica, retorna sessao e faz logout", async () => {
    const registered = await api("/auth/register", {
      method: "POST",
      body: {
        nome: "Ana Costa",
        email: "ana@example.com",
        senha: "segredo123",
        turma: "6 Ano",
        escola: "Escola Azul",
      },
    });

    assert.equal(registered.usuario.email, "ana@example.com");
    assert.equal(registered.usuario.tipoUsuario, "USER");
    assert.ok(registered.token);

    const me = await api("/auth/me", { token: registered.token });
    assert.equal(me.usuario.nome, "Ana Costa");

    await api("/auth/logout", { method: "POST", token: registered.token });
    await assert.rejects(() => api("/auth/me", { token: registered.token }), /Sessao expirada/);

    const logged = await api("/auth/login", {
      method: "POST",
      body: { email: "ana@example.com", senha: "segredo123" },
    });
    assert.equal(logged.usuario.email, "ana@example.com");
  });

  it("restringe gestao de conteudo para administradores", async () => {
    const seeded = await createUser("admin@example.com");
    server.service.db.prepare("UPDATE users SET role = 'ADMIN' WHERE id = ?").run(seeded.usuario.id);
    const admin = { ...seeded, usuario: server.service.publicUser(seeded.usuario.id) };
    const student = await createUser("aluno@example.com");

    assert.equal(admin.usuario.admin, true);
    assert.equal(student.usuario.admin, false);

    await assert.rejects(() => api("/admin/content", { token: student.token }), /Apenas administradores/);

    const mission = await api("/admin/missions", {
      method: "POST",
      token: admin.token,
      body: {
        titulo: "Auditoria de residuos",
        descricao: "Registrar itens encontrados no caminho ate a escola.",
        aprendizado: "Observacao ambiental",
        impacto: "Melhora a consciencia sobre descarte.",
        categoria: "Observacao",
        xpRecompensa: 45,
        validationType: "list",
        active: true,
      },
    });

    assert.equal(mission.missao.id, "auditoria-de-residuos");
    const content = await api("/admin/content", { token: admin.token });
    assert.ok(content.missoes.some((item) => item.id === "auditoria-de-residuos"));
  });
});

describe("atividades e progresso", () => {
  it("rejeita missao sem evidencia e concede XP uma vez quando valida", async () => {
    const { token } = await createUser();

    await assert.rejects(() => api("/missions/lixo-marinho/submit", {
      method: "POST",
      token,
      body: { residuo1: "garrafa" },
    }), /tres residuos/);

    const done = await api("/missions/lixo-marinho/submit", {
      method: "POST",
      token,
      body: { residuo1: "garrafa", residuo2: "sacola", residuo3: "canudo" },
    });

    assert.equal(done.usuario.missoesConcluidas, 1);
    assert.equal(done.xpGanho, 100);
    assert.equal(done.novasConquistas[0].id, "primeira-missao");

    const repeated = await api("/missions/lixo-marinho/submit", {
      method: "POST",
      token,
      body: { residuo1: "garrafa", residuo2: "sacola", residuo3: "canudo" },
    });

    assert.equal(repeated.xpGanho, 0);
    assert.equal(repeated.usuario.xp, done.usuario.xp);
  });

  it("valida quiz no backend e rejeita resposta incorreta", async () => {
    const { token } = await createUser("quiz@example.com");

    await assert.rejects(() => api("/missions/quiz-ambiental/submit", {
      method: "POST",
      token,
      body: {
        respostas: {
          "residuo-praia": "ignorar",
          "animal-silvestre": "observar-distancia",
          microplasticos: "reutilizaveis",
        },
      },
    }), /Revise o quiz/);

    const result = await api("/missions/quiz-ambiental/submit", {
      method: "POST",
      token,
      body: {
        respostas: {
          "residuo-praia": "recolher-descartar",
          "animal-silvestre": "observar-distancia",
          microplasticos: "reutilizaveis",
        },
      },
    });

    assert.equal(result.usuario.missoesConcluidas, 1);
  });

  it("concede aula uma unica vez", async () => {
    const { token } = await createUser("aula@example.com");
    const payload = { resposta: "Vou observar a praia sem interferir na vida marinha local." };

    const first = await api("/learning/modules/vida-marinha/lessons/ecossistemas-costeiros/submit", {
      method: "POST",
      token,
      body: payload,
    });
    const second = await api("/learning/modules/vida-marinha/lessons/ecossistemas-costeiros/submit", {
      method: "POST",
      token,
      body: payload,
    });

    assert.equal(first.usuario.aulasConcluidas, 1);
    assert.equal(second.xpGanho, 0);
    assert.equal(second.usuario.xp, first.usuario.xp);
  });
});

describe("jogos", () => {
  it("controla pares do jogo da memoria e premia ao completar", async () => {
    const { token, usuario } = await createUser("memoria@example.com");
    const started = await api("/games/memory/sessions", { method: "POST", token });
    const row = server.service.db.prepare("SELECT state_json FROM game_sessions WHERE id = ?")
      .get(started.sessionId);
    const state = JSON.parse(row.state_json);
    const bySymbol = new Map();

    state.cards.forEach((card) => {
      bySymbol.set(card.symbol, [...(bySymbol.get(card.symbol) || []), card.id]);
    });

    let latest;
    for (const pair of bySymbol.values()) {
      latest = await api(`/games/memory/sessions/${started.sessionId}/flip`, {
        method: "POST",
        token,
        body: { cardId: pair[0] },
      });
      latest = await api(`/games/memory/sessions/${started.sessionId}/flip`, {
        method: "POST",
        token,
        body: { cardId: pair[1] },
      });
    }

    assert.equal(latest.jogo.completed, true);
    assert.equal(latest.xpGanho, 70);
    assert.equal(latest.usuario.xp, usuario.xp + 70);

    const repeated = await api(`/games/memory/sessions/${started.sessionId}/flip`, {
      method: "POST",
      token,
      body: { cardId: state.cards[0].id },
    });
    assert.equal(repeated.xpGanho, 0);
  });

  it("rejeita movimento ilegal no puzzle e premia solucao", async () => {
    const { token } = await createUser("puzzle@example.com");
    const started = await api("/games/puzzle/sessions", { method: "POST", token });

    server.service.db.prepare(`
      UPDATE game_sessions
      SET state_json = ?
      WHERE id = ?
    `).run(JSON.stringify({
      board: [1, 2, 3, 4, 5, 6, 0, 7, 8],
      moves: 0,
      completed: false,
      xpReward: 90,
    }), started.sessionId);

    await assert.rejects(() => api(`/games/puzzle/sessions/${started.sessionId}/move`, {
      method: "POST",
      token,
      body: { tile: 5 },
    }), /Movimento invalido/);

    await api(`/games/puzzle/sessions/${started.sessionId}/move`, {
      method: "POST",
      token,
      body: { tile: 7 },
    });
    const solved = await api(`/games/puzzle/sessions/${started.sessionId}/move`, {
      method: "POST",
      token,
      body: { tile: 8 },
    });

    assert.equal(solved.jogo.completed, true);
    assert.equal(solved.xpGanho, 90);
  });
});

async function createUser(email = "eco@example.com") {
  return api("/auth/register", {
    method: "POST",
    body: {
      nome: "Usuario Eco",
      email,
      senha: "segredo123",
      turma: "7 Ano",
      escola: "Escola do Mar",
    },
  });
}

async function api(path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.erro || `HTTP ${response.status}`);
  }

  return payload;
}

describe("seguranca da autenticacao", () => {
  it("impede duplicacao e escalada pelo cadastro ou perfil", async () => {
    const body = { nome: "Teste Seguro", email: "safe@example.com", senha: "segredo123", role: "ADMIN", admin: true, username: "invasor" };
    const user = await api("/auth/register", { method: "POST", body });
    assert.equal(user.usuario.role, "USER");
    assert.equal(user.usuario.username, null);
    await assert.rejects(() => api("/auth/register", { method: "POST", body: { ...body, email: " SAFE@example.com " } }), /ja esta cadastrado/);
    await api("/account/profile", { method: "PATCH", token: user.token, body: { role: "ADMIN", admin: true } });
    await assert.rejects(() => api("/admin/users", { token: user.token }), /Apenas administradores/);
    const row = server.service.db.prepare("SELECT password_hash FROM users WHERE id = ?").get(user.usuario.id);
    assert.ok(row.password_hash.startsWith("scrypt$"));
    assert.ok(!JSON.stringify(user).includes("password_hash"));
  });

  it("rejeita senha incorreta e sessoes ausentes, invalidas ou expiradas", async () => {
    const user = await createUser();
    await assert.rejects(() => api("/auth/login", { method: "POST", body: { email: user.usuario.email, senha: "incorreta" } }), /invalidos/);
    for (const token of [undefined, "invalido"]) {
      const response = await fetch(`${baseUrl}/admin/users`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      assert.equal(response.status, 401);
    }
    server.service.db.prepare("UPDATE sessions SET created_at = ? WHERE token = ?").run("2000-01-01T00:00:00.000Z", user.token);
    await assert.rejects(() => api("/auth/me", { token: user.token }), /Sessao expirada/);
  });

  it("autentica administrador por usuario e verifica papel atual em cada operacao", async () => {
    const user = await createUser();
    server.service.db.prepare("UPDATE users SET role = 'ADMIN', username = 'gestor' WHERE id = ?").run(user.usuario.id);
    const admin = await api("/auth/admin/login", { method: "POST", body: { username: "GESTOR", senha: "segredo123" } });
    assert.equal(admin.usuario.role, "ADMIN");
    const users = await api("/admin/users", { token: admin.token });
    assert.equal(users.usuarios.length, 1);
    assert.equal(users.usuarios[0].password_hash, undefined);
    server.service.db.prepare("UPDATE users SET role = 'USER' WHERE id = ?").run(user.usuario.id);
    const denied = await fetch(`${baseUrl}/admin/users`, { headers: { Authorization: `Bearer ${admin.token}` } });
    assert.equal(denied.status, 403);
    await assert.rejects(() => api("/auth/admin/login", { method: "POST", body: { username: "gestor", senha: "segredo123" } }), /invalidos/);
  });

  it("limita tentativas excessivas e rejeita JSON invalido", async () => {
    for (let i = 0; i < 30; i++) {
      const response = await fetch(`${baseUrl}/auth/admin/login`, { method: "POST", body: JSON.stringify({ username: "inexistente", senha: "errada" }) });
      assert.equal(response.status, 401);
    }
    const limited = await fetch(`${baseUrl}/auth/login`, { method: "POST", body: "{}" });
    assert.equal(limited.status, 429);
    const malformed = await fetch(`${baseUrl}/auth/register`, { method: "POST", body: "{" });
    assert.equal(malformed.status, 400);
  });

  it("mantem compatibilidade com senhas PBKDF2 existentes", async () => {
    const { pbkdf2Sync } = await import("node:crypto");
    const user = await createUser();
    const salt = "legacy-salt";
    const hash = pbkdf2Sync("segredo123", salt, 120000, 32, "sha256").toString("base64");
    server.service.db.prepare("UPDATE users SET password_salt = ?, password_hash = ? WHERE id = ?").run(salt, hash, user.usuario.id);
    const login = await api("/auth/login", { method: "POST", body: { email: user.usuario.email, senha: "segredo123" } });
    assert.equal(login.usuario.id, user.usuario.id);
  });

  for (const prefix of ["GUARDIOES_DE_SAQUAREMA", "ECOMAR"]) {
  it(`provisiona administrador usando ${prefix} sem duplicar e redefine senha revogando sessoes`, async () => {
    const { spawnSync } = await import("node:child_process");
    const { randomBytes } = await import("node:crypto");
    const password = randomBytes(24).toString("hex");
    const env = { ...process.env, [`${prefix}_DB_PATH`]: join(tempDir, "test.sqlite"), [`${prefix}_ADMIN_USERNAME`]: "gestor", [`${prefix}_ADMIN_EMAIL`]: "gestor@example.com", [`${prefix}_ADMIN_PASSWORD`]: password };
    const seed = (args = []) => {
      const result = spawnSync(process.execPath, ["backend/legacy/createAdmin.js", ...args], { env, encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
    };
    seed(); seed();
    assert.equal(server.service.db.prepare("SELECT count(*) AS n FROM users WHERE role = 'ADMIN'").get().n, 1);
    const login = await api("/auth/admin/login", { method: "POST", body: { username: "gestor", senha: password } });
    env[`${prefix}_ADMIN_PASSWORD`] = randomBytes(24).toString("hex");
    seed(["--reset-password"]);
    await assert.rejects(() => api("/auth/me", { token: login.token }), /Sessao expirada/);
    await assert.rejects(() => api("/auth/admin/login", { method: "POST", body: { username: "gestor", senha: password } }), /invalidos/);
    await api("/auth/admin/login", { method: "POST", body: { username: "gestor", senha: env[`${prefix}_ADMIN_PASSWORD`] } });
  });
  }
});

it("inicia backend pelo entrypoint real com ambiente e banco temporario", async () => {
  const { spawn } = await import("node:child_process");
  const { once } = await import("node:events");
  const child = spawn(process.execPath, ["backend/legacy/server.js"], { env: { ...process.env, PORT: "0", HOST: "127.0.0.1", GUARDIOES_DE_SAQUAREMA_DB_PATH: join(tempDir, "startup.sqlite") }, stdio: ["ignore", "pipe", "pipe"] });
  let timer;
  try {
    const url = await new Promise((resolve, reject) => {
      let output = "";
      timer = setTimeout(() => reject(new Error("Backend nao iniciou")), 5000);
      child.on("error", reject);
      child.on("exit", code => reject(new Error(`Backend encerrou: ${code}`)));
      child.stdout.on("data", data => {
        output += data;
        const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if (match) resolve(match[0]);
      });
    });
    const response = await fetch(`${url}/api/health`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ok, true);
  } finally {
    clearTimeout(timer);
    const ended = once(child, "exit");
    child.kill();
    await ended;
  }
});
