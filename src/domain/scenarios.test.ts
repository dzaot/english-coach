import { describe, expect, it } from "vitest";
import {
  INDUSTRIES,
  SCENARIOS,
  buildOpener,
  getIndustry,
  getScenario,
  isIndustryId,
  isScenarioId,
} from "./scenarios";

describe("scenarios catalog", () => {
  it("offers the five work scenarios in a stable order", () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual([
      "job_interview",
      "team_meeting",
      "client_call",
      "presentation",
      "salary_negotiation",
    ]);
  });

  it("offers a general preset plus five industries", () => {
    expect(INDUSTRIES.map((i) => i.id)).toEqual([
      "general",
      "sales",
      "customer_support",
      "healthcare_admin",
      "construction",
      "tech",
    ]);
  });

  it("gives every scenario Spanish copy and an English counterpart", () => {
    for (const s of SCENARIOS) {
      expect(s.titleEs.length).toBeGreaterThan(3);
      expect(s.descriptionEs.length).toBeGreaterThan(10);
      expect(s.counterpart.name.length).toBeGreaterThan(1);
      expect(s.counterpart.roleEn.length).toBeGreaterThan(3);
    }
  });

  it("validates ids at the boundary", () => {
    expect(isScenarioId("job_interview")).toBe(true);
    expect(isScenarioId("karaoke")).toBe(false);
    expect(isScenarioId(42)).toBe(false);
    expect(isIndustryId("tech")).toBe(true);
    expect(isIndustryId("")).toBe(false);
  });

  it("finds a scenario and an industry by id", () => {
    expect(getScenario("client_call").counterpart.name).toBe("Michael");
    expect(getIndustry("sales").roleEn).toBe("sales representative");
  });

  it("throws on an unknown id", () => {
    expect(() => getScenario("nope" as never)).toThrow(/scenario/);
    expect(() => getIndustry("nope" as never)).toThrow(/industry/);
  });
});

describe("buildOpener", () => {
  it("opens a job interview for the chosen industry role", () => {
    const text = buildOpener(getScenario("job_interview"), getIndustry("healthcare_admin"));
    expect(text).toContain("medical office administrator");
    expect(text).toMatch(/tell me a little about yourself/i);
  });

  it("uses a neutral role for the general preset", () => {
    const text = buildOpener(getScenario("job_interview"), getIndustry("general"));
    expect(text).toContain("this position");
  });

  it("returns a non-empty English line for every scenario", () => {
    for (const s of SCENARIOS) {
      expect(buildOpener(s, getIndustry("tech")).length).toBeGreaterThan(20);
    }
  });
});
