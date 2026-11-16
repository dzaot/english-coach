import { describe, expect, it } from "vitest";
import { diffLetters, diffPhrase } from "./diff";

describe("diffLetters", () => {
  it("keeps shared letters and adds the missing ending", () => {
    expect(diffLetters("work", "worked")).toEqual([
      { op: "same", text: "work" },
      { op: "add", text: "ed" },
    ]);
  });

  it("marks an extra first letter as removed", () => {
    expect(diffLetters("espeak", "speak")).toEqual([
      { op: "del", text: "e" },
      { op: "same", text: "speak" },
    ]);
  });

  it("compares letters without caring about case", () => {
    expect(diffLetters("I", "i")).toEqual([{ op: "same", text: "I" }]);
  });

  it("shows a changed vowel as removed then added", () => {
    expect(diffLetters("sheep", "ship")).toEqual([
      { op: "same", text: "sh" },
      { op: "del", text: "ee" },
      { op: "add", text: "i" },
      { op: "same", text: "p" },
    ]);
  });
});

describe("diffPhrase", () => {
  it("removes a whole extra word", () => {
    expect(diffPhrase("I am agree", "I agree")).toEqual([
      { op: "same", text: "I " },
      { op: "del", text: "am" },
      { op: "same", text: " agree" },
    ]);
  });

  it("compares a replaced, similar word letter by letter", () => {
    expect(diffPhrase("I have work there", "I have worked there")).toEqual([
      { op: "same", text: "I have work" },
      { op: "add", text: "ed" },
      { op: "same", text: " there" },
    ]);
  });

  it("replaces a different word as a whole", () => {
    expect(diffPhrase("since three years", "for three years")).toEqual([
      { op: "del", text: "since" },
      { op: "same", text: " " },
      { op: "add", text: "for" },
      { op: "same", text: " three years" },
    ]);
  });

  it("adds a missing word", () => {
    expect(diffPhrase("I agree the plan", "I agree with the plan")).toEqual([
      { op: "same", text: "I agree " },
      { op: "add", text: "with" },
      { op: "same", text: " the plan" },
    ]);
  });

  it("returns nothing for two empty phrases", () => {
    expect(diffPhrase("", "")).toEqual([]);
  });
});
