import { describe, expect, it } from "vitest";
import { PASS_SCORE, REVIEW_INTERVAL_DAYS, compareSaid, isDue, nextSchedule } from "./drill";

describe("compareSaid", () => {
  it("passes when the person said the phrase, ignoring case, punctuation and numbers as digits", () => {
    const r = compareSaid("I cut processing time by 40%.", "i cut processing time by forty percent");
    expect(r.passed).toBe(true);
    expect(r.score).toBe(100);
    expect(r.missing).toEqual([]);
  });

  it("lists the words that were missing and fails below the pass score", () => {
    const r = compareSaid("I'm fully aligned with the team's goals", "I aligned with goals");
    expect(r.passed).toBe(false);
    expect(r.score).toBeLessThan(PASS_SCORE);
    expect(r.missing).toEqual(["i'm", "fully", "the", "team's"]);
  });

  it("tolerates one small slip in a long phrase", () => {
    const r = compareSaid("I have five years of experience in sales and I work well with people", "I have five years of experience in sales and I work well with the people");
    expect(r.passed).toBe(true);
  });

  it("fails on empty speech", () => {
    expect(compareSaid("Hello there", "").passed).toBe(false);
  });
});

describe("spaced review", () => {
  it("moves a phrase 1, 3 and 7 days ahead, then marks it learned", () => {
    expect(REVIEW_INTERVAL_DAYS).toEqual([1, 3, 7]);
    expect(nextSchedule({ step: 0 }, "2026-11-15")).toEqual({ step: 1, dueDay: "2026-11-16", learned: false });
    expect(nextSchedule({ step: 1 }, "2026-11-16")).toEqual({ step: 2, dueDay: "2026-11-19", learned: false });
    expect(nextSchedule({ step: 2 }, "2026-11-19")).toEqual({ step: 3, dueDay: "2026-11-26", learned: false });
    expect(nextSchedule({ step: 3 }, "2026-11-26")).toEqual({ step: 4, dueDay: null, learned: true });
  });

  it("knows what is due today", () => {
    expect(isDue({ dueDay: "2026-11-15", reviewedAt: null }, "2026-11-15")).toBe(true);
    expect(isDue({ dueDay: "2026-11-14", reviewedAt: null }, "2026-11-15")).toBe(true);
    expect(isDue({ dueDay: "2026-11-16", reviewedAt: null }, "2026-11-15")).toBe(false);
    expect(isDue({ dueDay: "2026-11-14", reviewedAt: "x" }, "2026-11-15")).toBe(false);
    expect(isDue({ dueDay: null, reviewedAt: null }, "2026-11-15")).toBe(false);
  });
});
