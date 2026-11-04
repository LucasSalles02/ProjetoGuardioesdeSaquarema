export const can = (user, permission) => Boolean(user?.permissions?.includes(permission));
export const canGrant = (user, permission) => can(user, permission) || (permission === "school_units.read" && can(user, "institutions.update"));

export function routePermission(path) {
  if (path.startsWith("/admin/unidades-escolares")) return "institutions.read";
  if (path === "/gestao") return "content.read";
  if (path.startsWith("/admin/usuarios/novo")) return "users.create";
  if (/^\/admin\/usuarios\/[^/]+\/editar$/.test(path)) return "users.update";
  if (path.startsWith("/aprender")) return "learning.read";
  return ({ "/jogos": "games.read", "/missoes": "missions.read", "/progresso": "progress.read", "/conquistas": "achievements.read" })[path];
}
