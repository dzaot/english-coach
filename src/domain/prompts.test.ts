import { describe, expect, it } from "vitest";
import { getAvatar } from "./avatars";
import { getLevel } from "./levels";
import { counterpartSystemPrompt, feedbackMessages } from "./prompts";
import { getIndustry, getScenario } from "./scenarios";

describe("counterpartSystemPrompt", () => {
  it("puts the chosen avatar in role, in English, for the industry and level", () => {
    const p = counterpartSystemPrompt(getScenario("salary_negotiation"), getIndustry("construction"), getAvatar("mike"), getLevel("beginner"));
    expect(p).toContain("You are Mike, a HR manager");
    expect(p).toContain("construction");
    expect(p).toMatch(/only in English/i);
    expect(p).toMatch(/one question/i);
    expect(p).toMatch(/A2/);
    expect(p).toMatch(/never use the em dash/i);
    expect(counterpartSystemPrompt(getScenario("team_meeting"), getIndustry("general"), getAvatar("sarah"), getLevel("advanced"))).toMatch(/C1/);
  });
});

describe("feedbackMessages", () => {
  const turns = [
    { role: "counterpart" as const, text: "What's your update?" },
    { role: "user" as const, text: "I finish the API yesterday." },
  ];

  it("asks for strict JSON and includes the transcript", () => {
    const msgs = feedbackMessages(getScenario("team_meeting"), getIndustry("tech"), getLevel("intermediate"), turns);
    expect(msgs[0].role).toBe("system");
    expect(msgs[0].content).toMatch(/betterPhrases/);
    expect(msgs[0].content).toMatch(/simple, friendly English/);
    expect(msgs[0].content).toMatch(/never use the em dash/i);
    expect(msgs[1].content).toContain("USER: I finish the API yesterday.");
    expect(msgs[1].content).toContain("COUNTERPART: What's your update?");
  });

  it("explains in Spanish for beginners", () => {
    const msgs = feedbackMessages(getScenario("team_meeting"), getIndustry("tech"), getLevel("beginner"), turns);
    expect(msgs[0].content).toMatch(/Latin American Spanish/);
    expect(msgs[0].content).toMatch(/"tú"/);
  });
});
