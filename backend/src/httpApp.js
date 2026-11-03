import { createServer } from "node:http";
import { GuardioesDeSaquaremaService } from "./guardioesDeSaquaremaService.js";
import { HttpError, notFound, badRequest } from "./errors.js";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

export function createGuardioesDeSaquaremaServer(options = {}) {
  const service = options.service || new GuardioesDeSaquaremaService(options);

  const attempts = new Map();
  const server = createServer(async (request, response) => {
    try {
      if (request.method === "OPTIONS") {
        response.writeHead(204, JSON_HEADERS);
        response.end();
        return;
      }

      const url = new URL(request.url, "http://localhost");
      const route = findRoute(request.method, url.pathname);

      if (!route) {
        throw notFound("Endpoint nao encontrado.");
      }

      const body = await readJson(request);
      if (request.method === "POST" && ["/api/auth/login", "/api/auth/admin/login", "/api/auth/register"].includes(url.pathname)) {
        const now = Date.now();
        for (const [key, entry] of attempts) if (entry.until <= now) attempts.delete(key);
        const key = request.socket.remoteAddress;
        const entry = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
        if (++entry.count > 30) throw new HttpError(429, "Muitas tentativas. Aguarde 15 minutos.");
        attempts.set(key, entry);
      }
      const token = readBearerToken(request);
      const params = route.match.slice(1).map(decodeURIComponent);
      const payload = await route.handler({ body, params, service, token });

      sendJson(response, 200, payload);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const message = status === 500 ? "Erro interno do servidor." : error.message;

      if (status === 500) {
        console.error("Erro interno na API:", error.name);
      }

      sendJson(response, status, { erro: message });
    }
  });

  server.service = service;
  return server;
}

const routes = [
  route("POST", /^\/api\/auth\/admin\/login$/, ({ body, service }) => service.login(body, true)),
  route("GET", /^\/api\/admin\/users$/, authenticated((id, { service }) => service.listUsers(id))),
  route("GET", /^\/api\/health$/, () => ({ ok: true, service: "guardioes-de-saquarema-backend" })),

  route("POST", /^\/api\/auth\/register$/, ({ body, service }) => service.register(body)),
  route("POST", /^\/api\/auth\/login$/, ({ body, service }) => service.login(body)),
  route("GET", /^\/api\/auth\/me$/, ({ service, token }) => service.me(token)),
  route("POST", /^\/api\/auth\/logout$/, ({ service, token }) => service.logout(token)),

  route("PATCH", /^\/api\/account\/profile$/, authenticated((userId, { body, service }) => (
    service.updateProfile(userId, body)
  ))),
  route("PATCH", /^\/api\/account\/password$/, authenticated((userId, { body, service }) => (
    service.changePassword(userId, body)
  ))),

  route("GET", /^\/api\/admin\/content$/, authenticated((userId, { service }) => (
    service.getAdminContent(userId)
  ))),
  route("POST", /^\/api\/admin\/missions$/, authenticated((userId, { body, service }) => (
    service.saveMission(userId, null, body)
  ))),
  route("PATCH", /^\/api\/admin\/missions\/([^/]+)$/, authenticated((userId, { body, params, service }) => (
    service.saveMission(userId, params[0], body)
  ))),
  route("POST", /^\/api\/admin\/modules$/, authenticated((userId, { body, service }) => (
    service.saveModule(userId, null, body)
  ))),
  route("PATCH", /^\/api\/admin\/modules\/([^/]+)$/, authenticated((userId, { body, params, service }) => (
    service.saveModule(userId, params[0], body)
  ))),
  route("POST", /^\/api\/admin\/modules\/([^/]+)\/lessons$/, authenticated((userId, { body, params, service }) => (
    service.saveLesson(userId, params[0], null, body)
  ))),
  route("PATCH", /^\/api\/admin\/modules\/([^/]+)\/lessons\/([^/]+)$/, authenticated((userId, { body, params, service }) => (
    service.saveLesson(userId, params[0], params[1], body)
  ))),
  route("PATCH", /^\/api\/admin\/games\/([^/]+)$/, authenticated((userId, { body, params, service }) => (
    service.saveGame(userId, params[0], body)
  ))),

  route("GET", /^\/api\/missions$/, authenticated((userId, { service }) => service.listMissions(userId))),
  route("POST", /^\/api\/missions\/([^/]+)\/submit$/, authenticated((userId, { body, params, service }) => (
    service.submitMission(userId, params[0], body)
  ))),

  route("GET", /^\/api\/learning\/modules$/, authenticated((userId, { service }) => (
    service.listModules(userId)
  ))),
  route("GET", /^\/api\/learning\/modules\/([^/]+)$/, authenticated((userId, { params, service }) => (
    service.getModule(userId, params[0])
  ))),
  route("POST", /^\/api\/learning\/modules\/([^/]+)\/lessons\/([^/]+)\/submit$/, authenticated((userId, { body, params, service }) => (
    service.submitLesson(userId, params[0], params[1], body)
  ))),

  route("GET", /^\/api\/progress$/, authenticated((userId, { service }) => service.getProgress(userId))),
  route("GET", /^\/api\/progress\/history$/, authenticated((userId, { service }) => service.getHistory(userId))),
  route("GET", /^\/api\/achievements$/, authenticated((userId, { service }) => service.listAchievements(userId))),

  route("GET", /^\/api\/games$/, authenticated((_userId, { service }) => service.getGames())),
  route("POST", /^\/api\/games\/memory\/sessions$/, authenticated((userId, { service }) => (
    service.startMemory(userId)
  ))),
  route("POST", /^\/api\/games\/memory\/sessions\/([^/]+)\/flip$/, authenticated((userId, { body, params, service }) => (
    service.flipMemory(userId, params[0], body.cardId)
  ))),
  route("POST", /^\/api\/games\/puzzle\/sessions$/, authenticated((userId, { service }) => (
    service.startPuzzle(userId)
  ))),
  route("POST", /^\/api\/games\/puzzle\/sessions\/([^/]+)\/move$/, authenticated((userId, { body, params, service }) => (
    service.movePuzzle(userId, params[0], body.tile)
  ))),
];

function route(method, pattern, handler) {
  return { method, pattern, handler };
}

function authenticated(handler) {
  return (context) => {
    const userId = context.service.requireUserId(context.token);
    return handler(userId, context);
  };
}

function findRoute(method, pathname) {
  for (const item of routes) {
    if (item.method !== method) continue;
    const match = pathname.match(item.pattern);
    if (match) return { ...item, match };
  }
  return null;
}

async function readJson(request) {
  if (!["POST", "PATCH"].includes(request.method)) {
    return {};
  }

  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 100_000) {
      throw new HttpError(413, "Payload muito grande.");
    }
  }

  if (!raw) return {};
  try {
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw badRequest("JSON invalido.");
    return body;
  } catch { throw badRequest("JSON invalido."); }
}

function readBearerToken(request) {
  const authorization = request.headers.authorization || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function sendJson(response, status, payload) {
  response.writeHead(status, JSON_HEADERS);
  response.end(JSON.stringify(payload));
}
