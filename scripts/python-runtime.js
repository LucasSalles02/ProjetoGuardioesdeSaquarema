import { existsSync } from "node:fs";
import { join } from "node:path";

export function pythonRuntime() {
  if (process.env.GUARDIOES_PYTHON) return process.env.GUARDIOES_PYTHON;
  const candidates = process.platform === "win32"
    ? ["backend/.venv/Scripts/python.exe", ".venv/Scripts/python.exe", ".runtime/python/tools/python.exe"]
    : ["backend/.venv/bin/python", ".venv/bin/python"];
  return candidates.map(path => join(process.cwd(), path)).find(existsSync)
    || (process.platform === "win32" ? "python" : "python3");
}

export function pythonEnvironment() {
  return { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8", PYTHONUNBUFFERED: "1" };
}
