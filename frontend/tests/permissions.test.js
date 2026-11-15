import test from "node:test";
import assert from "node:assert/strict";
import { can, canGrant, routePermission } from "../src/services/permissions.js";

test("permissões exigem concessão explícita", () => {
  assert.equal(can(null, "users.read"), false);
  assert.equal(can({ permissions: [] }, "users.read"), false);
  assert.equal(can({ permissions: ["users.read"] }, "users.read"), true);
});

test("administrador pode delegar operações escolares aos gestores", () => {
  const admin = { admin: true, permissions: [] };
  for (const permission of ["classes.create", "classes.update", "enrollments.update", "transfers.create"]) {
    assert.equal(canGrant(admin, permission), true);
    assert.equal(can(admin, permission), false);
    assert.equal(canGrant({ permissions: [] }, permission), false);
  }
});

test("rotas de conteúdos e transferências exigem as permissões correspondentes", () => {
  const routes = {
    "/admin/transferencias": "transfers.read", "/gestao-escolar/transferencias": "transfers.read",
    "/admin/usuarios/novo": "users.create", "/admin/usuarios/ficticio/editar": "users.update",
    "/admin/destaques": "highlights.read", "/jogos": "games.read", "/missoes": "missions.read",
    "/aprender/trilha": "learning.read", "/progresso": "progress.read", "/conquistas": "achievements.read",
  };
  for (const [route, permission] of Object.entries(routes)) assert.equal(routePermission(route), permission);
});
