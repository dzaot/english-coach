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
import { counterpartSystemPrompt, feedbackMessages } from "@/domain/prompts";
import { cleanDashes } from "@/domain/text";
import { AVATAR_IDS, getAvatar } from "@/domain/avatars";
import { LEVEL_IDS, getLevel } from "@/domain/levels";
import { INDUSTRY_IDS, SCENARIO_IDS, buildOpener, getIndustry, getScenario } from "@/domain/scenarios";
import { addDays, computeStreak, localDay, type Streak } from "@/domain/streak";
import type { AiProvider, SpeechAudio, Tier } from "./ai/provider";
import type { AppContext } from "./context";
import type { PhraseRecord, PracticeRecord } from "./db/store";
import { AppError } from "./errors";

/** Use cases of a practice session. Route handlers only parse HTTP and call these. */

export const MAX_AUDIO_BYTES = 4_000_000; // publik's multipart transcription limit is about 4 MB
const REPLY_MAX_TOKENS = 160;
const FEEDBACK_MAX_TOKENS = 900;
const HELP_MAX_TOKENS = 300;
const HISTORY_LIMIT = 30;
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

function load(ctx: AppContext, sid: string, id: string): PracticeRecord {
  const p = ctx.store.getPractice(sid, id);
  if (!p) throw new AppError("not_found");
  return p;
}

const StartSchema = z.object({
  scenarioId: z.enum(SCENARIO_IDS),
  industryId: z.enum(INDUSTRY_IDS),
  level: z.enum(LEVEL_IDS).default("intermediate"),
  avatarId: z.enum(AVATAR_IDS).default("sarah"),
});
const TzSchema = z.number().int().min(-840).max(840);

export async function startPractice(ctx: AppContext, ai: AiProvider, sid: string, input: unknown) {
  const parsed = StartSchema.safeParse(input);
  if (!parsed.success) throw new AppError("invalid_input");
  const opener = buildOpener(getScenario(parsed.data.scenarioId), getIndustry(parsed.data.industryId), getAvatar(parsed.data.avatarId));
  const now = ctx.now().toISOString();
  ctx.store.getOrCreateUser(sid, now);
  const practice = ctx.store.createPractice({ sid, ...parsed.data, startedAt: now, turns: [{ role: "counterpart", text: opener }] });
  // Speech is fetched separately (speakTurn) so the text shows without waiting for audio.
  return { practice: view(practice), audio: null };
}

export function getPractice(ctx: AppContext, sid: string, id: string): PracticeView {
  return view(load(ctx, sid, id));
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
  readonly audio: SpeechAudio | null;
  readonly practice: PracticeView;
}

export async function takeTurn(
  ctx: AppContext,
  ai: AiProvider,
  sid: string,
  id: string,
  input: { audio?: Blob | null; text?: string | null },
): Promise<TurnResult> {
  const practice = load(ctx, sid, id);
  if (practice.finishedAt) throw new AppError("session_finished");
  if (isTurnLimitReached(practice.turns)) throw new AppError("turn_limit");
  const check = validateUserText(await userTextFrom(ai, input));
  if (!check.ok) throw new AppError(input.audio ? "transcription_empty" : "invalid_input");
  const withUser = appendTurn(practice.turns, { role: "user", text: check.text });
  const system = counterpartSystemPrompt(
    getScenario(practice.scenarioId),
    getIndustry(practice.industryId),
    getAvatar(practice.avatarId),
    getLevel(practice.level),
  );
  const replyText = cleanDashes(await ai.chat(toChatMessages(system, withUser), { tier: ctx.config.replyTier, maxTokens: REPLY_MAX_TOKENS }));
  const saved = ctx.store.savePracticeTurns(sid, id, appendTurn(withUser, { role: "counterpart", text: replyText }));
  return { userText: check.text, replyText, audio: null, practice: view(saved) };
}

/** "Help me": translation of the last line and a suggested answer (fast tier). */
export async function getHelp(ctx: AppContext, ai: AiProvider, sid: string, id: string): Promise<Help> {
  const practice = load(ctx, sid, id);
  if (practice.finishedAt) throw new AppError("session_finished");
  const messages = helpMessages(getScenario(practice.scenarioId), getIndustry(practice.industryId), getLevel(practice.level), practice.turns);
  try {
    return parseHelp(await ai.chat(messages, { tier: "fast", maxTokens: HELP_MAX_TOKENS }));
  } catch (e) {
    if (e instanceof HelpParseError) throw new AppError("help_invalid");
    throw e;
  }
}

