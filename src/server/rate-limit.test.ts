import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("rate limiter", () => {
  it("allows up to the limit inside the window, then blocks, then recovers", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(limiter.allow("a", 0)).toBe(true);
    expect(limiter.allow("a", 10)).toBe(true);
    expect(limiter.allow("a", 20)).toBe(false);
    expect(limiter.allow("b", 20)).toBe(true);
    expect(limiter.allow("a", 1500)).toBe(true);
  });
});
