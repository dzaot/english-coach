import { describe, expect, it } from "vitest";
import { progress } from "@/test/fixtures";
import { localToday, replacePhrase } from "./progress";

describe("replacePhrase", () => {
  it("swaps the phrase immutably and recounts what is due and what is left", () => {
    const before = progress();
    const after = replacePhrase(before, { ...before.phrases[1], step: 1, dueDay: "2026-11-16" }, "2026-11-15");
    expect(after.dueToday).toBe(0);
    expect(after.toReview).toBe(1);
    expect(before.phrases[1].step).toBe(0);
    const learned = replacePhrase(after, { ...after.phrases[1], reviewedAt: "2026-11-15T12:00:00Z" }, "2026-11-15");
    expect(learned.toReview).toBe(0);
  });
});

describe("localToday", () => {
  it("returns the browser's calendar day", () => {
    expect(localToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
