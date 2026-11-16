import { describe, expect, it, vi } from "vitest";
import { fakeFetch, json } from "@/test/fake-fetch";
import { createOpenAiCompatibleProvider } from "./openai-compatible";

const models = { fast: "publik-fast", balanced: "publik-balanced", transcribe: "whisper-1", speech: "tts-1" };
const make = (f: typeof fetch) =>
  createOpenAiCompatibleProvider({ baseURL: "https://publikhq.com/api/v1", apiKey: "pk_test", models, voice: "alloy", fetch: f });
const audio = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm" });

describe("OpenAI-compatible provider", () => {
  it("transcribes with whisper-1 over multipart and the bearer key", async () => {
    const { fetch, calls } = fakeFetch({ "/audio/transcriptions": json({ text: "  I worked in sales. " }) });
    expect(await make(fetch).transcribe(audio, "turn.webm")).toBe("I worked in sales.");
    const body = calls[0].init?.body as FormData;
    expect(body.get("model")).toBe("whisper-1");
    expect(body.get("language")).toBe("en");
    expect((calls[0].init?.headers as Record<string, string>).authorization).toBe("Bearer pk_test");
  });

  it("transcribes with word timings for the sound coach", async () => {
    const { fetch, calls } = fakeFetch({
      "/audio/transcriptions": json({ text: " I agree. ", words: [{ word: "I", start: 0, end: 0.2 }, { word: "agree", start: 0.2, end: 0.7 }, { word: 3 }] }),
    });
    const out = await make(fetch).transcribeTimed(audio, "say.webm");
    expect(out).toEqual({ text: "I agree.", words: [{ word: "I", start: 0, end: 0.2 }, { word: "agree", start: 0.2, end: 0.7 }] });
    const body = calls[0].init?.body as FormData;
    expect(body.get("response_format")).toBe("verbose_json");
    expect(body.get("timestamp_granularities[]")).toBe("word");
  });

  it("returns no timings when the provider sends none", async () => {
    const { fetch } = fakeFetch({ "/audio/transcriptions": json({ text: "I agree." }) });
    expect(await make(fetch).transcribeTimed(audio, "say.webm")).toEqual({ text: "I agree.", words: [] });
  });

  it("reports an empty transcription", async () => {
    const { fetch } = fakeFetch({ "/audio/transcriptions": json({ text: "  " }) });
    await expect(make(fetch).transcribe(audio, "a.webm")).rejects.toMatchObject({ code: "transcription_empty" });
  });

  it("chats with the tier model and returns the first message", async () => {
    const { fetch, calls } = fakeFetch({
      "/chat/completions": json({ choices: [{ message: { content: "Great, tell me more." } }] }),
    });
    const reply = await make(fetch).chat([{ role: "user", content: "Hi" }], { tier: "balanced" });
    expect(reply).toBe("Great, tell me more.");
    const sent = JSON.parse(String(calls[0].init?.body));
    expect(sent.model).toBe("publik-balanced");
    expect(sent.messages).toHaveLength(1);
  });

  it("maps a 402 to a balance error with its link", async () => {
    const { fetch } = fakeFetch({
      "/chat/completions": json({ error: { message: "No credit", top_up_url: "https://publikhq.com/wallet" } }, 402),
    });
    await expect(make(fetch).chat([], { tier: "fast" })).rejects.toMatchObject({
      code: "ai_balance",
      topUpUrl: "https://publikhq.com/wallet",
    });
  });

  it("treats an empty chat answer as an outage", async () => {
    const { fetch } = fakeFetch({ "/chat/completions": json({ choices: [] }) });
    await expect(make(fetch).chat([], { tier: "fast" })).rejects.toMatchObject({ code: "ai_unavailable" });
  });

  it("maps a network failure to an outage", async () => {
    const { fetch } = fakeFetch({});
    await expect(make(fetch).chat([], { tier: "fast" })).rejects.toMatchObject({ code: "ai_unavailable" });
  });

  it("handles a non-JSON error body", async () => {
    const { fetch } = fakeFetch({ "/audio/transcriptions": new Response("Request Entity Too Large", { status: 413 }) });
    await expect(make(fetch).transcribe(audio, "a.webm")).rejects.toMatchObject({ code: "audio_too_large" });
  });

  it("speaks a reply as base64 mp3", async () => {
    const { fetch, calls } = fakeFetch({
      "/audio/speech": new Response(new Uint8Array([9, 9, 9]), { headers: { "content-type": "audio/mpeg" } }),
    });
    const out = await make(fetch).speak("Hello there");
    expect(out).toEqual({ base64: Buffer.from([9, 9, 9]).toString("base64"), mime: "audio/mpeg" });
    expect(JSON.parse(String(calls[0].init?.body))).toMatchObject({ model: "tts-1", voice: "alloy", input: "Hello there" });
  });

  it("speaks in the avatar's voice when given", async () => {
    const { fetch, calls } = fakeFetch({ "/audio/speech": new Response(new Uint8Array([1]), { headers: { "content-type": "audio/mpeg" } }) });
    await make(fetch).speak("Hi", "onyx");
    expect(JSON.parse(String(calls[0].init?.body)).voice).toBe("onyx");
  });

  it("falls back to the browser voice when speech fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { fetch } = fakeFetch({ "/audio/speech": json({ error: { message: "x" } }, 500) });
    expect(await make(fetch).speak("Hello")).toBeNull();
    const net = fakeFetch({});
    expect(await make(net.fetch).speak("Hello")).toBeNull();
    spy.mockRestore();
  });

  it("reports what each call cost from x-publik-charge-micros", async () => {
    const onCharge = vi.fn();
    const { fetch } = fakeFetch({
      "/chat/completions": json({ choices: [{ message: { content: "Hi" } }] }, 200, { "x-publik-charge-micros": "1234" }),
      "/audio/transcriptions": json({ text: "hello" }, 200, { "x-publik-charge-micros": "50" }),
      "/audio/speech": new Response(new Uint8Array([1]), { headers: { "content-type": "audio/mpeg" } }),
    });
    const ai = createOpenAiCompatibleProvider({ baseURL: "https://publikhq.com/api/v1", apiKey: "pk", models, voice: "alloy", fetch, onCharge });
    await ai.chat([], { tier: "fast" });
    await ai.transcribe(audio, "a.webm");
    await ai.speak("x");
    expect(onCharge).toHaveBeenCalledWith({ op: "chat", model: "publik-fast", micros: 1234 });
    expect(onCharge).toHaveBeenCalledWith({ op: "transcribe", model: "whisper-1", micros: 50 });
    expect(onCharge).toHaveBeenCalledTimes(2);
  });
});
