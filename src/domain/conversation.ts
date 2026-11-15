/** Turn-based conversation rules. Immutable helpers only. */

export type TurnRole = "counterpart" | "user";
export interface Turn {
  readonly role: TurnRole;
  readonly text: string;
}
export interface ChatMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

/** About 5 to 10 minutes of speaking. */
export const MAX_USER_TURNS = 12;
export const MIN_USER_TURNS_FOR_FEEDBACK = 2;
export const MAX_USER_TEXT_CHARS = 1200;

export function countUserTurns(turns: readonly Turn[]): number {
  return turns.filter((t) => t.role === "user").length;
}

export function canFinish(turns: readonly Turn[]): boolean {
  return countUserTurns(turns) >= MIN_USER_TURNS_FOR_FEEDBACK;
}

export function isTurnLimitReached(turns: readonly Turn[]): boolean {
  return countUserTurns(turns) >= MAX_USER_TURNS;
}

export function appendTurn(turns: readonly Turn[], turn: Turn): readonly Turn[] {
  return [...turns, turn];
}

export function toChatMessages(system: string, turns: readonly Turn[]): ChatMessage[] {
  return [
    { role: "system", content: system },
    ...turns.map((t) => ({ role: t.role === "user" ? ("user" as const) : ("assistant" as const), content: t.text })),
  ];
}

export type TextCheck = { ok: true; text: string } | { ok: false; reason: "empty" | "too_long" };

export function validateUserText(input: string): TextCheck {
  const text = input.replace(/\s+/g, " ").trim();
  if (text.length === 0) return { ok: false, reason: "empty" };
  if (text.length > MAX_USER_TEXT_CHARS) return { ok: false, reason: "too_long" };
  return { ok: true, text };
}
