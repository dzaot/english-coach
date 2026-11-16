/** Small display helpers (English). */

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));
}

const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

/** "2026-11-15" (a Sunday) -> "S". */
export function weekdayInitial(day: string): string {
  return WEEKDAY_INITIALS[new Date(`${day}T12:00:00Z`).getUTCDay()];
}

export function daysLabel(n: number): string {
  return n === 1 ? "1 day" : `${n} days`;
}

/** "2026-11-15" -> "Sunday 15". For screen readers. */
export function weekdayName(day: string): string {
  const date = new Date(`${day}T12:00:00Z`);
  return `${new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(date)} ${date.getUTCDate()}`;
}
