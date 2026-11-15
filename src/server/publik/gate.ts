import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { AppContext } from "@/server/context";
import { seal, unseal } from "@/server/crypto";
import { AppError } from "@/server/errors";
import { createMockProvider } from "@/server/ai/mock-provider";
import { ownKeyProvider, publikProvider } from "@/server/ai/factory";
import type { AiProvider } from "@/server/ai/provider";
import { gateScreen, provisionInstall, readWallet, sendTelemetry, type GateScreen, type TelemetryEvent, type Wallet } from "./publik";

/** Sign in with publik for a hosted web app: one publik install per browser session, keys sealed server side. */

export type GateState =
  | { state: "ready"; mode: "demo" | "publik" | "own_key"; account: string | null; usedPercent: number | null }
  | { state: "screen"; screen: GateScreen; links: { signIn?: string; getPlan?: string } };

const OFFLINE_RE = /fetch failed|abort|timeout|network/i;

function unreachable(error?: unknown): GateState {
  const message = error instanceof Error && !OFFLINE_RE.test(`${error.name} ${error.message}`) ? error.message : undefined;
  return { state: "screen", screen: gateScreen("unreachable", null, null, message), links: {} };
}

function secretOf(ctx: AppContext): string {
  // loadConfig guarantees APP_SECRET whenever the gate is on.
  return ctx.config.appSecret ?? "";
}

async function connectWallet(ctx: AppContext, sid: string): Promise<{ wallet: Wallet | null; message: string | null }> {
  const { config, store } = ctx;
  for (let attempt = 0; attempt < 2; attempt++) {
    const user = store.getOrCreateUser(sid, ctx.now().toISOString());
    let key = user.installKeySealed ? unseal(user.installKeySealed, secretOf(ctx)) : null;
    if (!key) {
      const cred = await provisionInstall(ctx.fetch, {
        origin: config.publikOrigin,
        appToken: config.publikAppToken ?? "",
        installId: user.installId ?? randomUUID(),
        os: config.installOs,
      });
      store.updateUser(sid, { installKeySealed: seal(cred.key, secretOf(ctx)), installId: cred.installId, claimUrl: cred.claimUrl });
      key = cred.key;
    }
    const r = await readWallet(ctx.fetch, config.publikOrigin, key);
    if (r.status === 401) {
      store.updateUser(sid, { installKeySealed: null, choice: null }); // a revoked key: provision again
      continue;
    }
    return { wallet: r.wallet, message: r.message };
  }
  return { wallet: null, message: null };
}

export async function getGateState(ctx: AppContext, sid: string): Promise<GateState> {
  if (!ctx.config.gateEnabled) {
    return { state: "ready", mode: ctx.config.aiProvider === "mock" ? "demo" : "publik", account: null, usedPercent: null };
  }
  let result: Awaited<ReturnType<typeof connectWallet>>;
  try {
    result = await connectWallet(ctx, sid);
  } catch (e) {
    return unreachable(e);
  }
  const w = result.wallet;
  if (!w) return unreachable(result.message ? new Error(result.message) : undefined);
  const user = ctx.store.getOrCreateUser(sid, ctx.now().toISOString());
  if (w.claim_state !== "claimed") {
    const signIn = w.claim_url ?? user.claimUrl ?? `${ctx.config.publikOrigin}/wallet`;
    return { state: "screen", screen: gateScreen("sign_in", w), links: { signIn } };
  }
  if (!user.choice || (user.choice === "own_key" && !user.ownKeySealed)) {
    return { state: "screen", screen: gateScreen("choose", w), links: { getPlan: w.top_up_url } };
  }
  return { state: "ready", mode: user.choice, account: w.account?.handle ?? null, usedPercent: w.used_percent };
}

const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("connect") }),
  z.object({ action: z.literal("reset") }),
  z.object({ action: z.literal("own_key"), key: z.string() }),
]);
const OWN_KEY_RE = /^sk-[A-Za-z0-9_-]{20,300}$/;

/** The person's answer on the plan screen ("Connect your plan", "Use my own key") or a reset from settings. */
export async function applyGateAction(ctx: AppContext, sid: string, input: unknown): Promise<GateState> {
  const parsed = ActionSchema.safeParse(input);
  if (!parsed.success) throw new AppError("invalid_input");
  const action = parsed.data;
  ctx.store.getOrCreateUser(sid, ctx.now().toISOString());
  if (action.action === "own_key") {
    const key = action.key.trim();
    if (!OWN_KEY_RE.test(key)) throw new AppError("own_key_invalid");
    ctx.store.updateUser(sid, { ownKeySealed: seal(key, secretOf(ctx)), choice: "own_key" });
  } else {
    ctx.store.updateUser(sid, { choice: action.action === "connect" ? "publik" : null });
  }
  return getGateState(ctx, sid);
}

/** The AI client for this person. Throws gate_required until the gate is passed. */
export function resolveAi(ctx: AppContext, sid: string): AiProvider {
  const { config } = ctx;
  if (!config.gateEnabled) {
    if (config.aiProvider === "mock") return createMockProvider();
    if (!config.publikApiKeyOverride) throw new AppError("internal", { detail: "AI_PROVIDER=publik with the gate off needs PUBLIK_API_KEY" });
    return publikProvider(config, config.publikApiKeyOverride, ctx.fetch);
  }
  const user = ctx.store.getOrCreateUser(sid, ctx.now().toISOString());
  const sealed = user.choice === "own_key" ? user.ownKeySealed : user.choice === "publik" ? user.installKeySealed : null;
  const key = sealed ? unseal(sealed, secretOf(ctx)) : null;
  if (!key) throw new AppError("gate_required");
  if (config.aiProvider === "mock") return createMockProvider();
  return user.choice === "own_key" ? ownKeyProvider(key, ctx.fetch) : publikProvider(config, key, ctx.fetch);
}

const MIN_INTERVAL_MS: Record<TelemetryEvent, number> = { app_opened: 60_000, active_session: 25 * 60_000 };
const lastSent = new Map<string, number>();

export function resetTelemetryThrottle(): void {
  lastSent.clear();
}

/** Usage counting after the gate: app_opened on load, active_session every 30 minutes (sent by the page). */
export async function recordTelemetry(ctx: AppContext, sid: string, event: TelemetryEvent): Promise<"sent" | "skipped" | "throttled"> {
  if (!ctx.config.gateEnabled) return "skipped";
  const user = ctx.store.getOrCreateUser(sid, ctx.now().toISOString());
  const key = user.installKeySealed && user.choice ? unseal(user.installKeySealed, secretOf(ctx)) : null;
  if (!key) return "skipped";
  const throttleKey = `${sid}:${event}`;
  const now = ctx.now().getTime();
  if (now - (lastSent.get(throttleKey) ?? -Infinity) < MIN_INTERVAL_MS[event]) return "throttled";
  lastSent.set(throttleKey, now);
  const telemetryId = user.telemetryId ?? ctx.store.updateUser(sid, { telemetryId: randomUUID() }).telemetryId!;
  await sendTelemetry(ctx.fetch, { origin: ctx.config.publikOrigin, key, telemetryId, event, os: ctx.config.installOs });
  return "sent";
}
