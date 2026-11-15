/** A tiny scripted fetch for tests: match by URL substring, record every call. */
export interface FakeCall {
  url: string;
  init: RequestInit | undefined;
}
type Responder = (call: FakeCall) => Response | Promise<Response>;

export function fakeFetch(routes: Record<string, Responder | Response>) {
  const calls: FakeCall[] = [];
  const fn = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    const call = { url, init };
    calls.push(call);
    const key = Object.keys(routes).find((k) => url.includes(k));
    if (!key) throw new TypeError(`fetch failed: ${url}`);
    const r = routes[key];
    return typeof r === "function" ? r(call) : r.clone();
  };
  return { fetch: fn as typeof fetch, calls };
}

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
