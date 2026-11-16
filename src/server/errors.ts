/** Errors with friendly messages for the UI, and details kept for server logs. */

const CATALOG = {
  invalid_input: { status: 400, msg: "Please check your input and try again." },
  audio_empty: { status: 400, msg: "We didn't hear anything. Keep the microphone close and try again." },
  audio_too_large: { status: 413, msg: "That recording is too long. Keep your answer under a minute and a half." },
  transcription_empty: { status: 422, msg: "We couldn't understand the audio. Speak a bit louder or type your answer." },
  not_found: { status: 404, msg: "We couldn't find that practice." },
  session_finished: { status: 409, msg: "This practice is over. Start a new one." },
  turn_limit: { status: 409, msg: "You reached the maximum number of answers. Get your feedback." },
  not_enough_turns: { status: 409, msg: "Answer at least twice to get feedback." },
  gate_required: { status: 403, msg: "Sign in with publik to practice." },
  forbidden: { status: 403, msg: "This request is not allowed." },
  own_key_invalid: { status: 400, msg: "That key doesn't look right. Check that it is complete." },
  ai_balance: { status: 402, msg: "Your publik AI balance has run out." },
  ai_rate_limited: { status: 429, msg: "You're going fast! Wait a few seconds and try again." },
  ai_auth: { status: 502, msg: "Your publik session expired. Reload the page to sign in again." },
  ai_unavailable: { status: 503, msg: "The AI service is not responding right now. Try again in a moment." },
  feedback_invalid: { status: 502, msg: "We couldn't prepare your feedback. Please try again." },
  help_invalid: { status: 502, msg: "We couldn't prepare a hint. Please try again." },
  internal: { status: 500, msg: "Something went wrong on our side. Please try again." },
} as const;

export type ErrorCode = keyof typeof CATALOG;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly userMessage: string;
  readonly topUpUrl: string | null;
  readonly detail: string | null;

  constructor(code: ErrorCode, opts: { topUpUrl?: string | null; detail?: string | null } = {}) {
    super(opts.detail ?? code);
    this.name = "AppError";
    this.code = code;
    this.status = CATALOG[code].status;
    this.userMessage = CATALOG[code].msg;
    this.topUpUrl = opts.topUpUrl ?? null;
    this.detail = opts.detail ?? null;
  }
}

function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

/** Maps a publik API (or OpenAI-compatible) error status to an AppError. */
export function fromPublikStatus(status: number, body: unknown): AppError {
  const err = (body as { error?: { message?: unknown; top_up_url?: unknown } } | null)?.error;
  const detail = typeof err?.message === "string" ? err.message : null;
  if (status === 402) return new AppError("ai_balance", { detail, topUpUrl: safeHttpsUrl(err?.top_up_url) });
  if (status === 429) return new AppError("ai_rate_limited", { detail });
  if (status === 401) return new AppError("ai_auth", { detail });
  if (status === 413) return new AppError("audio_too_large", { detail });
  return new AppError("ai_unavailable", { detail: detail ?? `upstream status ${status}` });
}

export function errorResponse(error: unknown): Response {
  const appError = error instanceof AppError ? error : new AppError("internal");
  if (!(error instanceof AppError) || appError.status >= 500) {
    console.error("[api]", appError.code, error instanceof Error ? error.message : error);
  }
  return Response.json(
    { error: { code: appError.code, message: appError.userMessage, topUpUrl: appError.topUpUrl } },
    { status: appError.status },
  );
}
