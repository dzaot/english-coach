import { addDays } from "./streak";

/** "Dilo tú": say the better phrase out loud, compare it with what was heard, and schedule the next review. */

export const PASS_SCORE = 80;
/** Days until the next review after each successful say-it: 1, then 3, then 7, then learned. */
export const REVIEW_INTERVAL_DAYS = [1, 3, 7] as const;

const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

/** Lowercase words without punctuation; number words become digits so "forty" matches "40". */
export function toWords(text: string): string[] {
  const raw = text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/%/g, " percent")
    .replace(/[^a-z0-9'\s-]/g, " ")
    .replace(/-/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter(Boolean);
  return raw.reduce<string[]>((out, w, i) => {
    if (w in TENS && raw[i + 1] && raw[i + 1] in UNITS && UNITS[raw[i + 1]] < 10) return [...out, String(TENS[w] + UNITS[raw[i + 1]])];
    if (i > 0 && raw[i - 1] in TENS && w in UNITS && UNITS[w] < 10) return out;
    if (w in TENS) return [...out, String(TENS[w])];
    if (w in UNITS) return [...out, String(UNITS[w])];
    return [...out, w];
  }, []);
}

/** Longest common subsequence as a match flag per target word. */
function matchedFlags(target: readonly string[], said: readonly string[]): boolean[] {
  const dp = Array.from({ length: target.length + 1 }, () => new Array<number>(said.length + 1).fill(0));
  for (let i = target.length - 1; i >= 0; i--) {
    for (let j = said.length - 1; j >= 0; j--) {
      dp[i][j] = target[i] === said[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const flags = new Array<boolean>(target.length).fill(false);
  for (let i = 0, j = 0; i < target.length && j < said.length; ) {
    if (target[i] === said[j]) {
      flags[i] = true;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return flags;
}

export interface SayResult {
  readonly score: number;
  readonly passed: boolean;
  /** Target words that were not heard, in order (display form). */
  readonly missing: string[];
}

export function compareSaid(target: string, said: string): SayResult {
  const t = toWords(target);
  const flags = matchedFlags(t, toWords(said));
  const score = t.length === 0 ? 0 : Math.round((flags.filter(Boolean).length / t.length) * 100);
  return { score, passed: score >= PASS_SCORE, missing: t.filter((_, i) => !flags[i]) };
}

export interface Schedule {
  readonly step: number;
  readonly dueDay: string | null;
  readonly learned: boolean;
}

/** After a successful say-it on `today`. */
export function nextSchedule(current: { step: number }, today: string): Schedule {
  const step = current.step + 1;
  if (step > REVIEW_INTERVAL_DAYS.length) return { step, dueDay: null, learned: true };
  return { step, dueDay: addDays(today, REVIEW_INTERVAL_DAYS[step - 1]), learned: false };
}

export function isDue(phrase: { dueDay: string | null; reviewedAt: string | null }, today: string): boolean {
  return !phrase.reviewedAt && phrase.dueDay !== null && phrase.dueDay <= today;
}
