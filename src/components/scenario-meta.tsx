import type { ComponentType } from "react";
import { INDUSTRIES, SCENARIOS, type IndustryId, type ScenarioId } from "@/domain/scenarios";
import { BoardSticker, BriefcaseSticker, HeadsetSticker, RaiseSticker, SituationSticker, TeamSticker, type StickerProps } from "./brand/stickers";

/** Each scenario has its own sticker. */
export const SCENARIO_ICONS: Record<ScenarioId, ComponentType<StickerProps>> = {
  job_interview: BriefcaseSticker,
  team_meeting: TeamSticker,
  client_call: HeadsetSticker,
  presentation: BoardSticker,
  salary_negotiation: RaiseSticker,
  my_situation: SituationSticker,
};

export function scenarioTitle(id: ScenarioId): string {
  return SCENARIOS.find((s) => s.id === id)?.title ?? id;
}

export function industryLabel(id: IndustryId): string {
  return INDUSTRIES.find((i) => i.id === id)?.label ?? id;
}
