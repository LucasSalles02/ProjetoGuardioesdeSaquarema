// Prefer current names while keeping existing deployments compatible.
export function readProjectEnv(key) {
  return process.env[`GUARDIOES_DE_SAQUAREMA_${key}`] ?? process.env[`ECOMAR_${key}`];
}
