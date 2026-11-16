import { isDue } from "@/domain/drill";
import { localDay } from "@/domain/streak";
import type { Phrase, Progress } from "./types";

export function localToday(): string {
  const now = new Date();
  return localDay(now, now.getTimezoneOffset());
}

/** Progress with one phrase replaced, and its counters recomputed. */
export function replacePhrase(p: Progress, phrase: Phrase, today: string = localToday()): Progress {
  const phrases = p.phrases.map((x) => (x.id === phrase.id ? phrase : x));
  return {
    ...p,
    phrases,
    toReview: phrases.filter((x) => !x.reviewedAt).length,
    dueToday: phrases.filter((x) => isDue(x, today)).length,
  };
}
