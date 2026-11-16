import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Row, SqlDb } from "./sql";

/** A local SQLite file (or ":memory:") through Node's built-in node:sqlite. Used locally and in tests. */
export function openSqliteDb(path: string): SqlDb {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  if (path !== ":memory:") db.exec("PRAGMA journal_mode = WAL;");
  return {
    async exec(sql) {
      db.exec(sql);
    },
    async run(sql, args = []) {
      const r = db.prepare(sql).run(...args);
      return { changes: Number(r.changes) };
    },
    async get(sql, args = []) {
      return db.prepare(sql).get(...args) as Row | undefined;
    },
    async all(sql, args = []) {
      return db.prepare(sql).all(...args) as Row[];
    },
  };
}
