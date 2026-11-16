import { Check, Ear, Snail, TriangleAlert, X } from "lucide-react";
import type { WordCheck, WordGuide } from "@/lib/types";

/** The phrase as tappable words: colors and icons for what was understood, dotted underline for sounds to watch. */

interface SoundWordsProps {
  readonly words: readonly WordGuide[];
  readonly checks: readonly WordCheck[] | null;
  readonly selected: number | null;
  readonly onSelect: (index: number) => void;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function wordLabel(word: WordGuide, check: WordCheck | undefined): string {
  const parts = [word.text];
  if (check) parts.push(check.status === "clear" ? "understood" : "not understood");
  if (word.tips.length > 0) parts.push(plural(word.tips.length, "sound to watch", "sounds to watch"));
  return `${parts.join(": ")}. Show how to say it`;
}

export function SoundWords({ words, checks, selected, onSelect }: SoundWordsProps) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Your phrase, word by word">
      {words.map((w, i) => {
        const check = checks?.[i];
        const tone =
          check?.status === "clear"
            ? "bg-accent-soft text-accent-ink"
            : check?.status === "missed"
              ? "bg-error-soft text-error underline decoration-wavy decoration-2 underline-offset-4"
              : w.tips.length > 0
                ? "bg-surface-2 underline decoration-warn decoration-dotted decoration-2 underline-offset-[6px]"
                : "bg-surface-2";
        return (
          <li key={`${w.text}-${i}`}>
            <button
              type="button"
              lang="en"
              aria-pressed={selected === i}
              aria-label={wordLabel(w, check)}
              onClick={() => onSelect(i)}
              className={`inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-xl px-2.5 font-display text-xl font-bold transition duration-200 hover:brightness-95 ${tone} ${
                selected === i ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""
              }`}
            >
              {check?.status === "clear" ? <Check aria-hidden="true" className="size-4" strokeWidth={3} /> : null}
              {check?.status === "missed" ? <X aria-hidden="true" className="size-4" strokeWidth={3} /> : null}
              {w.text}
            </button>{" "}
          </li>
        );
      })}
    </ul>
  );
}

interface WordDetailProps {
  readonly word: WordGuide;
  readonly check: WordCheck | undefined;
  readonly tipsInSpanish: boolean;
  readonly onHearIt: () => void;
  readonly onHearMine: (() => void) | null;
}

export function WordDetail({ word, check, tipsInSpanish, onHearIt, onHearMine }: WordDetailProps) {
  return (
    <div className="animate-rise space-y-3 rounded-2xl border border-border bg-surface p-4" aria-live="polite">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p lang="en" className="font-display text-2xl font-extrabold">
          {word.text.replace(/[^\p{L}'’-]/gu, "")}
        </p>
        {word.respelling ? (
          <p className="text-lg">
            <span className="sr-only">Say it like </span>
            <span className="rounded-lg bg-sun px-2 py-0.5 font-bold text-on-sun tracking-wide">{word.respelling}</span>
          </p>
        ) : null}
      </div>
      {word.respelling && word.syllables > 1 ? <p className="text-sm text-muted">Capital letters mark the strong syllable.</p> : null}
      {check?.status === "missed" ? (
        <p className="flex items-center gap-1.5 font-semibold text-error">
          <X aria-hidden="true" className="size-4" />
          {check.heardAs ? `We heard “${check.heardAs}”.` : "We did not catch this word."}
        </p>
      ) : null}
      {word.tips.length > 0 ? (
        <ul className="space-y-2.5">
          {word.tips.map((t) => (
            <li key={t.id} className="space-y-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2.5 py-0.5 text-sm font-semibold text-warn">
                <TriangleAlert aria-hidden="true" className="size-3.5" /> {t.label}
              </span>
              <p lang={tipsInSpanish ? "es" : "en"}>{tipsInSpanish ? t.tipEs : t.tipEn}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No tricky sounds here for Spanish speakers.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onHearIt} className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full bg-surface-2 px-4 text-sm font-semibold transition duration-200 hover:brightness-95">
          <Snail aria-hidden="true" className="size-4" /> Hear it slowly
        </button>
        {onHearMine ? (
          <button type="button" onClick={onHearMine} className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full bg-surface-2 px-4 text-sm font-semibold transition duration-200 hover:brightness-95">
            <Ear aria-hidden="true" className="size-4" /> Hear yours
          </button>
        ) : null}
      </div>
    </div>
  );
}
