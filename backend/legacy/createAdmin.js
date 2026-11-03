// Legacy Node/SQLite entrypoint. Use only for explicit rollback.
import { readProjectEnv } from "../src/config.js";
import { GuardioesDeSaquaremaService } from "../src/guardioesDeSaquaremaService.js";
import { withTransaction } from "../src/database.js";
import { generateToken, hashPassword } from "../src/security.js";
const service = new GuardioesDeSaquaremaService();
try {
  const username = String(readProjectEnv("ADMIN_USERNAME") || "").trim().toLowerCase();
  const senha = readProjectEnv("ADMIN_PASSWORD");
  if (!/^[a-z0-9_.-]{3,40}$/.test(username) || typeof senha !== "string" || senha.length < 12 || senha.length > 256) {
    throw new Error("Defina GUARDIOES_DE_SAQUAREMA_ADMIN_USERNAME (3-40 letras/numeros/_.-) e GUARDIOES_DE_SAQUAREMA_ADMIN_PASSWORD (12-256 caracteres).");
  }
  withTransaction(service.db, () => {
    const existing = service.db.prepare("SELECT id, role FROM users WHERE username = ?").get(username);
    if (existing) {
      if (existing.role !== "ADMIN") throw new Error("Nome de usuario ja utilizado por conta comum.");
      if (process.argv.includes("--reset-password")) {
        const salt = generateToken();
        service.db.prepare("UPDATE users SET password_salt = ?, password_hash = ?, updated_at = ? WHERE id = ? AND role = 'ADMIN'").run(salt, hashPassword(senha, salt), new Date().toISOString(), existing.id);
        service.db.prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ?").run(new Date().toISOString(), existing.id);
      }
      return;
    }
    const email = readProjectEnv("ADMIN_EMAIL");
    if (service.db.prepare("SELECT id FROM users WHERE email = ?").get(String(email || "").trim().toLowerCase())) throw new Error("Email ja utilizado. Use um email exclusivo para o administrador.");
    const id = generateToken();
    const salt = generateToken();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Defina GUARDIOES_DE_SAQUAREMA_ADMIN_EMAIL com um email valido.");
    const now = new Date().toISOString();
    service.db.prepare("INSERT INTO users (id, nome, username, email, role, password_salt, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, 'ADMIN', ?, ?, ?, ?)").run(id, readProjectEnv("ADMIN_NAME") || username, username, email.trim().toLowerCase(), salt, hashPassword(senha, salt), now, now);
    service.db.prepare("INSERT INTO stats (user_id) VALUES (?)").run(id);
  });
  console.log("Administrador provisionado. Use --reset-password para redefinir a senha existente.");
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { service.close(); }
