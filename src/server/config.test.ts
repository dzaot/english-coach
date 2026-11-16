import { describe, expect, it } from "vitest";
import { loadConfig } from "./config";

describe("loadConfig", () => {
  it("defaults to the mock provider with the gate off", () => {
    const c = loadConfig({});
    expect(c.aiProvider).toBe("mock");
    expect(c.gateEnabled).toBe(false);
    expect(c.databasePath).toBe("./data/coach.db");
    expect(c.publikOrigin).toBe("https://publikhq.com");
    expect(c.speechModel).toBe("tts-1-hd");
    expect(c.replyTier).toBe("fast");
    expect(loadConfig({ REPLY_TIER: "balanced" }).replyTier).toBe("balanced");
    expect(c.costLog).toBe(false);
    expect(loadConfig({ PUBLIK_COST_LOG: "1" }).costLog).toBe(true);
  });

  it("turns the gate on for the publik provider and requires its secrets", () => {
    expect(() => loadConfig({ AI_PROVIDER: "publik" })).toThrow(/PUBLIK_APP_TOKEN/);
    expect(() => loadConfig({ AI_PROVIDER: "publik", PUBLIK_APP_TOKEN: "pat_x" })).toThrow(/APP_SECRET/);
    const c = loadConfig({ AI_PROVIDER: "publik", PUBLIK_APP_TOKEN: "pat_x", APP_SECRET: "s".repeat(32) });
    expect(c.gateEnabled).toBe(true);
    expect(c.publikAppToken).toBe("pat_x");
  });

  it("uses a hosted libSQL database when a URL is set, with Turso's variable names too", () => {
    expect(loadConfig({}).database).toEqual({ url: null, authToken: null });
    expect(loadConfig({ DATABASE_URL: "libsql://dilo.turso.io", DATABASE_AUTH_TOKEN: "t1" }).database).toEqual({ url: "libsql://dilo.turso.io", authToken: "t1" });
    expect(loadConfig({ TURSO_DATABASE_URL: "libsql://x.turso.io", TURSO_AUTH_TOKEN: "t2" }).database).toEqual({ url: "libsql://x.turso.io", authToken: "t2" });
    expect(() => loadConfig({ DATABASE_URL: "postgres://nope" })).toThrow(/DATABASE_URL/);
  });

  it("rejects an unknown provider", () => {
    expect(() => loadConfig({ AI_PROVIDER: "openai" })).toThrow(/AI_PROVIDER/);
  });

  it("allows the gate to be forced on with the mock provider", () => {
    const c = loadConfig({ PUBLIK_GATE: "on", PUBLIK_APP_TOKEN: "pat_x", APP_SECRET: "s".repeat(32) });
    expect(c.gateEnabled).toBe(true);
    expect(c.aiProvider).toBe("mock");
  });
});
