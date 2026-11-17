import { z } from "zod";
import { extractJsonObject } from "./json";
import { cleanDashes } from "./text";

/** Feedback the coach returns at the end of a session. Explanations in Spanish or English by level. */
export const FeedbackSchema = z.object({
  summary: z.string().min(1).max(600),
  wellDone: z.array(z.string().min(1).max(300)).min(1).max(5),
  betterPhrases: z
    .array(
      z.object({
        original: z.string().min(1).max(400),
        better: z.string().min(1).max(400),
        why: z.string().min(1).max(300),
      }),
    )
    .min(1)
    .max(6),
  vocabulary: z
    .array(z.object({ term: z.string().min(1).max(80), meaning: z.string().min(1).max(200) }))
    .max(8),
  score: z.number().finite(),
});

export type Feedback = z.infer<typeof FeedbackSchema> & {
  /** Points added by the app (not the coach) for using the phrase of the day. */
  readonly bonus?: { readonly phrase: string; readonly points: number };
};

export const MAX_BETTER_PHRASES = 3;

export class FeedbackParseError extends Error {
  constructor(detail: string) {
    super(`Invalid feedback: ${detail}`);
    this.name = "FeedbackParseError";
  }
}

function extractJson(raw: string): unknown {
  const json = extractJsonObject(raw);
  if (json === null) throw new FeedbackParseError("no valid JSON object found");
  return json;
}

/** Parses model output into feedback. Throws FeedbackParseError on anything unexpected. */
export function parseFeedback(raw: string): Feedback {
  const parsed = FeedbackSchema.safeParse(extractJson(raw));
  if (!parsed.success) throw new FeedbackParseError(parsed.error.issues[0]?.message ?? "wrong shape");
  const fb = parsed.data;
  return {
    summary: cleanDashes(fb.summary),
    wellDone: fb.wellDone.map(cleanDashes),
    betterPhrases: fb.betterPhrases
      .slice(0, MAX_BETTER_PHRASES)
      .map((p) => ({ original: p.original, better: cleanDashes(p.better), why: cleanDashes(p.why) })),
    vocabulary: fb.vocabulary.map((v) => ({ term: cleanDashes(v.term), meaning: cleanDashes(v.meaning) })),
    score: Math.min(100, Math.max(0, Math.round(fb.score))),
  };
}

export type ScoreTier = "excellent" | "great" | "getting" | "keep";

/** The score band, so the interface can name it in any language. */
export function scoreTier(score: number): ScoreTier {
  if (score >= 85) return "excellent";
  if (score >= 70) return "great";
  if (score >= 50) return "getting";
  return "keep";
}

export function scoreLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Great job";
  if (score >= 50) return "Getting there";
  return "Keep practicing";
}
