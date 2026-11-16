import type { Feedback, FinishResult, PracticeView, Progress } from "@/lib/types";

export const feedback: Feedback = {
  summary: "Te comunicaste con claridad.",
  wellDone: ["Diste ejemplos concretos", "Saludaste con naturalidad"],
  betterPhrases: [
    { original: "I am agree", better: "I agree", why: "Agree es verbo." },
    { original: "I make a process", better: "I created a process", why: "Pasado de create." },
    { original: "I have 5 years", better: "I bring five years", why: "Suena más seguro." },
  ],
  vocabulary: [{ term: "follow up", meaning: "dar seguimiento" }],
  score: 78,
};

export function practice(over: Partial<PracticeView> = {}): PracticeView {
  return {
    id: "p1",
    scenarioId: "job_interview",
    industryId: "sales",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    turns: [{ role: "counterpart", text: "Tell me about yourself." }],
    feedback: null,
    score: null,
    canFinish: false,
    limitReached: false,
    ...over,
  };
}

export const finishResult: FinishResult = {
  practice: practice({ finishedAt: new Date().toISOString(), feedback, score: 78, canFinish: true }),
  feedback,
  streak: { current: 3, best: 5, practicedToday: true },
};

export const progress = (over: Partial<Progress> = {}): Progress => ({
  streak: { current: 2, best: 4, practicedToday: false },
  week: Array.from({ length: 7 }, (_, i) => ({ day: `2026-11-${String(9 + i).padStart(2, "0")}`, practiced: i >= 5 })),
  history: [{ id: "h1", scenarioId: "client_call", industryId: "tech", finishedAt: "2026-11-14T18:00:00Z", score: 81 }],
  phrases: [
    { id: "ph1", practiceId: "h1", original: "I am agree", better: "I agree", why: "Verbo", createdAt: "2026-11-14T18:00:00Z", reviewedAt: "2026-11-15T10:00:00Z", step: 4, dueDay: null },
    { id: "ph2", practiceId: "h1", original: "Make a meeting", better: "Set up a meeting", why: "Colocación", createdAt: "2026-11-14T18:00:00Z", reviewedAt: null, step: 0, dueDay: "2026-11-15" },
  ],
  toReview: 1,
  dueToday: 1,
  ...over,
});
