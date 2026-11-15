import { describe, expect, it } from "vitest";
import { parseFeedback } from "@/domain/feedback";
import { createMockProvider } from "./mock-provider";

describe("mock provider", () => {
  const ai = createMockProvider();

  it("returns a plausible English answer for any audio", async () => {
    const text = await ai.transcribe(new Blob([new Uint8Array(10)]), "a.webm");
    expect(text.length).toBeGreaterThan(10);
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

  it("uses the browser voice (no audio)", async () => {
    expect(await ai.speak("Hi")).toBeNull();
  });
});
