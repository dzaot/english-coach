import { AppError, fromPublikStatus } from "@/server/errors";
import type { AiProvider, SpeechAudio, Tier } from "./provider";

/** One client for publik API and for a user's own OpenAI key: both speak the OpenAI API. */
export interface OpenAiCompatibleOptions {
  readonly baseURL: string;
  readonly apiKey: string;
  readonly models: Readonly<Record<Tier, string>> & { readonly transcribe: string; readonly speech: string };
  readonly voice: string;
  readonly fetch?: typeof fetch;
}

const CHAT_TIMEOUT_MS = 45_000;
const AUDIO_TIMEOUT_MS = 30_000;

export function createOpenAiCompatibleProvider(opts: OpenAiCompatibleOptions): AiProvider {
  const doFetch = opts.fetch ?? fetch;
  const auth = { authorization: `Bearer ${opts.apiKey}` };

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

  return {
    async transcribe(audio, filename) {
      const form = new FormData();
      form.append("file", audio, filename);
      form.append("model", opts.models.transcribe);
      form.append("language", "en");
      const res = await call("/audio/transcriptions", { method: "POST", headers: auth, body: form }, AUDIO_TIMEOUT_MS);
      const body = (await res.json().catch(() => ({}))) as { text?: unknown };
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!text) throw new AppError("transcription_empty");
      return text;
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
      const body = (await res.json().catch(() => ({}))) as { choices?: { message?: { content?: unknown } }[] };
      const content = body.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new AppError("ai_unavailable", { detail: "empty chat answer" });
      }
      return content.trim();
    },

    async speak(text): Promise<SpeechAudio | null> {
      try {
        const res = await call(
          "/audio/speech",
          {
            method: "POST",
            headers: { ...auth, "content-type": "application/json" },
            body: JSON.stringify({ model: opts.models.speech, voice: opts.voice, input: text, response_format: "mp3" }),
          },
          AUDIO_TIMEOUT_MS,
        );
        const bytes = Buffer.from(await res.arrayBuffer());
        return { base64: bytes.toString("base64"), mime: res.headers.get("content-type") ?? "audio/mpeg" };
      } catch (e) {
        console.error("[ai] speech failed, using the browser voice", e instanceof AppError ? e.code : e);
        return null;
      }
    },
  };
}
