"use client";

import { useEffect, useState } from "react";

/** Microphone loudness from 0 to 1 while recording, so the screen can react to your voice. */

const FFT_SIZE = 512;
/** RMS of normal speech is small; this maps it onto 0 to 1. */
const GAIN = 4;
/** Skip re-renders for tiny changes. */
const MIN_STEP = 0.04;

export function useMicLevel(stream: MediaStream | null): number {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!stream || typeof window === "undefined" || typeof AudioContext !== "function") return;
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    source.connect(analyser);
    const data = new Uint8Array(FFT_SIZE);
    let raf = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      const sum = data.reduce((acc, v) => acc + ((v - 128) / 128) ** 2, 0);
      const next = Math.min(1, Math.sqrt(sum / data.length) * GAIN);
      setLevel((cur) => (Math.abs(cur - next) < MIN_STEP ? cur : next));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      void ctx.close();
      setLevel(0);
    };
  }, [stream]);

  return stream ? level : 0;
}
