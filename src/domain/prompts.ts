import type { ChatMessage, Turn } from "./conversation";
import type { Industry, Scenario } from "./scenarios";

/** System prompt for the AI counterpart in the role-play. */
export function counterpartSystemPrompt(scenario: Scenario, industry: Industry): string {
  const { name, roleEn } = scenario.counterpart;
  return [
    `You are ${name}, a ${roleEn}. Setting: ${industry.contextEn}. The other person works as a ${industry.roleEn === "this position" ? "professional" : industry.roleEn}.`,
    `Your goal in this role-play: ${scenario.goalEn}.`,
    "The other person is a Spanish-speaking professional practicing spoken English for work.",
    "Rules:",
    "- Speak only in English, even if they use Spanish. If they switch to Spanish, gently ask them to try in English.",
    "- Reply in 1 to 3 short sentences, like a real person talking. No lists, no markdown, no emojis.",
    "- Ask one question at a time and react to what they actually said.",
    "- Stay in character. Do not correct their English during the role-play; feedback comes later.",
    "- Use clear, natural workplace English at a normal pace.",
  ].join("\n");
}

const FEEDBACK_SPEC = `Return ONLY a JSON object with this exact shape, no prose:
{
  "summaryEs": "2 sentences in neutral Latin American Spanish about how it went",
  "wellDone": ["2 or 3 specific things they did well, in Spanish"],
  "betterPhrases": [
    {"original": "an exact sentence the USER said", "better": "a more natural way a native professional would say it", "whyEs": "short reason in Spanish"}
  ],
  "vocabulary": [{"term": "useful English word or phrase for this situation", "meaningEs": "meaning in Spanish"}],
  "score": 0-100
}
betterPhrases: exactly 3 items, taken from what the USER said (never from the counterpart). If the user's English is already natural, suggest more idiomatic or more confident versions.
vocabulary: 3 to 5 items.
score: overall spoken workplace English in this conversation (clarity, grammar, vocabulary, confidence). Be encouraging but honest.`;

/** Messages for the end-of-session feedback call. */
export function feedbackMessages(scenario: Scenario, industry: Industry, turns: readonly Turn[]): ChatMessage[] {
  const transcript = turns
    .map((t) => `${t.role === "user" ? "USER" : "COUNTERPART"}: ${t.text}`)
    .join("\n");
  return [
    {
      role: "system",
      content: `You are a friendly English coach for Spanish-speaking professionals. ${FEEDBACK_SPEC}`,
    },
    {
      role: "user",
      content: `Scenario: ${scenario.titleEs} (${scenario.counterpart.roleEn}). Industry: ${industry.labelEs}.\nTranscript (speech-to-text, ignore small transcription errors):\n${transcript}`,
    },
  ];
}
