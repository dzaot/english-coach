import { beforeEach, describe, expect, it } from "vitest";
import { setContext } from "@/server/context";
import { resetRateLimits } from "@/server/http";
import { SESSION_COOKIE } from "@/server/session";
import { testContext } from "@/test/context";
import { POST } from "./route";

const SID = "3f0c2b1e-8a4d-4c6e-9f1a-2b3c4d5e6f70";
const post = (body: unknown) =>
  new Request("http://localhost/api/onboarding", {
    method: "POST",
    headers: { cookie: `${SESSION_COOKIE}=${SID}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const answers = {
  locale: "es",
  goal: "interview",
  pains: ["blank", "mistakes", "blank"],
  confidence: 2,
  industryId: "other",
  industryOther: "  Enfermería  ",
  level: "beginner",
  avatarId: "emily",
  completed: true,
};

beforeEach(() => resetRateLimits());

describe("onboarding answers over HTTP", () => {
  it("saves what the person answered, tidied up, under their session", async () => {
    const ctx = testContext();
    setContext(ctx);
    const res = await POST(post(answers));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ saved: true, completed: true });
    expect(await ctx.store.getOnboarding(SID)).toEqual({
      ...answers,
      pains: ["blank", "mistakes"],
      industryOther: "Enfermería",
      sid: SID,
      createdAt: "2026-11-15T18:00:00.000Z",
    });
    expect(await ctx.store.getOnboarding("someone-else")).toBeNull();
  });

  it("keeps one row per person: answering again replaces it", async () => {
    const ctx = testContext();
    setContext(ctx);
    await POST(post({ ...answers, completed: false, confidence: null, level: null, avatarId: null }));
    expect(await ctx.store.getOnboarding(SID)).toMatchObject({ completed: false, confidence: null, level: null });
    await POST(post({ ...answers, confidence: 4 }));
    expect(await ctx.store.getOnboarding(SID)).toMatchObject({ completed: true, confidence: 4, level: "beginner" });
  });

  it("rejects answers outside the questions", async () => {
    setContext(testContext());
    for (const bad of [
      { ...answers, goal: "world_domination" },
      { ...answers, confidence: 9 },
      { ...answers, pains: ["shyness"] },
      { ...answers, industryOther: "x".repeat(61) },
      { ...answers, locale: "xx" },
      { goal: "interview" },
      null,
    ]) {
      expect((await POST(post(bad))).status).toBe(400);
    }
  });

  it("refuses a request from another site", async () => {
    setContext(testContext());
    const res = await POST(
      new Request("http://localhost/api/onboarding", {
        method: "POST",
        headers: { cookie: `${SESSION_COOKIE}=${SID}`, "content-type": "application/json", origin: "https://evil.example" },
        body: JSON.stringify(answers),
      }),
    );
    expect(res.status).toBe(403);
  });
});
