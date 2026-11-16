"use client";

import { ArrowRight, BookOpen, Check, Flame, Home, RotateCcw, Sparkles, Volume2 } from "lucide-react";
import { useSpeaker } from "@/lib/hooks/use-speaker";
import { daysLabel } from "@/lib/format";
import type { Feedback, Phrase, PracticeView, Streak } from "@/lib/types";
import { SayItButton } from "./say-it-button";
import { ScoreRing } from "./score-ring";
import { scenarioTitle } from "./scenario-meta";
import { Button, Card, TopBar } from "./ui";

interface Props {
  practice: PracticeView;
  feedback: Feedback;
  streak: Streak | null;
  /** Saved phrases of this practice, to say them out loud ("Say it"). */
  phrases?: readonly Phrase[];
  onDrilled?: (phrase: Phrase) => void;
  onPracticeAgain: () => void;
  onHome: () => void;
}

export function FeedbackView({ practice, feedback, streak, phrases = [], onDrilled, onPracticeAgain, onHome }: Props) {
  const speaker = useSpeaker();
  return (
    <div className="animate-rise space-y-4">
      <TopBar title="Your feedback" onBack={onHome} />

      <Card>
        <p className="mb-3 text-sm font-semibold text-muted">{scenarioTitle(practice.scenarioId)}</p>
        <ScoreRing score={feedback.score} />
        <p className="mt-4">{feedback.summary}</p>
      </Card>

      {streak ? (
        <div className="flex items-center gap-3 rounded-3xl bg-primary px-5 py-4 text-on-primary shadow-card">
          <Flame aria-hidden="true" className="animate-flicker size-7 shrink-0" />
          <p className="font-semibold">
            <span className="tabular">{daysLabel(streak.current)}</span> streak. Come back tomorrow to keep it.
          </p>
        </div>
      ) : null}

      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <Check aria-hidden="true" className="size-5 text-accent-ink" /> What you did well
        </h2>
        <ul className="space-y-2">
          {feedback.wellDone.map((item) => (
            <li key={item} className="flex gap-2">
              <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-accent-ink" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Card>

      <section aria-labelledby="better-title" className="space-y-3">
        <h2 id="better-title" className="flex items-center gap-2 text-lg font-bold">
          <Sparkles aria-hidden="true" className="size-5 text-primary-ink" /> Say it more naturally
        </h2>
        <ol className="space-y-3">
          {feedback.betterPhrases.map((p, i) => {
            const saved = phrases.find((x) => x.better === p.better);
            return (
            <Card as="li" key={`${i}-${p.original}`} className="space-y-2">
              <p className="text-sm text-muted">
                <span className="font-semibold">You said: </span>
                <span lang="en" className="line-through decoration-muted/60">{p.original}</span>
              </p>
              <p className="flex items-start gap-2 text-lg font-semibold">
                <ArrowRight aria-hidden="true" className="mt-1.5 size-4 shrink-0 text-primary-ink" />
                <span lang="en">{p.better}</span>
              </p>
              <p className="text-sm text-muted">{p.why}</p>
              <button
                type="button"
                onClick={() => speaker.play(`better-${i}`, p.better)}
                className="-ml-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-primary-ink transition duration-200 hover:bg-surface-2"
              >
                <Volume2 aria-hidden="true" className="size-4" />
                Hear how it sounds
              </button>
              {saved ? <SayItButton phraseId={saved.id} onDrilled={onDrilled} /> : null}
            </Card>
            );
          })}
        </ol>
        <p className="text-sm text-muted">Say them out loud now. Tomorrow they come back in “Today’s review”.</p>
      </section>

      {feedback.vocabulary.length > 0 ? (
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
            <BookOpen aria-hidden="true" className="size-5 text-accent-ink" /> Vocabulary to keep
          </h2>
          <dl className="grid gap-2">
            {feedback.vocabulary.map((v) => (
              <div key={v.term} className="rounded-2xl bg-surface-2 px-4 py-2.5">
                <dt lang="en" className="font-semibold">{v.term}</dt>
                <dd className="text-sm text-muted">{v.meaning}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : null}

      <div className="grid gap-2 pt-2">
        <Button size="lg" onClick={onPracticeAgain}>
          <RotateCcw aria-hidden="true" className="size-5" /> Practice again
        </Button>
        <Button variant="secondary" onClick={onHome}>
          <Home aria-hidden="true" className="size-4" /> Back to home
        </Button>
      </div>
    </div>
  );
}
