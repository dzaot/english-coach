import { diffPhrase, type DiffPart } from "@/domain/diff";

/**
 * A correction shown letter by letter: green letters were right, red ones (struck through) go away,
 * yellow ones (underlined) are missing. Color is never the only cue: strike-through and underline too.
 */

const PART_CLASS: Record<DiffPart["op"], string> = {
  same: "text-accent-ink",
  del: "rounded-sm bg-error-soft text-error line-through decoration-2",
  add: "rounded-sm bg-sun px-px text-on-sun underline decoration-2 underline-offset-2",
};

export function DiffParts({ parts }: { parts: readonly DiffPart[] }) {
  return (
    <>
      {parts.map((p, i) => (
        <span key={i} className={PART_CLASS[p.op]}>
          {p.text}
        </span>
      ))}
    </>
  );
}

/** "I am agree" to "I agree", with a screen-reader sentence in place of the colored letters. */
export function LetterDiff({ said, better, className = "" }: { said: string; better: string; className?: string }) {
  return (
    <span className={`font-semibold ${className}`}>
      <span aria-hidden="true">
        <DiffParts parts={diffPhrase(said, better)} />
      </span>
      <span className="sr-only">{`You said "${said}". Better: "${better}".`}</span>
    </span>
  );
}

/** Explains the three colors once, with the same styles. */
export function DiffLegend() {
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted">
      <span>
        <span className={PART_CLASS.same}>Green</span> right
      </span>
      <span>
        <span className={PART_CLASS.del}>Red</span> remove
      </span>
      <span>
        <span className={PART_CLASS.add}>Yellow</span> add or change
      </span>
    </p>
  );
}
