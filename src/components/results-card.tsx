import { TrendingUp } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import type { ProgressStats } from "@/lib/types";

/** Visible results: how much English you have spoken and how your score moved. Numbers come from your own practices. */

const CHART_W = 100;
const CHART_H = 32;
const CHART_PAD = 3;

export function sparklinePoints(scores: readonly number[]): string {
  if (scores.length < 2) return "";
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = max - min || 1;
  return scores
    .map((s, i) => {
      const x = (i / (scores.length - 1)) * CHART_W;
      const y = CHART_H - CHART_PAD - ((s - min) / span) * (CHART_H - 2 * CHART_PAD);
      return `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`;
    })
    .join(" ");
}

export function ResultsCard({ stats }: { stats: ProgressStats }) {
  const { t, locale } = useI18n();
  const fmt = new Intl.NumberFormat(locale);
  const { scores } = stats;
  const first = scores[0];
  const last = scores[scores.length - 1];
  const delta = scores.length >= 2 ? last - first : null;
  const tiles = [
    { value: fmt.format(stats.wordsSpoken), label: t.results.words },
    { value: fmt.format(stats.practices), label: t.results.practices(stats.practices) },
    { value: fmt.format(stats.phrasesLearned), label: t.results.phrases(stats.phrasesLearned) },
  ];

  return (
    <section aria-labelledby="results-title" className="panel rounded-card p-5">
      <h2 id="results-title" className="kicker text-muted">
        {t.results.title}
      </h2>
      <dl className="mt-4 grid grid-cols-3">
        {tiles.map((t, index) => (
          <div key={t.label} className={`flex flex-col-reverse justify-end gap-1.5 ${index > 0 ? "border-l border-border pl-4" : "pr-2"}`}>
            <dt className="text-xs font-medium leading-snug text-muted">{t.label}</dt>
            <dd className="display tabular text-[1.75rem]">{t.value}</dd>
          </div>
        ))}
      </dl>
      {delta !== null ? (
        <div className="divider-dashed mt-5 flex items-center gap-4 pt-5">
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={t.results.chart(scores.length, scores.join(", "))}
            className="h-12 flex-1 overflow-visible"
          >
            <polyline points={sparklinePoints(scores)} fill="none" stroke="var(--primary)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <p className="shrink-0 text-right text-sm">
            <span className="flex items-center justify-end gap-1.5 text-lg font-bold">
              <TrendingUp aria-hidden="true" className="size-4 text-accent" />
              <span className="tabular">
                {first} → {last}
              </span>
            </span>
            <span className="text-muted">{t.results.since(delta)}</span>
          </p>
        </div>
      ) : null}
    </section>
  );
}
