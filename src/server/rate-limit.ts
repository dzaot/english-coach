/** Fixed-window rate limiter in memory. Enough for one server process; swap for a shared store if scaled out. */
export interface RateLimiter {
  allow(key: string, nowMs: number): boolean;
  reset(): void;
}

export function createRateLimiter(opts: { limit: number; windowMs: number }): RateLimiter {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    allow(key, nowMs) {
      const w = windows.get(key);
      if (!w || nowMs - w.start >= opts.windowMs) {
        windows.set(key, { start: nowMs, count: 1 });
        return true;
      }
      if (w.count >= opts.limit) return false;
      windows.set(key, { start: w.start, count: w.count + 1 });
      return true;
    },
    reset() {
      windows.clear();
    },
  };
}
