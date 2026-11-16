import { describe, expect, it } from "vitest";
import { HelpParseError, helpMessages, parseHelp } from "./help";
import { getIndustry, getScenario } from "./scenarios";

describe("helpMessages", () => {
  it("asks for the translation of the counterpart's last line and a short suggested answer", () => {
    const msgs = helpMessages(getScenario("job_interview"), getIndustry("sales"), [
      { role: "counterpart", text: "Tell me about yourself." },
    ]);
    expect(msgs[0].content).toMatch(/translation/);
    expect(msgs[0].content).toMatch(/suggestion/);
    expect(msgs[0].content).toMatch(/never use the em dash/i);
    expect(msgs[1].content).toContain("Tell me about yourself.");
    expect(msgs[1].content).toContain("sales representative");
  });
});

describe("parseHelp", () => {
  const ok = { translation: "Háblame de ti.", suggestion: "I'm a sales rep with five years of experience.", tip: "Empieza por tu rol actual — y un logro." };

  it("parses JSON, even inside a fence, and cleans dashes", () => {
    const help = parseHelp("```json\n" + JSON.stringify(ok) + "\n```");
    expect(help.suggestion).toBe(ok.suggestion);
    expect(help.tip).toBe("Empieza por tu rol actual, y un logro.");
  });

  it("rejects anything else", () => {
    expect(() => parseHelp("nope")).toThrow(HelpParseError);
    expect(() => parseHelp("{\"a\":")).toThrow(HelpParseError);
    expect(() => parseHelp(JSON.stringify({ translation: "x" }))).toThrow(HelpParseError);
  });
});
