"use client";

import { ChevronDown, Globe } from "lucide-react";
import { LOCALES, LOCALE_NAMES, isLocale } from "@/domain/locales";
import { useI18n } from "@/i18n/provider";

/** The language picker at the top of the app. Each language is named in its own words. */
export function LanguageMenu({ className = "" }: { className?: string }) {
  const { locale, t, setLocale } = useI18n();
  return (
    <label className={`relative inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface pl-3 pr-8 text-sm font-semibold text-ink transition duration-200 hover:bg-surface-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${className}`}>
      <Globe aria-hidden="true" className="size-4 shrink-0 text-primary-ink" />
      <select
        aria-label={t.languageMenu}
        value={locale}
        onChange={(e) => {
          if (isLocale(e.target.value)) setLocale(e.target.value);
        }}
        className="cursor-pointer appearance-none bg-transparent py-2 font-semibold text-ink outline-none"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 size-4 text-muted" />
    </label>
  );
}
