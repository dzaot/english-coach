import { describe, expect, it } from "vitest";
import { daysLabel, formatClock, formatDay, weekdayInitial, weekdayName } from "./format";

describe("format helpers", () => {
  it("formats a timer", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(65.9)).toBe("1:05");
    expect(formatClock(-3)).toBe("0:00");
  });

  it("gives weekday initials", () => {
    expect(weekdayInitial("2026-11-15")).toBe("S");
    expect(weekdayInitial("2026-11-16")).toBe("M");
  });

  it("names the weekday for screen readers", () => {
    expect(weekdayName("2026-11-15")).toBe("Sunday 15");
  });

  it("pluralizes days", () => {
    expect(daysLabel(1)).toBe("1 day");
    expect(daysLabel(4)).toBe("4 days");
  });

  it("formats a date", () => {
    expect(formatDay("2026-11-15T18:00:00Z")).toMatch(/Nov/);
  });
});
