import { z } from "zod";
import type { ChatMessage, Turn } from "./conversation";
import { extractJsonObject } from "./json";
import type { Industry, Scenario } from "./scenarios";
import { cleanDashes } from "./text";

/** "¿Qué digo?": translate the counterpart's last line and suggest a short answer the user can read out loud. */

export const HelpSchema = z.object({
  translationEs: z.string().min(1).max(600),
  suggestionEn: z.string().min(1).max(400),
  tipEs: z.string().min(1).max(300),
});
export type Help = z.infer<typeof HelpSchema>;

export class HelpParseError extends Error {
  constructor() {
    super("Invalid help JSON");
    this.name = "HelpParseError";
  }
}

const HELP_SPEC = `HELP_JSON. Return ONLY a JSON object, no prose:
{"translationEs": "the COUNTERPART's last message translated to neutral Latin American Spanish",
 "suggestionEn": "one natural answer the user could say out loud, first person, max 30 words, simple workplace English",
 "tipEs": "one short tip in Spanish, max 20 words, speaking to the user as tú"}
Never use the em dash character.`;

export function helpMessages(scenario: Scenario, industry: Industry, turns: readonly Turn[]): ChatMessage[] {
  const recent = turns.slice(-6).map((t) => `${t.role === "user" ? "USER" : "COUNTERPART"}: ${t.text}`).join("\n");
  return [
    { role: "system", content: `You help a Spanish-speaking professional who is stuck in an English role-play. ${HELP_SPEC}` },
    {
      role: "user",
      content: `Role-play: ${scenario.titleEs} with a ${scenario.counterpart.roleEn}. The user works as: ${industry.roleEn}.\nRecent conversation:\n${recent}`,
    },
  ];
}

export function parseHelp(raw: string): Help {
  const parsed = HelpSchema.safeParse(extractJsonObject(raw));
  if (!parsed.success) throw new HelpParseError();
  return {
    translationEs: cleanDashes(parsed.data.translationEs),
    suggestionEn: cleanDashes(parsed.data.suggestionEn),
    tipEs: cleanDashes(parsed.data.tipEs),
  };
}
