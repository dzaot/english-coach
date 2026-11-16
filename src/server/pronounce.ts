import { dictionary } from "cmu-pronouncing-dictionary";
import { z } from "zod";
import { guideText, type WordGuide } from "@/domain/sounds";
import { AppError } from "./errors";

/** The sound coach: General American pronunciation hints for a sentence. No AI call, so it costs nothing. */

const MAX_TEXT_CHARS = 400;
const PronounceSchema = z.object({ text: z.string().trim().min(1).max(MAX_TEXT_CHARS) });

const lookup = (word: string): string | null => (Object.hasOwn(dictionary, word) ? dictionary[word] : null);

export function pronounceGuide(input: unknown): { words: WordGuide[] } {
  const parsed = PronounceSchema.safeParse(input);
  if (!parsed.success) throw new AppError("invalid_input");
  return { words: guideText(parsed.data.text, lookup) };
}
