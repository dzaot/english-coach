import { z } from "zod";
import {
  appendTurn,
  canFinish,
  isTurnLimitReached,
  toChatMessages,
  validateUserText,
  type Turn,
} from "@/domain/conversation";
import { checkClarity, measurePace } from "@/domain/clarity";
import { compareSaid, isDue, nextSchedule } from "@/domain/drill";
import { FeedbackParseError, parseFeedback, type Feedback } from "@/domain/feedback";
import { HelpParseError, helpMessages, parseHelp, type Help } from "@/domain/help";
import { MAX_CONTEXT_CHARS, counterpartSystemPrompt, feedbackMessages, linkBriefMessages, openerMessages } from "@/domain/prompts";
import { parseTurnCheck, turnCheckMessages, type TurnCheck } from "@/domain/turn-check";
import { cleanDashes } from "@/domain/text";
import { AVATAR_IDS, getAvatar } from "@/domain/avatars";
import { LEVEL_IDS, getLevel } from "@/domain/levels";
import { LOCALES } from "@/domain/locales";
import { CUSTOM_SCENARIO, INDUSTRY_IDS, SCENARIO_IDS, buildOpener, getIndustry, getScenario } from "@/domain/scenarios";
import { addDays, computeStreak, localDay, type Streak } from "@/domain/streak";
import type { AiProvider, SpeechAudio, Tier } from "./ai/provider";
import type { AppContext } from "./context";
import type { PhraseRecord, PracticeRecord } from "./db/store";
import { AppError } from "./errors";
import { findLink, readLinkText } from "./link-reader";

/** Use cases of a practice session. Route handlers only parse HTTP and call these. */

export const MAX_AUDIO_BYTES = 4_000_000; // publik's multipart transcription limit is about 4 MB
const REPLY_MAX_TOKENS = 160;
const FEEDBACK_MAX_TOKENS = 900;
const HELP_MAX_TOKENS = 300;
const CHECK_MAX_TOKENS = 450;
const OPENER_MAX_TOKENS = 120;
const BRIEF_MAX_TOKENS = 260;
/** What the person can type about their situation. A pasted link adds a short summary on top. */
export const MAX_CONTEXT_INPUT = 2000;
const MIN_CUSTOM_CONTEXT = 10;
const HISTORY_LIMIT = 30;
/** Practices counted for lifetime stats. */
const STATS_LIMIT = 1000;
/** Scores shown in the progress chart. */
const SCORE_TREND = 10;
const WEEK_DAYS = 7;

export interface PracticeView {
  readonly id: string;
  readonly scenarioId: PracticeRecord["scenarioId"];
  readonly industryId: PracticeRecord["industryId"];
  readonly level: PracticeRecord["level"];
  readonly avatarId: PracticeRecord["avatarId"];
  readonly startedAt: string;
  readonly finishedAt: string | null;
  readonly turns: readonly Turn[];
  readonly feedback: Feedback | null;
  readonly score: number | null;
  readonly canFinish: boolean;
  readonly limitReached: boolean;
  readonly context: string | null;
  readonly locale: PracticeRecord["locale"];
}

function view(p: PracticeRecord): PracticeView {
  return {
    id: p.id,
    scenarioId: p.scenarioId,
    industryId: p.industryId,
    level: p.level,
    avatarId: p.avatarId,
    startedAt: p.startedAt,
    finishedAt: p.finishedAt,
    turns: p.turns,
    feedback: p.feedback,
    score: p.score,
    canFinish: canFinish(p.turns),
    limitReached: isTurnLimitReached(p.turns),
    context: p.context,
    locale: p.locale,
  };
}

/** A phrase without the owner's session id. */
function publicPhrase(p: PhraseRecord) {
  return {
    id: p.id,
    practiceId: p.practiceId,
    original: p.original,
    better: p.better,
    why: p.why,
    createdAt: p.createdAt,
    reviewedAt: p.reviewedAt,
    step: p.step,
    dueDay: p.dueDay,
  };
}

