import type { TimedWord } from "@/domain/clarity";
import type { ChatMessage } from "@/domain/conversation";

/** The AI port. Route handlers and services depend on this, never on a vendor SDK. */
export type Tier = "fast" | "balanced";

export interface SpeechAudio {
  readonly base64: string;
  readonly mime: string;
}

export interface AiProvider {
  /** Speech to text (English). Throws AppError("transcription_empty") when nothing was understood. */
  transcribe(audio: Blob, filename: string): Promise<string>;
  /** Speech to text with the start and end of each word (empty when the provider gives none). */
  transcribeTimed(audio: Blob, filename: string): Promise<{ text: string; words: TimedWord[] }>;
  chat(messages: readonly ChatMessage[], opts: { tier: Tier; maxTokens?: number }): Promise<string>;
  /** Text to speech, optionally in a given voice. null means "use the browser's voice instead". */
  speak(text: string, voice?: string): Promise<SpeechAudio | null>;
}
