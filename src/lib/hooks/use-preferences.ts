"use client";

import { useCallback, useState } from "react";
import { isAvatarId, type AvatarId } from "@/domain/avatars";
import { isLevelId, type LevelId } from "@/domain/levels";
import { MAX_INDUSTRY_OTHER, isIndustryId, isScenarioId, type IndustryId, type ScenarioId } from "@/domain/scenarios";

/** The person's setup (level, partner, field, what they practice) remembered in this browser only: a convenience, not data. */

export const PREFERENCES_KEY = "dilo:preferences";
export interface Preferences {
  readonly level: LevelId;
  readonly avatarId: AvatarId;
  readonly industryId: IndustryId;
  /** Their own field of work, when the industry is "other". */
  readonly industryOther: string;
  readonly scenarioId: ScenarioId;
  /** The first-run questions were answered or skipped. */
  readonly onboarded: boolean;
}
export const DEFAULT_PREFERENCES: Preferences = {
  level: "intermediate",
  avatarId: "sarah",
  industryId: "general",
  industryOther: "",
  scenarioId: "job_interview",
  onboarded: false,
};

export function readPreferences(): Preferences {
  try {
    const raw = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? "{}") as Record<string, unknown>;
    return {
      level: isLevelId(raw.level) ? raw.level : DEFAULT_PREFERENCES.level,
      avatarId: isAvatarId(raw.avatarId) ? raw.avatarId : DEFAULT_PREFERENCES.avatarId,
      industryId: isIndustryId(raw.industryId) ? raw.industryId : DEFAULT_PREFERENCES.industryId,
      industryOther: typeof raw.industryOther === "string" ? raw.industryOther.slice(0, MAX_INDUSTRY_OTHER) : "",
      scenarioId: isScenarioId(raw.scenarioId) ? raw.scenarioId : DEFAULT_PREFERENCES.scenarioId,
      onboarded: raw.onboarded === true,
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
