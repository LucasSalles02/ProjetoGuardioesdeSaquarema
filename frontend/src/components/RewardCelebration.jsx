import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Sparkles, Star, Trophy } from "lucide-react";
import LevelBadge from "./LevelBadge";

export default function RewardCelebration({ reward, onClose }) {
  const dialog = useRef(null);
  const heading = useId();
  const [frame, setFrame] = useState(reward.frames[0]);
  const [resetting, setResetting] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    const focus = document.activeElement;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers = [];
    if (reduced) setFrame(reward.frames.at(-1));
    else {
      timers.push(setTimeout(() => setFrame(reward.frames[1]), 180));
      if (reward.levelUp) {
        timers.push(
          setTimeout(() => {
            setResetting(true);
            setFrame(reward.frames[2]);
          }, 1150),
        );
        timers.push(
          setTimeout(() => {
            setResetting(false);
            setFrame(reward.frames[3]);
          }, 1300),
        );
      }
    }
    timers.push(setTimeout(onClose, 5500));
    return () => {
      timers.forEach(clearTimeout);
      element.close();
      document.body.style.overflow = overflow;
      if (focus?.isConnected) focus.focus();
    };
  }, [onClose, reward]);

  return createPortal(
    <dialog
      ref={dialog}
      aria-labelledby={heading}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="reward-celebration"
    >
      <div className="reward-confetti" aria-hidden="true">
        {Array.from({ length: 16 }, (_, index) => (
          <i key={index} style={{ "--particle": index }} />
        ))}
      </div>
      <div className="relative p-6 text-center sm:p-8">
        <div className="reward-emblem mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-amber-600">
          <Trophy size={45} aria-hidden="true" />
        </div>
        <h2 id={heading} className="mt-5 text-2xl font-black text-sky-950">
          {reward.title}
        </h2>
        <p
          role="status"
          className="reward-xp mt-3 flex items-center justify-center gap-2 text-4xl font-black text-teal-700"
        >
          <Star className="fill-amber-300 text-amber-500" size={30} aria-hidden="true" />+
          {reward.xp} XP
        </p>
        {reward.levelUp && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-sm font-bold text-amber-900">
            <Sparkles size={17} aria-hidden="true" />
            Você chegou ao nível {reward.next.nivel}!
          </p>
        )}
        <div className="mt-6 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-left">
          <div className="flex items-center gap-3">
            <LevelBadge level={frame.level} size="profile" />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2 text-sm font-black text-sky-950">
                <span>Nível {frame.level}</span>
                <span>{Math.round(frame.percent)}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="Evolução no nível"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(frame.percent)}
                className="mt-2 h-4 overflow-hidden rounded-full bg-white"
              >
                <div
                  className={`reward-progress ${resetting ? "reward-progress--reset" : ""}`}
                  style={{ width: `${frame.percent}%` }}
                />
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs font-semibold text-sky-800">
            {reward.next.xp} XP no total
            {reward.next.nivelMaximo ? " · Nível máximo alcançado!" : " · Continue explorando!"}
          </p>
        </div>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-sky-700 px-6 py-3 font-bold text-white hover:bg-sky-800"
        >
          Continuar
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </dialog>,
    document.body,
  );
}
