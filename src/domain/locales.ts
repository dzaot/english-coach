/**
 * Languages the app can be shown in. The practice itself is always in English; the chosen language is used
 * for the interface and, depending on the level, for explanations and translations.
 */

export const LOCALES = ["en", "es", "pt", "fr", "it", "de"] as const;
export type Locale = (typeof LOCALES)[number];

/** Each language in its own words, for the language menu. */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  it: "Italiano",
  de: "Deutsch",
};

/** Each language's name in English, for prompts ("a French speaker"). */
export const LANGUAGE_NAME_EN: Readonly<Record<Locale, string>> = {
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  fr: "French",
  it: "Italian",
  de: "German",
};

/** Who is practicing, for prompts. English UI users may speak anything, so they are just "non-native". */
export function speakerOf(locale: Locale): string {
  return locale === "en" ? "a non-native speaker" : `a ${LANGUAGE_NAME_EN[locale]} speaker`;
}

/** How the AI should write explanations in each language (register and form of address). */
export const PROMPT_LANGUAGE: Readonly<Record<Locale, string>> = {
  en: "simple, friendly English, speaking to the user as \"you\"",
  es: "neutral Latin American Spanish, speaking to the user as \"tú\"",
  pt: "Brazilian Portuguese, speaking to the user as \"você\"",
  fr: "French, speaking to the user as \"tu\"",
  it: "Italian, speaking to the user as \"tu\"",
  de: "German, speaking to the user as \"du\"",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** The first supported language in the browser's list ("pt-BR" counts as "pt"), else English. */
export function detectLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return "en";
}
