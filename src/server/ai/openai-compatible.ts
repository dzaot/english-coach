import type { TimedWord } from "@/domain/clarity";
import { AppError, fromPublikStatus } from "@/server/errors";
import type { AiProvider, SpeechAudio, Tier } from "./provider";

/** One client for publik API and for a user's own OpenAI key: both speak the OpenAI API. */
export interface OpenAiCompatibleOptions {
  readonly baseURL: string;
  readonly apiKey: string;
  readonly models: Readonly<Record<Tier, string>> & { readonly transcribe: string; readonly speech: string };
  readonly voice: string;
  readonly fetch?: typeof fetch;
  /** Called with what publik charged for a call (x-publik-charge-micros), when the header is present. */
  readonly onCharge?: (charge: Charge) => void;
}

export interface Charge {
  readonly op: "transcribe" | "chat" | "speech";
  readonly model: string;
  readonly micros: number;
}

const CHAT_TIMEOUT_MS = 45_000;
const AUDIO_TIMEOUT_MS = 30_000;

export function createOpenAiCompatibleProvider(opts: OpenAiCompatibleOptions): AiProvider {
  const doFetch = opts.fetch ?? fetch;
  const auth = { authorization: `Bearer ${opts.apiKey}` };

  function report(res: Response, op: Charge["op"], model: string): void {
    const micros = Number(res.headers.get("x-publik-charge-micros"));
    if (opts.onCharge && res.headers.has("x-publik-charge-micros") && Number.isFinite(micros)) opts.onCharge({ op, model, micros });
  }

  async function call(path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    let res: Response;
    try {
      res = await doFetch(`${opts.baseURL}${path}`, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (e) {
      throw new AppError("ai_unavailable", { detail: e instanceof Error ? e.message : "network error" });
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let body: unknown = text;
      try {
        body = JSON.parse(text);
      } catch {
        /* plain-text error from the host, e.g. a 413 */
      }
      throw fromPublikStatus(res.status, body);
    }
    return res;
  }

  async function transcribeWith(audio: Blob, filename: string, timed: boolean): Promise<{ text: string; words: TimedWord[] }> {
    const form = new FormData();
    form.append("file", audio, filename);
    form.append("model", opts.models.transcribe);
    form.append("language", "en");
    if (timed) {
      form.append("response_format", "verbose_json");
      form.append("timestamp_granularities[]", "word");
    }
    const res = await call("/audio/transcriptions", { method: "POST", headers: auth, body: form }, AUDIO_TIMEOUT_MS);
    report(res, "transcribe", opts.models.transcribe);
    const body = (await res.json().catch(() => ({}))) as { text?: unknown; words?: unknown };
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) throw new AppError("transcription_empty");
    return { text, words: parseTimedWords(body.words) };
  }

  return {
    async transcribe(audio, filename) {
      return (await transcribeWith(audio, filename, false)).text;
    },

    async transcribeTimed(audio, filename) {
      return transcribeWith(audio, filename, true);
    },

    async chat(messages, { tier, maxTokens }) {
      const res = await call(
        "/chat/completions",
        {
          method: "POST",
          headers: { ...auth, "content-type": "application/json" },
          body: JSON.stringify({ model: opts.models[tier], messages, ...(maxTokens ? { max_tokens: maxTokens } : {}) }),
        },
        CHAT_TIMEOUT_MS,
      );
      report(res, "chat", opts.models[tier]);
      const body = (await res.json().catch(() => ({}))) as { choices?: { message?: { content?: unknown } }[] };
      const content = body.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new AppError("ai_unavailable", { detail: "empty chat answer" });
      }
      return content.trim();
    },

    async speak(text, voice): Promise<SpeechAudio | null> {
      try {
        const res = await call(
          "/audio/speech",
          {
            method: "POST",
            headers: { ...auth, "content-type": "application/json" },
            body: JSON.stringify({ model: opts.models.speech, voice: voice ?? opts.voice, input: text, response_format: "mp3" }),
          },
          AUDIO_TIMEOUT_MS,
        );
        report(res, "speech", opts.models.speech);
        const bytes = Buffer.from(await res.arrayBuffer());
        return { base64: bytes.toString("base64"), mime: res.headers.get("content-type") ?? "audio/mpeg" };
      } catch (e) {
        console.error("[ai] speech failed, using the browser voice", e instanceof AppError ? e.code : e);
        return null;
      }
    },
  };
}

function parseTimedWords(raw: unknown): TimedWord[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((w) => {
    const { word, start, end } = (w ?? {}) as { word?: unknown; start?: unknown; end?: unknown };
    return typeof word === "string" && typeof start === "number" && typeof end === "number" ? [{ word, start, end }] : [];
  });
}
