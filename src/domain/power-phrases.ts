/**
 * Power phrases: short expressions that make work English sound sure of itself. One is the phrase of the day;
 * using it in a practice earns bonus points. Meanings are in plain English on purpose (the phrase is what is learned).
 */

export interface PowerPhrase {
  readonly id: string;
  readonly phrase: string;
  readonly meaning: string;
  readonly example: string;
}

export const POWER_PHRASES: readonly PowerPhrase[] = [
  { id: "follow_up", phrase: "follow up", meaning: "Contact someone again about the same thing.", example: "I'll follow up with the client tomorrow." },
  { id: "on_track", phrase: "on track", meaning: "Going as planned.", example: "The project is on track for Friday." },
  { id: "take_the_lead", phrase: "take the lead", meaning: "Be the one in charge.", example: "I can take the lead on this." },
  { id: "im_confident", phrase: "I'm confident", meaning: "Stronger than \"I think\".", example: "I'm confident we can deliver on time." },
  { id: "my_recommendation", phrase: "my recommendation is", meaning: "A clear way to give your opinion.", example: "My recommendation is to start with one client." },
  { id: "walk_you_through", phrase: "walk you through", meaning: "Explain step by step.", example: "Let me walk you through the plan." },
  { id: "bottom_line", phrase: "the bottom line", meaning: "The most important point.", example: "The bottom line is we need two more weeks." },
  { id: "to_clarify", phrase: "to clarify", meaning: "Check that you understood.", example: "Just to clarify, the deadline is Monday?" },
  { id: "moving_forward", phrase: "moving forward", meaning: "From now on.", example: "Moving forward, I'll send a weekly update." },
  { id: "reach_out", phrase: "reach out", meaning: "Contact someone.", example: "I'll reach out to the supplier today." },
  { id: "i_delivered", phrase: "I delivered", meaning: "A strong verb for results.", example: "I delivered the project two weeks early." },
  { id: "in_my_experience", phrase: "in my experience", meaning: "Give an opinion with authority.", example: "In my experience, short meetings work better." },
  { id: "next_step", phrase: "the next step", meaning: "What happens after this.", example: "The next step is to test it with users." },
  { id: "happy_to", phrase: "I'd be happy to", meaning: "A warm way to say yes.", example: "I'd be happy to help with that." },
  { id: "quick_update", phrase: "a quick update", meaning: "Short news about your work.", example: "Here's a quick update on the launch." },
  { id: "push_back", phrase: "push back", meaning: "Disagree politely, or ask for more time.", example: "I'd like to push back on that deadline." },
  { id: "i_led", phrase: "I led", meaning: "A strong verb for being in charge.", example: "I led a team of five people." },
  { id: "trade_off", phrase: "trade-off", meaning: "What you give up to get something else.", example: "The trade-off is higher cost for faster delivery." },
  { id: "in_the_loop", phrase: "in the loop", meaning: "Informed about what is happening.", example: "Please keep me in the loop." },
  { id: "bring_to_the_table", phrase: "bring to the table", meaning: "The skills you offer.", example: "Here is what I bring to the table: five years in sales." },
  { id: "make_sure", phrase: "make sure", meaning: "Check that something happens.", example: "I'll make sure the report is ready." },
];

/** Bonus points added to the score when the phrase of the day is used. */
export const POWER_PHRASE_BONUS = 5;

const DAY_MS = 86_400_000;

/** The phrase for a local day ("YYYY-MM-DD"): the same for everyone that day, a new one tomorrow. */
export function phraseOfTheDay(day: string): PowerPhrase {
  const time = Date.parse(`${day}T00:00:00Z`);
  const index = Number.isFinite(time) ? Math.floor(time / DAY_MS) % POWER_PHRASES.length : 0;
  return POWER_PHRASES[(index + POWER_PHRASES.length) % POWER_PHRASES.length];
}

export function getPowerPhrase(id: unknown): PowerPhrase | null {
  return POWER_PHRASES.find((p) => p.id === id) ?? null;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whether a sentence uses the phrase. Endings may change ("followed up", "reaching out"). */
export function usesPhrase(text: string, phrase: PowerPhrase): boolean {
  const words = phrase.phrase.toLowerCase().replace(/[’']/g, "'").split(/[\s-]+/).filter(Boolean);
  const pattern = words.map((w) => `${escapeRegExp(w)}[a-z]*`).join("[\\s-]+");
  return new RegExp(`(^|[^a-z'])${pattern}(?![a-z])`, "i").test(text.toLowerCase().replace(/[’]/g, "'"));
}
