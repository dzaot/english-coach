import { loadConfig, type AppConfig } from "./config";
import { openLibsqlDb } from "./db/libsql-db";
import { createSqlStore, createSqliteStore } from "./db/sqlite-store";
import type { Store } from "./db/store";

/** Everything a request needs. Built once per server process; tests pass their own. */
export interface AppContext {
  readonly config: AppConfig;
  readonly store: Store;
  readonly fetch: typeof fetch;
  readonly now: () => Date;
}

let current: AppContext | null = null;

export function getContext(): AppContext {
  if (!current) {
    const config = loadConfig(process.env);
    const store = config.database.url
      ? createSqlStore(openLibsqlDb(config.database.url, config.database.authToken))
      : createSqliteStore(config.databasePath);
    current = { config, store, fetch: globalThis.fetch.bind(globalThis), now: () => new Date() };
  }
  return current;
}

export function setContext(ctx: AppContext | null): void {
  current = ctx;
}
