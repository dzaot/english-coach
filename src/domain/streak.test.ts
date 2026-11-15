import { describe, expect, it } from "vitest";
import { addDays, computeStreak, localDay } from "./streak";

describe("localDay", () => {
  it("converts a UTC instant to the user's calendar day", () => {
    // 2026-11-15 03:00 UTC is still Nov 14 in Vancouver (UTC-8, offset 480)
    expect(localDay(new Date("2026-11-15T03:00:00Z"), 480)).toBe("2026-11-14");
    expect(localDay(new Date("2026-11-15T03:00:00Z"), 0)).toBe("2026-11-15");
    // Madrid is ahead of UTC: offset -60
    expect(localDay(new Date("2026-11-14T23:30:00Z"), -60)).toBe("2026-11-15");
  });
});

describe("addDays", () => {
  it("moves across month boundaries", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-01", -1)).toBe("2026-11-30");
  });
});

describe("computeStreak", () => {
  it("is zero with no practice", () => {
    expect(computeStreak([], "2026-11-15")).toEqual({ current: 0, best: 0, practicedToday: false });
  });

  it("counts consecutive days ending today", () => {
    const days = ["2026-11-13", "2026-11-14", "2026-11-15", "2026-11-15"];
    expect(computeStreak(days, "2026-11-15")).toEqual({ current: 3, best: 3, practicedToday: true });
  });

  it("keeps the streak alive until the end of today when yesterday was practiced", () => {
    expect(computeStreak(["2026-11-13", "2026-11-14"], "2026-11-15")).toEqual({
      current: 2,
      best: 2,
      practicedToday: false,
    });
  });

  it("breaks the streak after a missed day but remembers the best run", () => {
    const days = ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-12"];
    expect(computeStreak(days, "2026-11-15")).toEqual({ current: 0, best: 4, practicedToday: false });
  });

  it("does not mutate its input", () => {
    const days = Object.freeze(["2026-11-15", "2026-11-14"]);
    expect(() => computeStreak(days, "2026-11-15")).not.toThrow();
  });
});
