"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { detectLocale, isLocale, type Locale } from "@/domain/locales";
import { MESSAGES, setRuntimeLocale, type Messages } from "./messages";

/** The interface language: saved choice, else the browser's language, else English. Stored in this browser only. */

export const LOCALE_KEY = "dilo:locale";

interface I18n {
  readonly locale: Locale;
  readonly t: Messages;
  readonly setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18n>({ locale: "en", t: MESSAGES.en, setLocale: () => undefined });

function storedLocale(): Locale | null {
  try {
    const value = window.localStorage.getItem(LOCALE_KEY);
    return isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

function browserLocale(): Locale {
  const list = navigator.languages?.length ? navigator.languages : [navigator.language ?? "en"];
  return detectLocale(list);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // English on the server and the first paint, so the HTML matches; the saved or browser language right after.
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const found = storedLocale() ?? browserLocale();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser-only settings after hydration
    if (found !== "en") setLocaleState(found);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    setRuntimeLocale(locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    try {
      window.localStorage.setItem(LOCALE_KEY, next);
    } catch {
      /* storage blocked: keep it for this visit */
    }
    setRuntimeLocale(next);
    setLocaleState(next);
  }, []);

  const value = useMemo(() => ({ locale, t: MESSAGES[locale], setLocale }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  return useContext(I18nContext);
}
