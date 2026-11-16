import { describe, expect, it } from "vitest";
import { captionWords } from "./caption";

describe("captionWords", () => {
  const text = "Tell me about your last job.";

  it("marks words already said, the current word and the rest", () => {
    const words = captionWords(text, 0.4);
    expect(words.map((w) => w.text)).toEqual(["Tell", "me", "about", "your", "last", "job."]);
    expect(words.map((w) => w.state)).toEqual(["said", "said", "now", "next", "next", "next"]);
  });

  it("shows everything as said when playback is done or not live", () => {
    expect(captionWords(text, 1).every((w) => w.state === "said")).toBe(true);
    expect(captionWords(text, null).every((w) => w.state === "said")).toBe(true);
  });

  it("starts on the first word", () => {
    expect(captionWords(text, 0)[0].state).toBe("now");
  });

  it("handles empty text", () => {
    expect(captionWords("  ", 0.5)).toEqual([]);
  });
});
