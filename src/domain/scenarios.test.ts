import { describe, expect, it } from "vitest";
import { getAvatar } from "./avatars";
import { INDUSTRIES, SCENARIOS, buildOpener, getIndustry, getScenario, isIndustryId, isScenarioId, withOwnField, MAX_INDUSTRY_OTHER, ownFieldOf } from "./scenarios";

describe("scenarios catalog", () => {
  it("offers the five work scenarios, then your own situation, in a stable order", () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual([
      "job_interview",
      "team_meeting",
      "client_call",
      "presentation",
      "salary_negotiation",
      "my_situation",
    ]);
  });

  it("offers a general preset, ten industries and a way to name your own", () => {
    expect(INDUSTRIES.map((i) => i.id)).toEqual([
      "general",
      "sales",
      "customer_support",
      "healthcare_admin",
      "construction",
      "tech",
      "hospitality",
      "finance",
      "education",
      "logistics",
      "marketing",
      "other",
    ]);
    // The person's own field joins what they told us, once, and is cut to a short name.
    expect(withOwnField("", "  Nursing  ")).toBe("My field of work: Nursing.");
    expect(withOwnField("Interview on Monday.", "Real   estate")).toBe("My field of work: Real estate.\nInterview on Monday.");
    expect(withOwnField("My field of work: Law.\nNotes", "Law")).toBe("My field of work: Law.\nNotes");
    expect(withOwnField("Notes", "   ")).toBe("Notes");
    expect(ownFieldOf("My field of work: Real estate.\nInterview on Monday.")).toBe("Real estate");
    expect(ownFieldOf("Interview on Monday.")).toBeNull();
    expect(ownFieldOf(null)).toBeNull();
    expect(withOwnField("", "x".repeat(200))).toHaveLength("My field of work: .".length + MAX_INDUSTRY_OTHER);
  });

  it("gives every scenario English copy and a counterpart role", () => {
    for (const s of SCENARIOS) {
      expect(s.title.length).toBeGreaterThan(3);
      expect(s.description.length).toBeGreaterThan(10);
      expect(s.counterpart.roleEn.length).toBeGreaterThan(3);
    }
    expect(getScenario("job_interview").title).toBe("Job interview");
    expect(INDUSTRIES.find((i) => i.id === "healthcare_admin")?.label).toBe("Healthcare admin");
  });

  it("validates ids at the boundary", () => {
    expect(isScenarioId("job_interview")).toBe(true);
    expect(isScenarioId("karaoke")).toBe(false);
    expect(isScenarioId(42)).toBe(false);
    expect(isIndustryId("tech")).toBe(true);
    expect(isIndustryId("")).toBe(false);
  });

  it("finds a scenario and an industry by id", () => {
    expect(getScenario("client_call").counterpart.roleEn).toBe("client");
    expect(getIndustry("sales").roleEn).toBe("sales representative");
  });

  it("throws on an unknown id", () => {
    expect(() => getScenario("nope" as never)).toThrow(/scenario/);
    expect(() => getIndustry("nope" as never)).toThrow(/industry/);
  });
});

describe("buildOpener", () => {
  it("opens a job interview for the chosen industry role", () => {
    const text = buildOpener(getScenario("job_interview"), getIndustry("healthcare_admin"), getAvatar("emily"));
    expect(text).toContain("medical office administrator");
    expect(text).toContain("I'm Emily");
    expect(text).toMatch(/tell me a little about yourself/i);
  });

  it("uses a neutral role for the general preset", () => {
    const text = buildOpener(getScenario("job_interview"), getIndustry("general"), getAvatar("sarah"));
    expect(text).toContain("this position");
  });

  it("returns a non-empty English line for every scenario", () => {
    for (const s of SCENARIOS) {
      expect(buildOpener(s, getIndustry("tech"), getAvatar("mike")).length).toBeGreaterThan(20);
    }
  });
});
