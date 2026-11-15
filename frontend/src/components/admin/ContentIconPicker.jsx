import { Check } from "lucide-react";
import { contentIcon, contentIcons } from "../../services/contentIcons";

export default function ContentIconPicker({ value, onChange, fallback: Fallback }) {
  const Selected = contentIcon(value, Fallback);
  const selectedLabel = contentIcons.find((item) => item.id === value)?.label || "Automático";
  return (
    <fieldset className="rounded-2xl border border-cyan-200 bg-cyan-50/50 p-4">
      <legend className="px-1 text-sm font-bold text-sky-950">Ícone do conteúdo</legend>
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200 bg-white text-cyan-800">
          <Selected size={28} aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-bold text-sky-900">{selectedLabel}</p>
          <p className="mt-1 text-xs text-slate-600">Escolha o ícone que aparecerá para o aluno.</p>
        </div>
      </div>
      <div
        className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto p-1 sm:grid-cols-4"
        role="group"
        aria-label="Banco de ícones"
      >
        {[{ id: null, label: "Automático", Icon: Fallback }, ...contentIcons].map(
          ({ id, label, Icon }) => (
            <button
              type="button"
              key={id || "auto"}
              aria-label={`Selecionar ícone ${label}`}
              aria-pressed={(value || null) === id}
              onClick={() => onChange(id)}
              className={`relative flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border p-2 text-[10px] font-semibold transition focus-visible:outline-sky-600 ${(value || null) === id ? "border-cyan-600 bg-cyan-100 text-cyan-950" : "border-cyan-100 bg-white text-slate-700 hover:border-cyan-400"}`}
            >
              <Icon size={24} aria-hidden="true" />
              <span>{label}</span>
              {(value || null) === id && (
                <Check className="absolute right-1 top-1" size={12} aria-hidden="true" />
              )}
            </button>
          ),
        )}
      </div>
    </fieldset>
  );
}
