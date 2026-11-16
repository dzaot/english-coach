import { z } from "zod";
import type { ChatMessage } from "./conversation";
import { extractJsonObject } from "./json";
import type { Level } from "./levels";
import { cleanDashes } from "./text";

/**
 * Live check of one spoken answer: the mistakes in what the person actually said (grammar, wrong words,
 * phrasing that does not sound natural, words the recognizer likely heard wrong) and other ways to say it.
 * It reads the word-for-word transcript; it does not measure accent sound by sound.
 */

export const ISSUE_KINDS = ["grammar", "word", "natural", "sound"] as const;
export type IssueKind = (typeof ISSUE_KINDS)[number];

export interface TurnIssue {
  /** Exact words from the person's answer. */
  readonly said: string;
  readonly better: string;
  readonly kind: IssueKind;
  readonly why: string;
}

export interface Alternative {
  readonly label: string;
  readonly text: string;
}

export interface TurnCheck {
  readonly issues: readonly TurnIssue[];
  readonly alternatives: readonly Alternative[];
}

export const MAX_ISSUES = 4;
export const MAX_ALTERNATIVES = 2;
export const TURN_CHECK_MARK = "TURN_CHECK_JSON";

const RawSchema = z.object({
  issues: z
    .array(
      z.object({
        said: z.string().min(1).max(120),
        better: z.string().min(1).max(160),
        kind: z.string(),
        why: z.string().max(200).default(""),
      }),
    )
    .default([]),
  alternatives: z.array(z.object({ label: z.string().min(1).max(40), text: z.string().min(1).max(400) })).default([]),
});

/** Red marks (real mistakes) first, then yellow ones (sounds less natural). */
export function isMistake(kind: IssueKind): boolean {
  return kind === "grammar" || kind === "word";
}

function spec(level: Level): string {
  const why = level.explanationLanguage === "Spanish" ? "in neutral Latin American Spanish, speaking as tú" : "in simple English";
  const second = level.id === "beginner" ? "Simpler" : "More confident";
  return `${TURN_CHECK_MARK}. The USER line is a word-for-word speech-to-text transcript of a Spanish speaker practicing work English, so its mistakes are real.
Return ONLY a JSON object, no prose:
{"issues": [{"said": "1 to 6 words copied exactly from the USER line", "better": "what a native US professional would say instead", "kind": "grammar | word | natural | sound", "why": "one short reason ${why}, max 14 words"}],
 "alternatives": [{"label": "Natural", "text": "the whole answer said naturally, max 30 words"}, {"label": "${second}", "text": "another way, max 30 words"}]}
kind: grammar = a grammar mistake; word = a wrong word or false friend; natural = correct but not how a native speaker says it; sound = a word that does not fit the conversation and was probably mispronounced (heard "sheep" where "ship" fits), with better = the word they likely meant.
Keep their meaning and their subject: fix how they said it, never what they said ("He don't like" becomes "He doesn't like").
At most ${MAX_ISSUES} issues, the most important first. Ignore capital letters, punctuation and a few fillers like um. If the line is already natural, return no issues but still give alternatives.
Never use the em dash character.`;
}

/** One worked example: small models copy it closely, so it shows keeping the speaker's subject and meaning. */
function example(level: Level): ChatMessage[] {
  const spanish = level.explanationLanguage === "Spanish";
  const answer = {
    issues: [
      { said: "He don't like", better: "He doesn't like", kind: "grammar", why: spanish ? "Con he, she o it se usa doesn't." : "Use doesn't with he, she and it." },
      { said: "since two years", better: "for two years", kind: "word", why: spanish ? "Para una duración se usa for." : "Use for with a length of time." },
    ],
    alternatives: [
      { label: "Natural", text: "My manager doesn't like long meetings. We've worked together for two years." },
      { label: level.id === "beginner" ? "Simpler" : "More confident", text: level.id === "beginner" ? "My boss doesn't like long meetings. We work together for two years now." : "My manager prefers short meetings, and we've worked together for two years." },
    ],
  };
  return [
    { role: "user", content: "COUNTERPART: How is your team doing?\nUSER: He don't like the long meetings, we work together since two years." },
    { role: "assistant", content: JSON.stringify(answer) },
  ];
}

/** Messages for the live check of the user's last answer (fast tier). */
export function turnCheckMessages(level: Level, counterpartLine: string, userLine: string): ChatMessage[] {
  return [
    { role: "system", content: `You are a precise, friendly English coach. ${spec(level)}` },
    ...example(level),
    { role: "user", content: `COUNTERPART: ${counterpartLine}\nUSER: ${userLine}` },
  ];
}

const norm = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'");
const isKind = (k: string): k is IssueKind => (ISSUE_KINDS as readonly string[]).includes(k);

/** Parses the model's answer. Drops issues that do not quote the user's words. Null when nothing usable came back. */
export function parseTurnCheck(raw: string, userLine: string): TurnCheck | null {
  const parsed = RawSchema.safeParse(extractJsonObject(raw));
  if (!parsed.success) return null;
  const line = norm(userLine);
  const seen = new Set<string>();
  const issues = parsed.data.issues
    .map((i) => ({ ...i, said: i.said.trim(), better: cleanDashes(i.better.trim()), why: cleanDashes(i.why.trim()), kind: i.kind.trim().toLowerCase() }))
    .filter((i): i is TurnIssue => isKind(i.kind) && line.includes(norm(i.said)) && norm(i.said) !== norm(i.better))
    .filter((i) => !seen.has(norm(i.said)) && seen.add(norm(i.said)))
    .slice(0, MAX_ISSUES);
  const alternatives = parsed.data.alternatives
    .map((a) => ({ label: cleanDashes(a.label.trim()), text: cleanDashes(a.text.trim()) }))
    .slice(0, MAX_ALTERNATIVES);
  return { issues, alternatives };
}

export interface Segment {
  readonly text: string;
  /** Index into the issues list when this part of the answer was flagged. */
  readonly issue: number | null;
}

/** Splits the answer into plain parts and flagged parts, in order, without overlaps. */
export function markSegments(text: string, issues: readonly TurnIssue[]): Segment[] {
  const lower = norm(text);
  const spans = issues
    .map((issue, index) => ({ index, start: lower.indexOf(norm(issue.said)), length: issue.said.length }))
    .filter((s) => s.start >= 0)
    .sort((a, b) => a.start - b.start)
    .reduce<{ index: number; start: number; length: number }[]>((acc, s) => {
      const last = acc[acc.length - 1];
      return last && s.start < last.start + last.length ? acc : [...acc, s];
    }, []);
  const out: Segment[] = [];
  let at = 0;
  for (const s of spans) {
    if (s.start > at) out.push({ text: text.slice(at, s.start), issue: null });
    out.push({ text: text.slice(s.start, s.start + s.length), issue: s.index });
    at = s.start + s.length;
  }
  if (at < text.length) out.push({ text: text.slice(at), issue: null });
  return out;
}
