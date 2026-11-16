import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Feedback } from "@/domain/feedback";
import type { NewPractice, PhraseRecord, PracticeRecord, Store, UserPatch, UserRecord } from "./store";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  sid TEXT PRIMARY KEY, created_at TEXT NOT NULL, install_key_sealed TEXT, install_id TEXT,
  claim_url TEXT, choice TEXT, own_key_sealed TEXT, telemetry_id TEXT
);
CREATE TABLE IF NOT EXISTS practices (
  id TEXT PRIMARY KEY, sid TEXT NOT NULL, scenario_id TEXT NOT NULL, industry_id TEXT NOT NULL,
  started_at TEXT NOT NULL, finished_at TEXT, local_day TEXT, turns TEXT NOT NULL, feedback TEXT, score INTEGER
);
CREATE INDEX IF NOT EXISTS practices_sid ON practices(sid, started_at);
CREATE TABLE IF NOT EXISTS phrases (
  id TEXT PRIMARY KEY, sid TEXT NOT NULL, practice_id TEXT NOT NULL, original TEXT NOT NULL,
  better TEXT NOT NULL, why_es TEXT NOT NULL, created_at TEXT NOT NULL, reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS phrases_sid ON phrases(sid, created_at);
`;

/** Columns added after the first release, applied to older databases on open. */
const PHRASE_MIGRATIONS: Record<string, string> = {
  step: "ALTER TABLE phrases ADD COLUMN step INTEGER NOT NULL DEFAULT 0",
  due_day: "ALTER TABLE phrases ADD COLUMN due_day TEXT",
};

function migrate(db: DatabaseSync): void {
  const existing = new Set((db.prepare("PRAGMA table_info(phrases)").all() as Row[]).map((c) => String(c.name)));
  for (const [column, sql] of Object.entries(PHRASE_MIGRATIONS)) {
    if (!existing.has(column)) db.exec(sql);
  }
}

type Row = Record<string, unknown>;
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

function toUser(r: Row): UserRecord {
  return {
    sid: String(r.sid),
    createdAt: String(r.created_at),
    installKeySealed: str(r.install_key_sealed),
    installId: str(r.install_id),
    claimUrl: str(r.claim_url),
    choice: r.choice === "publik" || r.choice === "own_key" ? r.choice : null,
    ownKeySealed: str(r.own_key_sealed),
    telemetryId: str(r.telemetry_id),
  };
}

function toPractice(r: Row): PracticeRecord {
  return {
    id: String(r.id),
    sid: String(r.sid),
    scenarioId: r.scenario_id as PracticeRecord["scenarioId"],
    industryId: r.industry_id as PracticeRecord["industryId"],
    startedAt: String(r.started_at),
    finishedAt: str(r.finished_at),
    localDay: str(r.local_day),
    turns: JSON.parse(String(r.turns)),
    feedback: r.feedback ? (JSON.parse(String(r.feedback)) as Feedback) : null,
    score: typeof r.score === "number" ? r.score : null,
  };
}

function toPhrase(r: Row): PhraseRecord {
  return {
    id: String(r.id),
    sid: String(r.sid),
    practiceId: String(r.practice_id),
    original: String(r.original),
    better: String(r.better),
    whyEs: String(r.why_es),
    createdAt: String(r.created_at),
    reviewedAt: str(r.reviewed_at),
    step: typeof r.step === "number" ? r.step : Number(r.step ?? 0),
    dueDay: str(r.due_day),
  };
}

const USER_COLUMNS: Record<keyof UserPatch, string> = {
  installKeySealed: "install_key_sealed",
  installId: "install_id",
  claimUrl: "claim_url",
  choice: "choice",
  ownKeySealed: "own_key_sealed",
  telemetryId: "telemetry_id",
};

export function createSqliteStore(path: string): Store {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(SCHEMA);
  migrate(db);
  const phraseRow = (sid: string, id: string) =>
    db.prepare("SELECT * FROM phrases WHERE id = ? AND sid = ?").get(id, sid) as Row | undefined;

  const getUser = (sid: string) => db.prepare("SELECT * FROM users WHERE sid = ?").get(sid) as Row | undefined;
  const getPracticeRow = (sid: string, id: string) =>
    db.prepare("SELECT * FROM practices WHERE id = ? AND sid = ?").get(id, sid) as Row | undefined;
  const requirePractice = (sid: string, id: string): PracticeRecord => {
    const row = getPracticeRow(sid, id);
    if (!row) throw new Error("practice not found");
    return toPractice(row);
  };

  return {
    getOrCreateUser(sid, now) {
      db.prepare("INSERT OR IGNORE INTO users (sid, created_at) VALUES (?, ?)").run(sid, now);
      return toUser(getUser(sid)!);
    },
    updateUser(sid, patch) {
      if (!getUser(sid)) throw new Error("user not found");
      const keys = Object.keys(patch) as (keyof UserPatch)[];
      for (const key of keys) {
        db.prepare(`UPDATE users SET ${USER_COLUMNS[key]} = ? WHERE sid = ?`).run(patch[key] ?? null, sid);
      }
      return toUser(getUser(sid)!);
    },
    createPractice(input: NewPractice) {
      const id = randomUUID();
      db.prepare(
        "INSERT INTO practices (id, sid, scenario_id, industry_id, started_at, turns) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(id, input.sid, input.scenarioId, input.industryId, input.startedAt, JSON.stringify(input.turns));
      return requirePractice(input.sid, id);
    },
    getPractice(sid, id) {
      const row = getPracticeRow(sid, id);
      return row ? toPractice(row) : null;
    },
    savePracticeTurns(sid, id, turns) {
      requirePractice(sid, id);
      db.prepare("UPDATE practices SET turns = ? WHERE id = ? AND sid = ?").run(JSON.stringify(turns), id, sid);
      return requirePractice(sid, id);
    },
    finishPractice(sid, id, result) {
      requirePractice(sid, id);
      db.prepare(
        "UPDATE practices SET feedback = ?, score = ?, finished_at = ?, local_day = ? WHERE id = ? AND sid = ?",
      ).run(JSON.stringify(result.feedback), result.feedback.score, result.finishedAt, result.localDay, id, sid);
      return requirePractice(sid, id);
    },
    listPractices(sid, limit) {
      const rows = db
        .prepare("SELECT * FROM practices WHERE sid = ? ORDER BY started_at DESC LIMIT ?")
        .all(sid, limit) as Row[];
      return rows.map(toPractice);
    },
    practiceDays(sid) {
      const rows = db
        .prepare("SELECT DISTINCT local_day FROM practices WHERE sid = ? AND local_day IS NOT NULL ORDER BY local_day")
        .all(sid) as Row[];
      return rows.map((r) => String(r.local_day));
    },
    addPhrases(sid, practiceId, phrases, now, dueDay) {
      const insert = db.prepare(
        "INSERT INTO phrases (id, sid, practice_id, original, better, why_es, created_at, due_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      );
      const ids = phrases.map((p) => {
        const id = randomUUID();
        insert.run(id, sid, practiceId, p.original, p.better, p.whyEs, now, dueDay);
        return id;
      });
      return ids.map((id) => toPhrase(db.prepare("SELECT * FROM phrases WHERE id = ?").get(id) as Row));
    },
    getPhrase(sid, id) {
      const row = phraseRow(sid, id);
      return row ? toPhrase(row) : null;
    },
    schedulePhrase(sid, id, schedule) {
      const result = db
        .prepare("UPDATE phrases SET step = ?, due_day = ?, reviewed_at = ? WHERE id = ? AND sid = ?")
        .run(schedule.step, schedule.dueDay, schedule.reviewedAt, id, sid);
      if (Number(result.changes) === 0) return null;
      return toPhrase(phraseRow(sid, id)!);
    },
    listPhrases(sid) {
      const rows = db.prepare("SELECT * FROM phrases WHERE sid = ? ORDER BY created_at DESC").all(sid) as Row[];
      return rows.map(toPhrase);
    },
    markPhrase(sid, id, reviewed, now) {
      const result = db
        .prepare("UPDATE phrases SET reviewed_at = ? WHERE id = ? AND sid = ?")
        .run(reviewed ? now : null, id, sid);
      if (Number(result.changes) === 0) return null;
      return toPhrase(db.prepare("SELECT * FROM phrases WHERE id = ?").get(id) as Row);
    },
  };
}
