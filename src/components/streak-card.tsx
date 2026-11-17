import { Check } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { weekdayInitial, weekdayName } from "@/lib/format";
import type { Progress } from "@/lib/types";
import { FlameSticker } from "./brand/stickers";

/** Daily streak with the last 7 days as bars. Practiced days are tall, orange and carry a check: never color alone. */
export function StreakCard({ progress }: { progress: Pick<Progress, "streak" | "week"> }) {
  const { t, locale } = useI18n();
  const { streak, week } = progress;
  const message = streak.practicedToday ? t.streak.doneToday : streak.current > 0 ? t.streak.keep : t.streak.start;
  const alive = streak.current > 0;
  return (
    <section aria-labelledby="streak-title" className="panel rounded-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="streak-title" className="kicker text-muted">
            {t.streak.title}
          </h2>
          <p className="display tabular mt-2 text-[2.75rem] font-black">{t.streak.days(streak.current)}</p>
        </div>
        <FlameSticker size={56} className={alive ? "animate-flicker" : "opacity-40 grayscale"} />
      </div>
      <ol className="mt-6 grid h-28 grid-cols-7 items-end gap-2" aria-label={t.streak.lastDays}>
        {week.map((d) => (
          <li key={d.day} className="flex h-full flex-col items-center justify-end gap-2">
            <span
              className={`flex w-full items-end justify-center rounded-full pb-2 transition-[height] duration-500 ${
                d.practiced ? "h-full bg-primary text-on-primary" : "h-9 bg-surface-2"
              }`}
            >
              {d.practiced ? <Check aria-hidden="true" className="size-4" strokeWidth={3.5} /> : null}
            </span>
            <span aria-hidden="true" className="text-sm font-semibold text-muted">
              {weekdayInitial(d.day, locale)}
            </span>
            <span className="sr-only">{`${weekdayName(d.day, locale)}: ${d.practiced ? t.streak.practiced : t.streak.notPracticed}`}</span>
          </li>
        ))}
      </ol>
      <div className="divider-dashed mt-5 flex items-center justify-between gap-4 pt-4">
        <p className="text-sm text-muted">{message}</p>
        <p className="tabular shrink-0 text-right text-sm text-muted">
          {t.streak.best}
          <br />
          <span className="font-bold text-ink">{t.streak.days(streak.best)}</span>
        </p>
      </div>
    </section>
  );
}
