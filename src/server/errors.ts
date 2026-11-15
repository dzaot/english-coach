/** Errors with friendly Spanish messages for the UI, and details kept for server logs. */

const CATALOG = {
  invalid_input: { status: 400, es: "Revisa los datos e inténtalo de nuevo." },
  audio_empty: { status: 400, es: "No escuchamos nada. Mantén el micrófono cerca e inténtalo otra vez." },
  audio_too_large: { status: 413, es: "El audio es muy largo. Responde en menos de un minuto y medio." },
  transcription_empty: { status: 422, es: "No entendimos el audio. Habla un poco más fuerte o escribe tu respuesta." },
  not_found: { status: 404, es: "No encontramos esa práctica." },
  session_finished: { status: 409, es: "Esta práctica ya terminó. Empieza una nueva." },
  turn_limit: { status: 409, es: "Llegaste al máximo de respuestas. Pide tu feedback." },
  not_enough_turns: { status: 409, es: "Responde al menos dos veces para recibir feedback." },
  gate_required: { status: 403, es: "Inicia sesión con publik para practicar." },
  own_key_invalid: { status: 400, es: "Esa clave no parece válida. Revisa que esté completa." },
  ai_balance: { status: 402, es: "Se acabó tu saldo de IA en publik." },
  ai_rate_limited: { status: 429, es: "Vas muy rápido. Espera unos segundos e inténtalo de nuevo." },
  ai_auth: { status: 502, es: "Tu sesión de publik expiró. Recarga la página para entrar de nuevo." },
  ai_unavailable: { status: 503, es: "El servicio de IA no responde ahora. Inténtalo en un momento." },
  feedback_invalid: { status: 502, es: "No pudimos preparar tu feedback. Inténtalo otra vez." },
  internal: { status: 500, es: "Algo salió mal de nuestro lado. Inténtalo de nuevo." },
} as const;

export type ErrorCode = keyof typeof CATALOG;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly messageEs: string;
  readonly topUpUrl: string | null;
  readonly detail: string | null;

  constructor(code: ErrorCode, opts: { topUpUrl?: string | null; detail?: string | null } = {}) {
    super(opts.detail ?? code);
    this.name = "AppError";
    this.code = code;
    this.status = CATALOG[code].status;
    this.messageEs = CATALOG[code].es;
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
    { error: { code: appError.code, message: appError.messageEs, topUpUrl: appError.topUpUrl } },
    { status: appError.status },
  );
}
