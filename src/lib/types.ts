/** Shapes the browser receives from the API. Type-only imports: nothing from the server ships to the client. */
import type { Feedback } from "@/domain/feedback";
import type { Help } from "@/domain/help";
import type { Streak } from "@/domain/streak";
import type { SpeechAudio } from "@/server/ai/provider";
import type { HistoryItem, PracticeView, TurnResult } from "@/server/practice-service";
import type { GateState } from "@/server/publik/gate";

export type { Feedback, GateState, Help, HistoryItem, PracticeView, SpeechAudio, Streak, TurnResult };

export interface Phrase {
  readonly id: string;
  readonly practiceId: string;
  readonly original: string;
  readonly better: string;
  readonly why: string;
  readonly createdAt: string;
  readonly reviewedAt: string | null;
  readonly step: number;
  readonly dueDay: string | null;
}

export interface DrillResult {
  readonly said: string;
  readonly score: number;
  readonly passed: boolean;
  readonly missing: readonly string[];
  readonly phrase: Phrase;
}

export interface Progress {
  readonly streak: Streak;
  readonly week: readonly { readonly day: string; readonly practiced: boolean }[];
  readonly history: readonly HistoryItem[];
  readonly phrases: readonly Phrase[];
  readonly toReview: number;
  readonly dueToday: number;
}

export interface FinishResult {
  readonly practice: PracticeView;
  readonly feedback: Feedback;
  readonly streak: Streak;
}
