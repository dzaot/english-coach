import { createClient } from "@libsql/client";
import { describe, expect, it, vi } from "vitest";
import { libsqlDb } from "./libsql-db";
import { createSqlStore } from "./sqlite-store";

describe("libSQL adapter", () => {
  it("maps execute results to plain rows and change counts", async () => {
    const execute = vi.fn().mockResolvedValue({ columns: ["id", "n"], rows: [{ id: "a", n: 1, 0: "a", 1: 1 }], rowsAffected: 1 });
    const executeMultiple = vi.fn().mockResolvedValue(undefined);
    const db = libsqlDb({ execute, executeMultiple } as never);
    await db.exec("CREATE TABLE t (id TEXT)");
    expect(executeMultiple).toHaveBeenCalledWith("CREATE TABLE t (id TEXT)");
    expect(await db.get("SELECT * FROM t WHERE id = ?", ["a"])).toEqual({ id: "a", n: 1 });
    expect(execute).toHaveBeenCalledWith({ sql: "SELECT * FROM t WHERE id = ?", args: ["a"] });
    expect(await db.all("SELECT * FROM t")).toEqual([{ id: "a", n: 1 }]);
    expect(await db.run("DELETE FROM t")).toEqual({ changes: 1 });
    execute.mockResolvedValueOnce({ columns: [], rows: [], rowsAffected: 0 });
    expect(await db.get("SELECT 1")).toBeUndefined();
  });

  it("runs the whole store on a real libSQL database", async () => {
    const store = createSqlStore(libsqlDb(createClient({ url: ":memory:" })));
    await store.getOrCreateUser("s1", "2026-11-16T00:00:00Z");
    const user = await store.updateUser("s1", { choice: "publik" });
    expect(user.choice).toBe("publik");
    const p = await store.createPractice({ sid: "s1", scenarioId: "job_interview", industryId: "tech", level: "beginner", avatarId: "mike", startedAt: "t", turns: [] });
    const feedback = { summary: "ok", wellDone: ["a"], betterPhrases: [{ original: "x", better: "y", why: "z" }], vocabulary: [], score: 80 };
    const done = await store.finishPractice("s1", p.id, { feedback, finishedAt: "t2", localDay: "2026-11-16" });
    expect(done).toMatchObject({ score: 80, level: "beginner", avatarId: "mike" });
    const [phrase] = await store.addPhrases("s1", p.id, feedback.betterPhrases, "t3", "2026-11-17");
    expect(phrase).toMatchObject({ better: "y", step: 0, dueDay: "2026-11-17" });
    expect(await store.schedulePhrase("s1", phrase.id, { step: 1, dueDay: "2026-11-19", reviewedAt: null })).toMatchObject({ step: 1 });
    expect(await store.markPhrase("s1", phrase.id, true, "t4")).toMatchObject({ reviewedAt: "t4" });
    expect(await store.practiceDays("s1")).toEqual(["2026-11-16"]);
    expect(await store.listPractices("s1", 5)).toHaveLength(1);
  });
});
