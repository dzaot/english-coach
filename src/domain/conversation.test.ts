import { describe, expect, it } from "vitest";
import {
  MAX_USER_TURNS,
  appendTurn,
  canFinish,
  countUserTurns,
  isTurnLimitReached,
  toChatMessages,
  validateUserText,
  type Turn,
} from "./conversation";

const opener: Turn = { role: "counterpart", text: "Tell me about yourself." };

describe("conversation rules", () => {
  it("counts only user turns", () => {
    const turns: Turn[] = [opener, { role: "user", text: "Hi" }, { role: "counterpart", text: "Ok" }];
    expect(countUserTurns(turns)).toBe(1);
  });

  it("allows feedback after two answers", () => {
    expect(canFinish([opener, { role: "user", text: "a" }])).toBe(false);
    expect(canFinish([opener, { role: "user", text: "a" }, opener, { role: "user", text: "b" }])).toBe(true);
  });

  it("stops at the turn limit", () => {
    const many: Turn[] = Array.from({ length: MAX_USER_TURNS }, () => ({ role: "user", text: "x" }) as Turn);
    expect(isTurnLimitReached(many)).toBe(true);
    expect(isTurnLimitReached([opener])).toBe(false);
  });

  it("appends without mutating", () => {
    const before: readonly Turn[] = Object.freeze([opener]);
    const after = appendTurn(before, { role: "user", text: "Hello" });
    expect(before).toHaveLength(1);
    expect(after).toHaveLength(2);
  });

  it("maps turns to chat messages after the system prompt", () => {
    const msgs = toChatMessages("SYS", [opener, { role: "user", text: "Hi" }]);
    expect(msgs).toEqual([
      { role: "system", content: "SYS" },
      { role: "assistant", content: "Tell me about yourself." },
      { role: "user", content: "Hi" },
    ]);
  });
});

describe("validateUserText", () => {
  it("trims and collapses whitespace", () => {
    expect(validateUserText("  I   worked  in sales \n")).toEqual({ ok: true, text: "I worked in sales" });
  });

  it("rejects empty text", () => {
    expect(validateUserText("   ")).toEqual({ ok: false, reason: "empty" });
  });

  it("rejects text that is too long", () => {
    expect(validateUserText("a".repeat(1201))).toEqual({ ok: false, reason: "too_long" });
  });
});
