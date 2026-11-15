import { describe, expect, it } from "vitest";
import { seal, unseal } from "./crypto";

const SECRET = "a".repeat(32);

describe("seal / unseal", () => {
  it("round-trips a secret", () => {
    const sealed = seal("pk_live_123", SECRET);
    expect(sealed).not.toContain("pk_live_123");
    expect(unseal(sealed, SECRET)).toBe("pk_live_123");
  });

  it("uses a fresh IV every time", () => {
    expect(seal("x", SECRET)).not.toBe(seal("x", SECRET));
  });

  it("returns null with the wrong secret or a damaged value", () => {
    const sealed = seal("pk_live_123", SECRET);
    expect(unseal(sealed, "b".repeat(32))).toBeNull();
    expect(unseal("garbage", SECRET)).toBeNull();
    expect(unseal("v1.aaaa.bbbb.cccc", SECRET)).toBeNull();
  });
});
