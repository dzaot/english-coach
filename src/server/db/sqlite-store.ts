import { randomUUID } from "node:crypto";
import { isAvatarId } from "@/domain/avatars";
import type { Feedback } from "@/domain/feedback";
import { isLevelId } from "@/domain/levels";
import { isLocale } from "@/domain/locales";
import type { Row, SqlDb } from "./sql";
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
const MIGRATIONS: Record<"phrases" | "practices", Record<string, string>> = {
  phrases: {
    step: "ALTER TABLE phrases ADD COLUMN step INTEGER NOT NULL DEFAULT 0",
    due_day: "ALTER TABLE phrases ADD COLUMN due_day TEXT",
  },
  practices: {
    level: "ALTER TABLE practices ADD COLUMN level TEXT NOT NULL DEFAULT 'intermediate'",
    avatar_id: "ALTER TABLE practices ADD COLUMN avatar_id TEXT NOT NULL DEFAULT 'sarah'",
    context: "ALTER TABLE practices ADD COLUMN context TEXT",
    // Practices made before languages were added had Spanish support.
    locale: "ALTER TABLE practices ADD COLUMN locale TEXT NOT NULL DEFAULT 'es'",
  },
};

async function migrate(db: SqlDb): Promise<void> {
  for (const [table, columns] of Object.entries(MIGRATIONS)) {
    const existing = new Set((await db.all(`PRAGMA table_info(${table})`)).map((c) => String(c.name)));
    for (const [column, sql] of Object.entries(columns)) {
      if (!existing.has(column)) await db.exec(sql);
    }
  }
}
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
    level: isLevelId(r.level) ? r.level : "intermediate",
    avatarId: isAvatarId(r.avatar_id) ? r.avatar_id : "sarah",
    startedAt: String(r.started_at),
    finishedAt: str(r.finished_at),
    localDay: str(r.local_day),
    turns: JSON.parse(String(r.turns)),
    feedback: r.feedback ? (JSON.parse(String(r.feedback)) as Feedback) : null,
    score: r.score === null || r.score === undefined ? null : Number(r.score),
    context: str(r.context),
    locale: isLocale(r.locale) ? r.locale : "es",
  };
}

