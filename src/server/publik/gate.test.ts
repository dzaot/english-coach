import { beforeEach, describe, expect, it } from "vitest";
import { GATE_ENV, testContext } from "@/test/context";
import { fakeFetch, json } from "@/test/fake-fetch";
import { seal } from "@/server/crypto";
import { applyGateAction, getGateState, recordTelemetry, resetTelemetryThrottle, resolveAi } from "./gate";

const SID = "sid-1";
const installs = json({ key: "pk_live_abc", install_id: "inst-1", claim_url: "https://publikhq.com/claim/1" }, 201);
const anonymous = json({ claim_state: "anonymous", claim_url: "https://publikhq.com/claim/1", top_up_url: "https://publikhq.com/wallet" });
const claimed = (extra = {}) =>
  json({ claim_state: "claimed", account: { handle: "ana" }, plan: { kind: "none", label: null }, balance_micros: 0, top_up_url: "https://publikhq.com/wallet", used_percent: null, ...extra });

describe("getGateState", () => {
  beforeEach(() => resetTelemetryThrottle());

  it("is ready in demo mode when the gate is off", async () => {
    expect(await getGateState(testContext(), SID)).toEqual({ state: "ready", mode: "demo", account: null, usedPercent: null });
  });

  it("provisions an install, seals the key and shows Sign in with publik", async () => {
    const { fetch } = fakeFetch({ "/api/v1/installs": installs, "/api/v1/wallet": anonymous });
    const ctx = testContext({ env: GATE_ENV, fetch });
    const state = await getGateState(ctx, SID);
    expect(state).toMatchObject({ state: "screen", screen: { id: "sign_in" }, links: { signIn: "https://publikhq.com/claim/1" } });
    const user = await ctx.store.getOrCreateUser(SID, "t");
    expect(user.installKeySealed).toBeTruthy();
    expect(user.installKeySealed).not.toContain("pk_live_abc");
    expect(JSON.stringify(state)).not.toContain("pk_live_abc");
  });

  it("shows the plan choice once signed in, then ready after Connect", async () => {
    const { fetch, calls } = fakeFetch({ "/api/v1/installs": installs, "/api/v1/wallet": claimed({ plan: { kind: "plan", label: "Basic" }, used_percent: 12.5 }) });
    const ctx = testContext({ env: GATE_ENV, fetch });
    const first = await getGateState(ctx, SID);
    expect(first).toMatchObject({ state: "screen", screen: { id: "choose", title: "Connect your plan" }, links: { getPlan: "https://publikhq.com/wallet" } });
    const after = await applyGateAction(ctx, SID, { action: "connect" });
    expect(after).toEqual({ state: "ready", mode: "publik", account: "ana", usedPercent: 12.5 });
    expect(calls.filter((c) => c.url.includes("/installs"))).toHaveLength(1);
  });

  it("accepts the user's own key, sealed", async () => {
    const { fetch } = fakeFetch({ "/api/v1/installs": installs, "/api/v1/wallet": claimed() });
    const ctx = testContext({ env: GATE_ENV, fetch });
    const state = await applyGateAction(ctx, SID, { action: "own_key", key: "sk-" + "x".repeat(40) });
    expect(state).toMatchObject({ state: "ready", mode: "own_key" });
    expect((await ctx.store.getOrCreateUser(SID, "t")).ownKeySealed).not.toContain("sk-");
  });

  it("rejects a malformed own key and an unknown action", async () => {
    const ctx = testContext({ env: GATE_ENV });
    await expect(applyGateAction(ctx, SID, { action: "own_key", key: "short" })).rejects.toMatchObject({ code: "own_key_invalid" });
    await expect(applyGateAction(ctx, SID, { action: "hack" })).rejects.toMatchObject({ code: "invalid_input" });
  });

  it("asks again after reset", async () => {
    const { fetch } = fakeFetch({ "/api/v1/installs": installs, "/api/v1/wallet": claimed() });
    const ctx = testContext({ env: GATE_ENV, fetch });
    await applyGateAction(ctx, SID, { action: "connect" });
    const state = await applyGateAction(ctx, SID, { action: "reset" });
    expect(state).toMatchObject({ state: "screen", screen: { id: "choose", title: "Choose how to pay for AI" } });
  });

  it("shows the unreachable screen when publik does not answer", async () => {
    const ctx = testContext({ env: GATE_ENV });
    expect(await getGateState(ctx, SID)).toMatchObject({
      state: "screen",
      screen: { id: "unreachable", body: "publik is not reachable. Check your connection." },
    });
  });

  it("shows publik's message when provisioning is refused", async () => {
    const { fetch } = fakeFetch({ "/api/v1/installs": json({ error: { message: "This app is blocked." } }, 403) });
    expect(await getGateState(testContext({ env: GATE_ENV, fetch }), SID)).toMatchObject({ screen: { id: "unreachable", body: "This app is blocked." } });
  });

  it("provisions again when the stored key was revoked", async () => {
    let walletCalls = 0;
    const { fetch, calls } = fakeFetch({
      "/api/v1/installs": installs,
      "/api/v1/wallet": () => (++walletCalls === 1 ? json({ error: { message: "revoked" } }, 401) : anonymous.clone()),
    });
    const ctx = testContext({ env: GATE_ENV, fetch });
    await ctx.store.getOrCreateUser(SID, "t");
    await ctx.store.updateUser(SID, { installKeySealed: seal("pk_live_old", GATE_ENV.APP_SECRET), choice: "publik" });
    expect(await getGateState(ctx, SID)).toMatchObject({ screen: { id: "sign_in" } });
    expect(calls.filter((c) => c.url.includes("/installs"))).toHaveLength(1);
  });

  it("shows unreachable when the wallet answers with an error", async () => {
    const { fetch } = fakeFetch({ "/api/v1/installs": installs, "/api/v1/wallet": json({ error: { message: "Down" } }, 503) });
    expect(await getGateState(testContext({ env: GATE_ENV, fetch }), SID)).toMatchObject({ screen: { id: "unreachable", body: "Down" } });
  });
});

