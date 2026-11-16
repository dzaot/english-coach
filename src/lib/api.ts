import { runtimeMessages } from "@/i18n/messages";
import type { DrillResult, FinishResult, GateState, Help, Phrase, PracticeView, Progress, SpeechAudio, TurnEvent, TurnResult, WordGuide } from "./types";

/** Typed calls to our own API. Every failure becomes an ApiError with a Spanish message. */

export class ApiError extends Error {
  readonly code: string;
  readonly topUpUrl: string | null;
  constructor(code: string, message: string, topUpUrl: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.topUpUrl = topUpUrl;
  }
}

/** Error texts in the person's language; the server's English message is the fallback for unknown codes. */
const errorText = (code: string, fallback?: string): string => {
  const known = runtimeMessages().errors as Record<string, string>;
  return known[code] ?? fallback ?? known.internal;
};
const offline = () => new ApiError("offline", errorText("offline"));

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { credentials: "same-origin", ...init });
  } catch {
    throw offline();
  }
  const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string; topUpUrl?: string | null } } | null;
  if (!res.ok) {
    const e = body?.error;
    throw new ApiError(e?.code ?? "internal", errorText(e?.code ?? "internal", e?.message), e?.topUpUrl ?? null);
  }
  return body as T;
}

type ErrorJson = { code?: string; message?: string; topUpUrl?: string | null } | undefined;
const toApiError = (e: ErrorJson) => new ApiError(e?.code ?? "internal", errorText(e?.code ?? "internal", e?.message), e?.topUpUrl ?? null);

/** Reads a JSON-lines stream: each event goes to onEvent; "done" is the result and "error" throws. */
async function streamRequest<T>(path: string, init: RequestInit, onEvent: (event: TurnEvent) => void): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { credentials: "same-origin", ...init });
  } catch {
    throw offline();
  }
  if (!res.ok || !res.body || !(res.headers.get("content-type") ?? "").includes("ndjson")) {
    const body = (await res.json().catch(() => null)) as { error?: ErrorJson } | null;
    throw toApiError(body?.error);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try {
      chunk = await reader.read();
    } catch {
      throw offline();
    }
    buffer += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !chunk.done });
    const lines = buffer.split("\n");
    buffer = chunk.done ? "" : (lines.pop() ?? "");
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as { type: string; error?: ErrorJson };
      if (event.type === "done") {
        return Object.fromEntries(Object.entries(event).filter(([k]) => k !== "type")) as T;
      }
      if (event.type === "error") throw toApiError(event.error);
      onEvent(event as TurnEvent);
    }
    if (chunk.done) throw new ApiError("internal", errorText("cutOff"));
  }
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const tzOffset = (): number => new Date().getTimezoneOffset();

export const api = {
  gate: () => request<GateState>("/api/gate"),
  gateAction: (body: { action: "connect" | "reset" } | { action: "own_key"; key: string }) =>
    request<GateState>("/api/gate", jsonInit("POST", body)),
  telemetry: (event: "app_opened" | "active_session") =>
    request<{ result: string }>("/api/telemetry", jsonInit("POST", { event })),
  start: (choice: { scenarioId: string; industryId: string; level: string; avatarId: string; context?: string; locale?: string }) =>
    request<{ practice: PracticeView; audio: SpeechAudio | null }>("/api/practice", jsonInit("POST", choice)),
  getPractice: (id: string) => request<{ practice: PracticeView }>(`/api/practice/${encodeURIComponent(id)}`),
  /** One answer, streamed: your words, the marks, the reply and its voice arrive as separate events. */
  turn: (id: string, answer: { audio: Blob } | { text: string }, onEvent: (event: TurnEvent) => void = () => undefined) => {
    const form = new FormData();
    if ("audio" in answer) {
      const ext = answer.audio.type.includes("mp4") ? "mp4" : "webm";
      form.append("audio", answer.audio, `turn.${ext}`);
    } else {
      form.append("text", answer.text);
    }
    return streamRequest<TurnResult>(`/api/practice/${encodeURIComponent(id)}/turn`, { method: "POST", body: form }, onEvent);
  },
  speech: (id: string, turnIndex: number, alternative?: number) =>
    request<{ audio: SpeechAudio | null }>(`/api/practice/${encodeURIComponent(id)}/speech`, jsonInit("POST", { turnIndex, alternative })),
  drill: (phraseId: string, audio: Blob) => {
    const form = new FormData();
    form.append("audio", audio, `say.${audio.type.includes("mp4") ? "m4a" : "webm"}`);
    form.append("tzOffset", String(tzOffset()));
    return request<DrillResult>(`/api/phrases/${encodeURIComponent(phraseId)}/drill`, { method: "POST", body: form });
  },
  pronounce: (text: string) => request<{ words: WordGuide[] }>("/api/pronounce", jsonInit("POST", { text })),
  help: (id: string) => request<Help>(`/api/practice/${encodeURIComponent(id)}/help`, jsonInit("POST", {})),
  finish: (id: string) =>
    request<FinishResult>(`/api/practice/${encodeURIComponent(id)}/finish`, jsonInit("POST", { tzOffset: tzOffset() })),
  progress: () => request<Progress>(`/api/progress?tz=${tzOffset()}`),
  markPhrase: (id: string, reviewed: boolean) =>
    request<{ phrase: Phrase }>(`/api/phrases/${encodeURIComponent(id)}`, jsonInit("PATCH", { reviewed })),
};
