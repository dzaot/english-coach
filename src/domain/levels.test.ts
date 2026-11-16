import { describe, expect, it } from "vitest";
import { LEVELS, getLevel, isLevelId, explanationLocale, translationLocale } from "./levels";

describe("levels", () => {
  it("offers beginner, intermediate and advanced", () => {
    expect(LEVELS.map((l) => l.id)).toEqual(["beginner", "intermediate", "advanced"]);
  });

  it("gives beginners support in their own language and advanced learners English only", () => {
    expect(explanationLocale(getLevel("beginner"), "fr")).toBe("fr");
    expect(translationLocale(getLevel("beginner"), "fr")).toBe("fr");
    expect(explanationLocale(getLevel("intermediate"), "pt")).toBe("en");
    expect(translationLocale(getLevel("intermediate"), "pt")).toBe("pt");
    expect(explanationLocale(getLevel("advanced"), "es")).toBe("en");
    expect(translationLocale(getLevel("advanced"), "es")).toBe("en");
  });

  it("slows the voice down for beginners", () => {
    expect(getLevel("beginner").playbackRate).toBeLessThan(1);
    expect(getLevel("advanced").playbackRate).toBe(1);
  });

  it("validates ids", () => {
    expect(isLevelId("advanced")).toBe(true);
    expect(isLevelId("expert")).toBe(false);
    expect(() => getLevel("expert" as never)).toThrow(/level/);
  });
});
