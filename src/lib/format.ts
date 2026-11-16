/** Small display helpers. Dates follow the interface language. */

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function formatDay(iso: string, locale = "en"): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));
}

/** "2026-11-15" (a Sunday) -> "S" in English, "D" in Spanish. */
export function weekdayInitial(day: string, locale = "en"): string {
  return new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
}

export function daysLabel(n: number): string {
  return n === 1 ? "1 day" : `${n} days`;
}

/** "2026-11-15" -> "Sunday 15". For screen readers. */
export function weekdayName(day: string, locale = "en"): string {
  const date = new Date(`${day}T12:00:00Z`);
  return `${new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(date)} ${date.getUTCDate()}`;
}
