import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Loader2, RotateCcw, Waves } from "lucide-react";

export default function GameStage({ title, busy, onClose, onRestart, children }) {
  const dialog = useRef(null);
  const heading = useId();
  useEffect(() => {
    const element = dialog.current;
    const focus = document.activeElement;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (focus?.isConnected) focus.focus();
    };
  }, []);
  return createPortal(
    <dialog
      ref={dialog}
      aria-labelledby={heading}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className="ocean-game-stage"
    >
      <div className="ocean-bubbles" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <i key={index} style={{ "--bubble": index }} />
        ))}
      </div>
      <header className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-cyan-200 bg-white/90 px-4 py-3 sm:px-8">
        <button type="button" disabled={busy} onClick={onClose} className="game-stage-button">
          <ArrowLeft size={19} aria-hidden="true" />
          <span>Voltar aos jogos</span>
        </button>
        <h2
          id={heading}
          className="flex items-center gap-2 text-base font-black text-sky-950 sm:text-xl"
        >
          <Waves className="text-teal-600" size={25} aria-hidden="true" />
          {title}
        </h2>
        <button type="button" disabled={busy} onClick={onRestart} className="game-stage-button">
          {busy ? (
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          ) : (
            <RotateCcw size={18} aria-hidden="true" />
          )}
          Reiniciar
        </button>
      </header>
      <div className="game-stage-content relative z-10">{children}</div>
    </dialog>,
    document.body,
  );
}
