// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFERENCES, PREFERENCES_KEY, readPreferences, usePreferences } from "./use-preferences";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("usePreferences", () => {
  it("starts with defaults and remembers changes", () => {
    const { result } = renderHook(() => usePreferences());
    expect(result.current.level).toBe("intermediate");
    act(() => result.current.update({ level: "beginner", avatarId: "daniel" }));
    expect(result.current).toMatchObject({ level: "beginner", avatarId: "daniel" });
    expect(readPreferences()).toEqual({ level: "beginner", avatarId: "daniel" });
  });

  it("ignores bad stored values and blocked storage", () => {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ level: "expert", avatarId: "bob" }));
    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);
    window.localStorage.setItem(PREFERENCES_KEY, "{not json");
    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => usePreferences());
    act(() => result.current.update({ level: "advanced" }));
    expect(result.current.level).toBe("advanced");
  });
});
