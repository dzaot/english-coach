"use client";

import { useState } from "react";
import { Check, Loader2, Mic, RotateCcw, Square } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { useRecorder } from "@/lib/hooks/use-recorder";
import type { DrillResult, Phrase } from "@/lib/types";

/** "Dilo tú": record yourself saying the better phrase; the app checks it and schedules the next review. */
export function SayItButton({ phraseId, onDrilled }: { phraseId: string; onDrilled?: (phrase: Phrase) => void }) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<DrillResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async (audio: Blob) => {
    setChecking(true);
    setError(null);
    try {
      const r = await api.drill(phraseId, audio);
      setResult(r);
      onDrilled?.(r.phrase);
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : String(e));
    } finally {
      setChecking(false);
    }
  };

  const recorder = useRecorder({ onAutoStop: (audio) => void send(audio) });
  const recording = recorder.status === "recording";

  const press = async () => {
    if (recording) {
      const audio = await recorder.stop();
      if (audio) await send(audio);
      return;
    }
    setResult(null);
    await recorder.start();
  };

  const label = checking ? "Revisando…" : recording ? "Toca para terminar" : result ? "Otra vez" : "Dilo tú";
  const Icon = checking ? Loader2 : recording ? Square : result ? RotateCcw : Mic;

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => void press()}
        disabled={checking || recorder.status === "starting"}
        aria-pressed={recording}
        className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
          recording ? "bg-ink text-bg" : "bg-accent text-on-accent hover:brightness-110"
        }`}
      >
        <Icon aria-hidden="true" className={`size-4 ${checking ? "animate-spin motion-reduce:animate-none" : ""}`} />
        {label}
      </button>
      <div aria-live="polite" className="text-sm">
        {result?.passed ? (
          <p className="flex items-center gap-1.5 font-semibold text-accent-ink">
            <Check aria-hidden="true" className="size-4" /> ¡Bien dicho! <span className="tabular">{result.score}%</span>
          </p>
        ) : null}
        {result && !result.passed ? (
          <p>
            <span className="font-semibold">Casi (<span className="tabular">{result.score}%</span>).</span>{" "}
            {result.missing.length > 0 ? (
              <>
                Te faltó: <span lang="en" className="font-semibold">{result.missing.slice(0, 6).join(", ")}</span>
              </>
            ) : null}
          </p>
        ) : null}
        {result ? (
          <p className="text-muted">
            Escuchamos: <span lang="en">“{result.said}”</span>
          </p>
        ) : null}
        {error || recorder.error ? (
          <p role="alert" className="text-error">
            {error ?? recorder.error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