const SpeakSchema = z.object({ turnIndex: z.number().int().min(0) });

/** Voice for one counterpart line, asked for after the text is on screen. Only lines the app generated. */
export async function speakTurn(ctx: AppContext, ai: AiProvider, sid: string, id: string, input: unknown) {
  const practice = load(ctx, sid, id);
  const parsed = SpeakSchema.safeParse(input);
  const turn = parsed.success ? practice.turns[parsed.data.turnIndex] : undefined;
  if (!turn || turn.role !== "counterpart") throw new AppError("invalid_input");
  return { audio: await ai.speak(turn.text, getAvatar(practice.avatarId).voice) };
}

async function generateFeedback(ai: AiProvider, practice: PracticeRecord): Promise<Feedback> {
  const messages = feedbackMessages(getScenario(practice.scenarioId), getIndustry(practice.industryId), getLevel(practice.level), practice.turns);
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

function streakFor(ctx: AppContext, sid: string, tzOffset: number): Streak {
  return computeStreak(ctx.store.practiceDays(sid), localDay(ctx.now(), tzOffset));
}

function parseTz(value: unknown): number {
  const tz = TzSchema.safeParse(value);
  if (!tz.success) throw new AppError("invalid_input");
  return tz.data;
}

export async function finishPractice(ctx: AppContext, ai: AiProvider, sid: string, id: string, input: { tzOffset: unknown }) {
  const tzOffset = parseTz(input.tzOffset);
  const practice = load(ctx, sid, id);
  if (practice.finishedAt && practice.feedback) {
    return { practice: view(practice), feedback: practice.feedback, streak: streakFor(ctx, sid, tzOffset) };
  }
  if (!canFinish(practice.turns)) throw new AppError("not_enough_turns");
  const feedback = await generateFeedback(ai, practice);
  const now = ctx.now();
  const done = ctx.store.finishPractice(sid, id, { feedback, finishedAt: now.toISOString(), localDay: localDay(now, tzOffset) });
  ctx.store.addPhrases(sid, id, feedback.betterPhrases, now.toISOString(), addDays(localDay(now, tzOffset), 1));
  return { practice: view(done), feedback, streak: streakFor(ctx, sid, tzOffset) };
}

export interface HistoryItem {
  readonly id: string;
  readonly scenarioId: PracticeRecord["scenarioId"];
  readonly industryId: PracticeRecord["industryId"];
  readonly finishedAt: string;
  readonly score: number | null;
}

export function getProgress(ctx: AppContext, sid: string, tzOffset: unknown) {
  const tz = parseTz(tzOffset);
  const history: HistoryItem[] = ctx.store
    .listPractices(sid, HISTORY_LIMIT)
    .filter((p) => p.finishedAt)
    .map((p) => ({ id: p.id, scenarioId: p.scenarioId, industryId: p.industryId, finishedAt: p.finishedAt!, score: p.score }));
  const phrases: PhraseRecord[] = ctx.store.listPhrases(sid);
  const practiced = new Set(ctx.store.practiceDays(sid));
  const today = localDay(ctx.now(), tz);
  const week = Array.from({ length: WEEK_DAYS }, (_, i) => addDays(today, i - (WEEK_DAYS - 1))).map((day) => ({
    day,
    practiced: practiced.has(day),
  }));
  return {
    streak: streakFor(ctx, sid, tz),
    week,
    history,
    phrases: phrases.map(publicPhrase),
    toReview: phrases.filter((p) => !p.reviewedAt).length,
    dueToday: phrases.filter((p) => isDue(p, today)).length,
  };
}

const MarkSchema = z.object({ reviewed: z.boolean() });

export function markPhrase(ctx: AppContext, sid: string, id: string, input: unknown) {
  const parsed = MarkSchema.safeParse(input);
  if (!parsed.success) throw new AppError("invalid_input");
  const phrase = ctx.store.markPhrase(sid, id, parsed.data.reviewed, ctx.now().toISOString());
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
  const phrase = ctx.store.getPhrase(sid, id);
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
      ctx.store.schedulePhrase(sid, id, { step: next.step, dueDay: next.dueDay, reviewedAt: next.learned ? now.toISOString() : phrase.reviewedAt }) ??
      phrase;
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
