import { spawn, execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

const runtimePath = resolve(".runtime");
mkdirSync(runtimePath, { recursive: true });
// PostgreSQL bootstrap on Windows requires an ASCII path when the account name contains accents.
const directory = process.platform === "win32"
  ? execFileSync("powershell.exe", ["-NoProfile", "-Command", "(New-Object -ComObject Scripting.FileSystemObject).GetFolder($env:GUARDIOES_RUNTIME_FOLDER).ShortPath"],
    { env: { ...process.env, GUARDIOES_RUNTIME_FOLDER: runtimePath }, encoding: "utf8", windowsHide: true }).trim()
  : runtimePath;
const configuration = join(directory, "local-postgres.json");
const executable = name => join(process.env.POSTGRES_BIN || join(directory, "postgres", "pgsql", "bin"), process.platform === "win32" ? `${name}.exe` : name);
const data = join(directory, "postgres-data");

function run(name, args, env = process.env, quiet = false) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(executable(name), args, { env, stdio: quiet ? "ignore" : "inherit", windowsHide: true });
    child.on("error", reject);
    child.on("exit", code => code === 0 ? resolvePromise() : reject(new Error(`${name} falhou (${code}).`)));
  });
}

export function hasLocalPostgres() { return existsSync(configuration); }

export async function startLocalPostgres() {
  if (!hasLocalPostgres()) throw new Error("Execute npm run db:setup:local ou configure DATABASE_URL para uma instancia existente.");
  const config = JSON.parse(readFileSync(configuration, "utf8"));
  try { await run("pg_ctl", ["-D", data, "status"], process.env, true); return; } catch { /* Not running */ }
  await run("pg_ctl", ["-D", data, "-l", join(directory, "postgres.log"), "-o", `-h 127.0.0.1 -p ${config.port}`, "-w", "start"]);
}

async function setup() {
  if (hasLocalPostgres()) { await startLocalPostgres(); return; }
  if (!existsSync(executable("initdb"))) throw new Error("Binarios PostgreSQL ausentes. Configure POSTGRES_BIN ou consulte backend/README.md.");
  if (existsSync(join(data, "PG_VERSION"))) throw new Error("Cluster ja existe sem configuracao local. Preserve os dados e revise a configuracao antes de continuar.");
  const envFile = resolve(".env");
  const previous = existsSync(envFile) ? readFileSync(envFile, "utf8") : "";
  if (/^\s*DATABASE_URL\s*=/m.test(previous)) throw new Error("DATABASE_URL ja configurada. Nao sera substituida pelo setup local.");
  mkdirSync(directory, { recursive: true });
  const config = { user: "guardioes_local", password: randomBytes(32).toString("hex"), port: 55432, database: "guardioes" };
  const passwordFile = join(directory, "initdb-password");
  writeFileSync(passwordFile, config.password + "\n", { mode: 0o600 });
  try { await run("initdb", ["-D", data, "-U", config.user, "--auth=scram-sha-256", "--encoding=UTF8", "--locale=C", `--pwfile=${passwordFile}`]); }
  finally { unlinkSync(passwordFile); }
  writeFileSync(configuration, JSON.stringify(config), { mode: 0o600 });
  await startLocalPostgres();
  await run("createdb", ["-h", "127.0.0.1", "-p", String(config.port), "-U", config.user, config.database], { ...process.env, PGPASSWORD: config.password });
  const url = `postgresql://${config.user}:${config.password}@127.0.0.1:${config.port}/${config.database}`;
  writeFileSync(envFile, previous.trimEnd() + `\nDATABASE_URL=${url}\n`, { mode: 0o600 });
  console.log("PostgreSQL local pronto em 127.0.0.1:55432. Conexao gravada no .env; credenciais nao foram exibidas.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const operation = process.argv[2] || "start";
  try {
    if (operation === "setup") await setup();
    else if (operation === "start") await startLocalPostgres();
    else if (operation === "stop") await run("pg_ctl", ["-D", data, "-m", "fast", "-w", "stop"]);
    else throw new Error("Operacao local desconhecida.");
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
