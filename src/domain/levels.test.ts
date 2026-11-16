import { describe, expect, it } from "vitest";
import { LEVELS, getLevel, isLevelId } from "./levels";

describe("levels", () => {
  it("offers beginner, intermediate and advanced", () => {
    expect(LEVELS.map((l) => l.id)).toEqual(["beginner", "intermediate", "advanced"]);
  });

  it("gives beginners Spanish support and advanced learners English only", () => {
    expect(getLevel("beginner").explanationLanguage).toBe("Spanish");
    expect(getLevel("beginner").helpTranslation).toBe("Spanish");
    expect(getLevel("intermediate").explanationLanguage).toBe("English");
    expect(getLevel("intermediate").helpTranslation).toBe("Spanish");
    expect(getLevel("advanced").explanationLanguage).toBe("English");
    expect(getLevel("advanced").helpTranslation).toBe("English");
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
