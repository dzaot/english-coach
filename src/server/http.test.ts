import { afterEach, describe, expect, it } from "vitest";
import { testContext } from "@/test/context";
import { setContext } from "./context";
import { AppError } from "./errors";
import { handle, readJson } from "./http";
import { SESSION_COOKIE } from "./session";

afterEach(() => setContext(null));

describe("handle", () => {
  it("sets a session cookie for a new visitor and disables caching", async () => {
    setContext(testContext());
    const res = await handle(new Request("http://localhost/api/x"), async ({ sid }) => ({ sid }));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain(`${SESSION_COOKIE}=`);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("refuses a cross-site write", async () => {
    setContext(testContext());
    const req = new Request("http://localhost/api/x", { method: "POST", headers: { origin: "https://evil.test", host: "localhost" } });
    const res = await handle(req, async () => ({ ok: true }));
    expect(res.status).toBe(403);
  });

  it("allows a same-origin write", async () => {
    setContext(testContext());
    const req = new Request("http://localhost:3000/api/x", { method: "POST", headers: { origin: "http://localhost:3000", host: "localhost:3000" } });
    expect((await handle(req, async () => ({ ok: true }))).status).toBe(200);
  });

  it("renders thrown AppErrors", async () => {
    setContext(testContext());
    const res = await handle(new Request("http://localhost/api/x"), async () => {
      throw new AppError("not_found");
    });
    expect(res.status).toBe(404);
  });
});

describe("readJson", () => {
  it("rejects a body that is not JSON", async () => {
    await expect(readJson(new Request("http://x", { method: "POST", body: "nope" }))).rejects.toMatchObject({ code: "invalid_input" });
  });
});
