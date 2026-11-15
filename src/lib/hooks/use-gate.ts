"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { GateState } from "@/lib/types";

/** Sign in with publik on the client: load the state, wait for the browser sign-in or plan, apply answers. */

export const GATE_POLL_MS = 3_000;
export const GATE_POLL_LIMIT_MS = 10 * 60_000;
export type Waiting = "sign_in" | "get_plan";

function waitIsOver(waiting: Waiting, s: GateState): boolean {
  if (s.state === "ready") return true;
  return waiting === "sign_in" ? s.screen.id !== "sign_in" : s.screen.title === "Connect your plan";
}

export function useGate() {
  const [state, setState] = useState<GateState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState<Waiting | null>(null);
  const [timedOut, setTimedOut] = useState<Waiting | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setState(await api.gate());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    api.gate().then(
      (next) => alive && setState(next),
      (e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!waiting) return;
    const startedAt = Date.now();
    const id = setInterval(async () => {
      if (Date.now() - startedAt > GATE_POLL_LIMIT_MS) {
        clearInterval(id);
        setWaiting(null);
        setTimedOut(waiting);
        return;
      }
      const next = await api.gate().catch(() => null);
      if (!next) return;
      setState(next);
      if (waitIsOver(waiting, next)) setWaiting(null);
    }, GATE_POLL_MS);
    return () => clearInterval(id);
  }, [waiting]);

  const startWaiting = useCallback((what: Waiting) => {
    setTimedOut(null);
    setWaiting(what);
  }, []);

  const act = useCallback(async (body: Parameters<typeof api.gateAction>[0]) => {
    setBusy(true);
    setError(null);
    try {
      setState(await api.gateAction(body));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, error, waiting, timedOut, busy, refresh, startWaiting, act };
}
