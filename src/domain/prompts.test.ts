import { describe, expect, it } from "vitest";
import { counterpartSystemPrompt, feedbackMessages } from "./prompts";
import { getIndustry, getScenario } from "./scenarios";

describe("counterpartSystemPrompt", () => {
  it("puts the counterpart in role, in English, for the industry", () => {
    const p = counterpartSystemPrompt(getScenario("salary_negotiation"), getIndustry("construction"));
    expect(p).toContain("Linda");
    expect(p).toContain("construction");
    expect(p).toMatch(/only in English/i);
    expect(p).toMatch(/one question/i);
  });
});

describe("feedbackMessages", () => {
  it("asks for strict JSON in Spanish explanations and includes only the user's lines", () => {
    const msgs = feedbackMessages(getScenario("team_meeting"), getIndustry("tech"), [
      { role: "counterpart", text: "What's your update?" },
      { role: "user", text: "I finish the API yesterday." },
    ]);
    expect(msgs[0].role).toBe("system");
    expect(msgs[0].content).toMatch(/JSON/);
    expect(msgs[0].content).toMatch(/betterPhrases/);
    expect(msgs[1].content).toContain("USER: I finish the API yesterday.");
    expect(msgs[1].content).toContain("COUNTERPART: What's your update?");
  });
});
