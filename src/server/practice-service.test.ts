import { describe, expect, it, vi } from "vitest";
import { testContext } from "@/test/context";
import { createMockProvider } from "./ai/mock-provider";
import type { AiProvider } from "./ai/provider";
import { finishPractice, getPractice, getProgress, markPhrase, startPractice, takeTurn } from "./practice-service";

const SID = "sid-1";
const ai = createMockProvider();

async function started(ctx = testContext()) {
  const out = await startPractice(ctx, ai, SID, { scenarioId: "job_interview", industryId: "sales" });
  return { ctx, practice: out.practice };
}

describe("startPractice", () => {
  it("creates a practice that opens with the counterpart", async () => {
    const ctx = testContext();
    const out = await startPractice(ctx, ai, SID, { scenarioId: "job_interview", industryId: "sales" });
    expect(out.practice.turns).toHaveLength(1);
    expect(out.practice.turns[0].role).toBe("counterpart");
    expect(out.practice.turns[0].text).toContain("sales representative");
    expect(out.audio).toBeNull();
    expect(out.practice.canFinish).toBe(false);
  });

  it("rejects unknown scenarios", async () => {
    await expect(startPractice(testContext(), ai, SID, { scenarioId: "karaoke", industryId: "sales" })).rejects.toMatchObject({ code: "invalid_input" });
  });
});

describe("takeTurn", () => {
  it("transcribes audio, replies and saves both turns", async () => {
    const { ctx, practice } = await started();
    const out = await takeTurn(ctx, ai, SID, practice.id, { audio: new Blob([new Uint8Array(5)], { type: "audio/webm" }) });
    expect(out.userText.length).toBeGreaterThan(5);
    expect(out.replyText).toMatch(/\?$/);
    expect(getPractice(ctx, SID, practice.id).turns).toHaveLength(3);
  });

  it("removes em dashes from the counterpart's reply", async () => {
    const { ctx, practice } = await started();
    const dashy: AiProvider = { ...ai, chat: async () => "Great — tell me more." };
    const out = await takeTurn(ctx, dashy, SID, practice.id, { text: "Hi" });
    expect(out.replyText).toBe("Great, tell me more.");
  });

  it("accepts typed text instead of audio", async () => {
    const { ctx, practice } = await started();
    const out = await takeTurn(ctx, ai, SID, practice.id, { text: "  I sold software for three years. " });
    expect(out.userText).toBe("I sold software for three years.");
  });

  it("validates the input", async () => {
    const { ctx, practice } = await started();
    await expect(takeTurn(ctx, ai, SID, practice.id, {})).rejects.toMatchObject({ code: "invalid_input" });
    await expect(takeTurn(ctx, ai, SID, practice.id, { text: "   " })).rejects.toMatchObject({ code: "invalid_input" });
    await expect(takeTurn(ctx, ai, SID, practice.id, { audio: new Blob([]) })).rejects.toMatchObject({ code: "audio_empty" });
    const huge = new Blob([new Uint8Array(4_000_001)]);
    await expect(takeTurn(ctx, ai, SID, practice.id, { audio: huge })).rejects.toMatchObject({ code: "audio_too_large" });
    await expect(takeTurn(ctx, ai, SID, "missing", { text: "hi" })).rejects.toMatchObject({ code: "not_found" });
  });

  it("stops at the turn limit", async () => {
    const { ctx, practice } = await started();
    const turns = Array.from({ length: 24 }, (_, i) => ({ role: i % 2 ? "counterpart" : "user", text: "x" }) as const);
    ctx.store.savePracticeTurns(SID, practice.id, turns);
    await expect(takeTurn(ctx, ai, SID, practice.id, { text: "hi" })).rejects.toMatchObject({ code: "turn_limit" });
  });
});

