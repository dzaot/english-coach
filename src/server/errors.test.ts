import { describe, expect, it, vi } from "vitest";
import { AppError, errorResponse, fromPublikStatus } from "./errors";

describe("AppError", () => {
  it("carries a friendly message and an HTTP status", () => {
    const e = new AppError("not_found");
    expect(e.status).toBe(404);
    expect(e.userMessage).toMatch(/couldn't find/i);
  });
});

describe("fromPublikStatus", () => {
  it("maps 402 to a balance error with the top-up link", () => {
    const e = fromPublikStatus(402, { error: { message: "Not enough", top_up_url: "https://publikhq.com/wallet" } });
    expect(e.code).toBe("ai_balance");
    expect(e.topUpUrl).toBe("https://publikhq.com/wallet");
    expect(e.detail).toBe("Not enough");
  });

  it("maps throttling, auth, size and outages", () => {
    expect(fromPublikStatus(429, {}).code).toBe("ai_rate_limited");
    expect(fromPublikStatus(401, {}).code).toBe("ai_auth");
    expect(fromPublikStatus(413, "plain text").code).toBe("audio_too_large");
    expect(fromPublikStatus(503, {}).code).toBe("ai_unavailable");
    expect(fromPublikStatus(504, {}).code).toBe("ai_unavailable");
    expect(fromPublikStatus(400, {}).code).toBe("ai_unavailable");
  });

  it("drops a top-up link that is not https", () => {
    expect(fromPublikStatus(402, { error: { top_up_url: "javascript:alert(1)" } }).topUpUrl).toBeNull();
  });
});

describe("errorResponse", () => {
  it("renders an AppError as JSON with its status", async () => {
    const res = errorResponse(new AppError("ai_balance", { topUpUrl: "https://x.test/top" }));
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error.code).toBe("ai_balance");
    expect(body.error.topUpUrl).toBe("https://x.test/top");
    expect(body.error.message).toMatch(/balance/i);
  });

  it("hides unexpected errors behind a friendly 500 and logs them", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = errorResponse(new Error("db exploded"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("internal");
    expect(JSON.stringify(body)).not.toContain("exploded");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
