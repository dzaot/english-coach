import { describe, expect, it, vi } from "vitest";
import { loadConfig } from "@/server/config";
import { fakeFetch, json } from "@/test/fake-fetch";
import { logCharge, publikProvider } from "./factory";

describe("publik provider cost log", () => {
  it("logs one line per charged call when PUBLIK_COST_LOG=1", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const { fetch } = fakeFetch({ "/chat/completions": json({ choices: [{ message: { content: "ok" } }] }, 200, { "x-publik-charge-micros": "900" }) });
    await publikProvider(loadConfig({ PUBLIK_COST_LOG: "1" }), "pk_x", fetch).chat([], { tier: "balanced" });
    expect(spy).toHaveBeenCalledWith("[publik-cost] chat publik-balanced 900");
    spy.mockClear();
    await publikProvider(loadConfig({}), "pk_x", fetch).chat([], { tier: "balanced" });
    expect(spy).not.toHaveBeenCalled();
    logCharge({ op: "speech", model: "tts-1", micros: 3 });
    expect(spy).toHaveBeenCalledWith("[publik-cost] speech tts-1 3");
    spy.mockRestore();
  });
});
