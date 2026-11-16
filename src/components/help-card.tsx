import { Lightbulb, Volume2, X } from "lucide-react";
import type { Help } from "@/lib/types";

/** "¿Qué digo?": what the counterpart said in Spanish, a suggested answer to read out loud, and one tip. */
export function HelpCard({ help, onListen, onClose }: { help: Help; onListen: () => void; onClose: () => void }) {
  return (
    <section aria-label="Ayuda para responder" className="animate-rise space-y-2 rounded-3xl border-2 border-accent bg-accent-soft p-4 text-ink">
      <div className="flex items-start gap-2">
        <Lightbulb aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent-ink" />
        <p className="flex-1 text-sm">
          <span className="font-semibold">Te preguntó: </span>
          {help.translationEs}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar ayuda"
          className="-mr-2 -mt-2 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition duration-200 hover:bg-surface"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
      <p className="text-sm font-semibold text-accent-ink">Puedes decir:</p>
      <p lang="en" className="text-lg font-semibold leading-snug">{help.suggestionEn}</p>
      <p className="text-sm text-muted">{help.tipEs}</p>
      <button
        type="button"
        onClick={onListen}
        className="-ml-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-accent-ink transition duration-200 hover:bg-surface"
      >
        <Volume2 aria-hidden="true" className="size-4" /> Escuchar la sugerencia
      </button>
    </section>
  );
}
