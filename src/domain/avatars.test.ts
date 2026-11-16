import { describe, expect, it } from "vitest";
import { AVATARS, getAvatar, isAvatarId } from "./avatars";

describe("avatars", () => {
  it("offers four counterparts, each with a photo and a distinct voice", () => {
    expect(AVATARS.map((a) => a.id)).toEqual(["sarah", "james", "emily", "mike"]);
    expect(new Set(AVATARS.map((a) => a.voice)).size).toBe(4);
    for (const a of AVATARS) {
      expect(a.image).toBe(`/avatars/${a.id}.webp`);
      expect(a.alt.length).toBeGreaterThan(10);
    }
  });

  it("validates ids", () => {
    expect(isAvatarId("emily")).toBe(true);
    expect(isAvatarId("bob")).toBe(false);
    expect(getAvatar("james").name).toBe("James");
    expect(() => getAvatar("bob" as never)).toThrow(/avatar/);
  });
});
