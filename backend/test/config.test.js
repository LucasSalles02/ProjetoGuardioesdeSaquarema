import { it } from "node:test";
import assert from "node:assert/strict";
import { readProjectEnv } from "../src/config.js";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readdirSync, unlinkSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../src/database.js";
import { AUTH_TOKEN_KEY, SESSION_EXPIRED_EVENT } from "../../src/config/auth.js";

it("prioriza variaveis atuais mantendo aliases de ambientes existentes", () => {
  const current = "GUARDIOES_DE_SAQUAREMA_DB_PATH";
  const legacy = "ECOMAR_DB_PATH";
  const original = [process.env[current], process.env[legacy]];
  try {
    delete process.env[current];
    process.env[legacy] = "legacy.sqlite";
    assert.equal(readProjectEnv("DB_PATH"), "legacy.sqlite");
    process.env[current] = "current.sqlite";
    assert.equal(readProjectEnv("DB_PATH"), "current.sqlite");
  } finally {
    for (const [index, key] of [current, legacy].entries()) {
      if (original[index] === undefined) delete process.env[key];
      else process.env[key] = original[index];
    }
  }
});

it("preserva identificador de sessao do navegador apos renomeacao", () => {
  assert.equal(AUTH_TOKEN_KEY, "ecomar:auth-token:v1");
  assert.equal(SESSION_EXPIRED_EVENT, "guardioes-de-saquarema:session-expired");
});

it("mantem usuarios, hashes e progresso ao migrar perfis legados", () => {
  const directory = mkdtempSync(join(tmpdir(), "guardioes-migration-"));
  const dbPath = join(directory, "legacy.sqlite");
  const db = new DatabaseSync(dbPath);
  // Schema anterior a username e aos nomes USER/ADMIN.
  db.exec(`CREATE TABLE users (
    id TEXT PRIMARY KEY, nome TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    turma TEXT NOT NULL DEFAULT '', escola TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'student', password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );`);
  const insert = db.prepare("INSERT INTO users (id, nome, email, role, password_salt, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, 'salt', 'hash', '2025-01-01', '2025-01-01')");
  insert.run("existing-admin", "Gestor", "gestor@example.com", "admin");
  insert.run("existing-user", "Aluno", "aluno@example.com", "student");
  db.exec("CREATE TABLE stats (user_id TEXT PRIMARY KEY REFERENCES users(id), xp INTEGER NOT NULL DEFAULT 0);");
  db.prepare("INSERT INTO stats (user_id, xp) VALUES (?, ?)").run("existing-user", 250);
  const before = db.prepare("SELECT id, nome, email, password_salt, password_hash, created_at, updated_at FROM users ORDER BY id").all();
  db.close();
  const migrated = openDatabase(dbPath);
  try {
    assert.deepEqual(migrated.prepare("SELECT id, nome, email, password_salt, password_hash, created_at, updated_at FROM users ORDER BY id").all(), before);
    assert.equal(migrated.prepare("SELECT role FROM users WHERE id = ?").get("existing-admin").role, "ADMIN");
    assert.equal(migrated.prepare("SELECT role FROM users WHERE id = ?").get("existing-user").role, "USER");
    assert.equal(migrated.prepare("SELECT xp FROM stats WHERE user_id = ?").get("existing-user").xp, 250);
    assert.equal(migrated.prepare("SELECT username FROM users WHERE id = ?").get("existing-user").username, null);
  } finally {
    migrated.close();
    for (const file of readdirSync(directory)) unlinkSync(join(directory, file));
    rmdirSync(directory);
  }
});
