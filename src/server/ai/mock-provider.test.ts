import { describe, expect, it } from "vitest";
import { parseFeedback } from "@/domain/feedback";
import { createMockProvider } from "./mock-provider";

describe("mock provider", () => {
  const ai = createMockProvider();

  it("returns a plausible English answer for any audio", async () => {
    const text = await ai.transcribe(new Blob([new Uint8Array(10)]), "a.webm");
    expect(text.length).toBeGreaterThan(10);
  });

  it("times each word of the answer for the sound coach", async () => {
    const out = await ai.transcribeTimed(new Blob([new Uint8Array(10)]), "a.webm");
    expect(out.words.length).toBe(out.text.split(/\s+/).length);
    expect(out.words[1].start).toBeCloseTo(out.words[0].end);
  });

  it("asks a follow-up question in the role-play", async () => {
    const reply = await ai.chat(
      [
        { role: "system", content: "You are Sarah, a hiring manager." },
        { role: "assistant", content: "Tell me about yourself." },
        { role: "user", content: "I am a sales rep." },
      ],
      { tier: "balanced" },
    );
    expect(reply).toMatch(/\?$/);
  });

  it("returns valid feedback JSON built from the user's own lines", async () => {
    const raw = await ai.chat(
      [
        { role: "system", content: "Return ONLY a JSON object" },
        { role: "user", content: "COUNTERPART: Hi\nUSER: I have five years in sales.\nUSER: I am agree with the plan." },
      ],
      { tier: "balanced" },
    );
    const fb = parseFeedback(raw);
    expect(fb.betterPhrases.map((p) => p.original)).toContain("I am agree with the plan.");
    expect(fb.betterPhrases).toHaveLength(3);
    expect(new Set(fb.betterPhrases.map((p) => p.better)).size).toBe(3);
  });

  it("answers help requests with valid help JSON", async () => {
    const { parseHelp } = await import("@/domain/help");
    const raw = await ai.chat([{ role: "system", content: "HELP_JSON translation suggestion" }, { role: "user", content: "x" }], { tier: "fast" });
    expect(parseHelp(raw).suggestion.length).toBeGreaterThan(5);
  });

  it("uses the browser voice (no audio)", async () => {
    expect(await ai.speak("Hi")).toBeNull();
  });
});
