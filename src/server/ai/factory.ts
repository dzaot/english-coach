import type { AppConfig } from "@/server/config";
import { MODELS } from "@/server/publik/publik";
import { createOpenAiCompatibleProvider, type Charge } from "./openai-compatible";
import type { AiProvider } from "./provider";

/** Builds the real clients. Which key to use is decided by the gate (publik/gate.ts). */

export const OPENAI_BASE_URL = "https://api.openai.com/v1";

/** One server log line per charged call: operation, model, micros. Never the key or the content. */
export function logCharge(charge: Charge): void {
  console.info(`[publik-cost] ${charge.op} ${charge.model} ${charge.micros}`);
}

export function publikProvider(config: AppConfig, apiKey: string, doFetch: typeof fetch): AiProvider {
  return createOpenAiCompatibleProvider({
    baseURL: `${config.publikOrigin}/api/v1`,
    apiKey,
    models: { fast: MODELS.fast, balanced: MODELS.balanced, transcribe: "whisper-1", speech: config.speechModel },
    voice: config.speechVoice,
    fetch: doFetch,
    onCharge: config.costLog ? logCharge : undefined,
  });
}

/** "Use my own key": the person's OpenAI key, with OpenAI model names. */
export function ownKeyProvider(apiKey: string, doFetch: typeof fetch): AiProvider {
  return createOpenAiCompatibleProvider({
    baseURL: OPENAI_BASE_URL,
    apiKey,
    models: { fast: "gpt-4o-mini", balanced: "gpt-4o-mini", transcribe: "whisper-1", speech: "tts-1" },
    voice: "alloy",
    fetch: doFetch,
  });
}
