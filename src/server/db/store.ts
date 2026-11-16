import type { Turn } from "@/domain/conversation";
import type { Feedback } from "@/domain/feedback";
import type { AvatarId } from "@/domain/avatars";
import type { LevelId } from "@/domain/levels";
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
  readonly level: LevelId;
  readonly avatarId: AvatarId;
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
  readonly level: LevelId;
  readonly avatarId: AvatarId;
  readonly startedAt: string;
  readonly turns: readonly Turn[];
}

export interface PhraseRecord {
  readonly id: string;
  readonly sid: string;
  readonly practiceId: string;
  readonly original: string;
  readonly better: string;
  readonly why: string;
  readonly createdAt: string;
  /** Set when the phrase is learned (manually or after the last spaced review). */
  readonly reviewedAt: string | null;
  /** Successful say-it reviews so far. */
  readonly step: number;
  /** Next review day ("YYYY-MM-DD") in the user's time zone, or null. */
  readonly dueDay: string | null;
}

/** Persistence. Async so it can run on a local SQLite file or a hosted database. */
export interface Store {
  getOrCreateUser(sid: string, now: string): Promise<UserRecord>;
  updateUser(sid: string, patch: UserPatch): Promise<UserRecord>;
  createPractice(input: NewPractice): Promise<PracticeRecord>;
  getPractice(sid: string, id: string): Promise<PracticeRecord | null>;
  savePracticeTurns(sid: string, id: string, turns: readonly Turn[]): Promise<PracticeRecord>;
  finishPractice(
    sid: string,
    id: string,
    result: { feedback: Feedback; finishedAt: string; localDay: string },
  ): Promise<PracticeRecord>;
  listPractices(sid: string, limit: number): Promise<PracticeRecord[]>;
  practiceDays(sid: string): Promise<string[]>;
  addPhrases(
    sid: string,
    practiceId: string,
    phrases: readonly { original: string; better: string; why: string }[],
    now: string,
    dueDay: string,
  ): Promise<PhraseRecord[]>;
  getPhrase(sid: string, id: string): Promise<PhraseRecord | null>;
  schedulePhrase(
    sid: string,
    id: string,
    schedule: { step: number; dueDay: string | null; reviewedAt: string | null },
  ): Promise<PhraseRecord | null>;
  listPhrases(sid: string): Promise<PhraseRecord[]>;
  markPhrase(sid: string, id: string, reviewed: boolean, now: string): Promise<PhraseRecord | null>;
}
