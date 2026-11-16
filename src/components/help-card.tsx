import { Lightbulb, Volume2, X } from "lucide-react";
import type { Help } from "@/lib/types";
import type { Locale } from "@/domain/locales";
import { useI18n } from "@/i18n/provider";

/** "Help me": what the counterpart said (in Spanish or simpler English), a suggested answer to read out loud, and one tip. */
export function HelpCard({
  help,
  translationLocale,
  onListen,
  onClose,
}: {
  help: Help;
  /** The language of the translation: the person's own, or "en" for simpler English (advanced). */
  translationLocale: Locale;
  onListen: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <section aria-label={t.help.region} className="animate-rise space-y-2 rounded-3xl border-2 border-accent bg-accent-soft p-4 text-ink">
      <div className="flex items-start gap-2">
        <Lightbulb aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent-ink" />
        <p className="flex-1 text-sm">
          <span className="font-semibold">{translationLocale === "en" ? t.help.inOtherWords : t.help.inYourLanguage} </span>
          <span lang={translationLocale}>{help.translation}</span>
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.help.close}
          className="-mr-2 -mt-2 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition duration-200 hover:bg-surface"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
      <p className="text-sm font-semibold text-accent-ink">{t.help.youCouldSay}</p>
      <p lang="en" className="text-lg font-semibold leading-snug">{help.suggestion}</p>
      <p className="text-sm text-muted">{help.tip}</p>
      <button
        type="button"
        onClick={onListen}
        className="-ml-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-accent-ink transition duration-200 hover:bg-surface"
      >
        <Volume2 aria-hidden="true" className="size-4" /> {t.help.listen}
      </button>
    </section>
  );
}
