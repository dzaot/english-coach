import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "./api";
import { MESSAGES, setRuntimeLocale } from "@/i18n/messages";

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const ndjson = (lines: unknown[]) =>
  new Response(lines.map((l) => JSON.stringify(l)).join("\n") + "\n", { headers: { "content-type": "application/x-ndjson" } });

afterEach(() => vi.unstubAllGlobals());

describe("api client", () => {
  it("posts JSON and returns the body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ practice: { id: "p1" }, audio: null }));
    vi.stubGlobal("fetch", fetchMock);
    const out = await api.start({ scenarioId: "job_interview", industryId: "tech", level: "beginner", avatarId: "james" });
    expect(out.practice.id).toBe("p1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/practice");
    expect(JSON.parse(init.body)).toEqual({ scenarioId: "job_interview", industryId: "tech", level: "beginner", avatarId: "james" });
  });

  it("sends audio as multipart and text as a field", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => ndjson([{ type: "done", replyText: "ok" }]));
    vi.stubGlobal("fetch", fetchMock);
    await api.turn("p1", { audio: new Blob(["x"], { type: "audio/mp4" }) });
    await api.turn("p1", { text: "hello" });
    const audioForm = fetchMock.mock.calls[0][1].body as FormData;
    expect((audioForm.get("audio") as File).name).toBe("turn.mp4");
    expect((fetchMock.mock.calls[1][1].body as FormData).get("text")).toBe("hello");
  });

  it("reads a streamed turn: events in order, then the result", async () => {
    const lines = [
      { type: "heard", text: "I am agree", turnIndex: 1 },
      { type: "reply", text: "Why?", turnIndex: 2 },
      { type: "done", userText: "I am agree", replyText: "Why?" },
    ];
    const text = lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
    // Split mid-line to prove partial chunks are joined.
    const body = new ReadableStream({
      start(c) {
        const enc = new TextEncoder();
        c.enqueue(enc.encode(text.slice(0, 20)));
        c.enqueue(enc.encode(text.slice(20)));
        c.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { headers: { "content-type": "application/x-ndjson" } })));
    const seen: string[] = [];
    const result = await api.turn("p1", { text: "I am agree" }, (e) => seen.push(e.type));
    expect(seen).toEqual(["heard", "reply"]);
    expect(result).toEqual({ userText: "I am agree", replyText: "Why?" });
  });

  it("throws the error sent inside a stream, or when the stream is cut", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ndjson([{ type: "heard", text: "x", turnIndex: 1 }, { type: "error", error: { code: "ai_balance", message: "Saldo", topUpUrl: "https://publikhq.com/wallet" } }])));
    await expect(api.turn("p1", { text: "x" })).rejects.toMatchObject({ code: "ai_balance", topUpUrl: "https://publikhq.com/wallet" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ndjson([{ type: "heard", text: "x", turnIndex: 1 }])));
    await expect(api.turn("p1", { text: "x" })).rejects.toMatchObject({ code: "internal" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "turn_limit", message: "Limit" } }), { status: 409 })));
    await expect(api.turn("p1", { text: "x" })).rejects.toMatchObject({ code: "turn_limit" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(api.turn("p1", { text: "x" })).rejects.toMatchObject({ code: "offline" });
  });

  it("turns API errors into ApiError in the person's language, with the top-up link", async () => {
    const balance = () => new Response(JSON.stringify({ error: { code: "ai_balance", message: "Your publik AI balance has run out.", topUpUrl: "https://publikhq.com/wallet" } }), { status: 402 });
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => balance()));
    await expect(api.finish("p1")).rejects.toMatchObject({ code: "ai_balance", message: "Your publik AI balance has run out.", topUpUrl: "https://publikhq.com/wallet" });
    setRuntimeLocale("es");
    await expect(api.finish("p1")).rejects.toMatchObject({ message: MESSAGES.es.errors.ai_balance });
    setRuntimeLocale("en");
  });

  it("keeps the server's message for an error code the app does not know", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "brand_new", message: "Something new happened." } }), { status: 500 })));
    await expect(api.finish("p1")).rejects.toMatchObject({ code: "brand_new", message: "Something new happened." });
  });

  it("explains when there is no connection", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const err = await api.progress().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("offline");
  });

  it("handles a non-JSON error body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("oops", { status: 500 })));
    await expect(api.gate()).rejects.toMatchObject({ code: "internal" });
  });

  it("calls every endpoint with the right path", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => ok({}));
    vi.stubGlobal("fetch", fetchMock);
    await api.gateAction({ action: "connect" });
    await api.telemetry("app_opened");
    await api.getPractice("a/b");
    await api.markPhrase("ph1", true);
    await api.help("p1");
    await api.speech("p1", 2);
    await api.drill("ph1", new Blob(["x"], { type: "audio/mp4" }));
    await api.pronounce("I agree.");
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      "/api/gate",
      "/api/telemetry",
      "/api/practice/a%2Fb",
      "/api/phrases/ph1",
      "/api/practice/p1/help",
      "/api/practice/p1/speech",
      "/api/phrases/ph1/drill",
      "/api/pronounce",
    ]);
    expect(JSON.parse(fetchMock.mock.calls[7][1].body)).toEqual({ text: "I agree." });
    expect(JSON.parse(fetchMock.mock.calls[5][1].body)).toEqual({ turnIndex: 2 });
    const drillForm = fetchMock.mock.calls[6][1].body as FormData;
    expect((drillForm.get("audio") as File).name).toBe("say.m4a");
    expect(drillForm.get("tzOffset")).toMatch(/^-?\d+$/);
  });
});