function toPhrase(r: Row): PhraseRecord {
  return {
    id: String(r.id),
    sid: String(r.sid),
    practiceId: String(r.practice_id),
    original: String(r.original),
    better: String(r.better),
    why: String(r.why_es),
    createdAt: String(r.created_at),
    reviewedAt: str(r.reviewed_at),
    step: Number(r.step ?? 0),
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

/** The store on any SqlDb. Schema and migrations run once, before the first query. */
export function createSqlStore(open: SqlDb | Promise<SqlDb>): Store {
  const ready = (async () => {
    const db = await open;
    await db.exec(SCHEMA);
    await migrate(db);
    return db;
  })();

  const getUser = async (sid: string) => (await ready).get("SELECT * FROM users WHERE sid = ?", [sid]);
  const phraseRow = async (sid: string, id: string) => (await ready).get("SELECT * FROM phrases WHERE id = ? AND sid = ?", [id, sid]);
  const practiceRow = async (sid: string, id: string) => (await ready).get("SELECT * FROM practices WHERE id = ? AND sid = ?", [id, sid]);
  const requirePractice = async (sid: string, id: string): Promise<PracticeRecord> => {
    const row = await practiceRow(sid, id);
    if (!row) throw new Error("practice not found");
    return toPractice(row);
  };
  const requireUser = async (sid: string): Promise<UserRecord> => {
    const row = await getUser(sid);
    if (!row) throw new Error("user not found");
    return toUser(row);
  };

  return {
    async getOrCreateUser(sid, now) {
      await (await ready).run("INSERT OR IGNORE INTO users (sid, created_at) VALUES (?, ?)", [sid, now]);
      return requireUser(sid);
    },
    async updateUser(sid, patch) {
      await requireUser(sid);
      const db = await ready;
      for (const key of Object.keys(patch) as (keyof UserPatch)[]) {
        await db.run(`UPDATE users SET ${USER_COLUMNS[key]} = ? WHERE sid = ?`, [patch[key] ?? null, sid]);
      }
      return requireUser(sid);
    },
    async createPractice(input: NewPractice) {
      const id = randomUUID();
      await (await ready).run(
        "INSERT INTO practices (id, sid, scenario_id, industry_id, level, avatar_id, started_at, turns, context, locale) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [id, input.sid, input.scenarioId, input.industryId, input.level, input.avatarId, input.startedAt, JSON.stringify(input.turns), input.context ?? null, input.locale ?? "es"],
      );
      return requirePractice(input.sid, id);
    },
    async getPractice(sid, id) {
      const row = await practiceRow(sid, id);
      return row ? toPractice(row) : null;
    },
    async savePracticeTurns(sid, id, turns) {
      await (await ready).run("UPDATE practices SET turns = ? WHERE id = ? AND sid = ?", [JSON.stringify(turns), id, sid]);
      return requirePractice(sid, id);
    },
    async finishPractice(sid, id, result) {
      await requirePractice(sid, id);
      await (await ready).run(
        "UPDATE practices SET feedback = ?, score = ?, finished_at = ?, local_day = ? WHERE id = ? AND sid = ?",
        [JSON.stringify(result.feedback), result.feedback.score, result.finishedAt, result.localDay, id, sid],
      );
      return requirePractice(sid, id);
    },
    async listPractices(sid, limit) {
      const rows = await (await ready).all("SELECT * FROM practices WHERE sid = ? ORDER BY started_at DESC LIMIT ?", [sid, limit]);
      return rows.map(toPractice);
    },
    async practiceDays(sid) {
      const rows = await (await ready).all(
        "SELECT DISTINCT local_day FROM practices WHERE sid = ? AND local_day IS NOT NULL ORDER BY local_day",
        [sid],
      );
      return rows.map((r) => String(r.local_day));
    },
    async addPhrases(sid, practiceId, phrases, now, dueDay) {
      const db = await ready;
      const ids: string[] = [];
      for (const p of phrases) {
        const id = randomUUID();
        await db.run(
          "INSERT INTO phrases (id, sid, practice_id, original, better, why_es, created_at, due_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [id, sid, practiceId, p.original, p.better, p.why, now, dueDay],
        );
        ids.push(id);
      }
      const rows = await Promise.all(ids.map((id) => phraseRow(sid, id)));
      return rows.flatMap((r) => (r ? [toPhrase(r)] : []));
    },
    async getPhrase(sid, id) {
      const row = await phraseRow(sid, id);
      return row ? toPhrase(row) : null;
    },
    async schedulePhrase(sid, id, schedule) {
      const r = await (await ready).run("UPDATE phrases SET step = ?, due_day = ?, reviewed_at = ? WHERE id = ? AND sid = ?", [
        schedule.step,
        schedule.dueDay,
        schedule.reviewedAt,
        id,
        sid,
      ]);
      if (r.changes === 0) return null;
      const row = await phraseRow(sid, id);
      return row ? toPhrase(row) : null;
    },
    async listPhrases(sid) {
      const rows = await (await ready).all("SELECT * FROM phrases WHERE sid = ? ORDER BY created_at DESC", [sid]);
      return rows.map(toPhrase);
    },
    async markPhrase(sid, id, reviewed, now) {
      const r = await (await ready).run("UPDATE phrases SET reviewed_at = ? WHERE id = ? AND sid = ?", [reviewed ? now : null, id, sid]);
      if (r.changes === 0) return null;
      const row = await phraseRow(sid, id);
      return row ? toPhrase(row) : null;
    },
  };
}

/** A local SQLite file, or ":memory:" in tests. */
export function createSqliteStore(path: string): Store {
  // Loaded lazily so a host that uses a hosted database never loads node:sqlite.
  return createSqlStore(import("./sqlite-db").then((m) => m.openSqliteDb(path)));
}
