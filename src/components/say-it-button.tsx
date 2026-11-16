"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AudioWaveform, Check, Loader2, Mic, RotateCcw, Sparkles, Square } from "lucide-react";
import { mapTimings } from "@/domain/clarity";
import { ApiError, api } from "@/lib/api";
import { useRecorder } from "@/lib/hooks/use-recorder";
import { SLOW_RATE, useSpeaker } from "@/lib/hooks/use-speaker";
import type { DrillResult, Phrase, WordGuide } from "@/lib/types";
import { SoundWords, WordDetail } from "./sound-words";

/** Natural conversational pace, in words per minute. */
const PACE_SLOW = 100;
const PACE_FAST = 175;
/** Extra audio kept around a word when you replay it. */
const WORD_PADDING_SECONDS = 0.08;

interface SayItProps {
  readonly phraseId: string;
  readonly text: string;
  /** Beginner and intermediate learners read the sound tips in Spanish. */
  readonly tipsInSpanish?: boolean;
  readonly onDrilled?: (phrase: Phrase) => void;
}

const bareGuide = (text: string): WordGuide[] =>
  text.split(/\s+/).filter(Boolean).map((w) => ({ text: w, key: w.toLowerCase(), respelling: null, syllables: 0, stressed: null, tips: [] }));

function paceNote(wpm: number): string {
  if (wpm < PACE_SLOW) return "a little slow, keep it flowing";
  if (wpm > PACE_FAST) return "a little fast, slow down a bit";
  return "a natural pace";
}

/**
 * "Say it" with a sound check: the phrase word by word, how each word sounds in American English,
 * then which words the AI understood when you said it, your pace, and your own voice per word.
 */
export function SayItButton({ phraseId, text, tipsInSpanish = false, onDrilled }: SayItProps) {
  const [guide, setGuide] = useState<WordGuide[]>(() => bareGuide(text));
  const [selected, setSelected] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<DrillResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [takeUrl, setTakeUrl] = useState<string | null>(null);
  const replay = useRef<HTMLAudioElement | null>(null);
  const speaker = useSpeaker();

  useEffect(() => {
    let live = true;
    api.pronounce(text).then(
      (r) => {
        if (live && r.words.length === bareGuide(text).length) setGuide(r.words);
      },
      () => undefined, // the plain words still work without the guide
    );
    return () => {
      live = false;
    };
  }, [text]);

  useEffect(() => () => {
    if (takeUrl && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(takeUrl);
  }, [takeUrl]);

  const timings = useMemo(() => (result ? mapTimings(text, result.timings) : []), [result, text]);

  const send = async (audio: Blob) => {
    setChecking(true);
    setError(null);
    setTakeUrl(typeof URL.createObjectURL === "function" ? URL.createObjectURL(audio) : null);
    try {
      const r = await api.drill(phraseId, audio);
      setResult(r);
      const firstMissed = r.words.findIndex((w) => w.status === "missed");
      setSelected(firstMissed === -1 ? null : firstMissed);
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
    speaker.stop();
    setResult(null);
    await recorder.start();
  };

  const hearMine = (index: number) => {
    const t = timings[index];
    if (!t || !takeUrl) return;
    replay.current?.pause();
    const el = new Audio(takeUrl);
    replay.current = el;
    el.currentTime = Math.max(0, t.start - WORD_PADDING_SECONDS);
    void el.play().catch(() => undefined);
    window.setTimeout(() => el.pause(), (t.end - t.start + 2 * WORD_PADDING_SECONDS) * 1000);
  };

  const label = checking ? "Checking…" : recording ? "Tap to finish" : result ? "Try again" : "Say it";
  const Icon = checking ? Loader2 : recording ? Square : result ? RotateCcw : Mic;
  const clearCount = result?.words.filter((w) => w.status === "clear").length ?? 0;
  const word = selected === null ? null : guide[selected];

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-muted">
        <AudioWaveform aria-hidden="true" className="size-4" /> Sound check · tap a word to hear how it sounds
      </p>
      <SoundWords words={guide} checks={result?.words ?? null} selected={selected} onSelect={(i) => setSelected(i === selected ? null : i)} />
      {word && selected !== null ? (
        <WordDetail
          word={word}
          check={result?.words[selected]}
          tipsInSpanish={tipsInSpanish}
          onHearIt={() => speaker.play(`word-${selected}`, word.text, null, SLOW_RATE)}
          onHearMine={timings[selected] && takeUrl ? () => hearMine(selected) : null}
        />
      ) : null}

      <button
        type="button"
        onClick={() => void press()}
        disabled={checking || recorder.status === "starting"}
        aria-pressed={recording}
        className={`inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full px-5 font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
          recording ? "bg-ink text-bg" : "bg-accent text-on-accent hover:brightness-110"
        }`}
      >
        <Icon aria-hidden="true" className={`size-5 ${checking ? "animate-spin motion-reduce:animate-none" : ""}`} />
        {label}
      </button>

      <div aria-live="polite" className="space-y-1 text-sm">
        {result ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {result.passed ? (
              <span className="animate-pop inline-flex items-center gap-1 rounded-full bg-sun px-3 py-1 font-bold text-on-sun">
                <Sparkles aria-hidden="true" className="size-4" /> Well said!
              </span>
            ) : (
              <span className="font-bold">Almost.</span>
            )}
            <span className="inline-flex items-center gap-1 font-semibold">
              <Check aria-hidden="true" className="size-4 text-accent-ink" />
              <span className="tabular">{`${clearCount} of ${result.words.length} words clear`}</span>
            </span>
          </p>
        ) : null}
        {result?.pace ? (
          <p>
            <span className="tabular font-semibold">{result.pace.wordsPerMinute} words a minute</span>, {paceNote(result.pace.wordsPerMinute)}.
            {result.pace.longPauses > 0 ? ` ${result.pace.longPauses === 1 ? "1 long pause" : `${result.pace.longPauses} long pauses`}.` : ""}
          </p>
        ) : null}
        {result ? <p className="text-muted">“Clear” means the AI understood the word. Tap any word to work on its sounds.</p> : null}
        {error || recorder.error ? (
          <p role="alert" className="text-error">
            {error ?? recorder.error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