describe("resolveAi", () => {
  it("gives the mock provider in demo mode", async () => {
    const ai = await resolveAi(testContext(), SID);
    expect(await ai.speak("x")).toBeNull();
  });

  it("requires the gate before any AI call", async () => {
    const ctx = testContext({ env: GATE_ENV });
    await expect(resolveAi(ctx, SID)).rejects.toThrow(expect.objectContaining({ code: "gate_required" }));
  });

  it("uses the install key with publik API after Connect", async () => {
    const { fetch, calls } = fakeFetch({
      "/api/v1/installs": installs,
      "/api/v1/wallet": claimed(),
      "/chat/completions": json({ choices: [{ message: { content: "Hi!" } }] }),
    });
    const ctx = testContext({ env: GATE_ENV, fetch });
    await applyGateAction(ctx, SID, { action: "connect" });
    expect(await (await resolveAi(ctx, SID)).chat([], { tier: "fast" })).toBe("Hi!");
    const chat = calls.find((c) => c.url.includes("/chat/completions"))!;
    expect(chat.url).toBe("https://publikhq.com/api/v1/chat/completions");
    expect((chat.init?.headers as Record<string, string>).authorization).toBe("Bearer pk_live_abc");
    expect(JSON.parse(String(chat.init?.body)).model).toBe("publik-fast");
  });

  it("uses the user's own key against OpenAI", async () => {
    const { fetch, calls } = fakeFetch({
      "/api/v1/installs": installs,
      "/api/v1/wallet": claimed(),
      "api.openai.com/v1/chat/completions": json({ choices: [{ message: { content: "Yo" } }] }),
    });
    const ctx = testContext({ env: GATE_ENV, fetch });
    await applyGateAction(ctx, SID, { action: "own_key", key: "sk-" + "k".repeat(40) });
    (await resolveAi(ctx, SID)).chat([], { tier: "balanced" });
    expect(JSON.parse(String(calls.at(-1)?.init?.body)).model).toBe("gpt-4o-mini");
  });

  it("uses PUBLIK_API_KEY in development when the gate is off", async () => {
    const { fetch, calls } = fakeFetch({ "/chat/completions": json({ choices: [{ message: { content: "ok" } }] }) });
    const ctx = testContext({ env: { AI_PROVIDER: "publik", PUBLIK_GATE: "off", PUBLIK_API_KEY: "pk_dev" }, fetch });
    (await resolveAi(ctx, SID)).chat([], { tier: "fast" });
    expect((calls[0].init?.headers as Record<string, string>).authorization).toBe("Bearer pk_dev");
    expect(await getGateState(ctx, SID)).toMatchObject({ state: "ready", mode: "publik" });
  });

  it("fails clearly when publik is chosen with no key at all", async () => {
    const ctx = testContext({ env: { AI_PROVIDER: "publik", PUBLIK_GATE: "off" } });
    await expect(resolveAi(ctx, SID)).rejects.toThrow(expect.objectContaining({ code: "internal" }));
  });
});

describe("recordTelemetry", () => {
  beforeEach(() => resetTelemetryThrottle());

  it("skips when the gate is off", async () => {
    expect(await recordTelemetry(testContext(), SID, "app_opened")).toBe("skipped");
  });

  it("sends app_opened once the gate passed, and throttles repeats", async () => {
    const { fetch, calls } = fakeFetch({
      "/api/v1/installs": installs,
      "/api/v1/wallet": claimed(),
      "/api/v1/telemetry": json({}, 202),
    });
    const ctx = testContext({ env: GATE_ENV, fetch });
    expect(await recordTelemetry(ctx, SID, "app_opened")).toBe("skipped");
    await applyGateAction(ctx, SID, { action: "connect" });
    expect(await recordTelemetry(ctx, SID, "app_opened")).toBe("sent");
    expect(await recordTelemetry(ctx, SID, "app_opened")).toBe("throttled");
    const sent = calls.filter((c) => c.url.includes("/telemetry"));
    expect(sent).toHaveLength(1);
    expect(JSON.parse(String(sent[0].init?.body)).event).toBe("app_opened");
    expect((await ctx.store.getOrCreateUser(SID, "t")).telemetryId).toMatch(/^[0-9a-f-]{36}$/);
  });
});
