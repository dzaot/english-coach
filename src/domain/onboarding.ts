import { z } from "zod";
import { AVATAR_IDS } from "./avatars";
import { LEVEL_IDS } from "./levels";
import { LOCALES } from "./locales";
import { INDUSTRY_IDS, MAX_INDUSTRY_OTHER, type ScenarioId } from "./scenarios";

/**
 * The first-run questions. The answers set up the first call (scenario, field, level, partner) and are saved
 * so we can learn what the people who use Dilo need.
 */

export const GOAL_IDS = ["interview", "meetings", "clients", "presentations", "raise", "everyday"] as const;
export type GoalId = (typeof GOAL_IDS)[number];

/** What each goal practices first. */
export const GOAL_SCENARIO: Readonly<Record<GoalId, ScenarioId>> = {
  interview: "job_interview",
  meetings: "team_meeting",
  clients: "client_call",
  presentations: "presentation",
  raise: "salary_negotiation",
  everyday: "team_meeting",
};

export const PAIN_IDS = ["blank", "mistakes", "pronunciation", "words", "speed", "translating"] as const;
export type PainId = (typeof PAIN_IDS)[number];

export const CONFIDENCE_MIN = 1;
export const CONFIDENCE_MAX = 5;

export const OnboardingSchema = z.object({
  locale: z.enum(LOCALES),
  goal: z.enum(GOAL_IDS).nullable(),
  pains: z.array(z.enum(PAIN_IDS)).max(PAIN_IDS.length).transform((list) => [...new Set(list)]),
  confidence: z.number().int().min(CONFIDENCE_MIN).max(CONFIDENCE_MAX).nullable(),
  industryId: z.enum(INDUSTRY_IDS).nullable(),
  industryOther: z.string().trim().max(MAX_INDUSTRY_OTHER).default(""),
  level: z.enum(LEVEL_IDS).nullable(),
  avatarId: z.enum(AVATAR_IDS).nullable(),
  /** false when the person skipped before the last step. */
  completed: z.boolean(),
});

export type OnboardingAnswers = z.infer<typeof OnboardingSchema>;