async function load(ctx: AppContext, sid: string, id: string): Promise<PracticeRecord> {
  const p = await ctx.store.getPractice(sid, id);
  if (!p) throw new AppError("not_found");
  return p;
}

const StartSchema = z.object({
  scenarioId: z.enum(SCENARIO_IDS),
  industryId: z.enum(INDUSTRY_IDS),
  level: z.enum(LEVEL_IDS).default("intermediate"),
  avatarId: z.enum(AVATAR_IDS).default("sarah"),
  context: z.string().max(MAX_CONTEXT_INPUT).default(""),
  locale: z.enum(LOCALES).default("es"),
});
const TzSchema = z.number().int().min(-840).max(840);

/** Out of balance or signed out: the person has to act, so these are never hidden behind a fallback. */
const mustSurface = (e: unknown) => e instanceof AppError && (e.code === "ai_balance" || e.code === "ai_auth");

/** The person's notes, plus a short summary of the page when they pasted a link (a job post). */
async function situationFrom(ctx: AppContext, ai: AiProvider, notes: string): Promise<string | null> {
  const text = notes.trim();
  if (!text) return null;
  const link = findLink(text);
  if (!link) return text;
  const page = await readLinkText(link, ctx.fetch);
  const brief = cleanDashes(await ai.chat(linkBriefMessages(page), { tier: "fast", maxTokens: BRIEF_MAX_TOKENS }));
  return `${text}\n\nFrom the link: ${brief}`.slice(0, MAX_CONTEXT_CHARS);
}

export async function startPractice(ctx: AppContext, ai: AiProvider, sid: string, input: unknown) {
  const parsed = StartSchema.safeParse(input);
  if (!parsed.success) throw new AppError("invalid_input");
  const { context: notes, ...choice } = parsed.data;
  if (choice.scenarioId === CUSTOM_SCENARIO && notes.trim().length < MIN_CUSTOM_CONTEXT) throw new AppError("context_required");
  const scenario = getScenario(choice.scenarioId);
  const industry = getIndustry(choice.industryId);
  const avatar = getAvatar(choice.avatarId);
  const context = await situationFrom(ctx, ai, notes);
  const fixed = buildOpener(scenario, industry, avatar);
  // With their real situation, the first line is written for it; the fixed line is the fallback.
  const opener = context
    ? await ai
        .chat(openerMessages(scenario, industry, avatar, getLevel(choice.level), context), { tier: ctx.config.replyTier, maxTokens: OPENER_MAX_TOKENS })
        .then(cleanDashes)
        .catch((e: unknown) => {
          if (mustSurface(e)) throw e;
          return fixed;
        })
    : fixed;
  const now = ctx.now().toISOString();
  await ctx.store.getOrCreateUser(sid, now);
  const practice = await ctx.store.createPractice({ sid, ...choice, context, startedAt: now, turns: [{ role: "counterpart", text: opener }] });
  // Speech is fetched separately (speakTurn) so the text shows without waiting for audio.
  return { practice: view(practice), audio: null };
}

export async function getPractice(ctx: AppContext, sid: string, id: string): Promise<PracticeView> {
  return view(await load(ctx, sid, id));
}

/** File extension the transcription service expects for a browser recording's MIME type. */
export function audioExtension(mime: string): string {
  const type = mime.toLowerCase();
  if (type.includes("mp4") || type.includes("m4a") || type.includes("aac")) return "m4a";
  if (type.includes("ogg") || (type.includes("opus") && !type.includes("webm"))) return "ogg";
  if (type.includes("mpeg") || type.includes("mp3")) return "mp3";
  if (type.includes("wav")) return "wav";
  return "webm";
}

function checkAudio(audio: Blob): void {
  if (audio.size === 0) throw new AppError("audio_empty");
  if (audio.size > MAX_AUDIO_BYTES) throw new AppError("audio_too_large");
}

function transcribeAudio(ai: AiProvider, audio: Blob): Promise<string> {
  checkAudio(audio);
  return ai.transcribe(audio, `turn.${audioExtension(audio.type)}`);
}

