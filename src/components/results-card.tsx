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
    <section aria-labelledby="results-title" className="rounded-3xl border border-border bg-surface p-5 shadow-card">
      <h2 id="results-title" className="font-display text-lg font-bold">
        {t.results.title}
      </h2>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl bg-surface-2 px-3 py-2.5">
            <dt className="text-xs font-medium text-muted">{t.label}</dt>
            <dd className="tabular font-display text-2xl font-extrabold leading-tight">{t.value}</dd>
          </div>
        ))}
      </dl>
      {delta !== null ? (
        <div className="mt-4 flex items-center gap-4">
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={t.results.chart(scores.length, scores.join(", "))}
            className="h-12 flex-1 overflow-visible text-primary"
          >
            <polyline points={sparklinePoints(scores)} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <p className="shrink-0 text-right text-sm">
            <span className="flex items-center justify-end gap-1 font-semibold">
              <TrendingUp aria-hidden="true" className="size-4 text-accent-ink" />
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
