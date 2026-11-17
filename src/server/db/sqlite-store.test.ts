import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import { createSqliteStore } from "./sqlite-store";
import type { Store } from "./store";

const SID = "user-1";
const feedback = {
  summary: "Bien",
  wellDone: ["Claro"],
  betterPhrases: [{ original: "I am agree", better: "I agree", why: "Verbo" }],
  vocabulary: [{ term: "follow up", meaning: "seguimiento" }],
  score: 70,
};

describe("SQLite store", () => {
  let store: Store;
  beforeEach(() => {
    store = createSqliteStore(":memory:");
  });

  it("creates a user once and patches it immutably", async () => {
    const u = await store.getOrCreateUser(SID, "2026-11-15T00:00:00Z");
    expect(u.choice).toBeNull();
    expect((await store.getOrCreateUser(SID, "2026-11-16T00:00:00Z")).createdAt).toBe("2026-11-15T00:00:00Z");
    const patched = await store.updateUser(SID, { choice: "publik", installId: "inst-1" });
    expect(patched.choice).toBe("publik");
    expect(patched.installId).toBe("inst-1");
    expect(u.choice).toBeNull();
  });

  it("stores a practice, its turns and its feedback", async () => {
    await store.getOrCreateUser(SID, "2026-11-15T00:00:00Z");
    const p = await store.createPractice({
      sid: SID,
      scenarioId: "job_interview",
      industryId: "tech",
      level: "beginner",
      avatarId: "emily",
      startedAt: "2026-11-15T10:00:00Z",
      turns: [{ role: "counterpart", text: "Hi" }],
    });
    expect(p.finishedAt).toBeNull();
    expect(p.level).toBe("beginner");
    expect(p.avatarId).toBe("emily");
    const withTurn = await store.savePracticeTurns(SID, p.id, [...p.turns, { role: "user", text: "Hello" }]);
    expect(withTurn?.turns).toHaveLength(2);
    // A save that expects the old turn count is refused once another answer landed.
    expect(await store.savePracticeTurns(SID, p.id, [...p.turns, { role: "user", text: "Again" }], 1)).toBeNull();
    expect(await store.savePracticeTurns(SID, p.id, [...p.turns, { role: "user", text: "Hello" }, { role: "user", text: "Next" }], 2)).not.toBeNull();
    const done = await store.finishPractice(SID, p.id, { feedback, finishedAt: "2026-11-15T10:08:00Z", localDay: "2026-11-15" });
    expect(done.score).toBe(70);
    expect(done.feedback?.summary).toBe("Bien");
    expect(await store.practiceDays(SID)).toEqual(["2026-11-15"]);
    expect((await store.listPractices(SID, 10)).map((x) => x.id)).toEqual([p.id]);
  });

  it("never returns another user's practice", async () => {
    await store.getOrCreateUser(SID, "t");
    await store.getOrCreateUser("other", "t");
    const p = await store.createPractice({ sid: SID, scenarioId: "job_interview", industryId: "tech", level: "intermediate", avatarId: "sarah", startedAt: "t", turns: [] });
    expect(await store.getPractice("other", p.id)).toBeNull();
    await expect(store.savePracticeTurns("other", p.id, [])).rejects.toThrow(/not found/);
    await expect(store.finishPractice("other", p.id, { feedback, finishedAt: "t", localDay: "d" })).rejects.toThrow(/not found/);
  });

  it("keeps phrases to review and marks them", async () => {
    await store.getOrCreateUser(SID, "t");
    const p = await store.createPractice({ sid: SID, scenarioId: "client_call", industryId: "sales", level: "intermediate", avatarId: "sarah", startedAt: "t", turns: [] });
    const [phrase] = await store.addPhrases(SID, p.id, feedback.betterPhrases, "2026-11-15T10:08:00Z", "2026-11-16");
    expect(phrase.reviewedAt).toBeNull();
    expect(phrase.step).toBe(0);
    expect(phrase.dueDay).toBe("2026-11-16");
    const scheduled = await store.schedulePhrase(SID, phrase.id, { step: 1, dueDay: "2026-11-17", reviewedAt: null });
    expect(scheduled).toMatchObject({ step: 1, dueDay: "2026-11-17", reviewedAt: null });
    expect(await store.schedulePhrase("other", phrase.id, { step: 2, dueDay: null, reviewedAt: "x" })).toBeNull();
    expect((await store.getPhrase(SID, phrase.id))?.step).toBe(1);
    expect(await store.getPhrase("other", phrase.id)).toBeNull();
    const marked = await store.markPhrase(SID, phrase.id, true, "2026-11-16T09:00:00Z");
    expect(marked?.reviewedAt).toBe("2026-11-16T09:00:00Z");
    expect((await store.markPhrase(SID, phrase.id, false, "x"))?.reviewedAt).toBeNull();
    expect(await store.markPhrase("other", phrase.id, true, "x")).toBeNull();
    expect(await store.listPhrases(SID)).toHaveLength(1);
  });

  it("returns null for a missing user update target", async () => {
    await expect(store.updateUser("ghost", { choice: "publik" })).rejects.toThrow(/not found/);
  });
});

describe("SQLite store migration", () => {
  it("adds the review columns to a database made by an older version", async () => {
    const path = join(mkdtempSync(join(tmpdir(), "dilo-")), "old.db");
    const old = new DatabaseSync(path);
    old.exec("CREATE TABLE phrases (id TEXT PRIMARY KEY, sid TEXT NOT NULL, practice_id TEXT NOT NULL, original TEXT NOT NULL, better TEXT NOT NULL, why_es TEXT NOT NULL, created_at TEXT NOT NULL, reviewed_at TEXT)");
    old.exec("INSERT INTO phrases VALUES ('ph1', 's', 'p', 'a', 'b', 'c', 't', NULL)");
    old.exec("CREATE TABLE practices (id TEXT PRIMARY KEY, sid TEXT NOT NULL, scenario_id TEXT NOT NULL, industry_id TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT, local_day TEXT, turns TEXT NOT NULL, feedback TEXT, score INTEGER)");
    old.exec("INSERT INTO practices (id, sid, scenario_id, industry_id, started_at, turns) VALUES ('p1', 's', 'job_interview', 'tech', 't', '[]')");
    old.close();
    const store = createSqliteStore(path);
    expect((await store.listPhrases("s"))[0]).toMatchObject({ id: "ph1", step: 0, dueDay: null });
    expect(await store.getPractice("s", "p1")).toMatchObject({ level: "intermediate", avatarId: "sarah" });
    expect(await createSqliteStore(path).listPhrases("s")).toHaveLength(1);
  });
});
