import { loadConfig } from "@/server/config";
import type { AppContext } from "@/server/context";
import { createSqliteStore } from "@/server/db/sqlite-store";

/** A test context: in-memory SQLite, scripted fetch, fixed clock. */
export function testContext(over: Partial<AppContext> & { env?: Record<string, string> } = {}): AppContext {
  const { env, ...rest } = over;
  return {
    config: loadConfig(env ?? {}),
    store: createSqliteStore(":memory:"),
    fetch: (async () => {
      throw new TypeError("fetch failed: no network in tests");
    }) as typeof fetch,
    now: () => new Date("2026-11-15T18:00:00Z"),
    ...rest,
  };
}

export const GATE_ENV = {
  AI_PROVIDER: "publik",
  PUBLIK_APP_TOKEN: "pat_test",
  APP_SECRET: "s".repeat(32),
} as const;
