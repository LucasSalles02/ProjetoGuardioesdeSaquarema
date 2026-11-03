export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function badRequest(message) {
  return new HttpError(400, message);
}

export function unauthorized(message = "Sessao expirada. Entre novamente.") {
  return new HttpError(401, message);
}

export function forbidden(message = "Acesso negado.") {
  return new HttpError(403, message);
}

export function notFound(message = "Recurso nao encontrado.") {
  return new HttpError(404, message);
}
