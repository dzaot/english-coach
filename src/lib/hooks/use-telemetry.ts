"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";

export const ACTIVE_SESSION_MS = 30 * 60_000;

/** publik usage counting: app_opened once the gate passes, then active_session every 30 minutes. */
export function useTelemetry(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    void api.telemetry("app_opened").catch(() => undefined);
    const id = setInterval(() => void api.telemetry("active_session").catch(() => undefined), ACTIVE_SESSION_MS);
    return () => clearInterval(id);
  }, [enabled]);
}
