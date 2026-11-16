/** Shapes the browser receives from the API. Type-only imports: nothing from the server ships to the client. */
import type { Pace, TimedWord, WordCheck } from "@/domain/clarity";
import type { Feedback } from "@/domain/feedback";
import type { Help } from "@/domain/help";
import type { SoundTip, WordGuide } from "@/domain/sounds";
import type { Streak } from "@/domain/streak";
import type { SpeechAudio } from "@/server/ai/provider";
import type { HistoryItem, PracticeView, ProgressStats, TurnEvent, TurnResult } from "@/server/practice-service";
import type { Alternative, TurnCheck, TurnIssue } from "@/domain/turn-check";
import type { GateState } from "@/server/publik/gate";

export type { Alternative, Feedback, GateState, Help, HistoryItem, Pace, ProgressStats, PracticeView, SoundTip, SpeechAudio, Streak, TimedWord, TurnCheck, TurnEvent, TurnIssue, TurnResult, WordCheck, WordGuide };

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
  /** Each word of the phrase: understood or not, and what was heard instead. */
  readonly words: readonly WordCheck[];
  readonly pace: Pace | null;
  readonly timings: readonly TimedWord[];
  readonly phrase: Phrase;
}

export interface Progress {
  readonly streak: Streak;
  readonly week: readonly { readonly day: string; readonly practiced: boolean }[];
  readonly history: readonly HistoryItem[];
  readonly stats: ProgressStats;
  readonly phrases: readonly Phrase[];
  readonly toReview: number;
  readonly dueToday: number;
}

export interface FinishResult {
  readonly practice: PracticeView;
  readonly feedback: Feedback;
  readonly streak: Streak;
}
