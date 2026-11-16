import { getContext, type AppContext } from "./context";
import { AppError, errorBody, errorResponse } from "./errors";
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

/** A streamed answer: the handler sends events as they happen; its return value becomes the "done" event. */
export class EventStream {
  constructor(readonly run: (send: (event: { type: string } & Record<string, unknown>) => void) => Promise<Record<string, unknown>>) {}
}

/** Newline-delimited JSON: one event per line, then "done" or "error". */
function streamResponse(stream: EventStream): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        send({ type: "done", ...(await stream.run(send)) });
      } catch (e) {
        send({ type: "error", error: errorBody(e).body });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "x-accel-buffering": "no" } });
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
    const out = await fn({ ctx, sid: session.sid });
    res = out instanceof EventStream ? streamResponse(out) : Response.json(out);
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
