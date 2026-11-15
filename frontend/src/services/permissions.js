export const can = (user, permission) => Boolean(user?.permissions?.includes(permission));
export const canGrant = (user, permission) => (user?.admin && ["classes.create", "classes.update", "enrollments.update", "transfers.create"].includes(permission)) || can(user, permission) || (permission === "school_units.read" && can(user, "institutions.update"));

export function routePermission(path) {
  if (path === "/admin/transferencias" || path === "/gestao-escolar/transferencias") return "transfers.read";
  if (path.startsWith("/admin/destaques")) return "highlights.read";
  if (path.startsWith("/admin/usuarios/novo")) return "users.create";
  if (/^\/admin\/usuarios\/[^/]+\/editar$/.test(path)) return "users.update";
  if (path.startsWith("/aprender")) return "learning.read";
  return ({ "/jogos": "games.read", "/missoes": "missions.read", "/progresso": "progress.read", "/conquistas": "achievements.read" })[path];
}
