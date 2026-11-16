import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { AppError } from "./errors";

/**
 * Reads the text of a public web page the person pasted (a job post). Guards against reaching private
 * networks: http(s) only, public addresses only (checked again on every redirect), small pages, short timeout.
 */

const MAX_REDIRECTS = 3;
const MAX_BYTES = 600_000;
const TIMEOUT_MS = 6_000;
/** Characters of page text kept for the summary. */
export const MAX_PAGE_TEXT = 6_000;

export type Resolve = (host: string) => Promise<string[]>;

const defaultResolve: Resolve = async (host) => (await lookup(host, { all: true })).map((a) => a.address);

/** Loopback, private, link-local, carrier-grade NAT, multicast and reserved ranges, IPv4 and IPv6. */
export function isPrivateAddress(address: string): boolean {
  const v4 = address.startsWith("::ffff:") ? address.slice(7) : address;
  if (isIP(v4) === 4) {
    const [a, b] = v4.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  const v6 = address.toLowerCase();
  return v6 === "::" || v6 === "::1" || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6) || v6.startsWith("ff");
}

const unreadable = (detail: string) => new AppError("link_unreadable", { detail });

async function checkUrl(raw: string, resolve: Resolve): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw unreadable("bad url");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw unreadable("scheme");
  if (url.port && !["80", "443"].includes(url.port)) throw unreadable("port");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw unreadable("local host");
  }
  const addresses = isIP(host) ? [host] : await resolve(host).catch(() => []);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) throw unreadable("private or unknown address");
  return url;
}

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  await reader.cancel().catch(() => undefined);
  return new TextDecoder().decode(Buffer.concat(chunks).subarray(0, MAX_BYTES));
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Visible text of an HTML page: no scripts, styles or tags; entities decoded; spaces collapsed. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === "#") {
        const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : " ";
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

/** The first http(s) link in a piece of text, if any. */
export function findLink(text: string): string | null {
  return text.match(/https?:\/\/[^\s<>"']+/i)?.[0]?.replace(/[).,;]+$/, "") ?? null;
}

export async function readLinkText(raw: string, doFetch: typeof fetch, resolve: Resolve = defaultResolve): Promise<string> {
  let url = await checkUrl(raw, resolve);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let res: Response;
    try {
      res = await doFetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { accept: "text/html,text/plain;q=0.9", "user-agent": "Mozilla/5.0 (compatible; DiloBot/1.0)" },
      });
    } catch (e) {
      throw unreadable(e instanceof Error ? e.message : "network");
    }
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      url = await checkUrl(new URL(location, url).toString(), resolve);
      continue;
    }
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/text\/(html|plain)/i.test(type)) throw unreadable(`status ${res.status} ${type}`);
    const text = htmlToText(await readCapped(res)).slice(0, MAX_PAGE_TEXT);
    if (text.length < 80) throw unreadable("too little text");
    return text;
  }
  throw unreadable("too many redirects");
}
