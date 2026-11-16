import type { Avatar } from "./avatars";

/** Practice scenarios and industry presets. The counterpart's name and face come from the chosen avatar. */

export const SCENARIO_IDS = [
  "job_interview",
  "team_meeting",
  "client_call",
  "presentation",
  "salary_negotiation",
] as const;
export type ScenarioId = (typeof SCENARIO_IDS)[number];

export const INDUSTRY_IDS = [
  "general",
  "sales",
  "customer_support",
  "healthcare_admin",
  "construction",
  "tech",
] as const;
export type IndustryId = (typeof INDUSTRY_IDS)[number];

export interface Scenario {
  readonly id: ScenarioId;
  readonly title: string;
  readonly description: string;
  readonly counterpart: { readonly roleEn: string };
  /** What the counterpart is trying to do, for the system prompt. */
  readonly goalEn: string;
}

export interface Industry {
  readonly id: IndustryId;
  readonly label: string;
  /** The user's job title inside role-plays, e.g. "sales representative". */
  readonly roleEn: string;
  readonly contextEn: string;
}

export const SCENARIOS: readonly Scenario[] = [
  {
    id: "job_interview",
    title: "Job interview",
    description: "Introduce yourself, talk about your experience, handle tough questions.",
    counterpart: { roleEn: "hiring manager" },
    goalEn: "interview the candidate: background, a concrete achievement, a weakness, why this company",
  },
  {
    id: "team_meeting",
    title: "Team meeting",
    description: "Give your update, ask for help and share your opinion with confidence.",
    counterpart: { roleEn: "team lead" },
    goalEn: "run a weekly stand-up: ask for a status update, blockers, and an opinion on a plan",
  },
  {
    id: "client_call",
    title: "Client call",
    description: "Handle a complaint, explain options and agree on next steps.",
    counterpart: { roleEn: "client" },
    goalEn: "be a slightly frustrated client with a problem who wants clear options and next steps",
  },
  {
    id: "presentation",
    title: "Presentation",
    description: "Pitch an idea in 2 minutes and answer questions from the audience.",
    counterpart: { roleEn: "director in the audience" },
    goalEn: "listen to a short pitch, then ask follow-up questions about results, cost and timeline",
  },
  {
    id: "salary_negotiation",
    title: "Salary negotiation",
    description: "Ask for what you are worth, with numbers and without apologizing.",
    counterpart: { roleEn: "HR manager" },
    goalEn: "make a job offer slightly below market and negotiate politely but firmly",
  },
];

export const INDUSTRIES: readonly Industry[] = [
  { id: "general", label: "General", roleEn: "this position", contextEn: "a mid-size company" },
  { id: "sales", label: "Sales", roleEn: "sales representative", contextEn: "a B2B sales team with monthly quotas" },
  {
    id: "customer_support",
    label: "Customer support",
    roleEn: "customer support specialist",
    contextEn: "a support team that handles tickets, calls and refunds",
  },
  {
    id: "healthcare_admin",
    label: "Healthcare admin",
    roleEn: "medical office administrator",
    contextEn: "a busy clinic: scheduling, insurance, patient intake",
  },
  {
    id: "construction",
    label: "Construction",
    roleEn: "construction project coordinator",
    contextEn: "a construction company: crews, schedules, safety, change orders",
  },
  { id: "tech", label: "Tech", roleEn: "software developer", contextEn: "a software product team with sprints" },
];

export function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === "string" && (SCENARIO_IDS as readonly string[]).includes(value);
}

export function isIndustryId(value: unknown): value is IndustryId {
  return typeof value === "string" && (INDUSTRY_IDS as readonly string[]).includes(value);
}

export function getScenario(id: ScenarioId): Scenario {
  const found = SCENARIOS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown scenario: ${String(id)}`);
  return found;
}

export function getIndustry(id: IndustryId): Industry {
  const found = INDUSTRIES.find((i) => i.id === id);
  if (!found) throw new Error(`Unknown industry: ${String(id)}`);
  return found;
}

function roleText(industry: Industry): string {
  return industry.id === "general" ? "this position" : `the ${industry.roleEn} role`;
}

/** The counterpart's first line. Fixed text: no AI call needed to start. */
export function buildOpener(scenario: Scenario, industry: Industry, avatar: Avatar): string {
  const { roleEn } = scenario.counterpart;
  const { name } = avatar;
  switch (scenario.id) {
    case "job_interview":
      return `Hi, thanks for coming in today. I'm ${name}, the ${roleEn} for ${roleText(industry)}. To start, could you tell me a little about yourself?`;
    case "team_meeting":
      return `Morning, everyone. Let's keep this quick. You're up first: what did you work on this week, and is anything blocking you?`;
    case "client_call":
      return `Hi, this is ${name}. I'm calling because we've had the same problem twice this month and I'm honestly getting frustrated. Can you help me understand what's going on?`;
    case "presentation":
      return `Thanks for joining. I'm ${name}. We have about two minutes, so go ahead and walk me through your idea.`;
    case "salary_negotiation":
      return `Hi, I'm ${name} from HR. We're excited to offer you ${roleText(industry)}. Before we send the paperwork, how do you feel about the offer we discussed?`;
  }
}
