import { z } from "zod";

/** Server configuration from environment variables. Validated once; fails fast with the missing NAME. */
const EnvSchema = z.object({
  AI_PROVIDER: z.enum(["mock", "publik"]).default("mock"),
  PUBLIK_GATE: z.enum(["on", "off"]).optional(),
  PUBLIK_APP_TOKEN: z.string().optional(),
  APP_SECRET: z.string().optional(),
  PUBLIK_ORIGIN: z.string().url().default("https://publikhq.com"),
  PUBLIK_API_KEY: z.string().optional(),
  PUBLIK_TTS_MODEL: z.string().min(1).default("tts-1-hd"),
  PUBLIK_TTS_VOICE: z.string().min(1).default("alloy"),
  PUBLIK_INSTALL_OS: z.enum(["linux", "macos", "windows"]).default("linux"),
  REPLY_TIER: z.enum(["fast", "balanced"]).default("balanced"),
  PUBLIK_COST_LOG: z.enum(["0", "1"]).default("0"),
  DATABASE_PATH: z.string().min(1).default("./data/coach.db"),
  DATABASE_URL: z.string().regex(/^(libsql|https?|wss?):\/\//).optional(),
  DATABASE_AUTH_TOKEN: z.string().min(1).optional(),
  TURSO_DATABASE_URL: z.string().regex(/^(libsql|https?|wss?):\/\//).optional(),
  TURSO_AUTH_TOKEN: z.string().min(1).optional(),
  NODE_ENV: z.string().optional(),
});

export interface AppConfig {
  readonly aiProvider: "mock" | "publik";
  readonly gateEnabled: boolean;
  readonly publikAppToken: string | null;
  readonly appSecret: string | null;
  readonly publikOrigin: string;
  /** Development override, same as the publik module's PUBLIK_API_KEY. */
  readonly publikApiKeyOverride: string | null;
  readonly speechModel: string;
  readonly speechVoice: string;
  readonly installOs: "linux" | "macos" | "windows";
  /** Model tier for the counterpart's replies. Feedback always tries balanced first. */
  readonly replyTier: "fast" | "balanced";
  /** Log what publik charged for each call (server log, no keys, no content). */
  readonly costLog: boolean;
  readonly databasePath: string;
  /** A hosted libSQL database (Turso). When set, it is used instead of the local file. */
  readonly database: { readonly url: string | null; readonly authToken: string | null };
  readonly isProduction: boolean;
}

const MIN_SECRET_LENGTH = 32;

export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join(".") ?? "env";
    throw new Error(`Invalid configuration: ${field}`);
  }
  const e = parsed.data;
  const gateEnabled = e.PUBLIK_GATE ? e.PUBLIK_GATE === "on" : e.AI_PROVIDER === "publik";
  if (gateEnabled && !e.PUBLIK_APP_TOKEN?.startsWith("pat_")) {
    throw new Error("Missing configuration: PUBLIK_APP_TOKEN (pat_...) is required when the publik gate is on");
  }
  if (gateEnabled && (e.APP_SECRET?.length ?? 0) < MIN_SECRET_LENGTH) {
    throw new Error(`Missing configuration: APP_SECRET (${MIN_SECRET_LENGTH}+ characters) is required when the publik gate is on`);
  }
  return {
    aiProvider: e.AI_PROVIDER,
    gateEnabled,
    publikAppToken: e.PUBLIK_APP_TOKEN ?? null,
    appSecret: e.APP_SECRET ?? null,
    publikOrigin: e.PUBLIK_ORIGIN.replace(/\/$/, ""),
    publikApiKeyOverride: e.PUBLIK_API_KEY ?? null,
    speechModel: e.PUBLIK_TTS_MODEL,
    speechVoice: e.PUBLIK_TTS_VOICE,
    installOs: e.PUBLIK_INSTALL_OS,
    replyTier: e.REPLY_TIER,
    costLog: e.PUBLIK_COST_LOG === "1",
    databasePath: e.DATABASE_PATH,
    database: {
      url: e.DATABASE_URL ?? e.TURSO_DATABASE_URL ?? null,
      authToken: e.DATABASE_AUTH_TOKEN ?? e.TURSO_AUTH_TOKEN ?? null,
    },
    isProduction: e.NODE_ENV === "production",
  };
}
