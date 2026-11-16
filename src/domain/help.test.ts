import { describe, expect, it } from "vitest";
import { HelpParseError, helpMessages, parseHelp } from "./help";
import { getLevel } from "./levels";
import { getIndustry, getScenario } from "./scenarios";

describe("helpMessages", () => {
  it("translates to Spanish below advanced, and rephrases in English for advanced", () => {
    const turns = [{ role: "counterpart" as const, text: "Tell me about yourself." }];
    expect(helpMessages(getScenario("job_interview"), getIndustry("sales"), getLevel("beginner"), turns)[0].content).toMatch(/Spanish, speaking to the user as tú/);
    const advanced = helpMessages(getScenario("job_interview"), getIndustry("sales"), getLevel("advanced"), turns)[0].content;
    expect(advanced).toMatch(/simpler English/);
    expect(advanced).not.toMatch(/translated to neutral Latin American Spanish/);
  });

  it("asks for the translation of the counterpart's last line and a short suggested answer", () => {
    const msgs = helpMessages(getScenario("job_interview"), getIndustry("sales"), getLevel("intermediate"), [
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
