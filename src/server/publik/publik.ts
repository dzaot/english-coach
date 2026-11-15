// publik.ts: Sign in with publik, usage counting and publik API for a HOSTED web app (server side only).
// Adapted from the reference module https://publikhq.com/sdk/publik.ts.md (same endpoints, same gate words).
// Difference: that module keeps ONE install per computer in a file. A hosted app serves many people, so here
// each browser session gets its own install (POST /api/v1/installs), stored sealed in the database by gate.ts.
// The pk_ key never leaves the server. Endpoints used: POST /api/v1/installs, GET /api/v1/wallet,
// POST /api/v1/telemetry ("app_opened", then "active_session" every 30 minutes).

export const APP_SLUG = "english-coach"; // set to the real listing slug during publik setup
export const APP_VERSION = "0.1.0";
/** The app calls models (chat, transcription, speech), so the gate asks how to pay for AI. */
export const USES_AI = true;
export const MODELS = { fast: "publik-fast", balanced: "publik-balanced", smart: "publik-smart" } as const;
export const INSTALLS_PATH = "/api/v1/installs";
export const WALLET_PATH = "/api/v1/wallet";
export const TELEMETRY_PATH = "/api/v1/telemetry";

const INSTALL_TIMEOUT_MS = 20_000;
const WALLET_TIMEOUT_MS = 15_000;
const TELEMETRY_TIMEOUT_MS = 5_000;

export type InstallOs = "linux" | "macos" | "windows";
export type TelemetryEvent = "app_opened" | "active_session";

export interface InstallCredential {
  readonly key: string;
  readonly baseUrl: string;
  readonly installId: string;
  readonly claimUrl: string | null;
}

export interface Wallet {
  readonly claim_state: "anonymous" | "claimed";
  readonly claim_url: string | null;
  readonly account: { readonly handle: string | null } | null;
  readonly plan: { readonly kind: "none" | "plan" | "pack"; readonly label: string | null };
  readonly balance_micros: number;
  readonly top_up_url: string;
  readonly used_percent: number | null;
}

export type GateAction = "sign_in" | "retry" | "get_plan" | "connect" | "own_key";
export interface GateScreen {
  readonly id: "sign_in" | "unreachable" | "choose";
  readonly title: string;
  readonly body: string;
  readonly note: string | null;
  readonly buttons: readonly { readonly action: GateAction; readonly label: string }[];
}

type Json = Record<string, unknown>;
const asString = (v: unknown): string | null => (typeof v === "string" ? v : null);
const errorMessage = (b: Json): string | null => asString((b.error as Json | undefined)?.message);

