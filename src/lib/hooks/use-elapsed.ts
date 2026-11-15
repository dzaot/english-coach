"use client";

import { useEffect, useState } from "react";

/** Seconds since an ISO instant, ticking once a second. */
export function useElapsedSeconds(sinceIso: string): number {
  const since = Date.parse(sinceIso);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return Number.isFinite(since) ? Math.max(0, Math.floor((now - since) / 1000)) : 0;
}
