import { spawn } from "node:child_process";
import { pythonEnvironment, pythonRuntime } from "./python-runtime.js";

const [operation = "serve", ...args] = process.argv.slice(2);
const command = operation === "serve" ? ["backend/run.py", ...args]
  : operation === "test" ? ["-m", "pytest", "-c", "backend/pytest.ini", ...args]
    : ["backend/manage.py", operation, ...args];
const child = spawn(pythonRuntime(), command, { stdio: "inherit", env: pythonEnvironment(), windowsHide: true });
child.on("error", error => {
  console.error(`Nao foi possivel executar Python (${error.code}). Instale Python e backend/requirements.txt ou defina GUARDIOES_PYTHON.`);
  process.exitCode = 1;
});
child.on("exit", code => { process.exitCode = code ?? 1; });
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
