import { Check, Ear, Snail, TriangleAlert, X } from "lucide-react";
import { diffLetters } from "@/domain/diff";
import { soundLetters } from "@/domain/sounds";
import type { WordCheck, WordGuide } from "@/lib/types";
import { DiffParts } from "./letter-diff";
import type { Locale } from "@/domain/locales";
import { MESSAGES, type Messages } from "@/i18n/messages";
import { useI18n } from "@/i18n/provider";

/**
 * The phrase as tappable words, colored letter by letter: before you speak, yellow letters carry the sound
 * to watch; after, green letters came through, red ones were extra and yellow ones were missing.
 */

const WATCH = "rounded-sm bg-sun px-px text-on-sun underline decoration-dotted decoration-2 underline-offset-4";

/** A word's letters, colored by what was heard (or by the sound to watch when nothing was said yet). */
function WordLetters({ word, check }: { word: WordGuide; check: WordCheck | undefined }) {
  if (check?.status === "clear") return <span className="text-accent-ink">{word.text}</span>;
  if (check?.status === "missed") {
    if (!check.heardAs) return <span className="text-error line-through decoration-2">{word.text}</span>;
    const bare = word.text.replace(/[^\p{L}\p{N}'’-]/gu, "");
    return <DiffParts parts={diffLetters(check.heardAs.replace(/[^\p{L}\p{N}'’ -]/gu, ""), bare)} />;
  }
  const span = word.focus && word.tips[0] ? soundLetters(word.text, word.tips[0].id) : null;
  if (!span) return <>{word.text}</>;
  return (
    <>
      {word.text.slice(0, span[0])}
      <span className={WATCH}>{word.text.slice(span[0], span[1])}</span>
      {word.text.slice(span[1])}
    </>
  );
}

interface SoundWordsProps {
  readonly words: readonly WordGuide[];
  readonly checks: readonly WordCheck[] | null;
  readonly selected: number | null;
  readonly onSelect: (index: number) => void;
}


function wordLabel(word: WordGuide, check: WordCheck | undefined, t: Messages): string {
  const parts = [word.text];
  if (check) parts.push(check.status === "clear" ? t.sayIt.understood : t.sayIt.notUnderstood);
  if (word.focus) parts.push(t.sayIt.practiceThis);
  if (word.tips.length > 0) parts.push(t.sayIt.soundsToWatch(word.tips.length));
  return `${parts.join(": ")}. ${t.sayIt.showHow}`;
}

export function SoundWords({ words, checks, selected, onSelect }: SoundWordsProps) {
  const { t } = useI18n();
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={t.sayIt.phraseWords}>
      {words.map((w, i) => {
        const check = checks?.[i];
        const tone =
          check?.status === "clear"
            ? "bg-accent-soft text-accent-ink"
            : check?.status === "missed"
              ? "bg-surface-2 text-ink ring-1 ring-error"
              : w.focus
                ? "bg-warn-soft text-ink"
                : "bg-surface-2";
        return (
          <li key={`${w.text}-${i}`}>
            <button
              type="button"
              lang="en"
              aria-pressed={selected === i}
              aria-label={wordLabel(w, check, t)}
              onClick={() => onSelect(i)}
              className={`inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-xl px-2.5 font-display text-xl font-bold transition duration-200 hover:brightness-95 ${tone} ${
                selected === i ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""
              }`}
            >
              {check?.status === "clear" ? <Check aria-hidden="true" className="size-4" strokeWidth={3} /> : null}
              {check?.status === "missed" ? <X aria-hidden="true" className="size-4 text-error" strokeWidth={3} /> : null}
              <span aria-hidden="true">
                <WordLetters word={w} check={check} />
              </span>
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
  /** Language of the sound tips. */
  readonly tipsLocale: Locale;
  readonly onHearIt: () => void;
  readonly onHearMine: (() => void) | null;
}

export function WordDetail({ word, check, tipsLocale, onHearIt, onHearMine }: WordDetailProps) {
  const { t } = useI18n();
  const tips = MESSAGES[tipsLocale].sounds;
  return (
    <div className="animate-rise space-y-3 rounded-2xl border border-border bg-surface p-4" aria-live="polite">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p lang="en" className="font-display text-2xl font-extrabold">
          {word.text.replace(/[^\p{L}'’-]/gu, "")}
        </p>
        {word.respelling ? (
          <p className="text-lg">
            <span className="sr-only">{t.sayIt.sayItLike}</span>
            <span className="rounded-lg bg-sun px-2 py-0.5 font-bold text-on-sun tracking-wide">{word.respelling}</span>
          </p>
        ) : null}
      </div>
      {word.respelling && word.syllables > 1 ? <p className="text-sm text-muted">{t.sayIt.strongSyllable}</p> : null}
      {check?.status === "missed" ? (
        <p className="flex items-center gap-1.5 font-semibold text-error">
          <X aria-hidden="true" className="size-4" />
          {check.heardAs ? t.sayIt.weHeard(check.heardAs) : t.sayIt.notCaught}
        </p>
      ) : null}
      {check?.status === "missed" && check.heardAs ? (
        <p lang="en" className="font-display text-xl font-bold" aria-hidden="true">
          <WordLetters word={word} check={check} />
        </p>
      ) : null}
      {word.tips.length > 0 ? (
        <ul className="space-y-2.5">
          {word.tips.map((tip) => (
            <li key={tip.id} className="space-y-1">
              <span lang={tipsLocale} className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2.5 py-0.5 text-sm font-semibold text-warn">
                <TriangleAlert aria-hidden="true" className="size-3.5" /> {tips[tip.id].label}
              </span>
              <p lang={tipsLocale}>{tips[tip.id].tip}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{t.sayIt.noTricky}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onHearIt} className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full bg-surface-2 px-4 text-sm font-semibold transition duration-200 hover:brightness-95">
          <Snail aria-hidden="true" className="size-4" /> {t.sayIt.hearSlowly}
        </button>
        {onHearMine ? (
          <button type="button" onClick={onHearMine} className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full bg-surface-2 px-4 text-sm font-semibold transition duration-200 hover:brightness-95">
            <Ear aria-hidden="true" className="size-4" /> {t.sayIt.hearYours}
          </button>
        ) : null}
      </div>
    </div>
  );
}
