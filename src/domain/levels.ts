/** The learner's English level. It sets how the counterpart talks and how much Spanish support the app gives. */

export const LEVEL_IDS = ["beginner", "intermediate", "advanced"] as const;
export type LevelId = (typeof LEVEL_IDS)[number];

export interface Level {
  readonly id: LevelId;
  readonly label: string;
  readonly description: string;
  /** How the counterpart speaks, for the system prompt. */
  readonly counterpartStyle: string;
  /** Language of feedback explanations and help tips. */
  readonly explanationLanguage: "Spanish" | "English";
  /** What "What do I say?" translates the counterpart's line into. */
  readonly helpTranslation: "Spanish" | "English";
  /** Playback speed of the counterpart's voice. */
  readonly playbackRate: number;
}

export const LEVELS: readonly Level[] = [
  {
    id: "beginner",
    label: "Beginner",
    description: "Simple English, slower voice, tips and translations in Spanish.",
    counterpartStyle: "Use very simple English (CEFR A2): short sentences, common words, one idea at a time. Be patient and warm.",
    explanationLanguage: "Spanish",
    helpTranslation: "Spanish",
    playbackRate: 0.9,
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "Clear everyday English. Tips in English, translations in Spanish.",
    counterpartStyle: "Use clear, natural workplace English (CEFR B1 to B2). Avoid rare idioms.",
    explanationLanguage: "English",
    helpTranslation: "Spanish",
    playbackRate: 1,
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Natural speed and idioms. Everything in English.",
    counterpartStyle: "Speak like a native professional (CEFR C1): natural speed, common idioms, follow-up questions that push back a little.",
    explanationLanguage: "English",
    helpTranslation: "English",
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