async function userTextFrom(ai: AiProvider, input: { audio?: Blob | null; text?: string | null }): Promise<string> {
  if (input.audio) return transcribeAudio(ai, input.audio);
  if (typeof input.text === "string") return input.text;
  throw new AppError("invalid_input");
}

export interface TurnResult {
  readonly userText: string;
  readonly replyText: string;
  readonly check: TurnCheck | null;
  readonly audio: SpeechAudio | null;
  readonly practice: PracticeView;
}

/** Sent while a turn is in progress, so the screen can show each part as soon as it exists. */
export type TurnEvent =
  | { readonly type: "heard"; readonly text: string; readonly turnIndex: number }
  | { readonly type: "check"; readonly check: TurnCheck | null; readonly turnIndex: number }
  | { readonly type: "reply"; readonly text: string; readonly turnIndex: number }
  | { readonly type: "voice"; readonly audio: SpeechAudio | null; readonly turnIndex: number };

export interface TurnOptions {
  readonly onEvent?: (event: TurnEvent) => void;
  /** Make the counterpart's voice in the same request, right after the reply. */
  readonly voice?: boolean;
}

/**
 * The live check never blocks the conversation: any failure just means no marks for this answer.
 * Fast tier: the balanced one took 13 to 16 seconds and often ran out of tokens. A worked example in the
 * prompt keeps the fast one from rewriting what people meant.
 */
async function checkTurn(ai: AiProvider, practice: PracticeRecord, userText: string): Promise<TurnCheck | null> {
  const lastLine = practice.turns.findLast((t) => t.role === "counterpart")?.text ?? "";
  try {
    return parseTurnCheck(await ai.chat(turnCheckMessages(getLevel(practice.level), lastLine, userText, practice.locale), { tier: "fast", maxTokens: CHECK_MAX_TOKENS }), userText);
  } catch {
    return null;
  }
}

/**
 * One answer: transcribe it word for word, then in parallel write the reply and check the answer.
 * The reply's voice starts as soon as the reply exists. Each part is sent as an event when ready.
 */
export async function takeTurn(
  ctx: AppContext,
  ai: AiProvider,
  sid: string,
  id: string,
  input: { audio?: Blob | null; text?: string | null },
  opts: TurnOptions = {},
): Promise<TurnResult> {
  const emit = opts.onEvent ?? (() => undefined);
  const practice = await load(ctx, sid, id);
  if (practice.finishedAt) throw new AppError("session_finished");
  if (isTurnLimitReached(practice.turns)) throw new AppError("turn_limit");
  const said = validateUserText(await userTextFrom(ai, input));
  if (!said.ok) throw new AppError(input.audio ? "transcription_empty" : "invalid_input");
  const userIndex = practice.turns.length;
  emit({ type: "heard", text: said.text, turnIndex: userIndex });

  const avatar = getAvatar(practice.avatarId);
  const system = counterpartSystemPrompt(getScenario(practice.scenarioId), getIndustry(practice.industryId), avatar, getLevel(practice.level), practice.context);
  const withUser = appendTurn(practice.turns, { role: "user", text: said.text });
  const replyP = ai.chat(toChatMessages(system, withUser), { tier: ctx.config.replyTier, maxTokens: REPLY_MAX_TOKENS }).then((raw) => {
    const text = cleanDashes(raw);
    emit({ type: "reply", text, turnIndex: userIndex + 1 });
    return text;
  });
  const voiceP = opts.voice
    ? replyP.then(async (text) => {
        const audio = await ai.speak(text, avatar.voice);
        emit({ type: "voice", audio, turnIndex: userIndex + 1 });
        return audio;
      })
    : Promise.resolve(null);
  voiceP.catch(() => undefined); // a failed reply is reported once, below
  const checkP = checkTurn(ai, practice, said.text).then((check) => {
    emit({ type: "check", check, turnIndex: userIndex });
    return check;
  });

  const [replyText, check] = await Promise.all([replyP, checkP]);
  const saved = await ctx.store.savePracticeTurns(sid, id, [
    ...practice.turns,
    { role: "user", text: said.text, check },
    { role: "counterpart", text: replyText },
  ]);
  const audio = await voiceP;
  return { userText: said.text, replyText, check, audio, practice: view(saved) };
}

