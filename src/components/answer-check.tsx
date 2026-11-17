import { CircleCheck, Volume2 } from "lucide-react";
import { isMistake, markSegments } from "@/domain/turn-check";
import { useI18n } from "@/i18n/provider";
import type { TurnCheck } from "@/lib/types";
import { DiffLegend, LetterDiff } from "./letter-diff";
import { ROUND_BUTTON, VoiceBars } from "./ui";

/** Your answer as you said it, with each mistake corrected letter by letter right in the sentence. */

export function MarkedAnswer({ text, check }: { text: string; check: TurnCheck | null | undefined }) {
  if (!check || check.issues.length === 0) return <>{text}</>;
  return (
    <>
      {markSegments(text, check.issues).map((seg, i) => {
        if (seg.issue === null) {
          return (
            <span key={i} className="text-accent-ink">
              {seg.text}
            </span>
          );
        }
        const issue = check.issues[seg.issue];
        const number = <sup aria-hidden="true" className="tabular ml-0.5 text-xs font-bold text-ink/70">{seg.issue + 1}</sup>;
        if (isMistake(issue.kind)) {
          return (
            <span key={i}>
              <LetterDiff said={seg.text} better={issue.better} />
              {number}
            </span>
          );
        }
        return (
          <span key={i}>
            <span className="rounded-sm bg-warn-soft px-0.5 font-semibold text-warn underline decoration-warn decoration-wavy decoration-2 underline-offset-4">
              {seg.text}
            </span>
            {number}
          </span>
        );
      })}
    </>
  );
}

export function AnswerCheck({
  check,
  checking,
  onListenAlternative,
  playingAlternative,
}: {
  check: TurnCheck | null | undefined;
  checking?: boolean;
  onListenAlternative?: (index: number) => void;
  playingAlternative?: number | null;
}) {
  const { t } = useI18n();
  if (checking && !check) {
    return (
      <p role="status" className="flex items-center justify-end gap-2 text-sm font-semibold text-muted">
        <VoiceBars count={3} height="h-3" className="bg-muted" />
        {t.check.checking}
      </p>
    );
  }
  if (!check) return null;
  return (
    <section aria-label={t.check.region} className="animate-rise panel w-full space-y-4 rounded-tile p-4">
      {check.issues.length === 0 ? (
        <p className="flex items-center gap-2 font-semibold text-accent-ink">
          <CircleCheck aria-hidden="true" className="size-5" /> {t.check.natural}
        </p>
      ) : (
        <>
          <ol className="space-y-4">
            {check.issues.map((issue, i) => (
              <li key={`${issue.said}-${i}`} className="flex gap-3">
                <span aria-hidden="true" className="tabular mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold">
                  {i + 1}
                </span>
                <div className="min-w-0 space-y-1">
                  <p className={`text-sm font-bold ${isMistake(issue.kind) ? "text-error" : "text-warn"}`}>
                    {t.check.kinds[issue.kind]}
                    <span className="sr-only">{isMistake(issue.kind) ? t.check.mistake : t.check.suggestion}</span>
                  </p>
                  <p lang="en" className="text-lg leading-relaxed">
                    <LetterDiff said={issue.said} better={issue.better} />
                  </p>
                  {issue.why ? <p className="text-sm text-muted">{issue.why}</p> : null}
                </div>
              </li>
            ))}
          </ol>
          <DiffLegend />
        </>
      )}
      {check.alternatives.length > 0 ? (
        <div className="divider-dashed space-y-3 pt-4">
          <h3 className="kicker">{t.check.otherWays}</h3>
          <ul className="space-y-3">
            {check.alternatives.map((alt, i) => (
              <li key={`${alt.label}-${i}`} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-primary-ink">{t.check.altLabels[alt.label] ?? alt.label}</p>
                  <p lang="en" className="leading-relaxed">
                    {alt.text}
                  </p>
                </div>
                {onListenAlternative ? (
                  <button
                    type="button"
                    onClick={() => onListenAlternative(i)}
                    aria-label={t.check.listenTo(alt.text)}
                    title={playingAlternative === i ? t.practice.playing : t.practice.listen}
                    className={`${ROUND_BUTTON} ${playingAlternative === i ? "bg-accent text-on-accent" : ""}`}
                  >
                    <Volume2 aria-hidden="true" className="size-5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
