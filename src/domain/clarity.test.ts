import { describe, expect, it } from "vitest";
import { LONG_PAUSE_SECONDS, checkClarity, mapTimings, measurePace } from "./clarity";

describe("checkClarity", () => {
  it("marks every word clear when it was all heard", () => {
    const r = checkClarity("I worked in sales.", "i worked in sales");
    expect(r.map((w) => w.status)).toEqual(["clear", "clear", "clear", "clear"]);
    expect(r[3].text).toBe("sales.");
  });

  it("shows what was heard instead of a word", () => {
    const r = checkClarity("Let me check the ship date.", "let me check the sheep date");
    expect(r[4]).toEqual({ text: "ship", status: "missed", heardAs: "sheep" });
  });

  it("marks a skipped word as missed with nothing heard", () => {
    const r = checkClarity("I have worked there", "i have there");
    expect(r[2]).toEqual({ text: "worked", status: "missed", heardAs: null });
  });

  it("matches number words and digits", () => {
    expect(checkClarity("about forty people", "about 40 people").every((w) => w.status === "clear")).toBe(true);
  });

  it("keeps hyphenated words and percentages together", () => {
    const r = checkClarity("Send the follow-up with 40% off", "send the follow up with forty percent off");
    expect(r.map((w) => w.status)).toEqual(["clear", "clear", "clear", "clear", "clear", "clear"]);
    expect(r[2].text).toBe("follow-up");
  });

  it("returns nothing for an empty target", () => {
    expect(checkClarity("", "hello")).toEqual([]);
  });
});

describe("measurePace", () => {
  it("computes words per minute and long pauses", () => {
    const words = [
      { word: "I", start: 0, end: 0.3 },
      { word: "worked", start: 0.3, end: 0.8 },
      { word: "in", start: 0.8 + LONG_PAUSE_SECONDS + 0.1, end: 1.9 },
      { word: "sales", start: 1.9, end: 2.4 },
    ];
    expect(measurePace(words)).toEqual({ wordsPerMinute: 100, longPauses: 1 });
  });

  it("needs at least two words", () => {
    expect(measurePace([{ word: "hi", start: 0, end: 0.4 }])).toBeNull();
    expect(measurePace([])).toBeNull();
  });
});

describe("mapTimings", () => {
  const timings = [
    { word: "I", start: 0, end: 0.2 },
    { word: "agree", start: 0.2, end: 0.6 },
    { word: "fully.", start: 0.6, end: 1 },
  ];

  it("finds when each word of the sentence was said", () => {
    expect(mapTimings("I agree with you fully", timings)).toEqual([timings[0], timings[1], null, null, timings[2]]);
  });

  it("returns nulls when there are no timings", () => {
    expect(mapTimings("I agree", [])).toEqual([null, null]);
  });
});
