import { describe, expect, it } from "vitest";
import { parseFeedback, scoreLabel } from "./feedback";

const valid = {
  summary: "Buen ritmo y respuestas claras.",
  wellDone: ["Diste un ejemplo concreto", "Saludaste con naturalidad"],
  betterPhrases: [
    { original: "I have 5 years of experience in sales", better: "I've spent five years in sales", why: "Más natural" },
    { original: "I am agree", better: "I agree", why: "Agree es verbo" },
    { original: "Make a meeting", better: "Set up a meeting", why: "Colocación común" },
    { original: "Extra", better: "Extra one", why: "Sobra" },
  ],
  vocabulary: [{ term: "follow up", meaning: "dar seguimiento" }],
  score: 78,
};

describe("parseFeedback", () => {
  it("parses clean JSON and keeps only three phrases", () => {
    const fb = parseFeedback(JSON.stringify(valid));
    expect(fb.betterPhrases).toHaveLength(3);
    expect(fb.score).toBe(78);
    expect(fb.vocabulary[0].term).toBe("follow up");
  });

  it("accepts JSON wrapped in a markdown fence with extra prose", () => {
    const raw = "Here you go:\n```json\n" + JSON.stringify(valid) + "\n```\nGood luck!";
    expect(parseFeedback(raw).summary).toBe(valid.summary);
  });

  it("clamps and rounds the score", () => {
    expect(parseFeedback(JSON.stringify({ ...valid, score: 140 })).score).toBe(100);
    expect(parseFeedback(JSON.stringify({ ...valid, score: -3 })).score).toBe(0);
    expect(parseFeedback(JSON.stringify({ ...valid, score: 66.6 })).score).toBe(67);
  });

  it("removes em dashes the model writes", () => {
    const raw = JSON.stringify({ ...valid, summary: "Bien — sigue así", betterPhrases: [{ original: "a", better: "I agree — fully", why: "x — y" }] });
    const fb = parseFeedback(raw);
    expect(JSON.stringify(fb)).not.toContain("—");
    expect(fb.betterPhrases[0].better).toBe("I agree, fully");
  });

  it("rejects text without JSON", () => {
    expect(() => parseFeedback("no json here")).toThrow(/feedback/);
  });

  it("rejects JSON with the wrong shape", () => {
    expect(() => parseFeedback(JSON.stringify({ score: 50 }))).toThrow(/feedback/);
  });

  it("rejects broken JSON", () => {
    expect(() => parseFeedback("{\"score\": 5,")).toThrow(/feedback/);
  });
});

describe("scoreLabel", () => {
  it("maps a score to a Spanish label", () => {
    expect(scoreLabel(92)).toBe("Excelente");
    expect(scoreLabel(75)).toBe("Muy bien");
    expect(scoreLabel(55)).toBe("Vas bien");
    expect(scoreLabel(20)).toBe("Sigue practicando");
  });
});
