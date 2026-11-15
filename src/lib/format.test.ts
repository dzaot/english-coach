import { describe, expect, it } from "vitest";
import { daysLabel, formatClock, formatDay, weekdayInitial } from "./format";

describe("format helpers", () => {
  it("formats a timer", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(65.9)).toBe("1:05");
    expect(formatClock(-3)).toBe("0:00");
  });

  it("gives Spanish weekday initials", () => {
    expect(weekdayInitial("2026-11-15")).toBe("D");
    expect(weekdayInitial("2026-11-16")).toBe("L");
  });

  it("pluralizes days", () => {
    expect(daysLabel(1)).toBe("1 día");
    expect(daysLabel(4)).toBe("4 días");
  });

  it("formats a date in Spanish", () => {
    expect(formatDay("2026-11-15T18:00:00Z")).toMatch(/nov/);
  });
});
