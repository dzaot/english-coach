import { describe, expect, it } from "vitest";
import { fakeFetch, json } from "@/test/fake-fetch";
import { APP_SLUG, gateScreen, provisionInstall, readWallet, sendTelemetry, type Wallet } from "./publik";

const ORIGIN = "https://publikhq.com";
const wallet = (over: Partial<Wallet> = {}): Wallet => ({
  claim_state: "claimed",
  claim_url: null,
  account: { handle: "maria" },
  plan: { kind: "none", label: null },
  balance_micros: 0,
  top_up_url: "https://publikhq.com/wallet",
  used_percent: null,
  ...over,
});

describe("provisionInstall", () => {
  it("posts the app token and install id to /api/v1/installs", async () => {
    const { fetch, calls } = fakeFetch({
      "/api/v1/installs": json({ key: "pk_live_1", base_url: `${ORIGIN}/api/v1`, install_id: "i-1", claim_url: "https://publikhq.com/claim/x" }, 201),
    });
    const cred = await provisionInstall(fetch, { origin: ORIGIN, appToken: "pat_1", installId: "i-1", os: "linux" });
    expect(cred).toEqual({ key: "pk_live_1", baseUrl: `${ORIGIN}/api/v1`, installId: "i-1", claimUrl: "https://publikhq.com/claim/x" });
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body).toMatchObject({ app_token: "pat_1", app_slug: APP_SLUG, install_id: "i-1", os: "linux", disclosure_version: 1 });
  });

  it("asks again with a new install id when the old one was used", async () => {
    let n = 0;
    const { fetch, calls } = fakeFetch({
      "/api/v1/installs": () => (++n === 1 ? json({}, 200) : json({ key: "pk_live_2", install_id: "i-2" }, 201)),
    });
    const cred = await provisionInstall(fetch, { origin: ORIGIN, appToken: "pat_1", installId: "i-1", os: "linux" });
    expect(cred.key).toBe("pk_live_2");
    expect(JSON.parse(String(calls[1].init?.body)).install_id).not.toBe("i-1");
  });

  it("refuses to start without an app token", async () => {
    const { fetch } = fakeFetch({});
    await expect(provisionInstall(fetch, { origin: ORIGIN, appToken: "", installId: "i", os: "linux" })).rejects.toThrow(/app token/);
  });

  it("surfaces publik's error message", async () => {
    const { fetch } = fakeFetch({ "/api/v1/installs": json({ error: { message: "App is blocked" } }, 403) });
    await expect(provisionInstall(fetch, { origin: ORIGIN, appToken: "pat_1", installId: "i", os: "linux" })).rejects.toThrow("App is blocked");
  });

  it("gives up after two unusable answers", async () => {
    const { fetch } = fakeFetch({ "/api/v1/installs": json({}, 200) });
    await expect(provisionInstall(fetch, { origin: ORIGIN, appToken: "pat_1", installId: "i", os: "linux" })).rejects.toThrow(/could not set up/);
  });
});

describe("readWallet", () => {
  it("reads the wallet with the install key", async () => {
    const { fetch, calls } = fakeFetch({ "/api/v1/wallet": json({ claim_state: "anonymous", claim_url: "https://c", top_up_url: "https://t" }) });
    const r = await readWallet(fetch, ORIGIN, "pk_live_1");
    expect(r.wallet?.claim_state).toBe("anonymous");
    expect(r.wallet?.plan.kind).toBe("none");
    expect((calls[0].init?.headers as Record<string, string>).authorization).toBe("Bearer pk_live_1");
  });

  it("returns no wallet on 401", async () => {
    const { fetch } = fakeFetch({ "/api/v1/wallet": json({ error: { message: "revoked" } }, 401) });
    expect(await readWallet(fetch, ORIGIN, "pk")).toEqual({ status: 401, wallet: null, message: "revoked" });
  });
});

describe("gateScreen", () => {
  it("uses publik's exact words for sign-in and unreachable", () => {
    const s = gateScreen("sign_in", null);
    expect(s.title).toBe("Sign in with publik");
    expect(s.buttons).toEqual([{ action: "sign_in", label: "Sign in with publik" }]);
    const u = gateScreen("unreachable", null);
    expect(u.body).toBe("publik is not reachable. Check your connection.");
    expect(u.buttons[0].label).toBe("Retry");
  });

  it("offers Get a plan when there is no plan and no balance", () => {
    const s = gateScreen("choose", wallet());
    expect(s.title).toBe("Choose how to pay for AI");
    expect(s.body).toContain("@maria");
    expect(s.buttons.map((b) => b.label)).toEqual(["Get a plan", "Use my own key"]);
  });

  it("offers Connect your plan when a plan or balance exists", () => {
    const s = gateScreen("choose", wallet({ plan: { kind: "plan", label: "Basic" }, balance_micros: 10 }));
    expect(s.title).toBe("Connect your plan");
    expect(s.body).toContain("Your plan: Basic.");
    expect(s.buttons.map((b) => b.label)).toEqual(["Connect your plan", "Use my own key"]);
    const pack = gateScreen("choose", wallet({ account: null, plan: { kind: "pack", label: null }, balance_micros: 5 }));
    expect(pack.body).toContain("You have publik use ready.");
    expect(pack.body).toContain("You are signed in to publik.");
  });
});

describe("sendTelemetry", () => {
  it("sends app_opened to /api/v1/telemetry with the install key and no content", async () => {
    const { fetch, calls } = fakeFetch({ "/api/v1/telemetry": json({}, 202) });
    const status = await sendTelemetry(fetch, { origin: ORIGIN, key: "pk_live_1", telemetryId: "t-1", event: "app_opened", os: "linux" });
    expect(status).toBe(202);
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body).toEqual({ v: 1, app: APP_SLUG, install_id: "t-1", event: "app_opened", app_version: "0.1.0", os: "linux" });
  });

  it("never throws", async () => {
    const { fetch } = fakeFetch({});
    expect(await sendTelemetry(fetch, { origin: ORIGIN, key: "pk", telemetryId: "t", event: "active_session", os: "linux" })).toBe(0);
  });
});
