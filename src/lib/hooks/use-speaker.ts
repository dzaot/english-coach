"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SpeechAudio } from "@/lib/types";

/** Plays the counterpart's voice: server audio when there is some, else the browser's English voice. */

const SPEECH_RATE = 0.95;

function englishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang === "en-US" && /natural|google|samantha|aria|jenny/i.test(v.name)) ?? voices.find((v) => v.lang.startsWith("en"));
}

export function canUseBrowserVoice(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

export function useSpeaker() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (canUseBrowserVoice()) window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, []);

  const speakWithBrowser = useCallback((id: string, text: string) => {
    if (!canUseBrowserVoice()) {
      setSpeakingId(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = SPEECH_RATE;
    const voice = englishVoice();
    if (voice) utterance.voice = voice;
    utterance.onend = () => setSpeakingId((cur) => (cur === id ? null : cur));
    utterance.onerror = utterance.onend;
    window.speechSynthesis.speak(utterance);
  }, []);

  const play = useCallback(
    (id: string, text: string, audio: SpeechAudio | null = null) => {
      stop();
      setSpeakingId(id);
      if (!audio) {
        speakWithBrowser(id, text);
        return;
      }
      const el = new Audio(`data:${audio.mime};base64,${audio.base64}`);
      audioRef.current = el;
      el.onended = () => setSpeakingId((cur) => (cur === id ? null : cur));
      el.play().catch(() => speakWithBrowser(id, text));
    },
    [speakWithBrowser, stop],
  );

  useEffect(() => stop, [stop]);

  return { speakingId, play, stop };
}
