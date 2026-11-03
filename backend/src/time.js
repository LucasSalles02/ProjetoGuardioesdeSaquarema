const TIME_ZONE = "America/Sao_Paulo";
const DAY_MS = 24 * 60 * 60 * 1000;

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function nowISO(date = new Date()) {
  return date.toISOString();
}

export function todayKey(date = new Date()) {
  const parts = Object.fromEntries(
    dateFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function previousDayKey(dateKey = todayKey()) {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return todayKey(date);
}

export function weeklyKeys(date = new Date()) {
  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(date.getTime() - (6 - index) * DAY_MS);
    return {
      key: todayKey(current),
      label: current.toLocaleDateString("pt-BR", {
        weekday: "short",
        timeZone: TIME_ZONE,
      }).replace(".", ""),
    };
  });
}
