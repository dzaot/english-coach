"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SpeechAudio } from "@/lib/types";

/** Plays the counterpart's voice: server audio when there is some, else the browser's English voice. */

const SPEECH_RATE = 0.95;
/** "Slower": playback rate for a slower replay. */
export const SLOW_RATE = 0.75;

function englishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang === "en-US" && /natural|google|samantha|aria|jenny/i.test(v.name)) ?? voices.find((v) => v.lang.startsWith("en"));
}

export function canUseBrowserVoice(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

/** How far the current line has played, for live captions. */
export interface PlaybackProgress {
  readonly id: string;
  readonly ratio: number;
}

/** Typical speaking speed of browser voices, used to move captions when a browser sends no word events. */
const CHARS_PER_SECOND = 14;
const ESTIMATE_TICK_MS = 150;
/** Keep the estimate short of the end; the real end event finishes the line. */
const ESTIMATE_CAP = 0.97;

export function useSpeaker() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<PlaybackProgress | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const estimateRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopEstimate = useCallback(() => {
    if (estimateRef.current) clearInterval(estimateRef.current);
    estimateRef.current = null;
  }, []);

  const stop = useCallback(() => {
    stopEstimate();
    audioRef.current?.pause();
    audioRef.current = null;
    if (canUseBrowserVoice()) window.speechSynthesis.cancel();
    setSpeakingId(null);
    setProgress(null);
  }, [stopEstimate]);

  const speakWithBrowser = useCallback((id: string, text: string, rate = 1) => {
    if (!canUseBrowserVoice()) {
      setSpeakingId(null);
      setProgress(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = SPEECH_RATE * rate;
    const voice = englishVoice();
    if (voice) utterance.voice = voice;
    let heard = 0;
    const startedAt = Date.now();
    const expectedMs = (text.length / (CHARS_PER_SECOND * utterance.rate)) * 1000;
    utterance.onend = () => {
      stopEstimate();
      setSpeakingId((cur) => (cur === id ? null : cur));
      setProgress((cur) => (cur?.id === id ? null : cur));
    };
    utterance.onerror = utterance.onend;
    utterance.onboundary = (e) => {
      heard = text.length ? e.charIndex / text.length : 1;
      setProgress({ id, ratio: heard });
    };
    estimateRef.current = setInterval(() => {
      const estimate = Math.min(ESTIMATE_CAP, (Date.now() - startedAt) / expectedMs);
      setProgress((cur) => (cur?.id === id ? { id, ratio: Math.max(heard, estimate) } : cur));
    }, ESTIMATE_TICK_MS);
    window.speechSynthesis.speak(utterance);
  }, [stopEstimate]);

  const play = useCallback(
    (id: string, text: string, audio: SpeechAudio | null = null, rate = 1) => {
      stop();
      setSpeakingId(id);
      setProgress({ id, ratio: 0 });
      if (!audio) {
        speakWithBrowser(id, text, rate);
        return;
      }
      const el = new Audio(`data:${audio.mime};base64,${audio.base64}`);
      el.playbackRate = rate;
      audioRef.current = el;
      el.onended = () => {
        setSpeakingId((cur) => (cur === id ? null : cur));
        setProgress((cur) => (cur?.id === id ? null : cur));
      };
      el.ontimeupdate = () => {
        if (Number.isFinite(el.duration) && el.duration > 0) setProgress({ id, ratio: el.currentTime / el.duration });
      };
      el.play().catch(() => speakWithBrowser(id, text, rate));
    },
    [speakWithBrowser, stop],
  );

  useEffect(() => stop, [stop]);

  return { speakingId, progress, play, stop };
}
