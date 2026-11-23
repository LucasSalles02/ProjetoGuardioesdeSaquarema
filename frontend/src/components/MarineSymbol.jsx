const symbols = {
  Oceano: { drawing: "🐙", label: "Polvo", color: "#f3e8ff" },
  Reciclagem: { drawing: "🦀", label: "Caranguejo", color: "#ffe4e6" },
  Lagoa: { drawing: "🐟", label: "Peixe", color: "#dbeafe" },
  Tartaruga: { drawing: "🐢", label: "Tartaruga marinha", color: "#dcfce7" },
  Energia: { drawing: "⭐", label: "Estrela-do-mar", color: "#fef3c7" },
  Coleta: { drawing: "🐚", label: "Concha", color: "#ffedd5" },
};

export const marineSymbols = Object.values(symbols);
export function marineSymbol(symbol) {
  return symbols[symbol] || { drawing: "🪸", label: "Coral", color: "#ccfbf1" };
}

export default function MarineSymbol({ symbol, className = "" }) {
  const item = marineSymbol(symbol);
  return (
    <span role="img" aria-label={item.label} className={`marine-drawing ${className}`}>
      {item.drawing}
    </span>
  );
}
