export function rewardFrames(previous, next) {
  const percent = (value) => Math.max(0, Math.min(100, Number(value) || 0));
  const start = { level: previous.nivel, percent: percent(previous.percentualNivel) };
  const finish = { level: next.nivel, percent: percent(next.percentualNivel) };
  if (next.nivel > previous.nivel) {
    return [start, { ...start, percent: 100 }, { level: next.nivel, percent: 0 }, finish];
  }
  return [start, finish];
}

export function earnedReward(previous, result, title) {
  if (!previous || !result?.usuario || result.usuario.id !== previous.id || !(result.xpGanho > 0))
    return null;
  return {
    title,
    xp: result.xpGanho,
    next: result.usuario,
    levelUp: result.usuario.nivel > previous.nivel,
    frames: rewardFrames(previous, result.usuario),
  };
}
