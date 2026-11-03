import { spawn } from "node:child_process";
import { pythonEnvironment, pythonRuntime } from "./python-runtime.js";
import { hasLocalPostgres, startLocalPostgres } from "./postgres-local.js";

const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
if (hasLocalPostgres() && (process.env.DATABASE_URL || "").includes("@127.0.0.1:55432/")) {
  await startLocalPostgres();
}
const api = spawn(pythonRuntime(), ["backend/run.py"], { stdio: "inherit", env: pythonEnvironment(), windowsHide: true });
children.push(api);
api.on("exit", code => stop(code || 0));
api.on("error", error => { console.error(`Python indisponivel (${error.code}). Consulte backend/README.md.`); stop(1); });
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
const target = process.env.API_PROXY_TARGET || `http://127.0.0.1:${process.env.PORT || 3333}`;
let ready = false;
const deadline = Date.now() + 30_000;
while (Date.now() < deadline && !stopping) {
  try {
    const res = await fetch(`${target}/api/health`, { signal: AbortSignal.timeout(1000) });
    const health = await res.json();
    ready = res.ok && health.runtime === "python" && health.database === "postgresql";
  } catch { /* API starting */ }
  if (ready) break;
  await new Promise(resolve => setTimeout(resolve, 100));
}
if (!ready) { console.error("API Python/PostgreSQL nao iniciou. Verifique DATABASE_URL e a porta configurada."); stop(1); }
else if (!stopping) {
  const vite = spawn(process.execPath, ["node_modules/vite/bin/vite.js"], { stdio: "inherit" });
  children.push(vite);
  vite.on("exit", code => stop(code || 0));
  vite.on("error", () => stop(1));
}
