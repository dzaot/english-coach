import { describe, expect, it } from "vitest";
import { LOCALES } from "@/domain/locales";
import { MESSAGES, runtimeMessages, setRuntimeLocale } from "./messages";

type Tree = { [key: string]: unknown };

/** Every leaf of a messages tree: strings as they are, functions called with sample values. */
function leaves(tree: Tree, path = ""): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]): [string, string][] => {
    const at = path ? `${path}.${key}` : key;
    if (typeof value === "string") return [[at, value]];
    if (typeof value === "function") return [[at, String((value as (...a: unknown[]) => unknown)(2, "x"))]];
    return leaves(value as Tree, at);
  });
}

describe("interface texts", () => {
  const english = leaves(MESSAGES.en).map(([path]) => path);

  it.each(LOCALES)("%s has every text, none empty, and no em dash", (locale) => {
    const own = leaves(MESSAGES[locale]);
    expect(own.map(([path]) => path)).toEqual(english);
    for (const [path, text] of own) {
      expect(text.trim(), path).not.toBe("");
      expect(text, path).not.toContain("—");
    }
  });

  it("keeps publik's English button names in the gate notes", () => {
    for (const locale of LOCALES) expect(MESSAGES[locale].gate.timeoutSignIn).toContain("Sign in with publik");
  });

  it("switches the texts used outside React", () => {
    setRuntimeLocale("fr");
    expect(runtimeMessages()).toBe(MESSAGES.fr);
    setRuntimeLocale("en");
    expect(runtimeMessages()).toBe(MESSAGES.en);
  });
});
