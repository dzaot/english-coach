import { loadConfig, type AppConfig } from "./config";
import { createSqliteStore } from "./db/sqlite-store";
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
    current = { config, store: createSqliteStore(config.databasePath), fetch: globalThis.fetch.bind(globalThis), now: () => new Date() };
  }
  return current;
}

export function setContext(ctx: AppContext | null): void {
  current = ctx;
}
