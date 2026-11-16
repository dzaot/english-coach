import type { AiProvider } from "./provider";

/** Deterministic, offline AI for development, demos and tests. No network, no keys. */

const SAMPLE_ANSWERS = [
  "Sure. I have five years of experience in customer service and I am very good working with people.",
  "In my last job I make a new process for the returns and we reduce the time in forty percent.",
  "I think my weakness is that sometimes I want to do everything perfect, so I take more time.",
  "I want to work here because I like the culture and I can grow with the team.",
  "Yes, I am agree with the plan, but I need more information about the deadline.",
];

const FOLLOW_UPS = [
  "That's great. Can you give me a specific example of a result you're proud of?",
  "Interesting. How did you measure that improvement?",
  "Got it. What would you say is one area you're still working on?",
  "Makes sense. Why are you interested in this role in particular?",
  "Thanks for sharing. Do you have any questions for me?",
];

const BETTER: Record<string, { better: string; why: string }> = {
  agree: { better: "I agree with the plan, but I'd like more details on the deadline.", why: "\"Agree\" is already a verb, so you don't need \"am\"." },
  make: { better: "In my last role, I created a new returns process that cut handling time by 40%.", why: "You \"create\" or \"set up\" a process, and the past tense is \"created\"." },
  perfect: { better: "I tend to be a perfectionist, so I'm learning to prioritize and move faster.", why: "More direct, and it shows you are already working on it." },
  default: { better: "I bring five years of customer service experience, and I work really well with people.", why: "\"I bring\" sounds more confident in an interview." },
};

function userLines(transcript: string): string[] {
  return transcript
    .split("\n")
    .filter((l) => l.startsWith("USER: "))
    .map((l) => l.slice("USER: ".length).trim());
}

function improve(line: string): { original: string; better: string; why: string } {
  const key = Object.keys(BETTER).find((k) => k !== "default" && line.toLowerCase().includes(k)) ?? "default";
  return { original: line, ...BETTER[key] };
}

function mockFeedback(transcript: string): string {
  const candidates = [...userLines(transcript).slice(-3), ...SAMPLE_ANSWERS].map(improve);
  const picked = candidates.filter((c, i) => candidates.findIndex((o) => o.better === c.better) === i).slice(0, 3);
  return JSON.stringify({
    summary: "You communicated clearly and kept the conversation going. A few grammar tweaks will make you sound even more confident.",
    wellDone: ["You answered every question without freezing", "You gave concrete examples with numbers"],
    betterPhrases: picked,
    vocabulary: [
      { term: "cut (time) by", meaning: "to reduce (time) by an amount" },
      { term: "I tend to", meaning: "I usually do something" },
      { term: "hands-on", meaning: "practical, actively involved" },
    ],
    score: 72,
  });
}

const MOCK_HELP = JSON.stringify({
  translation: "¿Puedes darme un ejemplo concreto de un resultado del que estés orgulloso?",
  suggestion: "Sure. Last year I improved our returns process and cut handling time by forty percent.",
  tip: "Give one concrete number: it makes your answer more believable.",
});

export function createMockProvider(): AiProvider {
  return {
    async transcribe(audio) {
      return SAMPLE_ANSWERS[audio.size % SAMPLE_ANSWERS.length];
    },
    async chat(messages) {
      const system = messages[0]?.content ?? "";
      if (system.includes("HELP_JSON")) return MOCK_HELP;
      if (system.includes("JSON")) return mockFeedback(messages[messages.length - 1]?.content ?? "");
      const answered = messages.filter((m) => m.role === "user").length;
      return FOLLOW_UPS[(answered - 1 + FOLLOW_UPS.length) % FOLLOW_UPS.length];
    },
    async speak() {
      return null;
    },
  };
}
