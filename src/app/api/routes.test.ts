import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setContext } from "@/server/context";
import { resetRateLimits } from "@/server/http";
import { resetTelemetryThrottle } from "@/server/publik/gate";
import { SESSION_COOKIE } from "@/server/session";
import { GATE_ENV, testContext } from "@/test/context";
import { fakeFetch, json } from "@/test/fake-fetch";
import * as gate from "./gate/route";
import * as phrases from "./phrases/[id]/route";
import * as practiceById from "./practice/[id]/route";
import * as finish from "./practice/[id]/finish/route";
import * as turn from "./practice/[id]/turn/route";
import * as practice from "./practice/route";
import * as progress from "./progress/route";
import * as telemetry from "./telemetry/route";

const SID = "3f0c2b1e-8a4d-4c6e-9f1a-2b3c4d5e6f70";
const cookie = { cookie: `${SESSION_COOKIE}=${SID}` };
const post = (path: string, body: unknown) =>
  new Request(`http://localhost${path}`, { method: "POST", headers: { ...cookie, "content-type": "application/json" }, body: JSON.stringify(body) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  resetRateLimits();
  resetTelemetryThrottle();
});
afterEach(() => setContext(null));

describe("practice flow over HTTP (mock AI)", () => {
  it("starts, takes turns by text and audio, finishes and shows progress", async () => {
    setContext(testContext());
    const started = await (await practice.POST(post("/api/practice", { scenarioId: "client_call", industryId: "customer_support" }))).json();
    const id = started.practice.id;
    expect(started.practice.turns[0].text).toContain("Michael");

    const form = new FormData();
    form.append("text", "Sorry about that, let me check your account.");
    const t1 = await turn.POST(new Request(`http://localhost/api/practice/${id}/turn`, { method: "POST", headers: cookie, body: form }), params(id));
    expect(t1.status).toBe(200);

    const audioForm = new FormData();
    audioForm.append("audio", new Blob([new Uint8Array(7)], { type: "audio/webm" }), "turn.webm");
    const t2 = await (await turn.POST(new Request(`http://localhost/api/practice/${id}/turn`, { method: "POST", headers: cookie, body: audioForm }), params(id))).json();
    expect(t2.practice.canFinish).toBe(true);

    const fin = await (await finish.POST(post(`/api/practice/${id}/finish`, { tzOffset: 300 }), params(id))).json();
    expect(fin.feedback.betterPhrases).toHaveLength(3);
    expect(fin.streak.current).toBe(1);

    const one = await (await practiceById.GET(new Request(`http://localhost/api/practice/${id}`, { headers: cookie }), params(id))).json();
    expect(one.practice.feedback.score).toBe(72);

    const prog = await (await progress.GET(new Request("http://localhost/api/progress?tz=300", { headers: cookie }))).json();
    expect(prog.toReview).toBe(3);

    const phraseId = prog.phrases[0].id;
    const patched = await phrases.PATCH(
      new Request(`http://localhost/api/phrases/${phraseId}`, { method: "PATCH", headers: { ...cookie, "content-type": "application/json" }, body: JSON.stringify({ reviewed: true }) }),
      params(phraseId),
    );
    expect((await patched.json()).phrase.reviewedAt).not.toBeNull();
  });

  it("rejects a turn without audio or text", async () => {
    setContext(testContext());
    const started = await (await practice.POST(post("/api/practice", { scenarioId: "presentation", industryId: "tech" }))).json();
    const res = await turn.POST(
      new Request("http://localhost/api/practice/x/turn", { method: "POST", headers: cookie, body: new FormData() }),
      params(started.practice.id),
    );
    expect(res.status).toBe(400);
    const notForm = await turn.POST(post(`/api/practice/${started.practice.id}/turn`, { text: "hi" }), params(started.practice.id));
    expect(notForm.status).toBe(400);
  });

  it("limits how fast one person can call the AI", async () => {
    setContext(testContext());
    const statuses: number[] = [];
    for (let i = 0; i < 25; i++) {
      statuses.push((await practice.POST(post("/api/practice", { scenarioId: "team_meeting", industryId: "general" }))).status);
    }
    expect(statuses).toContain(429);
  });

  it("validates the progress time zone", async () => {
    setContext(testContext());
    expect((await progress.GET(new Request("http://localhost/api/progress?tz=abc", { headers: cookie }))).status).toBe(400);
  });
});

describe("gate and telemetry routes", () => {
  it("reports demo mode when the gate is off", async () => {
    setContext(testContext());
    const res = await gate.GET(new Request("http://localhost/api/gate", { headers: cookie }));
    expect(await res.json()).toMatchObject({ state: "ready", mode: "demo" });
    expect(await (await telemetry.POST(post("/api/telemetry", { event: "app_opened" }))).json()).toEqual({ result: "skipped" });
  });

  it("blocks practice until Sign in with publik is done", async () => {
    const { fetch } = fakeFetch({
      "/api/v1/installs": json({ key: "pk_live_z", install_id: "i" }, 201),
      "/api/v1/wallet": json({ claim_state: "claimed", top_up_url: "https://publikhq.com/wallet" }),
    });
    setContext(testContext({ env: GATE_ENV, fetch }));
    const blocked = await practice.POST(post("/api/practice", { scenarioId: "job_interview", industryId: "general" }));
    expect(blocked.status).toBe(403);
    const state = await (await gate.POST(post("/api/gate", { action: "connect" }))).json();
    expect(state).toMatchObject({ state: "ready", mode: "publik" });
  });

  it("rejects an unknown telemetry event", async () => {
    setContext(testContext());
    expect((await telemetry.POST(post("/api/telemetry", { event: "page_view" }))).status).toBe(400);
  });
});
