"use client";

import { ArrowRight, Check, Home, RotateCcw, Volume2 } from "lucide-react";
import { getLevel, translationLocale } from "@/domain/levels";
import { useI18n } from "@/i18n/provider";
import { useSpeaker } from "@/lib/hooks/use-speaker";
import type { Feedback, Phrase, PracticeView, Streak } from "@/lib/types";
import { CheckSticker, FlameSticker, QuoteSticker, SparkSticker } from "./brand/stickers";
import { SayItButton } from "./say-it-button";
import { ScoreRing } from "./score-ring";
import { ShareCard } from "./share-card";
import { Button, Card, QUIET_ACTION, TopBar } from "./ui";

interface Props {
  practice: PracticeView;
  feedback: Feedback;
  streak: Streak | null;
  /** Saved phrases of this practice, to say them out loud ("Say it"). */
  phrases?: readonly Phrase[];
  onDrilled?: (phrase: Phrase) => void;
  onPracticeAgain: () => void;
  onHome: () => void;
  /** A new practice is loading: the button waits instead of starting a second one. */
  starting?: boolean;
}

export function FeedbackView({ practice, feedback, streak, phrases = [], onDrilled, onPracticeAgain, onHome, starting = false }: Props) {
  const { t } = useI18n();
  const speaker = useSpeaker();
  // The tips follow the practice's own language, so an old practice keeps its language.
  const tipsLocale = translationLocale(getLevel(practice.level), practice.locale);
  return (
    <div className="animate-rise space-y-8">
      {/* Lime is getting it right: the score opens the screen. */}
      <div className="stage stage-lime">
        <TopBar title={t.feedback.title} onBack={onHome} tone="stage" />
        <p className="mb-4 mt-2 font-semibold">{t.scenarios[practice.scenarioId].title}</p>
        <ScoreRing score={feedback.score} />
        {feedback.bonus ? (
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-night py-1.5 pl-2 pr-4 text-sm font-bold text-ink">
            <SparkSticker size={26} /> <span className="tabular">{t.power.earned(feedback.bonus.phrase, feedback.bonus.points)}</span>
          </p>
        ) : null}
        <p className="mt-6 text-lg font-medium leading-relaxed">{feedback.summary}</p>
      </div>

      {streak ? (
        <div className="flex items-center gap-4 rounded-card bg-primary px-5 py-4 text-on-primary">
          <FlameSticker size={48} className="animate-flicker [--sticker-edge:var(--night)]" />
          <p className="display text-base leading-snug">
            <span className="tabular">{t.feedback.streak(t.streak.days(streak.current))}</span>
          </p>
        </div>
      ) : null}

      <section aria-labelledby="well-done-title">
        <h2 id="well-done-title" className={SECTION_TITLE}>
          <CheckSticker size={32} /> {t.feedback.wellDone}
        </h2>
        <ul className="panel rounded-card px-5">
          {feedback.wellDone.map((item, index) => (
            <li key={item} className={`flex gap-3 py-4 ${index > 0 ? "divider-dashed" : ""}`}>
              <span aria-hidden="true" className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
                <Check className="size-3.5" strokeWidth={3.5} />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="better-title">
        <h2 id="better-title" className={SECTION_TITLE}>
          <SparkSticker size={32} /> {t.feedback.sayItBetter}
        </h2>
        <ol className="space-y-3">
          {feedback.betterPhrases.map((p, i) => {
            const saved = phrases.find((x) => x.better === p.better);
            return (
            <Card as="li" key={`${i}-${p.original}`} className="space-y-3">
              <p className="text-sm text-muted">
                <span className="font-semibold">{t.feedback.youSaid}</span>
                <span lang="en" className="line-through decoration-muted/60">{p.original}</span>
              </p>
              {saved ? null : (
                <p className="flex items-start gap-2.5 text-xl font-bold leading-snug">
                  <ArrowRight aria-hidden="true" className="mt-1.5 size-4 shrink-0 text-accent" />
                  <span lang="en">{p.better}</span>
                </p>
              )}
              <p className="text-sm text-muted">{p.why}</p>
              <button type="button" onClick={() => speaker.play(`better-${i}`, p.better)} className={QUIET_ACTION}>
                <Volume2 aria-hidden="true" className="size-4 text-primary" />
                {t.feedback.hearIt}
              </button>
              {saved ? (
                <div className="divider-dashed pt-4">
                  <SayItButton phraseId={saved.id} text={saved.better} tipsLocale={tipsLocale} onDrilled={onDrilled} />
                </div>
              ) : null}
            </Card>
            );
          })}
        </ol>
        <p className="mt-3 text-sm text-muted">{t.feedback.sayThemNow}</p>
      </section>

      {feedback.vocabulary.length > 0 ? (
        <section aria-labelledby="vocabulary-title">
          <h2 id="vocabulary-title" className={SECTION_TITLE}>
            <QuoteSticker size={32} /> {t.feedback.vocabulary}
          </h2>
          <dl className="panel rounded-card px-5">
            {feedback.vocabulary.map((v, index) => (
              <div key={v.term} className={`py-4 ${index > 0 ? "divider-dashed" : ""}`}>
                <dt lang="en" className="text-lg font-bold">{v.term}</dt>
                <dd className="text-sm text-muted">{v.meaning}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <ShareCard />

      <div className="grid gap-3 pt-2">
        <Button size="lg" onClick={onPracticeAgain} disabled={starting}>
          <RotateCcw aria-hidden="true" className="size-5" /> {starting ? t.home.gettingReady : t.feedback.again}
        </Button>
        <Button variant="secondary" onClick={onHome}>
          <Home aria-hidden="true" className="size-4" /> {t.feedback.home}
        </Button>
      </div>
    </div>
  );
}

const SECTION_TITLE = "display mb-4 flex items-center gap-3 text-xl leading-tight";
