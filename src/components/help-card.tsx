import { Volume2, X } from "lucide-react";
import type { Help } from "@/lib/types";
import type { Locale } from "@/domain/locales";
import { useI18n } from "@/i18n/provider";
import { BulbSticker } from "./brand/stickers";
import { QUIET_ACTION, ROUND_BUTTON } from "./ui";

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
    <section aria-label={t.help.region} className="animate-rise space-y-3 rounded-card border-2 border-accent bg-surface p-5 text-ink">
      <div className="flex items-start gap-3">
        <BulbSticker size={40} className="-rotate-6" />
        <p className="flex-1 pt-1 text-sm">
          <span className="font-bold text-accent-ink">{translationLocale === "en" ? t.help.inOtherWords : t.help.inYourLanguage} </span>
          <span lang={translationLocale}>{help.translation}</span>
        </p>
        <button type="button" onClick={onClose} aria-label={t.help.close} className={`-mr-1.5 -mt-1.5 ${ROUND_BUTTON}`}>
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
      <div className="divider-dashed pt-4">
        <p className="kicker text-accent-ink">{t.help.youCouldSay}</p>
        <p lang="en" className="mt-2 text-xl font-bold leading-snug">{help.suggestion}</p>
        <p className="mt-2 text-sm text-muted">{help.tip}</p>
      </div>
      <button type="button" onClick={onListen} className={QUIET_ACTION}>
        <Volume2 aria-hidden="true" className="size-4 text-accent-ink" /> {t.help.listen}
      </button>
    </section>
  );
}
