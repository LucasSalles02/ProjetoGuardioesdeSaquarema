import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

export default function AdminDialog({ title, description, icon: Icon, onClose, busy = false, dismissible = true, children }) {
  const dialog = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  return <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={event => { event.preventDefault(); if (!busy && dismissible) onClose(); }}
    className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm">
    <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4">
      <div className="flex items-start gap-3"><span className="rounded-xl bg-sky-50 p-2 text-sky-700"><Icon size={20} aria-hidden="true" /></span><div><h2 id={titleId} className="text-lg font-black">{title}</h2><p id={descriptionId} className="mt-1 text-sm text-slate-500">{description}</p></div></div>
      {dismissible && <button type="button" onClick={onClose} disabled={busy} aria-label="Fechar janela" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-sky-600 disabled:opacity-40"><X size={20} aria-hidden="true" /></button>}
    </header>
    {children}
  </dialog>;
}