/** "Help me": translation of the last line and a suggested answer (fast tier). */
export async function getHelp(ctx: AppContext, ai: AiProvider, sid: string, id: string): Promise<Help> {
  const practice = await load(ctx, sid, id);
  if (practice.finishedAt) throw new AppError("session_finished");
  const messages = helpMessages(getScenario(practice.scenarioId), getIndustry(practice.industryId), getLevel(practice.level), practice.turns, practice.context, practice.locale);
  try {
    return parseHelp(await ai.chat(messages, { tier: "fast", maxTokens: HELP_MAX_TOKENS }));
  } catch (e) {
    if (e instanceof HelpParseError) throw new AppError("help_invalid");
    throw e;
  }
}

const SpeakSchema = z.object({ turnIndex: z.number().int().min(0), alternative: z.number().int().min(0).optional() });

/**
 * Voice for one counterpart line, or for one "other way to say it" of an answer, asked for after the text
 * is on screen. Only text the app generated: never arbitrary input.
 */
export async function speakTurn(ctx: AppContext, ai: AiProvider, sid: string, id: string, input: unknown) {
  const practice = await load(ctx, sid, id);
  const parsed = SpeakSchema.safeParse(input);
  if (!parsed.success) throw new AppError("invalid_input");
  const turn = practice.turns[parsed.data.turnIndex];
  const alt = parsed.data.alternative;
  const text =
    alt === undefined
      ? turn?.role === "counterpart" ? turn.text : undefined
      : turn?.role === "user" ? turn.check?.alternatives[alt]?.text : undefined;
  if (!text) throw new AppError("invalid_input");
  return { audio: await ai.speak(text, getAvatar(practice.avatarId).voice) };
}

async function generateFeedback(ai: AiProvider, practice: PracticeRecord): Promise<Feedback> {
  const messages = feedbackMessages(getScenario(practice.scenarioId), getIndustry(practice.industryId), getLevel(practice.level), practice.turns, practice.context, practice.locale);
  const tiers: Tier[] = ["balanced", "fast"];
  for (const tier of tiers) {
    try {
      return parseFeedback(await ai.chat(messages, { tier, maxTokens: FEEDBACK_MAX_TOKENS }));
    } catch (e) {
      if (!(e instanceof FeedbackParseError)) throw e;
    }
  }
  throw new AppError("feedback_invalid");
}

async function streakFor(ctx: AppContext, sid: string, tzOffset: number): Promise<Streak> {
  return computeStreak(await ctx.store.practiceDays(sid), localDay(ctx.now(), tzOffset));
}

function parseTz(value: unknown): number {
  const tz = TzSchema.safeParse(value);
  if (!tz.success) throw new AppError("invalid_input");
  return tz.data;
}

export async function finishPractice(ctx: AppContext, ai: AiProvider, sid: string, id: string, input: { tzOffset: unknown }) {
  const tzOffset = parseTz(input.tzOffset);
  const practice = await load(ctx, sid, id);
  if (practice.finishedAt && practice.feedback) {
    return { practice: view(practice), feedback: practice.feedback, streak: await streakFor(ctx, sid, tzOffset) };
  }
  if (!canFinish(practice.turns)) throw new AppError("not_enough_turns");
  const feedback = await generateFeedback(ai, practice);
  const now = ctx.now();
  const done = await ctx.store.finishPractice(sid, id, { feedback, finishedAt: now.toISOString(), localDay: localDay(now, tzOffset) });
  await ctx.store.addPhrases(sid, id, feedback.betterPhrases, now.toISOString(), addDays(localDay(now, tzOffset), 1));
  return { practice: view(done), feedback, streak: await streakFor(ctx, sid, tzOffset) };
}

export interface HistoryItem {
  readonly id: string;
  readonly scenarioId: PracticeRecord["scenarioId"];
  readonly industryId: PracticeRecord["industryId"];
  readonly finishedAt: string;
  readonly score: number | null;
}

