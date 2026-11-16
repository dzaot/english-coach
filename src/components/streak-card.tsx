import { Check, Flame } from "lucide-react";
import { daysLabel, weekdayInitial, weekdayName } from "@/lib/format";
import type { Progress } from "@/lib/types";

/** Daily streak with the last 7 days. Practiced days use a check mark, not color alone. */
export function StreakCard({ progress }: { progress: Pick<Progress, "streak" | "week"> }) {
  const { streak, week } = progress;
  const message = streak.practicedToday
    ? "You practiced today. Come back tomorrow to keep your streak."
    : streak.current > 0
      ? "Practice today to keep your streak."
      : "Practice 5 minutes today to start your streak.";
  return (
    <section aria-labelledby="streak-title" className="rounded-3xl bg-ink p-5 text-bg shadow-card">
      <div className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary">
          <Flame aria-hidden="true" className={`size-8 ${streak.current > 0 ? "animate-flicker" : ""}`} />
        </span>
        <div className="min-w-0">
          <h2 id="streak-title" className="text-sm font-medium uppercase tracking-wide opacity-80">
            Your streak
          </h2>
          <p className="tabular text-3xl font-extrabold leading-tight">{daysLabel(streak.current)}</p>
        </div>
        <p className="tabular ml-auto text-right text-sm opacity-80">
          Best
          <br />
          <span className="font-semibold">{daysLabel(streak.best)}</span>
        </p>
      </div>
      <ol className="mt-4 grid grid-cols-7 gap-1.5" aria-label="Last 7 days">
        {week.map((d) => (
          <li key={d.day} className="flex flex-col items-center gap-1 text-xs font-medium">
            <span
              className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${d.practiced ? "bg-primary text-on-primary" : "border border-bg/30"}`}
            >
              {d.practiced ? <Check aria-hidden="true" className="size-4" strokeWidth={3} /> : null}
            </span>
            <span aria-hidden="true" className="opacity-80">{weekdayInitial(d.day)}</span>
            <span className="sr-only">{`${weekdayName(d.day)}: ${d.practiced ? "practiced" : "no practice"}`}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm opacity-90">{message}</p>
    </section>
  );
}
