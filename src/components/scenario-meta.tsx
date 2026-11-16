import { Briefcase, HandCoins, Headset, MessageSquareText, Presentation, Users, type LucideIcon } from "lucide-react";
import { INDUSTRIES, SCENARIOS, type IndustryId, type ScenarioId } from "@/domain/scenarios";

export const SCENARIO_ICONS: Record<ScenarioId, LucideIcon> = {
  job_interview: Briefcase,
  team_meeting: Users,
  client_call: Headset,
  presentation: Presentation,
  salary_negotiation: HandCoins,
  my_situation: MessageSquareText,
};

export function scenarioTitle(id: ScenarioId): string {
  return SCENARIOS.find((s) => s.id === id)?.title ?? id;
}

export function industryLabel(id: IndustryId): string {
  return INDUSTRIES.find((i) => i.id === id)?.label ?? id;
}
