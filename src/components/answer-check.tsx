import { CircleCheck, Volume2 } from "lucide-react";
import { isMistake, markSegments, type IssueKind } from "@/domain/turn-check";
import type { TurnCheck } from "@/lib/types";
import { DiffLegend, LetterDiff } from "./letter-diff";

/** Your answer as you said it, with each mistake corrected letter by letter right in the sentence. */

const KIND_LABEL: Record<IssueKind, string> = {
  grammar: "Grammar",
  word: "Word choice",
  natural: "More natural",
  sound: "Check the sound",
};

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
        const number = <sup aria-hidden="true" className="ml-0.5 text-xs font-bold text-muted">{seg.issue + 1}</sup>;
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
            <span className="rounded-sm bg-warn-soft font-semibold text-warn underline decoration-warn decoration-wavy decoration-2 underline-offset-4">
              {seg.text}
            </span>
            {number}
          </span>
        );
      })}
    </>
  );
}

const LISTEN =
  "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-primary-ink transition duration-200 hover:bg-surface-2";

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
  if (checking && !check) {
    return (
      <p role="status" className="text-sm font-semibold text-muted">
        Checking your answer…
      </p>
    );
  }
  if (!check) return null;
  return (
    <section aria-label="Check of your answer" className="animate-rise w-full space-y-3 rounded-3xl border border-border bg-surface p-4 shadow-card">
      {check.issues.length === 0 ? (
        <p className="flex items-center gap-2 font-semibold text-accent-ink">
          <CircleCheck aria-hidden="true" className="size-5" /> Sounds natural. Nice!
        </p>
      ) : (
        <>
          <ol className="space-y-3">
            {check.issues.map((issue, i) => (
              <li key={`${issue.said}-${i}`} className="flex gap-2">
                <span aria-hidden="true" className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold">
                  {i + 1}
                </span>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {KIND_LABEL[issue.kind]}
                    <span className="sr-only">{isMistake(issue.kind) ? ", a mistake" : ", a suggestion"}</span>
                  </p>
                  <p lang="en" className="text-[1.0625rem] leading-relaxed">
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
        <div className="space-y-2 border-t border-border pt-3">
          <h3 className="text-sm font-semibold">Other ways to say it</h3>
          <ul className="space-y-2">
            {check.alternatives.map((alt, i) => (
              <li key={`${alt.label}-${i}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{alt.label}</p>
                <p lang="en" className="leading-relaxed">
                  {alt.text}
                </p>
                {onListenAlternative ? (
                  <button type="button" onClick={() => onListenAlternative(i)} aria-label={`Listen to: ${alt.text}`} className={`-ml-2 ${LISTEN}`}>
                    <Volume2 aria-hidden="true" className="size-4" />
                    {playingAlternative === i ? "Playing…" : "Listen"}
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
