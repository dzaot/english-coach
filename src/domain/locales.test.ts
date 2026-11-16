import { describe, expect, it } from "vitest";
import { LOCALES, LOCALE_NAMES, detectLocale, isLocale, speakerOf } from "./locales";

describe("locales", () => {
  it("offers English, Spanish, Portuguese, French, Italian and German, each named in its own language", () => {
    expect(LOCALES).toEqual(["en", "es", "pt", "fr", "it", "de"]);
    expect(LOCALE_NAMES.es).toBe("Español");
    expect(LOCALE_NAMES.de).toBe("Deutsch");
  });

  it("picks the first supported browser language, regional variants included", () => {
    expect(detectLocale(["pt-BR", "en-US"])).toBe("pt");
    expect(detectLocale(["ja-JP", "fr-CA"])).toBe("fr");
    expect(detectLocale(["ja-JP", "ko"])).toBe("en");
    expect(detectLocale([])).toBe("en");
  });

  it("checks values and names who is speaking", () => {
    expect(isLocale("it")).toBe(true);
    expect(isLocale("xx")).toBe(false);
    expect(speakerOf("de")).toBe("a German speaker");
    expect(speakerOf("en")).toBe("a non-native speaker");
  });
});
