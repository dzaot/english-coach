import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "./api";

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

afterEach(() => vi.unstubAllGlobals());

describe("api client", () => {
  it("posts JSON and returns the body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ practice: { id: "p1" }, audio: null }));
    vi.stubGlobal("fetch", fetchMock);
    const out = await api.start("job_interview", "tech");
    expect(out.practice.id).toBe("p1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/practice");
    expect(JSON.parse(init.body)).toEqual({ scenarioId: "job_interview", industryId: "tech" });
  });

  it("sends audio as multipart and text as a field", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({}));
    vi.stubGlobal("fetch", fetchMock);
    await api.turn("p1", { audio: new Blob(["x"], { type: "audio/mp4" }) });
    await api.turn("p1", { text: "hello" });
    const audioForm = fetchMock.mock.calls[0][1].body as FormData;
    expect((audioForm.get("audio") as File).name).toBe("turn.mp4");
    expect((fetchMock.mock.calls[1][1].body as FormData).get("text")).toBe("hello");
  });

  it("turns API errors into ApiError with the Spanish message and top-up link", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "ai_balance", message: "Se acabó tu saldo", topUpUrl: "https://publikhq.com/wallet" } }), { status: 402 })));
    await expect(api.finish("p1")).rejects.toMatchObject({ code: "ai_balance", message: "Se acabó tu saldo", topUpUrl: "https://publikhq.com/wallet" });
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
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      "/api/gate",
      "/api/telemetry",
      "/api/practice/a%2Fb",
      "/api/phrases/ph1",
      "/api/practice/p1/help",
      "/api/practice/p1/speech",
      "/api/phrases/ph1/drill",
    ]);
    expect(JSON.parse(fetchMock.mock.calls[5][1].body)).toEqual({ turnIndex: 2 });
    const drillForm = fetchMock.mock.calls[6][1].body as FormData;
    expect((drillForm.get("audio") as File).name).toBe("say.m4a");
    expect(drillForm.get("tzOffset")).toMatch(/^-?\d+$/);
  });
});
