import type { Locale } from "./locales";

/** The learner's English level. It sets how the counterpart talks and how much support comes in the person's own language. */

export const LEVEL_IDS = ["beginner", "intermediate", "advanced"] as const;
export type LevelId = (typeof LEVEL_IDS)[number];

export interface Level {
  readonly id: LevelId;
  readonly label: string;
  readonly description: string;
  /** How the counterpart speaks, for the system prompt. */
  readonly counterpartStyle: string;
  /** Feedback explanations, tips and reasons in the person's own language (else English). */
  readonly explainInOwnLanguage: boolean;
  /** "Help me" translates the counterpart's line into the person's own language (else simpler English). */
  readonly translateToOwnLanguage: boolean;
  /** Playback speed of the counterpart's voice. */
  readonly playbackRate: number;
}

export const LEVELS: readonly Level[] = [
  {
    id: "beginner",
    label: "Beginner",
    description: "Simple English, slower voice, tips and translations in your language.",
    counterpartStyle: "Use very simple English (CEFR A2): short sentences, common words, one idea at a time. Be patient and warm.",
    explainInOwnLanguage: true,
    translateToOwnLanguage: true,
    playbackRate: 0.9,
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "Clear everyday English. Tips in English, translations in your language.",
    counterpartStyle: "Use clear, natural workplace English (CEFR B1 to B2). Avoid rare idioms.",
    explainInOwnLanguage: false,
    translateToOwnLanguage: true,
    playbackRate: 1,
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Natural speed and idioms. Everything in English.",
    counterpartStyle: "Speak like a native professional (CEFR C1): natural speed, common idioms, follow-up questions that push back a little.",
    explainInOwnLanguage: false,
    translateToOwnLanguage: false,
    playbackRate: 1,
  },
];

export function isLevelId(value: unknown): value is LevelId {
  return typeof value === "string" && (LEVEL_IDS as readonly string[]).includes(value);
}

export function getLevel(id: LevelId): Level {
  const found = LEVELS.find((l) => l.id === id);
  if (!found) throw new Error(`Unknown level: ${String(id)}`);
  return found;
}

/** The language explanations are written in, for this level and the person's language. */
export function explanationLocale(level: Level, locale: Locale): Locale {
  return level.explainInOwnLanguage ? locale : "en";
}

/** The language "Help me" translates into (English means "simpler English"). */
export function translationLocale(level: Level, locale: Locale): Locale {
  return level.translateToOwnLanguage ? locale : "en";
}
