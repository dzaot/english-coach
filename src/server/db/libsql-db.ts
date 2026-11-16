import type { Client, InStatement } from "@libsql/client";
import type { Row, SqlArg, SqlDb } from "./sql";

/** A hosted libSQL database (Turso) over HTTP. Rows come back as plain objects keyed by column name. */
export function libsqlDb(client: Pick<Client, "execute" | "executeMultiple">): SqlDb {
  const exec = (sql: string, args: readonly SqlArg[]) => client.execute({ sql, args: [...args] } as InStatement);
  const plain = (row: Record<string, unknown>, columns: readonly string[]): Row => Object.fromEntries(columns.map((c) => [c, row[c]]));
  return {
    async exec(sql) {
      await client.executeMultiple(sql);
    },
    async run(sql, args = []) {
      const r = await exec(sql, args);
      return { changes: r.rowsAffected };
    },
    async get(sql, args = []) {
      const r = await exec(sql, args);
      return r.rows[0] ? plain(r.rows[0] as Record<string, unknown>, r.columns) : undefined;
    },
    async all(sql, args = []) {
      const r = await exec(sql, args);
      return r.rows.map((row) => plain(row as Record<string, unknown>, r.columns));
    },
  };
}

export async function openLibsqlDb(url: string, authToken: string | null): Promise<SqlDb> {
  // The web build talks HTTP only: no native module, so it runs on serverless hosts.
  const { createClient } = await import("@libsql/client/web");
  return libsqlDb(createClient({ url, ...(authToken ? { authToken } : {}) }));
}
