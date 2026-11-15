import type { Turn } from "@/domain/conversation";
import type { Feedback } from "@/domain/feedback";
import type { IndustryId, ScenarioId } from "@/domain/scenarios";

/** Persistence port. The app depends on this interface; SQLite is one implementation. */

export type AiChoice = "publik" | "own_key";

export interface UserRecord {
  readonly sid: string;
  readonly createdAt: string;
  readonly installKeySealed: string | null;
  readonly installId: string | null;
  readonly claimUrl: string | null;
  readonly choice: AiChoice | null;
  readonly ownKeySealed: string | null;
  readonly telemetryId: string | null;
}

export type UserPatch = Partial<Omit<UserRecord, "sid" | "createdAt">>;

export interface PracticeRecord {
  readonly id: string;
  readonly sid: string;
  readonly scenarioId: ScenarioId;
  readonly industryId: IndustryId;
  readonly startedAt: string;
  readonly finishedAt: string | null;
  readonly localDay: string | null;
  readonly turns: readonly Turn[];
  readonly feedback: Feedback | null;
  readonly score: number | null;
}

export interface NewPractice {
  readonly sid: string;
  readonly scenarioId: ScenarioId;
  readonly industryId: IndustryId;
  readonly startedAt: string;
  readonly turns: readonly Turn[];
}

export interface PhraseRecord {
  readonly id: string;
  readonly sid: string;
  readonly practiceId: string;
  readonly original: string;
  readonly better: string;
  readonly whyEs: string;
  readonly createdAt: string;
  readonly reviewedAt: string | null;
}

export interface Store {
  getOrCreateUser(sid: string, now: string): UserRecord;
  updateUser(sid: string, patch: UserPatch): UserRecord;
  createPractice(input: NewPractice): PracticeRecord;
  getPractice(sid: string, id: string): PracticeRecord | null;
  savePracticeTurns(sid: string, id: string, turns: readonly Turn[]): PracticeRecord;
  finishPractice(
    sid: string,
    id: string,
    result: { feedback: Feedback; finishedAt: string; localDay: string },
  ): PracticeRecord;
  listPractices(sid: string, limit: number): PracticeRecord[];
  practiceDays(sid: string): string[];
  addPhrases(
    sid: string,
    practiceId: string,
    phrases: readonly { original: string; better: string; whyEs: string }[],
    now: string,
  ): PhraseRecord[];
  listPhrases(sid: string): PhraseRecord[];
  markPhrase(sid: string, id: string, reviewed: boolean, now: string): PhraseRecord | null;
}
