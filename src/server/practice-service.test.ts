import { describe, expect, it, vi } from "vitest";
import { testContext } from "@/test/context";
import { createMockProvider } from "./ai/mock-provider";
import type { AiProvider } from "./ai/provider";
import { drillPhrase, finishPractice, speakTurn, getHelp, getPractice, getProgress, markPhrase, startPractice, takeTurn } from "./practice-service";

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

  it("uses the chosen avatar and level", async () => {
    const ctx = testContext();
    const out = await startPractice(ctx, ai, SID, { scenarioId: "team_meeting", industryId: "tech", level: "beginner", avatarId: "james" });
    expect(out.practice).toMatchObject({ level: "beginner", avatarId: "james" });
    const speak = vi.fn<AiProvider["speak"]>().mockResolvedValue(null);
    await speakTurn(ctx, { ...ai, speak }, SID, out.practice.id, { turnIndex: 0 });
    expect(speak).toHaveBeenCalledWith(expect.any(String), "onyx");
    await expect(startPractice(ctx, ai, SID, { scenarioId: "team_meeting", industryId: "tech", level: "expert" })).rejects.toMatchObject({ code: "invalid_input" });
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

describe("getHelp", () => {
  it("translates the last question and suggests an answer with the fast tier", async () => {
    const { ctx, practice } = await started();
    const chat = vi.fn<AiProvider["chat"]>(ai.chat);
    const help = await getHelp(ctx, { ...ai, chat }, SID, practice.id);
    expect(help.translation.length).toBeGreaterThan(3);
    expect(help.suggestion.length).toBeGreaterThan(3);
    expect(chat.mock.calls[0][1]).toEqual({ tier: "fast", maxTokens: 300 });
  });

  it("gives a friendly error when the model answer is not usable", async () => {
    const { ctx, practice } = await started();
    await expect(getHelp(ctx, { ...ai, chat: async () => "no" }, SID, practice.id)).rejects.toMatchObject({ code: "help_invalid" });
  });

  it("refuses a finished or missing practice", async () => {
    const { ctx, practice } = await started();
    await takeTurn(ctx, ai, SID, practice.id, { text: "one" });
    await takeTurn(ctx, ai, SID, practice.id, { text: "two" });
    await finishPractice(ctx, ai, SID, practice.id, { tzOffset: 0 });
    await expect(getHelp(ctx, ai, SID, practice.id)).rejects.toMatchObject({ code: "session_finished" });
    await expect(getHelp(ctx, ai, SID, "missing")).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("drillPhrase (Dilo tú)", () => {
  async function withPhrases() {
    const { ctx, practice } = await started();
    await takeTurn(ctx, ai, SID, practice.id, { text: "I am agree with the plan." });
    await takeTurn(ctx, ai, SID, practice.id, { text: "two" });
    await finishPractice(ctx, ai, SID, practice.id, { tzOffset: 0 });
    return { ctx, phrase: ctx.store.listPhrases(SID)[0] };
  }
  const saying = (text: string): AiProvider => ({
    ...ai,
    transcribe: async () => text,
    transcribeTimed: async () => ({ text, words: text.split(/\s+/).map((word, i) => ({ word, start: i * 0.4, end: i * 0.4 + 0.35 })) }),
  });
  const audio = new Blob([new Uint8Array(10)], { type: "audio/webm" });

  it("schedules new phrases for tomorrow and counts what is due", async () => {
    const { ctx, phrase } = await withPhrases();
    expect(phrase.dueDay).toBe("2026-11-16");
    expect(getProgress(ctx, SID, 0).dueToday).toBe(0);
    ctx.store.schedulePhrase(SID, phrase.id, { step: 0, dueDay: "2026-11-15", reviewedAt: null });
    expect(getProgress(ctx, SID, 0).dueToday).toBe(1);
  });

  it("moves the phrase ahead when it was said right", async () => {
    const { ctx, phrase } = await withPhrases();
    const out = await drillPhrase(ctx, saying(phrase.better), SID, phrase.id, { audio, tzOffset: 0 });
    expect(out).toMatchObject({ passed: true, score: 100, missing: [] });
    expect(out.words.every((w) => w.status === "clear")).toBe(true);
    expect(out.words.map((w) => w.text).join(" ")).toBe(phrase.better);
    expect(out.pace?.wordsPerMinute).toBeGreaterThan(0);
    expect(out.timings.length).toBe(phrase.better.split(/\s+/).length);
    expect(out.phrase).toMatchObject({ step: 1, dueDay: "2026-11-16", reviewedAt: null });
  });

  it("keeps the schedule and lists missing words when it was not", async () => {
    const { ctx, phrase } = await withPhrases();
    const out = await drillPhrase(ctx, saying("hello"), SID, phrase.id, { audio, tzOffset: 0 });
    expect(out.passed).toBe(false);
    expect(out.missing.length).toBeGreaterThan(0);
    expect(out.said).toBe("hello");
    expect(out.phrase.step).toBe(0);
  });

  it("marks the phrase learned after the last review", async () => {
    const { ctx, phrase } = await withPhrases();
    ctx.store.schedulePhrase(SID, phrase.id, { step: 3, dueDay: "2026-11-15", reviewedAt: null });
    const out = await drillPhrase(ctx, saying(phrase.better), SID, phrase.id, { audio, tzOffset: 0 });
    expect(out.phrase.reviewedAt).not.toBeNull();
    expect(out.phrase.dueDay).toBeNull();
  });

  it("validates input", async () => {
    const { ctx, phrase } = await withPhrases();
    await expect(drillPhrase(ctx, ai, SID, "nope", { audio, tzOffset: 0 })).rejects.toMatchObject({ code: "not_found" });
    await expect(drillPhrase(ctx, ai, SID, phrase.id, { audio: null, tzOffset: 0 })).rejects.toMatchObject({ code: "invalid_input" });
    await expect(drillPhrase(ctx, ai, SID, phrase.id, { audio, tzOffset: 9999 })).rejects.toMatchObject({ code: "invalid_input" });
    await expect(drillPhrase(ctx, ai, SID, phrase.id, { audio: new Blob([]), tzOffset: 0 })).rejects.toMatchObject({ code: "audio_empty" });
  });
});

describe("speakTurn", () => {
  it("speaks a counterpart turn on request, so the text can show first", async () => {
    const { ctx, practice } = await started();
    const speak = vi.fn<AiProvider["speak"]>().mockResolvedValue({ base64: "AA", mime: "audio/mpeg" });
    const out = await speakTurn(ctx, { ...ai, speak }, SID, practice.id, { turnIndex: 0 });
    expect(out.audio).toEqual({ base64: "AA", mime: "audio/mpeg" });
    expect(speak).toHaveBeenCalledWith(practice.turns[0].text, "nova");
  });

  it("does not speak user turns, missing turns or other people's practices", async () => {
    const { ctx, practice } = await started();
    await takeTurn(ctx, ai, SID, practice.id, { text: "Hello" });
    await expect(speakTurn(ctx, ai, SID, practice.id, { turnIndex: 1 })).rejects.toMatchObject({ code: "invalid_input" });
    await expect(speakTurn(ctx, ai, SID, practice.id, { turnIndex: 99 })).rejects.toMatchObject({ code: "invalid_input" });
    await expect(speakTurn(ctx, ai, SID, practice.id, { turnIndex: "0" })).rejects.toMatchObject({ code: "invalid_input" });
    await expect(speakTurn(ctx, ai, "other", practice.id, { turnIndex: 0 })).rejects.toMatchObject({ code: "not_found" });
  });

  it("leaves speech out of start and turn responses", async () => {
    const speak = vi.fn<AiProvider["speak"]>().mockResolvedValue({ base64: "AA", mime: "audio/mpeg" });
    const ctx = testContext();
    const out = await startPractice(ctx, { ...ai, speak }, SID, { scenarioId: "job_interview", industryId: "sales" });
    const turn = await takeTurn(ctx, { ...ai, speak }, SID, out.practice.id, { text: "Hi" });
    expect(out.audio).toBeNull();
    expect(turn.audio).toBeNull();
    expect(speak).not.toHaveBeenCalled();
  });
});
