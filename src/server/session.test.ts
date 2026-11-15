import { describe, expect, it } from "vitest";
import { SESSION_COOKIE, readSession, sessionCookieHeader } from "./session";

const SID = "3f0c2b1e-8a4d-4c6e-9f1a-2b3c4d5e6f70";

describe("readSession", () => {
  it("reads a valid session id from the cookie header", () => {
    const req = new Request("http://localhost/api", { headers: { cookie: `a=1; ${SESSION_COOKIE}=${SID}` } });
    expect(readSession(req)).toEqual({ sid: SID, isNew: false });
  });

  it("creates a new id when the cookie is missing or tampered", () => {
    const fresh = readSession(new Request("http://localhost/api"));
    expect(fresh.isNew).toBe(true);
    expect(fresh.sid).toMatch(/^[0-9a-f-]{36}$/);
    const bad = readSession(new Request("http://localhost/api", { headers: { cookie: `${SESSION_COOKIE}=../../etc` } }));
    expect(bad.isNew).toBe(true);
  });
});

describe("sessionCookieHeader", () => {
  it("is HttpOnly and SameSite=Lax, Secure only in production", () => {
    expect(sessionCookieHeader(SID, false)).toBe(
      `${SESSION_COOKIE}=${SID}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`,
    );
    expect(sessionCookieHeader(SID, true)).toContain("; Secure");
  });
});
