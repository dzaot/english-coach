/** Small display helpers (Spanish). */

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("es", { weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));
}

const WEEKDAY_INITIALS = ["D", "L", "M", "M", "J", "V", "S"];

/** "2026-11-15" (a Sunday) -> "D". */
export function weekdayInitial(day: string): string {
  return WEEKDAY_INITIALS[new Date(`${day}T12:00:00Z`).getUTCDay()];
}

export function daysLabel(n: number): string {
  return n === 1 ? "1 día" : `${n} días`;
}

/** "2026-11-15" -> "domingo 15". For screen readers. */
export function weekdayName(day: string): string {
  return new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
}
