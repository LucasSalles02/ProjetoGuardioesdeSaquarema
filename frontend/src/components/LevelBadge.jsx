import { Crown, Droplets, Fish, Flower2, Leaf, LockKeyhole, Shell, ShieldCheck, Sprout, Trophy, Waves } from "lucide-react";

const levels = [Waves, Sprout, Shell, Droplets, Fish, ShieldCheck, Leaf, Flower2, Trophy, Crown];
const sizes = { card: "level-badge--card", profile: "level-badge--profile", hero: "level-badge--hero" };

export default function LevelBadge({ level = 1, locked = false, size = "card", className = "" }) {
  const safeLevel = Math.min(10, Math.max(1, Math.trunc(Number(level) || 1)));
  const Icon = levels[safeLevel - 1];
  return <span className={`level-badge ${sizes[size] || sizes.card} ${className}`} data-level={safeLevel} data-locked={locked} role="img" aria-label={`Nível ${safeLevel}${locked ? " bloqueado" : ""}`}>
    <span className="level-badge-orbit" aria-hidden="true" />
    <Icon className="level-badge-icon" strokeWidth={2.3} aria-hidden="true" />
    {locked && <span className="level-badge-lock" aria-hidden="true"><LockKeyhole size={18} strokeWidth={2.5} /></span>}
  </span>;
}
