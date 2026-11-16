"use client";

import { useCallback, useState } from "react";
import { isAvatarId, type AvatarId } from "@/domain/avatars";
import { isLevelId, type LevelId } from "@/domain/levels";

/** The person's level and practice partner, remembered in this browser only (a convenience, not data). */

export const PREFERENCES_KEY = "dilo:preferences";
export interface Preferences {
  readonly level: LevelId;
  readonly avatarId: AvatarId;
}
export const DEFAULT_PREFERENCES: Preferences = { level: "intermediate", avatarId: "sarah" };

export function readPreferences(): Preferences {
  try {
    const raw = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? "{}") as Record<string, unknown>;
    return {
      level: isLevelId(raw.level) ? raw.level : DEFAULT_PREFERENCES.level,
      avatarId: isAvatarId(raw.avatarId) ? raw.avatarId : DEFAULT_PREFERENCES.avatarId,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function save(p: Preferences): void {
  try {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(p));
  } catch {
    /* storage blocked (private mode): keep it for this visit only */
  }
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(() => (typeof window === "undefined" ? DEFAULT_PREFERENCES : readPreferences()));
  const update = useCallback((patch: Partial<Preferences>) => {
    setPrefs((cur) => {
      const next = { ...cur, ...patch };
      save(next);
      return next;
    });
  }, []);
  return { ...prefs, update };
}
