import test from "node:test";
import assert from "node:assert/strict";
import { earnedReward, rewardFrames } from "../src/services/rewards.js";

test("o avanço de nível preenche a barra anterior antes de reiniciar a nova", () => {
  const frames = rewardFrames({ nivel: 4, percentualNivel: 90 }, { nivel: 5, percentualNivel: 7 });
  assert.deepEqual(frames, [
    { level: 4, percent: 90 },
    { level: 4, percent: 100 },
    { level: 5, percent: 0 },
    { level: 5, percent: 7 },
  ]);
});
test("uma recompensa no mesmo nível aumenta a barra sem reiniciá-la", () => {
  assert.deepEqual(
    rewardFrames({ nivel: 2, percentualNivel: 20 }, { nivel: 2, percentualNivel: 90 }),
    [
      { level: 2, percent: 20 },
      { level: 2, percent: 90 },
    ],
  );
});
test("sem XP ou com usuário diferente nenhuma celebração é criada", () => {
  const previous = { id: "aluno", nivel: 2, percentualNivel: 10 };
  assert.equal(earnedReward(previous, { xpGanho: 0, usuario: previous }, "Jogo"), null);
  assert.equal(
    earnedReward(previous, { xpGanho: 20, usuario: { ...previous, id: "outro" } }, "Jogo"),
    null,
  );
});
test("o nível máximo celebra XP mantendo a barra completa e o valor confirmado", () => {
  const previous = { id: "aluno", nivel: 10, percentualNivel: 100, xp: 1400 };
  const result = earnedReward(
    previous,
    { xpGanho: 70, usuario: { ...previous, xp: 1470 } },
    "Jogo",
  );
  assert.equal(result.xp, 70);
  assert.equal(result.levelUp, false);
  assert.deepEqual(result.frames, [
    { level: 10, percent: 100 },
    { level: 10, percent: 100 },
  ]);
});
