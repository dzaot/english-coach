import { z } from "zod";

/** Feedback the coach returns at the end of a session. Explanations in Spanish, phrases in English. */
export const FeedbackSchema = z.object({
  summaryEs: z.string().min(1).max(600),
  wellDone: z.array(z.string().min(1).max(300)).min(1).max(5),
  betterPhrases: z
    .array(
      z.object({
        original: z.string().min(1).max(400),
        better: z.string().min(1).max(400),
        whyEs: z.string().min(1).max(300),
      }),
    )
    .min(1)
    .max(6),
  vocabulary: z
    .array(z.object({ term: z.string().min(1).max(80), meaningEs: z.string().min(1).max(200) }))
    .max(8),
  score: z.number().finite(),
});

export type Feedback = z.infer<typeof FeedbackSchema>;

export const MAX_BETTER_PHRASES = 3;

export class FeedbackParseError extends Error {
  constructor(detail: string) {
    super(`Invalid feedback: ${detail}`);
    this.name = "FeedbackParseError";
  }
}

function extractJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) throw new FeedbackParseError("no JSON object found");
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    throw new FeedbackParseError("malformed JSON");
  }
}

/** Parses model output into feedback. Throws FeedbackParseError on anything unexpected. */
export function parseFeedback(raw: string): Feedback {
  const parsed = FeedbackSchema.safeParse(extractJson(raw));
  if (!parsed.success) throw new FeedbackParseError(parsed.error.issues[0]?.message ?? "wrong shape");
  const fb = parsed.data;
  return {
    ...fb,
    betterPhrases: fb.betterPhrases.slice(0, MAX_BETTER_PHRASES),
    score: Math.min(100, Math.max(0, Math.round(fb.score))),
  };
}

export function scoreLabel(score: number): string {
  if (score >= 85) return "Excelente";
  if (score >= 70) return "Muy bien";
  if (score >= 50) return "Vas bien";
  return "Sigue practicando";
}
