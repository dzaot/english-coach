import { getContext, type AppContext } from "./context";
import { AppError, errorResponse } from "./errors";
import { createRateLimiter } from "./rate-limit";
import { readSession, sessionCookieHeader } from "./session";

/** Shared plumbing for route handlers: session cookie, same-origin check, rate limit, JSON errors. */

const AI_CALLS_PER_MINUTE = 20;
const aiLimiter = createRateLimiter({ limit: AI_CALLS_PER_MINUTE, windowMs: 60_000 });

export function resetRateLimits(): void {
  aiLimiter.reset();
}

export interface HandlerArgs {
  readonly ctx: AppContext;
  readonly sid: string;
}

function isCrossSiteWrite(request: Request): boolean {
  if (request.method === "GET" || request.method === "HEAD") return false;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("host") ?? new URL(request.url).host;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export async function handle(
  request: Request,
  fn: (args: HandlerArgs) => Promise<unknown>,
  opts: { usesAi?: boolean } = {},
): Promise<Response> {
  const session = readSession(request);
  let res: Response;
  try {
    if (isCrossSiteWrite(request)) throw new AppError("forbidden", { detail: "cross-site request" });
    const ctx = getContext();
    if (opts.usesAi && !aiLimiter.allow(session.sid, ctx.now().getTime())) throw new AppError("ai_rate_limited");
    res = Response.json(await fn({ ctx, sid: session.sid }));
  } catch (e) {
    res = errorResponse(e);
  }
  res.headers.set("cache-control", "no-store");
  if (session.isNew) res.headers.append("set-cookie", sessionCookieHeader(session.sid, process.env.NODE_ENV === "production"));
  return res;
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("invalid_input");
  }
}

export type IdParams = { params: Promise<{ id: string }> };
