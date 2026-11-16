import type { DrillResult, FinishResult, GateState, Help, Phrase, PracticeView, Progress, SpeechAudio, TurnResult } from "./types";

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

const OFFLINE_MESSAGE = "No hay conexión. Revisa tu internet e inténtalo de nuevo.";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { credentials: "same-origin", ...init });
  } catch {
    throw new ApiError("offline", OFFLINE_MESSAGE);
  }
  const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string; topUpUrl?: string | null } } | null;
  if (!res.ok) {
    const e = body?.error;
    throw new ApiError(e?.code ?? "internal", e?.message ?? "Algo salió mal. Inténtalo de nuevo.", e?.topUpUrl ?? null);
  }
  return body as T;
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
  start: (scenarioId: string, industryId: string) =>
    request<{ practice: PracticeView; audio: SpeechAudio | null }>("/api/practice", jsonInit("POST", { scenarioId, industryId })),
  getPractice: (id: string) => request<{ practice: PracticeView }>(`/api/practice/${encodeURIComponent(id)}`),
  turn: (id: string, answer: { audio: Blob } | { text: string }) => {
    const form = new FormData();
    if ("audio" in answer) {
      const ext = answer.audio.type.includes("mp4") ? "mp4" : "webm";
      form.append("audio", answer.audio, `turn.${ext}`);
    } else {
      form.append("text", answer.text);
    }
    return request<TurnResult>(`/api/practice/${encodeURIComponent(id)}/turn`, { method: "POST", body: form });
  },
  speech: (id: string, turnIndex: number) =>
    request<{ audio: SpeechAudio | null }>(`/api/practice/${encodeURIComponent(id)}/speech`, jsonInit("POST", { turnIndex })),
  drill: (phraseId: string, audio: Blob) => {
    const form = new FormData();
    form.append("audio", audio, `say.${audio.type.includes("mp4") ? "m4a" : "webm"}`);
    form.append("tzOffset", String(tzOffset()));
    return request<DrillResult>(`/api/phrases/${encodeURIComponent(phraseId)}/drill`, { method: "POST", body: form });
  },
  help: (id: string) => request<Help>(`/api/practice/${encodeURIComponent(id)}/help`, jsonInit("POST", {})),
  finish: (id: string) =>
    request<FinishResult>(`/api/practice/${encodeURIComponent(id)}/finish`, jsonInit("POST", { tzOffset: tzOffset() })),
  progress: () => request<Progress>(`/api/progress?tz=${tzOffset()}`),
  markPhrase: (id: string, reviewed: boolean) =>
    request<{ phrase: Phrase }>(`/api/phrases/${encodeURIComponent(id)}`, jsonInit("PATCH", { reviewed })),
};
