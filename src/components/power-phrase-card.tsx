"use client";

import { Volume2 } from "lucide-react";
import { POWER_PHRASE_BONUS, type PowerPhrase } from "@/domain/power-phrases";
import { useI18n } from "@/i18n/provider";
import { useSpeaker } from "@/lib/hooks/use-speaker";
import { SparkSticker } from "./brand/stickers";

/** The phrase of the day, on lime: what it means, how it sounds in a sentence, and the bonus for using it. */
export function PowerPhraseCard({ phrase }: { phrase: PowerPhrase }) {
  const { t } = useI18n();
  const speaker = useSpeaker();
  return (
    <section aria-labelledby="power-title" className="stage-lime relative rounded-card bg-stage p-5 text-stage-ink">
      <SparkSticker size={44} className="absolute -top-4 right-4 rotate-12 [--sticker-edge:var(--night)]" />
      <h2 id="power-title" className="kicker">
        {t.power.title}
      </h2>
      <p lang="en" className="display mt-2 text-[1.75rem] font-black leading-[1.05]">
        {phrase.phrase}
      </p>
      <p lang="en" className="mt-3 font-medium">
        {phrase.meaning}
      </p>
      <p lang="en" className="mt-1 font-medium opacity-80">
        “{phrase.example}”
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => speaker.play(`power-${phrase.id}`, phrase.example)}
          className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full bg-night px-4 text-sm font-semibold text-ink transition duration-200 hover:bg-surface-2 active:scale-[0.97]"
        >
          <Volume2 aria-hidden="true" className="size-4" /> {t.power.hear}
        </button>
        <p className="text-sm font-bold">{t.power.bonus(POWER_PHRASE_BONUS)}</p>
      </div>
    </section>
  );
}
