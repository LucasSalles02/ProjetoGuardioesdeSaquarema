import { scryptSync, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { badRequest } from "./errors.js";

const TEXT_LIMIT = 80;
const PASSWORD_MIN_LENGTH = 8;
const HASH_ITERATIONS = 120000;
const HASH_ALGORITHM = "sha256";
const DERIVED_KEY_LENGTH = 32;

export function generateId(prefix = "id") {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

export function generateToken() {
  return randomBytes(32).toString("base64url");
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function cleanText(value, maxLength = TEXT_LIMIT) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function validatePassword(password) {
  return typeof password === "string" && password.length >= PASSWORD_MIN_LENGTH && password.length <= 256;
}

export function assertSafeProfile({ nome, email, senha, turma, escola }, { requirePassword = true } = {}) {
  const cleaned = {
    nome: cleanText(nome),
    email: normalizeEmail(email),
    turma: cleanText(turma, 40),
    escola: cleanText(escola, 80),
  };

  if (cleaned.nome.length < 2) {
    throw badRequest("Informe um nome com pelo menos 2 caracteres.");
  }

  if (!validateEmail(cleaned.email)) {
    throw badRequest("Informe um email valido.");
  }

  if (requirePassword && !validatePassword(senha)) {
    throw badRequest("A senha precisa ter pelo menos 8 caracteres.");
  }

  return cleaned;
}

export function hashPassword(password, salt) {
  return "scrypt$" + scryptSync(String(password || ""), salt, 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString("base64");
}

function legacyHash(password, salt) {
  return pbkdf2Sync(
    String(password || ""),
    salt,
    HASH_ITERATIONS,
    DERIVED_KEY_LENGTH,
    HASH_ALGORITHM,
  ).toString("base64");
}

export function verifyPassword(password, salt, expectedHash) {
  const actual = Buffer.from(String(expectedHash).startsWith("scrypt$") ? hashPassword(password, salt) : legacyHash(password, salt));
  const expected = Buffer.from(String(expectedHash || ""));

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}
