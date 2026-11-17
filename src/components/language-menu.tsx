"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/domain/locales";
import { useI18n } from "@/i18n/provider";
import { Flag } from "./brand/flags";
import type { Tone } from "./ui";

/** The six languages as big choices: flag, the language in its own words, and a check on the current one. */
export function LanguageChoices({ onChosen, className = "" }: { onChosen?: (locale: Locale) => void; className?: string }) {
  const { locale, t, setLocale } = useI18n();
  return (
    <ul aria-label={t.languageMenu} className={className}>
      {LOCALES.map((l) => {
        const current = l === locale;
        return (
          <li key={l}>
            <button
              type="button"
              lang={l}
              aria-current={current ? "true" : undefined}
              onClick={() => {
                setLocale(l);
                onChosen?.(l);
              }}
              className={`flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-2xl px-3 text-left font-semibold transition duration-200 active:scale-[0.98] ${
                current ? "bg-ink text-night" : "text-ink hover:bg-surface"
              }`}
            >
              <Flag locale={l} />
              <span className="min-w-0 flex-1 truncate">{LOCALE_NAMES[l]}</span>
              {current ? <Check aria-hidden="true" className="size-4 shrink-0" strokeWidth={3.5} /> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** The language picker at the top of the app: a pill with the current flag that opens the list of languages. */
export function LanguageMenu({ className = "", tone = "floor" }: { className?: string; tone?: Tone }) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLButtonElement>('[aria-current="true"]')?.focus();
    const onPointer = (e: PointerEvent) => {
      if (e.target instanceof Node && !root.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const skin = tone === "stage" ? "bg-stage-soft text-stage-ink hover:brightness-110" : "bg-surface-2 text-ink hover:bg-[#3b332e]";
  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${t.languageMenu}: ${LOCALE_NAMES[locale]}`}
        onClick={() => setOpen(!open)}
        className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full pl-2.5 pr-3 text-sm font-semibold transition duration-200 active:scale-[0.97] ${skin}`}
      >
        <Flag locale={locale} />
        <span aria-hidden="true">{LOCALE_NAMES[locale]}</span>
        <ChevronDown aria-hidden="true" className={`size-4 transition duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div id={panelId} className="animate-pop panel-float absolute right-0 top-full z-30 mt-2 w-60 origin-top-right rounded-tile p-1.5">
          <LanguageChoices
            className="space-y-0.5"
            onChosen={() => {
              setOpen(false);
              trigger.current?.focus();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
