import { toWords } from "./drill";

/**
 * Clarity: which words of a target sentence the speech recognizer understood. It measures being understood,
 * not accent: the recognizer often fixes small accent errors on its own, so "clear" does not mean "native".
 */

export type ClarityStatus = "clear" | "missed";

export interface WordCheck {
  readonly text: string;
  readonly status: ClarityStatus;
  /** The word heard in its place, if any. */
  readonly heardAs: string | null;
}

export interface TimedWord {
  readonly word: string;
  readonly start: number;
  readonly end: number;
}

export interface Pace {
  readonly wordsPerMinute: number;
  readonly longPauses: number;
}

/** A silence between words longer than this counts as a hesitation. */
export const LONG_PAUSE_SECONDS = 0.7;

/** Aligns target and heard words (longest common subsequence) and pairs leftover words as substitutions. */
export function checkClarity(target: string, heard: string): WordCheck[] {
  const tokens = target.split(/\s+/).filter(Boolean);
  // One display token can hold several words ("follow-up", "40%"); align the words, then group them back.
  const units = tokens.flatMap((token, owner) => toWords(token).map((word) => ({ word, owner })));
  const t = units.map((u) => u.word);
  const h = toWords(heard);
  const dp = Array.from({ length: t.length + 1 }, () => new Array<number>(h.length + 1).fill(0));
  for (let i = t.length - 1; i >= 0; i--) {
    for (let j = h.length - 1; j >= 0; j--) {
      dp[i][j] = t[i] === h[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const matched = new Array<boolean>(t.length).fill(false);
  const heardAs = new Array<string | null>(t.length).fill(null);
  let pendingTarget: number[] = [];
  let pendingHeard: string[] = [];
  const flush = () => {
    pendingTarget.forEach((ti, k) => {
      heardAs[ti] = pendingHeard[k] ?? null;
    });
    pendingTarget = [];
    pendingHeard = [];
  };
  for (let i = 0, j = 0; i < t.length; ) {
    if (j < h.length && t[i] === h[j]) {
      flush();
      matched[i] = true;
      i++;
      j++;
    } else if (j >= h.length || dp[i + 1][j] >= dp[i][j + 1]) {
      pendingTarget = [...pendingTarget, i];
      i++;
    } else {
      pendingHeard = [...pendingHeard, h[j]];
      j++;
    }
  }
  flush();
  return tokens.map((text, owner) => {
    const mine = units.flatMap((u, i) => (u.owner === owner ? [i] : []));
    const clear = mine.length > 0 && mine.every((i) => matched[i]);
    const heardWords = mine.map((i) => heardAs[i]).filter((w): w is string => w !== null);
    return { text, status: clear ? "clear" : "missed", heardAs: clear || heardWords.length === 0 ? null : heardWords.join(" ") };
  });
}

export function measurePace(words: readonly TimedWord[]): Pace | null {
  if (words.length < 2) return null;
  const seconds = words[words.length - 1].end - words[0].start;
  if (seconds <= 0) return null;
  const longPauses = words.slice(1).filter((w, k) => w.start - words[k].end > LONG_PAUSE_SECONDS).length;
  return { wordsPerMinute: Math.round((words.length / seconds) * 60), longPauses };
}

/** For each word of the sentence, when the learner said it (greedy, in order); null when it was not heard. */
export function mapTimings(target: string, timings: readonly TimedWord[]): (TimedWord | null)[] {
  let from = 0;
  return target
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const key = toWords(token)[0];
      const at = timings.findIndex((t, i) => i >= from && toWords(t.word)[0] === key);
      if (key === undefined || at === -1) return null;
      from = at + 1;
      return timings[at];
    });
}
