"use client";

import { BookmarkCheck, CalendarClock, Volume2 } from "lucide-react";
import { isDue } from "@/domain/drill";
import { formatDay } from "@/lib/format";
import { localToday } from "@/lib/progress";
import { useSpeaker } from "@/lib/hooks/use-speaker";
import type { Phrase } from "@/lib/types";
import { SayItButton } from "./say-it-button";
import { Card, TopBar } from "./ui";
import type { Locale } from "@/domain/locales";
import { useI18n } from "@/i18n/provider";

interface Props {
  phrases: readonly Phrase[];
  onToggle: (id: string, reviewed: boolean) => void;
  onDrilled?: (phrase: Phrase) => void;
  /** Language of the sound tips: the person's own below advanced, else English. */
  tipsLocale?: Locale;
  onBack: () => void;
}

/** Due today first, then pending, then learned. */
function rank(p: Phrase, today: string): number {
  if (isDue(p, today)) return 0;
  return p.reviewedAt ? 2 : 1;
}

/** Phrases to review: the better versions from past feedback. Pending ones first. */
export function PhrasesView({ phrases, onToggle, onDrilled, tipsLocale = "en", onBack }: Props) {
  const { t, locale } = useI18n();
  const speaker = useSpeaker();
  const today = localToday();
  const sorted = [...phrases].sort((a, b) => rank(a, today) - rank(b, today));
  const pending = phrases.filter((p) => !p.reviewedAt).length;
  const due = phrases.filter((p) => isDue(p, today)).length;

  return (
    <div className="animate-rise">
      <TopBar title={t.phrases.title} onBack={onBack} />
      {phrases.length === 0 ? (
        <Card className="text-center">
          <BookmarkCheck aria-hidden="true" className="mx-auto mb-2 size-8 text-muted" />
          <p className="font-semibold">{t.phrases.empty}</p>
          <p className="text-muted">{t.phrases.emptyHint}</p>
        </Card>
      ) : (
        <>
          <p className="mb-3 text-muted">
            <span className="tabular font-semibold text-ink">{t.phrases.left(pending)}</span>
            {due > 0 ? (
              <>
                {", "}
                <span className="tabular font-semibold text-ink">{t.phrases.due(due)}</span>
              </>
            ) : null}
            . {t.phrases.howItWorks}
          </p>
          <ul className="space-y-3">
            {sorted.map((p) => {
              const done = !!p.reviewedAt;
              const dueNow = isDue(p, today);
              return (
                <Card as="li" key={p.id} className={`space-y-2 ${done ? "opacity-75" : ""} ${dueNow ? "border-2 border-primary" : ""}`}>
                  {dueNow ? (
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold text-primary-ink">
                      <CalendarClock aria-hidden="true" className="size-3.5" /> {t.phrases.dueToday}
                    </p>
                  ) : null}
                  {done ? <p lang="en" className="text-lg font-semibold">{p.better}</p> : null}
                  <p className="text-sm text-muted">
                    <span className="font-semibold">{t.phrases.before}</span>
                    <span lang="en">{p.original}</span>
                  </p>
                  <p className="text-sm text-muted">{p.why}</p>
                  {!done && !dueNow && p.dueDay ? (
                    <p className="text-sm text-muted">{t.phrases.nextReview(formatDay(`${p.dueDay}T12:00:00Z`, locale))}</p>
                  ) : null}
                  {!done ? <SayItButton phraseId={p.id} text={p.better} tipsLocale={tipsLocale} onDrilled={onDrilled} /> : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => speaker.play(p.id, p.better)}
                      className="-ml-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-primary-ink transition duration-200 hover:bg-surface-2"
                    >
                      <Volume2 aria-hidden="true" className="size-4" /> {t.phrases.listen}
                    </button>
                    <label className="ml-auto inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={(e) => onToggle(p.id, e.target.checked)}
                        className="size-5 cursor-pointer accent-[var(--accent)]"
                      />
                      {t.phrases.known}
                    </label>
                  </div>
                </Card>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