export interface ProgressStats {
  /** Words the person said (or typed) in English across all practices. */
  readonly wordsSpoken: number;
  readonly practices: number;
  readonly phrasesLearned: number;
  /** Scores of the latest finished practices, oldest first. */
  readonly scores: readonly number[];
}

function statsFor(practices: readonly PracticeRecord[], phrases: readonly PhraseRecord[]): ProgressStats {
  const finished = practices.filter((p) => p.finishedAt);
  return {
    wordsSpoken: practices.reduce(
      (n, p) => n + p.turns.filter((t) => t.role === "user").reduce((m, t) => m + t.text.split(/\s+/).filter(Boolean).length, 0),
      0,
    ),
    practices: finished.length,
    phrasesLearned: phrases.filter((p) => p.reviewedAt).length,
    scores: finished
      .flatMap((p) => (p.score === null ? [] : [p.score]))
      .slice(0, SCORE_TREND)
      .reverse(),
  };
}

export async function getProgress(ctx: AppContext, sid: string, tzOffset: unknown) {
  const tz = parseTz(tzOffset);
  const [practices, phrases, days] = await Promise.all([
    ctx.store.listPractices(sid, STATS_LIMIT),
    ctx.store.listPhrases(sid),
    ctx.store.practiceDays(sid),
  ]);
  const history: HistoryItem[] = practices
    .slice(0, HISTORY_LIMIT)
    .filter((p) => p.finishedAt)
    .map((p) => ({ id: p.id, scenarioId: p.scenarioId, industryId: p.industryId, finishedAt: p.finishedAt!, score: p.score }));
  const practiced = new Set(days);
  const today = localDay(ctx.now(), tz);
  const week = Array.from({ length: WEEK_DAYS }, (_, i) => addDays(today, i - (WEEK_DAYS - 1))).map((day) => ({
    day,
    practiced: practiced.has(day),
  }));
  return {
    streak: computeStreak(days, today),
    week,
    history,
    stats: statsFor(practices, phrases),
    phrases: phrases.map(publicPhrase),
    toReview: phrases.filter((p) => !p.reviewedAt).length,
    dueToday: phrases.filter((p) => isDue(p, today)).length,
  };
}

const MarkSchema = z.object({ reviewed: z.boolean() });

export async function markPhrase(ctx: AppContext, sid: string, id: string, input: unknown) {
  const parsed = MarkSchema.safeParse(input);
  if (!parsed.success) throw new AppError("invalid_input");
  const phrase = await ctx.store.markPhrase(sid, id, parsed.data.reviewed, ctx.now().toISOString());
  if (!phrase) throw new AppError("not_found");
  return publicPhrase(phrase);
}

/** "Say it": the person says a better phrase out loud; when it matches, the next review moves 1, 3, then 7 days ahead. */
export async function drillPhrase(
  ctx: AppContext,
  ai: AiProvider,
  sid: string,
  id: string,
  input: { audio: Blob | null; tzOffset: unknown },
) {
  const tzOffset = parseTz(input.tzOffset);
  const phrase = await ctx.store.getPhrase(sid, id);
  if (!phrase) throw new AppError("not_found");
  if (!input.audio) throw new AppError("invalid_input");
  checkAudio(input.audio);
  const { text: said, words: timings } = await ai.transcribeTimed(input.audio, `say.${audioExtension(input.audio.type)}`);
  const result = compareSaid(phrase.better, said);
  let updated = phrase;
  if (result.passed) {
    const now = ctx.now();
    const next = nextSchedule(phrase, localDay(now, tzOffset));
    updated =
      (await ctx.store.schedulePhrase(sid, id, {
        step: next.step,
        dueDay: next.dueDay,
        reviewedAt: next.learned ? now.toISOString() : phrase.reviewedAt,
      })) ?? phrase;
  }
  return {
    said,
    ...result,
    words: checkClarity(phrase.better, said),
    pace: measurePace(timings),
    timings,
    phrase: publicPhrase(updated),
  };
}
