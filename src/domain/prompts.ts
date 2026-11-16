import type { Avatar } from "./avatars";
import type { ChatMessage, Turn } from "./conversation";
import type { Level } from "./levels";
import type { Industry, Scenario } from "./scenarios";

/** System prompt for the AI counterpart in the role-play. */
export function counterpartSystemPrompt(scenario: Scenario, industry: Industry, avatar: Avatar, level: Level): string {
  const role = industry.roleEn === "this position" ? "professional" : industry.roleEn;
  return [
    `You are ${avatar.name}, a ${scenario.counterpart.roleEn}. Personality: ${avatar.vibe.toLowerCase()}. Setting: ${industry.contextEn}. The other person works as a ${role}.`,
    `Your goal in this role-play: ${scenario.goalEn}.`,
    "The other person is a Spanish-speaking professional practicing spoken English for work.",
    "Rules:",
    "- Speak only in English, even if they use Spanish. If they switch to Spanish, gently ask them to try in English.",
    "- Reply in 1 to 3 short sentences, like a real person talking. No lists, no markdown, no emojis.",
    "- Ask one question at a time and react to what they actually said.",
    "- Stay in character. Do not correct their English during the role-play; feedback comes later.",
    `- ${level.counterpartStyle}`,
    "- Never use the em dash character; use commas or periods.",
  ].join("\n");
}

function feedbackSpec(level: Level): string {
  const lang = level.explanationLanguage === "Spanish" ? "neutral Latin American Spanish, speaking to the user as \"tú\"" : "simple, friendly English, speaking to the user as \"you\"";
  return `Return ONLY a JSON object with this exact shape, no prose:
{
  "summary": "2 short sentences about how it went",
  "wellDone": ["2 or 3 specific things they did well, max 15 words each"],
  "betterPhrases": [
    {"original": "an exact sentence the USER said", "better": "a more natural way a native professional would say it, max 25 words", "why": "one short reason, max 20 words"}
  ],
  "vocabulary": [{"term": "useful English word or phrase for this situation", "meaning": "short meaning"}],
  "score": 0-100
}
Write summary, wellDone, why and meaning in ${lang}. Never say "the candidate" or "the user".
betterPhrases: exactly 3 items, taken from what the USER said (never from the counterpart). If the user's English is already natural, suggest more idiomatic or more confident versions.
vocabulary: 3 to 5 items.
score: overall spoken workplace English in this conversation (clarity, grammar, vocabulary, confidence), for a ${level.label.toLowerCase()} learner. Be encouraging but honest.
Never use the em dash character; use commas or periods.`;
}

/** Messages for the end-of-session feedback call. */
export function feedbackMessages(scenario: Scenario, industry: Industry, level: Level, turns: readonly Turn[]): ChatMessage[] {
  const transcript = turns.map((t) => `${t.role === "user" ? "USER" : "COUNTERPART"}: ${t.text}`).join("\n");
  return [
    { role: "system", content: `You are a friendly English coach for Spanish-speaking professionals. ${feedbackSpec(level)}` },
    {
      role: "user",
      content: `Scenario: ${scenario.title} (${scenario.counterpart.roleEn}). Industry: ${industry.label}. Level: ${level.label}.\nTranscript (speech-to-text, ignore small transcription errors):\n${transcript}`,
    },
  ];
}
