import { describe, expect, it } from "vitest";
import { POWER_PHRASES, getPowerPhrase, phraseOfTheDay, usesPhrase } from "./power-phrases";

describe("power phrases", () => {
  it("gives the same phrase all day and another one the next day", () => {
    const today = phraseOfTheDay("2026-11-16");
    expect(phraseOfTheDay("2026-11-16")).toBe(today);
    expect(phraseOfTheDay("2026-11-17")).not.toBe(today);
  });

  it("falls back to the first phrase for a broken date", () => {
    expect(phraseOfTheDay("not a day")).toBe(POWER_PHRASES[0]);
  });

  it("has unique ids, and every example uses its own phrase", () => {
    expect(new Set(POWER_PHRASES.map((p) => p.id)).size).toBe(POWER_PHRASES.length);
    for (const p of POWER_PHRASES) expect(usesPhrase(p.example, p), p.id).toBe(true);
  });

  it("finds a phrase by id, or nothing", () => {
    expect(getPowerPhrase("follow_up")?.phrase).toBe("follow up");
    expect(getPowerPhrase("nope")).toBeNull();
    expect(getPowerPhrase(undefined)).toBeNull();
  });

  it("accepts changed endings and rejects look-alikes", () => {
    const followUp = getPowerPhrase("follow_up")!;
    expect(usesPhrase("I followed up with them on Monday.", followUp)).toBe(true);
    expect(usesPhrase("We are following up.", followUp)).toBe(true);
    expect(usesPhrase("I will follow them up the stairs.", followUp)).toBe(false);
    expect(usesPhrase("That is a trade off we accept.", getPowerPhrase("trade_off")!)).toBe(true);
    expect(usesPhrase("I’m confident about it.", getPowerPhrase("im_confident")!)).toBe(true);
    expect(usesPhrase("I misled them.", getPowerPhrase("i_led")!)).toBe(false);
  });
});