/** POST /api/v1/installs: one publik key for one browser session. Throws a readable message. */
export async function provisionInstall(
  doFetch: typeof fetch,
  args: { origin: string; appToken: string; installId: string; os: InstallOs },
): Promise<InstallCredential> {
  if (!args.appToken.startsWith("pat_")) throw new Error("This server has no publik app token (PUBLIK_APP_TOKEN).");
  let installId = args.installId;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await doFetch(`${args.origin}${INSTALLS_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(INSTALL_TIMEOUT_MS),
      body: JSON.stringify({
        app_token: args.appToken,
        app_slug: APP_SLUG,
        app_version: APP_VERSION,
        os: args.os,
        install_id: installId,
        disclosure_version: 1,
        dialects: ["chat_completions"],
      }),
    });
    const body = (await res.json().catch(() => ({}))) as Json;
    const key = asString(body.key);
    if ((res.status === 201 || res.status === 200) && key) {
      return {
        key,
        baseUrl: asString(body.base_url) ?? `${args.origin}/api/v1`,
        installId: asString(body.install_id) ?? installId,
        claimUrl: asString(body.claim_url),
      };
    }
    // 200 without a key: this install id was provisioned before and its key is gone. Start a new one.
    if (res.status === 200 || (body.error as Json | undefined)?.type === "install_revoked") {
      installId = crypto.randomUUID();
      continue;
    }
    throw new Error(errorMessage(body) ?? `publik could not set up this app (${res.status}).`);
  }
  throw new Error("publik could not set up this app.");
}

/** GET /api/v1/wallet. 401: the key is gone (null wallet). Throws when publik is not reachable. */
export async function readWallet(
  doFetch: typeof fetch,
  origin: string,
  key: string,
): Promise<{ status: number; wallet: Wallet | null; message: string | null }> {
  const res = await doFetch(`${origin}${WALLET_PATH}`, {
    headers: { authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(WALLET_TIMEOUT_MS),
  });
  const b = (await res.json().catch(() => ({}))) as Json;
  if (!res.ok || typeof b.claim_state !== "string") return { status: res.status, wallet: null, message: errorMessage(b) };
  const wallet: Wallet = {
    claim_state: b.claim_state === "claimed" ? "claimed" : "anonymous",
    claim_url: asString(b.claim_url),
    account: (b.account as Wallet["account"]) ?? null,
    plan: (b.plan as Wallet["plan"]) ?? { kind: "none", label: null },
    balance_micros: typeof b.balance_micros === "number" ? b.balance_micros : 0,
    top_up_url: asString(b.top_up_url) ?? `${origin}/wallet`,
    used_percent: typeof b.used_percent === "number" ? b.used_percent : null,
  };
  return { status: res.status, wallet, message: null };
}

/** The words of the gate: the same in every publik module (kept in English on purpose). */
export function gateScreen(id: GateScreen["id"], w: Wallet | null, note: string | null = null, message?: string): GateScreen {
  if (id === "unreachable") {
    return { id, title: "Sign in with publik", body: message ?? "publik is not reachable. Check your connection.", note, buttons: [{ action: "retry", label: "Retry" }] };
  }
  if (id === "sign_in") {
    return {
      id,
      title: "Sign in with publik",
      note,
      buttons: [{ action: "sign_in", label: "Sign in with publik" }],
      body: "This app uses your publik account. Click Sign in with publik, then sign in in your browser. This window continues when you are signed in.",
    };
  }
  const who = w?.account?.handle ? `You are signed in as @${w.account.handle}.` : "You are signed in to publik.";
  if (!w || (w.plan.kind === "none" && w.balance_micros === 0)) {
    return {
      id,
      title: "Choose how to pay for AI",
      note,
      body: `${who} This app uses AI. Get a publik plan, or use your own key.`,
      buttons: [{ action: "get_plan", label: "Get a plan" }, { action: "own_key", label: "Use my own key" }],
    };
  }
  const what = w.plan.kind === "plan" ? `Your plan: ${w.plan.label ?? "publik"}.` : "You have publik use ready.";
  return {
    id,
    title: "Connect your plan",
    note,
    body: `${who} ${what} Connect it to use AI in this app, or use your own key.`,
    buttons: [{ action: "connect", label: "Connect your plan" }, { action: "own_key", label: "Use my own key" }],
  };
}

/** POST /api/v1/telemetry: "app_opened" after the gate, then "active_session" every 30 minutes. No content. Never throws. */
export async function sendTelemetry(
  doFetch: typeof fetch,
  args: { origin: string; key: string; telemetryId: string; event: TelemetryEvent; os: InstallOs },
): Promise<number> {
  try {
    const res = await doFetch(`${args.origin}${TELEMETRY_PATH}`, {
      method: "POST",
      signal: AbortSignal.timeout(TELEMETRY_TIMEOUT_MS),
      headers: { "content-type": "application/json", authorization: `Bearer ${args.key}` },
      body: JSON.stringify({ v: 1, app: APP_SLUG, install_id: args.telemetryId, event: args.event, app_version: APP_VERSION, os: args.os }),
    });
    return res.status;
  } catch {
    return 0;
  }
}
