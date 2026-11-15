/** Daily streak math on calendar days ("YYYY-MM-DD") in the user's time zone. Pure functions. */

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

export interface Streak {
  readonly current: number;
  readonly best: number;
  readonly practicedToday: boolean;
}

/** `offsetMinutes` is what `Date#getTimezoneOffset()` returns in the browser (UTC minus local). */
export function localDay(instant: Date, offsetMinutes: number): string {
  return new Date(instant.getTime() - offsetMinutes * MS_PER_MINUTE).toISOString().slice(0, 10);
}

export function addDays(day: string, delta: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + delta * MS_PER_DAY).toISOString().slice(0, 10);
}

function longestRun(sortedDays: readonly string[]): number {
  return sortedDays.reduce(
    (acc, day, i) => {
      const run = i > 0 && addDays(sortedDays[i - 1], 1) === day ? acc.run + 1 : 1;
      return { run, best: Math.max(acc.best, run) };
    },
    { run: 0, best: 0 },
  ).best;
}

export function computeStreak(days: readonly string[], today: string): Streak {
  const unique = [...new Set(days)].sort();
  const set = new Set(unique);
  const practicedToday = set.has(today);
  let cursor = practicedToday ? today : addDays(today, -1);
  let current = 0;
  while (set.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  return { current, best: longestRun(unique), practicedToday };
}
