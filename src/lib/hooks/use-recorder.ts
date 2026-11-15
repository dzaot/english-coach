"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Push-to-talk recording with MediaRecorder. Tap to start, tap to stop. Auto-stops at the max length. */

export const MAX_RECORDING_MS = 90_000;
const MIN_RECORDING_MS = 600;
const MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

export type RecorderStatus = "idle" | "starting" | "recording";

export const RECORDER_ERRORS = {
  unsupported: "Tu navegador no permite grabar audio. Puedes escribir tu respuesta.",
  denied: "Necesitamos permiso para usar el micrófono. Actívalo en tu navegador o escribe tu respuesta.",
  noMic: "No encontramos un micrófono. Puedes escribir tu respuesta.",
  failed: "No pudimos usar el micrófono. Puedes escribir tu respuesta.",
  tooShort: "La grabación fue muy corta. Toca el micrófono, habla y toca otra vez para enviar.",
} as const;

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return undefined;
  return MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
}

export function isRecordingSupported(): boolean {
  return typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
}

export function useRecorder(opts: { onAutoStop?: (blob: Blob) => void; maxMs?: number } = {}) {
  const { onAutoStop, maxMs = MAX_RECORDING_MS } = opts;
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStopRef = useRef(onAutoStop);
  useEffect(() => {
    autoStopRef.current = onAutoStop;
  }, [onAutoStop]);

  const release = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setStatus("idle");
  }, []);

  const stop = useCallback((): Promise<Blob | null> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return Promise.resolve(null);
    return new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const tooShort = Date.now() - startedAtRef.current < MIN_RECORDING_MS || blob.size === 0;
        release();
        if (tooShort) setError(RECORDER_ERRORS.tooShort);
        resolve(tooShort ? null : blob);
      };
      recorder.stop();
    });
  }, [release]);

  const start = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (!isRecordingSupported()) {
      setError(RECORDER_ERRORS.unsupported);
      return false;
    }
    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current = [...chunksRef.current, e.data];
      };
      streamRef.current = stream;
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start();
      setStatus("recording");
      timerRef.current = setTimeout(async () => {
        const blob = await stop();
        if (blob) autoStopRef.current?.(blob);
      }, maxMs);
      return true;
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      setError(name === "NotAllowedError" ? RECORDER_ERRORS.denied : name === "NotFoundError" ? RECORDER_ERRORS.noMic : RECORDER_ERRORS.failed);
      release();
      return false;
    }
  }, [maxMs, release, stop]);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    release();
  }, [release]);

  useEffect(() => cancel, [cancel]);

  return { status, error, start, stop, cancel, clearError: () => setError(null) };
}
