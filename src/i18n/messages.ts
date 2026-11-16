import type { Locale } from "@/domain/locales";
import { de } from "./messages/de";
import { en, type Messages } from "./messages/en";
import { es } from "./messages/es";
import { fr } from "./messages/fr";
import { it } from "./messages/it";
import { pt } from "./messages/pt";

export type { Messages };

/** All interface texts, by language. */
export const MESSAGES: Readonly<Record<Locale, Messages>> = { en, es, pt, fr, it, de };

let current: Messages = en;

/** The language outside React (API errors, recorder errors). Kept in step by the I18nProvider. */
export function setRuntimeLocale(locale: Locale): void {
  current = MESSAGES[locale];
}

export function runtimeMessages(): Messages {
  return current;
}
