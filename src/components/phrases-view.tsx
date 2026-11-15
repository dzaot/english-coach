"use client";

import { BookmarkCheck, Volume2 } from "lucide-react";
import { useSpeaker } from "@/lib/hooks/use-speaker";
import type { Phrase } from "@/lib/types";
import { Card, TopBar } from "./ui";

interface Props {
  phrases: readonly Phrase[];
  onToggle: (id: string, reviewed: boolean) => void;
  onBack: () => void;
}

/** Phrases to review: the better versions from past feedback. Pending ones first. */
export function PhrasesView({ phrases, onToggle, onBack }: Props) {
  const speaker = useSpeaker();
  const sorted = [...phrases].sort((a, b) => Number(!!a.reviewedAt) - Number(!!b.reviewedAt));
  const pending = phrases.filter((p) => !p.reviewedAt).length;

  return (
    <div className="animate-rise">
      <TopBar title="Frases para repasar" onBack={onBack} />
      {phrases.length === 0 ? (
        <Card className="text-center">
          <BookmarkCheck aria-hidden="true" className="mx-auto mb-2 size-8 text-muted" />
          <p className="font-semibold">Aún no tienes frases.</p>
          <p className="text-muted">Termina una práctica y aquí guardamos las 3 frases para decir más natural.</p>
        </Card>
      ) : (
        <>
          <p className="mb-3 text-muted">
            Te quedan <span className="tabular font-semibold text-ink">{pending}</span> por repasar. Escúchalas y repítelas en voz alta.
          </p>
          <ul className="space-y-3">
            {sorted.map((p) => {
              const done = !!p.reviewedAt;
              return (
                <Card as="li" key={p.id} className={`space-y-2 ${done ? "opacity-75" : ""}`}>
                  <p lang="en" className="text-lg font-semibold">{p.better}</p>
                  <p className="text-sm text-muted">
                    <span className="font-semibold">Antes: </span>
                    <span lang="en">{p.original}</span>
                  </p>
                  <p className="text-sm text-muted">{p.whyEs}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => speaker.play(p.id, p.better)}
                      className="-ml-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-primary-ink transition duration-200 hover:bg-surface-2"
                    >
                      <Volume2 aria-hidden="true" className="size-4" /> Escuchar
                    </button>
                    <label className="ml-auto inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={(e) => onToggle(p.id, e.target.checked)}
                        className="size-5 cursor-pointer accent-[var(--accent)]"
                      />
                      Ya la practiqué
                    </label>
                  </div>
                </Card>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
