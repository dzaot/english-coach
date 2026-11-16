import { z } from "zod";
import type { ChatMessage, Turn } from "./conversation";
import type { Level } from "./levels";
import { extractJsonObject } from "./json";
import { contextBlock } from "./prompts";
import type { Industry, Scenario } from "./scenarios";
import { cleanDashes } from "./text";

/** "What do I say?": explain the counterpart's last line and suggest a short answer the user can read out loud. */

export const HelpSchema = z.object({
  translation: z.string().min(1).max(600),
  suggestion: z.string().min(1).max(400),
  tip: z.string().min(1).max(300),
});
export type Help = z.infer<typeof HelpSchema>;

export class HelpParseError extends Error {
  constructor() {
    super("Invalid help JSON");
    this.name = "HelpParseError";
  }
}

function helpSpec(level: Level): string {
  const translation =
    level.helpTranslation === "Spanish"
      ? "the COUNTERPART's last message translated to neutral Latin American Spanish"
      : "the COUNTERPART's last message rephrased in simpler English, max 25 words";
  const tip = level.explanationLanguage === "Spanish" ? "in Spanish, speaking to the user as tú" : "in simple English";
  return `HELP_JSON. Return ONLY a JSON object, no prose:
{"translation": "${translation}",
 "suggestion": "one natural answer the user could say out loud, first person, max 30 words, ${level.id === "advanced" ? "confident professional" : "simple workplace"} English",
 "tip": "one short tip ${tip}, max 20 words"}
Never use the em dash character.`;
}

export function helpMessages(scenario: Scenario, industry: Industry, level: Level, turns: readonly Turn[], context?: string | null): ChatMessage[] {
  const recent = turns.slice(-6).map((t) => `${t.role === "user" ? "USER" : "COUNTERPART"}: ${t.text}`).join("\n");
  return [
    { role: "system", content: `You help a Spanish-speaking professional who is stuck in an English role-play. ${helpSpec(level)}` },
    {
      role: "user",
      content: `Role-play: ${scenario.title} with a ${scenario.counterpart.roleEn}. The user works as: ${industry.roleEn}. Level: ${level.label}.${context?.trim() ? `\n${contextBlock(context)}` : ""}\nRecent conversation:\n${recent}`,
    },
  ];
}

export function parseHelp(raw: string): Help {
  const parsed = HelpSchema.safeParse(extractJsonObject(raw));
  if (!parsed.success) throw new HelpParseError();
  return {
    translation: cleanDashes(parsed.data.translation),
    suggestion: cleanDashes(parsed.data.suggestion),
    tip: cleanDashes(parsed.data.tip),
  };
}
