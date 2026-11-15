import { randomUUID } from "node:crypto";

/** Anonymous browser session: one random id in an HttpOnly cookie. Keys never reach the browser. */
export const SESSION_COOKIE = "dilo_sid";
const ONE_YEAR_SECONDS = 31_536_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface SessionInfo {
  readonly sid: string;
  readonly isNew: boolean;
}

export function readSession(request: Request): SessionInfo {
  const header = request.headers.get("cookie") ?? "";
  const value = header
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  return value && UUID_RE.test(value) ? { sid: value, isNew: false } : { sid: randomUUID(), isNew: true };
}

export function sessionCookieHeader(sid: string, secure: boolean): string {
  return `${SESSION_COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ONE_YEAR_SECONDS}${secure ? "; Secure" : ""}`;
}
