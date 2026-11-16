/**
 * The few SQL operations the store needs, so the same store runs on a local SQLite file (node:sqlite)
 * and on a hosted libSQL database (Turso), which serverless hosts need because they keep no disk.
 */

export type Row = Record<string, unknown>;
export type SqlArg = string | number | null;

export interface SqlDb {
  /** Runs several statements (schema). */
  exec(sql: string): Promise<void>;
  run(sql: string, args?: readonly SqlArg[]): Promise<{ changes: number }>;
  get(sql: string, args?: readonly SqlArg[]): Promise<Row | undefined>;
  all(sql: string, args?: readonly SqlArg[]): Promise<Row[]>;
}
