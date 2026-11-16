import { z } from "zod";
import type { ChatMessage, Turn } from "./conversation";
import { extractJsonObject } from "./json";
import type { Industry, Scenario } from "./scenarios";
import { cleanDashes } from "./text";

/** "¿Qué digo?": translate the counterpart's last line and suggest a short answer the user can read out loud. */

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

const HELP_SPEC = `HELP_JSON. Return ONLY a JSON object, no prose:
{"translation": "the COUNTERPART's last message translated to neutral Latin American Spanish",
 "suggestion": "one natural answer the user could say out loud, first person, max 30 words, simple workplace English",
 "tip": "one short tip in Spanish, max 20 words, speaking to the user as tú"}
Never use the em dash character.`;

export function helpMessages(scenario: Scenario, industry: Industry, turns: readonly Turn[]): ChatMessage[] {
  const recent = turns.slice(-6).map((t) => `${t.role === "user" ? "USER" : "COUNTERPART"}: ${t.text}`).join("\n");
  return [
    { role: "system", content: `You help a Spanish-speaking professional who is stuck in an English role-play. ${HELP_SPEC}` },
    {
      role: "user",
      content: `Role-play: ${scenario.title} with a ${scenario.counterpart.roleEn}. The user works as: ${industry.roleEn}.\nRecent conversation:\n${recent}`,
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
