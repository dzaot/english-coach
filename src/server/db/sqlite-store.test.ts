import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import { createSqliteStore } from "./sqlite-store";
import type { Store } from "./store";

const SID = "user-1";
const feedback = {
  summaryEs: "Bien",
  wellDone: ["Claro"],
  betterPhrases: [{ original: "I am agree", better: "I agree", whyEs: "Verbo" }],
  vocabulary: [{ term: "follow up", meaningEs: "seguimiento" }],
  score: 70,
};

describe("SQLite store", () => {
  let store: Store;
  beforeEach(() => {
    store = createSqliteStore(":memory:");
  });

  it("creates a user once and patches it immutably", () => {
    const u = store.getOrCreateUser(SID, "2026-11-15T00:00:00Z");
    expect(u.choice).toBeNull();
    expect(store.getOrCreateUser(SID, "2026-11-16T00:00:00Z").createdAt).toBe("2026-11-15T00:00:00Z");
    const patched = store.updateUser(SID, { choice: "publik", installId: "inst-1" });
    expect(patched.choice).toBe("publik");
    expect(patched.installId).toBe("inst-1");
    expect(u.choice).toBeNull();
  });

  it("stores a practice, its turns and its feedback", () => {
    store.getOrCreateUser(SID, "2026-11-15T00:00:00Z");
    const p = store.createPractice({
      sid: SID,
      scenarioId: "job_interview",
      industryId: "tech",
      startedAt: "2026-11-15T10:00:00Z",
      turns: [{ role: "counterpart", text: "Hi" }],
    });
    expect(p.finishedAt).toBeNull();
    const withTurn = store.savePracticeTurns(SID, p.id, [...p.turns, { role: "user", text: "Hello" }]);
    expect(withTurn.turns).toHaveLength(2);
    const done = store.finishPractice(SID, p.id, { feedback, finishedAt: "2026-11-15T10:08:00Z", localDay: "2026-11-15" });
    expect(done.score).toBe(70);
    expect(done.feedback?.summaryEs).toBe("Bien");
    expect(store.practiceDays(SID)).toEqual(["2026-11-15"]);
    expect(store.listPractices(SID, 10).map((x) => x.id)).toEqual([p.id]);
  });

  it("never returns another user's practice", () => {
    store.getOrCreateUser(SID, "t");
    store.getOrCreateUser("other", "t");
    const p = store.createPractice({ sid: SID, scenarioId: "job_interview", industryId: "tech", startedAt: "t", turns: [] });
    expect(store.getPractice("other", p.id)).toBeNull();
    expect(() => store.savePracticeTurns("other", p.id, [])).toThrow(/not found/);
    expect(() => store.finishPractice("other", p.id, { feedback, finishedAt: "t", localDay: "d" })).toThrow(/not found/);
  });

  it("keeps phrases to review and marks them", () => {
    store.getOrCreateUser(SID, "t");
    const p = store.createPractice({ sid: SID, scenarioId: "client_call", industryId: "sales", startedAt: "t", turns: [] });
    const [phrase] = store.addPhrases(SID, p.id, feedback.betterPhrases, "2026-11-15T10:08:00Z", "2026-11-16");
    expect(phrase.reviewedAt).toBeNull();
    expect(phrase.step).toBe(0);
    expect(phrase.dueDay).toBe("2026-11-16");
    const scheduled = store.schedulePhrase(SID, phrase.id, { step: 1, dueDay: "2026-11-17", reviewedAt: null });
    expect(scheduled).toMatchObject({ step: 1, dueDay: "2026-11-17", reviewedAt: null });
    expect(store.schedulePhrase("other", phrase.id, { step: 2, dueDay: null, reviewedAt: "x" })).toBeNull();
    expect(store.getPhrase(SID, phrase.id)?.step).toBe(1);
    expect(store.getPhrase("other", phrase.id)).toBeNull();
    const marked = store.markPhrase(SID, phrase.id, true, "2026-11-16T09:00:00Z");
    expect(marked?.reviewedAt).toBe("2026-11-16T09:00:00Z");
    expect(store.markPhrase(SID, phrase.id, false, "x")?.reviewedAt).toBeNull();
    expect(store.markPhrase("other", phrase.id, true, "x")).toBeNull();
    expect(store.listPhrases(SID)).toHaveLength(1);
  });

  it("returns null for a missing user update target", () => {
    expect(() => store.updateUser("ghost", { choice: "publik" })).toThrow(/not found/);
  });
});

describe("SQLite store migration", () => {
  it("adds the review columns to a database made by an older version", () => {
    const path = join(mkdtempSync(join(tmpdir(), "dilo-")), "old.db");
    const old = new DatabaseSync(path);
    old.exec("CREATE TABLE phrases (id TEXT PRIMARY KEY, sid TEXT NOT NULL, practice_id TEXT NOT NULL, original TEXT NOT NULL, better TEXT NOT NULL, why_es TEXT NOT NULL, created_at TEXT NOT NULL, reviewed_at TEXT)");
    old.exec("INSERT INTO phrases VALUES ('ph1', 's', 'p', 'a', 'b', 'c', 't', NULL)");
    old.close();
    const store = createSqliteStore(path);
    expect(store.listPhrases("s")[0]).toMatchObject({ id: "ph1", step: 0, dueDay: null });
    expect(createSqliteStore(path).listPhrases("s")).toHaveLength(1);
  });
});
