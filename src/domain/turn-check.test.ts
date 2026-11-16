import { describe, expect, it } from "vitest";
import { getLevel } from "./levels";
import { TURN_CHECK_MARK, isMistake, markSegments, parseTurnCheck, turnCheckMessages } from "./turn-check";

const LINE = "I am agree with the goals and I have work there since three years.";

describe("turnCheckMessages", () => {
  it("asks for Spanish reasons at the beginner level and quotes both lines", () => {
    const messages = turnCheckMessages(getLevel("beginner"), "Tell me about yourself.", LINE);
    const [system, , example] = messages;
    const user = messages[messages.length - 1];
    expect(example.role).toBe("assistant");
    expect(JSON.parse(example.content).issues[0].better).toBe("He doesn't like");
    expect(system.content).toContain(TURN_CHECK_MARK);
    expect(system.content).toContain("Spanish");
    expect(system.content).toContain('"Simpler"');
    expect(user.content).toBe(`COUNTERPART: Tell me about yourself.\nUSER: ${LINE}`);
  });

  it("asks for English reasons at the advanced level", () => {
    const [system] = turnCheckMessages(getLevel("advanced"), "Hi.", LINE);
    expect(system.content).toContain("in simple, friendly English");
    expect(system.content).toContain('"More confident"');
  });
});

describe("turnCheckMessages in other languages", () => {
  it("writes reasons and the example in the person's language", () => {
    const messages = turnCheckMessages(getLevel("beginner"), "Hi.", LINE, "pt");
    expect(messages[0].content).toContain("Brazilian Portuguese");
    expect(messages[0].content).toContain("a Portuguese speaker");
    expect(JSON.parse(messages[2].content).issues[0].why).toBe("Com he, she ou it se usa doesn't.");
  });
});

describe("parseTurnCheck", () => {
  it("keeps issues that quote the answer and drops the rest", () => {
    const raw = JSON.stringify({
      issues: [
        { said: "I am agree", better: "I agree", kind: "grammar", why: "Agree is already a verb." },
        { said: "since three years", better: "for three years", kind: "Word", why: "Use for with a length of time." },
        { said: "words I never said", better: "x", kind: "grammar", why: "" },
        { said: "have work", better: "have worked", kind: "spelling", why: "" },
        { said: "the goals", better: "the goals", kind: "natural", why: "" },
      ],
      alternatives: [
        { label: "Natural", text: "I agree with the goals, and I've worked there for three years." },
        { label: "More confident", text: "I share those goals. I've spent three years there." },
        { label: "Extra", text: "ignored" },
      ],
    });
    const check = parseTurnCheck(`Here you go: ${raw}`, LINE);
    expect(check?.issues.map((i) => [i.said, i.kind])).toEqual([
      ["I am agree", "grammar"],
      ["since three years", "word"],
    ]);
    expect(check?.alternatives).toHaveLength(2);
  });

  it("removes em dashes from what it shows", () => {
    const raw = JSON.stringify({ issues: [{ said: "I am agree", better: "I agree", kind: "grammar", why: "Short — clear" }], alternatives: [] });
    expect(parseTurnCheck(raw, LINE)?.issues[0].why).not.toContain("—");
  });

  it("returns null for text that is not JSON", () => {
    expect(parseTurnCheck("Sorry, I can't.", LINE)).toBeNull();
  });

  it("accepts an answer with no issues", () => {
    expect(parseTurnCheck('{"alternatives": []}', LINE)).toEqual({ issues: [], alternatives: [] });
  });
});

describe("isMistake", () => {
  it("treats grammar and word issues as mistakes, the others as suggestions", () => {
    expect(isMistake("grammar")).toBe(true);
    expect(isMistake("word")).toBe(true);
    expect(isMistake("natural")).toBe(false);
    expect(isMistake("sound")).toBe(false);
  });
});

describe("markSegments", () => {
  it("splits the answer around flagged words, in order and ignoring case", () => {
    const segments = markSegments(LINE, [
      { said: "since three years", better: "for three years", kind: "word", why: "" },
      { said: "i am agree", better: "I agree", kind: "grammar", why: "" },
    ]);
    expect(segments).toEqual([
      { text: "I am agree", issue: 1 },
      { text: " with the goals and I have work there ", issue: null },
      { text: "since three years", issue: 0 },
      { text: ".", issue: null },
    ]);
  });

  it("skips an issue that overlaps an earlier one", () => {
    const segments = markSegments("I am agree", [
      { said: "I am", better: "I", kind: "grammar", why: "" },
      { said: "am agree", better: "agree", kind: "grammar", why: "" },
    ]);
    expect(segments).toEqual([
      { text: "I am", issue: 0 },
      { text: " agree", issue: null },
    ]);
  });

  it("returns the whole answer when nothing was flagged", () => {
    expect(markSegments("Hello there", [])).toEqual([{ text: "Hello there", issue: null }]);
  });
});