describe("finishPractice", () => {
  it("needs two answers", async () => {
    const { ctx, practice } = await started();
    await expect(finishPractice(ctx, ai, SID, practice.id, { tzOffset: 480 })).rejects.toMatchObject({ code: "not_enough_turns" });
  });

  it("returns feedback, saves phrases and starts the streak", async () => {
    const { ctx, practice } = await started();
    await takeTurn(ctx, ai, SID, practice.id, { text: "I have five years in sales." });
    await takeTurn(ctx, ai, SID, practice.id, { text: "I am agree with the plan." });
    const out = await finishPractice(ctx, ai, SID, practice.id, { tzOffset: 480 });
    expect(out.feedback.betterPhrases).toHaveLength(3);
    expect(out.streak).toEqual({ current: 1, best: 1, practicedToday: true });
    expect(ctx.store.listPhrases(SID)).toHaveLength(3);
    // finishing twice is safe and adds nothing
    const again = await finishPractice(ctx, ai, SID, practice.id, { tzOffset: 480 });
    expect(again.feedback).toEqual(out.feedback);
    expect(ctx.store.listPhrases(SID)).toHaveLength(3);
    await expect(takeTurn(ctx, ai, SID, practice.id, { text: "more" })).rejects.toMatchObject({ code: "session_finished" });
  });

  it("retries once with the fast tier when the feedback is not valid JSON", async () => {
    const { ctx, practice } = await started();
    await takeTurn(ctx, ai, SID, practice.id, { text: "one" });
    await takeTurn(ctx, ai, SID, practice.id, { text: "two" });
    const chat = vi.fn<AiProvider["chat"]>().mockResolvedValueOnce("sorry, no JSON").mockImplementation(ai.chat);
    const flaky: AiProvider = { ...ai, chat };
    const out = await finishPractice(ctx, flaky, SID, practice.id, { tzOffset: 0 });
    expect(out.feedback.score).toBe(72);
    expect(chat.mock.calls[1][1]).toEqual({ tier: "fast", maxTokens: 900 });
  });

  it("gives a friendly error when the retry also fails", async () => {
    const { ctx, practice } = await started();
    await takeTurn(ctx, ai, SID, practice.id, { text: "one" });
    await takeTurn(ctx, ai, SID, practice.id, { text: "two" });
    const broken: AiProvider = { ...ai, chat: async () => "nope" };
    await expect(finishPractice(ctx, broken, SID, practice.id, { tzOffset: 0 })).rejects.toMatchObject({ code: "feedback_invalid" });
  });

  it("validates the time zone offset", async () => {
    const { ctx, practice } = await started();
    await expect(finishPractice(ctx, ai, SID, practice.id, { tzOffset: 5000 })).rejects.toMatchObject({ code: "invalid_input" });
  });
});

describe("progress and phrases", () => {
  it("summarizes streak, history and phrases to review", async () => {
    const { ctx, practice } = await started();
    await takeTurn(ctx, ai, SID, practice.id, { text: "one" });
    await takeTurn(ctx, ai, SID, practice.id, { text: "two" });
    await finishPractice(ctx, ai, SID, practice.id, { tzOffset: 480 });
    await startPractice(ctx, ai, SID, { scenarioId: "team_meeting", industryId: "tech" });
    const progress = getProgress(ctx, SID, 480);
    expect(progress.streak.current).toBe(1);
    expect(progress.history).toHaveLength(1);
    expect(progress.history[0]).toMatchObject({ scenarioId: "job_interview", score: 72 });
    expect(progress.phrases).toHaveLength(3);
    expect(progress.toReview).toBe(3);
    expect(progress.week).toHaveLength(7);
    expect(progress.week[6]).toEqual({ day: "2026-11-15", practiced: true });
    expect(progress.week[5].practiced).toBe(false);

    const marked = markPhrase(ctx, SID, progress.phrases[0].id, { reviewed: true });
    expect(marked.reviewedAt).not.toBeNull();
    expect(getProgress(ctx, SID, 480).toReview).toBe(2);
    expect(() => markPhrase(ctx, SID, "nope", { reviewed: true })).toThrow(expect.objectContaining({ code: "not_found" }));
    expect(() => markPhrase(ctx, SID, progress.phrases[0].id, { reviewed: "yes" })).toThrow(expect.objectContaining({ code: "invalid_input" }));
    expect(() => getProgress(ctx, SID, Number.NaN)).toThrow(expect.objectContaining({ code: "invalid_input" }));
  });

  it("hides another user's practice", () => {
    expect(() => getPractice(testContext(), SID, "x")).toThrow(expect.objectContaining({ code: "not_found" }));
  });
});

describe("audioExtension", () => {
  it("names browser recordings the way the transcription service accepts them", async () => {
    const { audioExtension } = await import("./practice-service");
    expect(audioExtension("audio/mp4")).toBe("m4a"); // Safari on iPhone
    expect(audioExtension("audio/webm;codecs=opus")).toBe("webm"); // Chrome, Firefox
    expect(audioExtension("audio/ogg;codecs=opus")).toBe("ogg");
    expect(audioExtension("audio/mpeg")).toBe("mp3");
    expect(audioExtension("audio/wav")).toBe("wav");
    expect(audioExtension("")).toBe("webm");
  });
});
