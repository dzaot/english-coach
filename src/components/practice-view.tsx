"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Flag, Keyboard, LifeBuoy, Mic, Send, X } from "lucide-react";
import { MAX_USER_TURNS, countUserTurns } from "@/domain/conversation";
import { getAvatar } from "@/domain/avatars";
import { getLevel, translationLocale } from "@/domain/levels";
import { getScenario, ownFieldOf } from "@/domain/scenarios";
import { POWER_PHRASE_BONUS, phraseOfTheDay, usesPhrase } from "@/domain/power-phrases";
import { ApiError, api } from "@/lib/api";
import { localToday } from "@/lib/progress";
import { formatClock } from "@/lib/format";
import { useElapsedSeconds } from "@/lib/hooks/use-elapsed";
import { useMicLevel } from "@/lib/hooks/use-mic-level";
import { useRecorder } from "@/lib/hooks/use-recorder";
import { SLOW_RATE, useSpeaker } from "@/lib/hooks/use-speaker";
import type { FinishResult, Help, PracticeView as Practice, SpeechAudio, TurnEvent } from "@/lib/types";
import type { PortraitState } from "./avatar-portrait";
import { CallStage } from "./call-stage";
import { SparkSticker } from "./brand/stickers";
import { ChatBubble } from "./chat-bubble";
import { HelpCard } from "./help-card";
import { RecordButton, micLabel, type MicState } from "./record-button";
import { Button, CHIP_STAGE, ErrorBanner, FIELD, TopBar, VoiceBars } from "./ui";
import { useI18n } from "@/i18n/provider";
import { unlockAudio } from "@/lib/audio-unlock";

interface Props {
  initial: Practice;
  initialAudio: SpeechAudio | null;
  /** Something to tell the person as the practice opens (a pasted link that could not be read). */
  notice?: "link_unreadable" | null;
  onFinished: (result: FinishResult) => void;
  onExit: () => void;
  /** Silence before a way to answer shows up by itself. */
  autoHelpAfterMs?: number;
}

type Phase = "ready" | "sending" | "finishing" | "helping";
/** While an answer is on its way: reading your words, then your partner thinking. */
type Stage = "hearing" | "thinking";
const turnKey = (i: number) => `turn-${i}`;
const altKey = (turn: number, alt: number) => `alt-${turn}-${alt}`;
/** After this long without an answer (and without starting one), a way to answer shows up by itself. */
export const AUTO_HELP_AFTER_MS = 12_000;
/** If the voice is slow, show the reply's text anyway after this long. */
const REVEAL_WITHOUT_VOICE_MS = 7000;

export function PracticeView({ initial, initialAudio, notice = null, onFinished, onExit, autoHelpAfterMs = AUTO_HELP_AFTER_MS }: Props) {
  const [practice, setPractice] = useState(initial);
  const [phase, setPhase] = useState<Phase>("ready");
  const [error, setError] = useState<{ message: string; topUpUrl: string | null } | null>(null);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [help, setHelp] = useState<Help | null>(null);
  const [stage, setStage] = useState<Stage>("hearing");
  const [checkingTurn, setCheckingTurn] = useState<number | null>(null);
  const altAudio = useRef(new Map<string, SpeechAudio | null>());
  const revealed = useRef(new Set<number>());
  const sendingRef = useRef(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const [showNotice, setShowNotice] = useState(notice !== null);
  const [kept, setKept] = useState(false);
  const [helpUnasked, setHelpUnasked] = useState(false);
  const autoHelped = useRef(new Set<number>());
  const [powerPhrase] = useState(() => phraseOfTheDay(localToday()));
  const { t } = useI18n();
  const speaker = useSpeaker();
  const { play, stop: stopSpeaking } = speaker;
  const audioCache = useRef(new Map<number, SpeechAudio | null>(initialAudio ? [[0, initialAudio]] : []));
  const voiceToken = useRef(0);
  const elapsed = useElapsedSeconds(initial.startedAt);
  const endRef = useRef<HTMLLIElement | null>(null);
  const scenario = getScenario(practice.scenarioId);
  const avatar = getAvatar(practice.avatarId);
  const { name } = avatar;
  const baseRate = getLevel(practice.level).playbackRate;

  /** Plays a counterpart line. Its audio is fetched once, after the text is already on screen. */
  const voice = useCallback(
    async (index: number, text: string, rate = baseRate) => {
      const token = ++voiceToken.current;
      let audio = audioCache.current.get(index);
      if (audio === undefined) {
        audio = await api.speech(initial.id, index).then((r) => r.audio, () => null);
        audioCache.current.set(index, audio);
      }
      if (token === voiceToken.current) play(turnKey(index), text, audio, rate);
    },
    [baseRate, initial.id, play],
  );

  const silence = useCallback(() => {
    voiceToken.current += 1;
    stopSpeaking();
  }, [stopSpeaking]);

  /** Shows the partner's reply once: when its voice is ready, so text and voice arrive together. */
  const reveal = useCallback(
    (index: number, text: string) => {
      if (revealed.current.has(index)) return;
      revealed.current.add(index);
      setPractice((p) => (p.turns.length === index ? { ...p, turns: [...p.turns, { role: "counterpart", text }] } : p));
      setAnnouncement(t.practice.partnerSays(name, text));
    },
    [name, t],
  );

  const submit = useCallback(
    async (answer: { audio: Blob } | { text: string }) => {
      if (sendingRef.current) return; // a second tap on Send while the first answer is on its way
      sendingRef.current = true;
      unlockAudio();
      setKept(false);
      setPhase("sending");
      setStage("hearing");
      setError(null);
      setHelp(null);
      setAnnouncement(t.practice.sending);
      let reply: { index: number; text: string } | null = null;
      let heard: { index: number; text: string } | null = null;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const onEvent = (event: TurnEvent) => {
        switch (event.type) {
          case "heard":
            heard = { index: event.turnIndex, text: event.text };
            setPractice((p) => ({ ...p, turns: [...p.turns, { role: "user", text: event.text }] }));
            setCheckingTurn(event.turnIndex);
            setStage("thinking");
            setDraft("");
            setAnnouncement(t.practice.youSaid(event.text));
            break;
          case "check":
            setPractice((p) => ({ ...p, turns: p.turns.map((t, i) => (i === event.turnIndex ? { ...t, check: event.check } : t)) }));
            setCheckingTurn(null);
            break;
          case "reply": {
            const r = { index: event.turnIndex, text: event.text };
            reply = r;
            timer = setTimeout(() => reveal(r.index, r.text), REVEAL_WITHOUT_VOICE_MS);
            break;
          }
          case "voice":
            audioCache.current.set(event.turnIndex, event.audio);
            if (reply) {
              reveal(reply.index, reply.text);
              void voice(reply.index, reply.text);
            }
            break;
        }
      };
      try {
        const result = await api.turn(practice.id, answer, onEvent);
        const index = result.practice.turns.length - 1;
        const fresh = !revealed.current.has(index);
        revealed.current.add(index);
        setPractice(result.practice);
        if (fresh) {
          setAnnouncement(t.practice.partnerSays(name, result.replyText));
          void voice(index, result.replyText);
        }
      } catch (e) {
        setError({ message: e instanceof Error ? e.message : String(e), topUpUrl: e instanceof ApiError ? e.topUpUrl : null });
        setAnnouncement("");
        // Nothing was saved: take the answer off the conversation and keep its words, so it can be sent again
        // (for example after topping up the balance).
        const lost = heard as { index: number; text: string } | null;
        if (lost) {
          setPractice((p) => (p.turns.length > lost.index ? { ...p, turns: p.turns.slice(0, lost.index) } : p));
          setDraft(lost.text);
          setTyping(true);
          setKept(true);
        } else if ("text" in answer) {
          setDraft(answer.text);
        }
      } finally {
        if (timer) clearTimeout(timer);
        setCheckingTurn(null);
        setPhase("ready");
        sendingRef.current = false;
      }
    },
    [name, practice.id, reveal, t, voice],
  );

  /** "Other ways to say it": hear one in your partner's voice. */
  const listenAlternative = useCallback(
    async (turnIndex: number, alt: number, text: string) => {
      const key = altKey(turnIndex, alt);
      const token = ++voiceToken.current;
      let audio = altAudio.current.get(key);
      if (audio === undefined) {
        audio = await api.speech(practice.id, turnIndex, alt).then((r) => r.audio, () => null);
        altAudio.current.set(key, audio);
      }
      if (token === voiceToken.current) play(key, text, audio, baseRate);
    },
    [baseRate, play, practice.id],
  );

  const recorder = useRecorder({ onAutoStop: (audio) => void submit({ audio }) });
  const micLevel = useMicLevel(recorder.stream);

  useEffect(() => {
    void voice(0, initial.turns[0]?.text ?? "");
    // Speak the opener once, when the practice opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Not when the call opens: the first thing to see is your coworker, at the top.
    if (practice.turns.length <= 1 && phase === "ready" && !help) return;
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [practice.turns.length, phase, help]);

  useEffect(() => {
    const el = panelRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setPanelHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const pressMic = useCallback(async () => {
    if (recorder.status === "recording") {
      const audio = await recorder.stop();
      if (audio) await submit({ audio });
      return;
    }
    unlockAudio();
    silence();
    if (await recorder.start()) setAnnouncement(t.practice.recordingNow);
  }, [recorder, silence, submit, t]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      const inField = !!target?.closest("input, textarea, button, a, select");
      if (e.key === "Escape" && recorder.status === "recording") recorder.cancel();
      if (e.code === "Space" && !inField && !typing && phase === "ready") {
        e.preventDefault();
        void pressMic();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, pressMic, recorder, typing]);

  const askHelp = useCallback(
    async (unasked = false) => {
      setPhase("helping");
      setError(null);
      try {
        const next = await api.help(practice.id);
        setHelp(next);
        setHelpUnasked(unasked);
        setAnnouncement(t.practice.youCouldSay(next.suggestion));
      } catch (e) {
        // Help nobody asked for fails quietly: the Help me button is still there.
        if (!unasked) setError({ message: e instanceof Error ? e.message : String(e), topUpUrl: e instanceof ApiError ? e.topUpUrl : null });
      } finally {
        setPhase("ready");
      }
    },
    [practice.id, t],
  );

  const finish = async () => {
    setPhase("finishing");
    setError(null);
    silence();
    try {
      onFinished(await api.finish(practice.id, powerPhrase.id));
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : String(e), topUpUrl: e instanceof ApiError ? e.topUpUrl : null });
      setPhase("ready");
    }
  };

  const answered = countUserTurns(practice.turns);
  const lastLine = practice.turns.findLastIndex((t) => t.role === "counterpart");
  const counterpartSpeaking = speaker.speakingId !== null && speaker.speakingId.startsWith("turn-");
  const portraitState: PortraitState = recorder.status === "recording" ? "listening" : counterpartSpeaking ? "speaking" : "idle";
  const micState: MicState = phase !== "ready" ? "busy" : recorder.status;
  const busy = phase !== "ready";

  // Silence is a signal: if it is your turn and nothing has started for a while, a way to answer appears, once per question.
  const waitingOnYou =
    phase === "ready" &&
    recorder.status === "idle" &&
    !counterpartSpeaking &&
    !help &&
    !practice.limitReached &&
    draft.trim() === "" &&
    lastLine === practice.turns.length - 1;
  useEffect(() => {
    if (!waitingOnYou || autoHelped.current.has(lastLine)) return;
    const timer = setTimeout(() => {
      autoHelped.current.add(lastLine);
      void askHelp(true);
    }, autoHelpAfterMs);
    return () => clearTimeout(timer);
  }, [askHelp, autoHelpAfterMs, lastLine, waitingOnYou]);

  const recordingNow = recorder.status === "recording";
  const DOCK_ACTION =
    "inline-flex min-h-14 min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full px-2 text-xs font-semibold text-ink transition duration-200 hover:bg-surface-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <div className="stage stage-cobalt">
        <TopBar
          title={t.scenarios[scenario.id].title}
          onBack={() => {
            recorder.cancel();
            silence();
            onExit();
          }}
          backLabel={t.practice.leave}
          tone="stage"
          right={
            <span
              className={`tabular ${CHIP_STAGE}`}
              aria-label={t.practice.time(formatClock(elapsed))}
            >
              {formatClock(elapsed)}
            </span>
          }
        />

        <CallStage
          avatar={avatar}
          role={`${t.scenarios[scenario.id].role} · ${ownFieldOf(practice.context) ?? t.industries[practice.industryId]}`}
          state={portraitState}
          caption={practice.turns[lastLine]?.text ?? ""}
          captionProgress={speaker.progress?.id === turnKey(lastLine) ? speaker.progress.ratio : null}
          micLevel={micLevel}
          status={
            portraitState === "speaking"
              ? t.practice.talking(name)
              : portraitState === "listening"
                ? t.practice.listening(name)
                : phase === "sending"
                  ? stage === "hearing"
                    ? t.practice.gettingWords
                    : t.practice.thinking(name)
                  : t.practice.yourTurn(answered, MAX_USER_TURNS)
          }
        />
      </div>

      <p className="mt-6 flex items-center gap-3 rounded-tile bg-surface px-3 py-2.5 text-sm font-semibold leading-snug">
        <SparkSticker size={28} />
        <span className="min-w-0 flex-1">{t.power.inCall(powerPhrase.phrase)}</span>
        <span className="tabular shrink-0 rounded-full bg-accent px-2.5 py-0.5 font-bold text-on-accent">+{POWER_PHRASE_BONUS}</span>
      </p>

      <h2 className="kicker mb-4 mt-6 text-muted">{t.practice.transcript}</h2>
      <ol className="flex-1 space-y-4 pb-6" aria-label={t.practice.conversation}>
        {practice.turns.map((t, i) => (
          <ChatBubble
            key={turnKey(i)}
            turn={t}
            speakerName={name}
            speaking={speaker.speakingId === turnKey(i)}
            onListen={t.role === "counterpart" ? () => void voice(i, t.text) : undefined}
            onListenSlow={t.role === "counterpart" ? () => void voice(i, t.text, SLOW_RATE) : undefined}
            checking={checkingTurn === i}
            onListenAlternative={t.role === "user" ? (alt) => void listenAlternative(i, alt, t.check?.alternatives[alt]?.text ?? "") : undefined}
            playingAlternative={
              speaker.speakingId?.startsWith(`alt-${i}-`) ? Number(speaker.speakingId.slice(`alt-${i}-`.length)) : null
            }
            usedPowerPhrase={t.role === "user" && usesPhrase(t.text, powerPhrase)}
          />
        ))}
        {phase === "sending" ? (
          <li className="flex justify-start" aria-hidden="true">
            <span className="flex h-12 items-center rounded-[1.5rem] rounded-bl-md bg-cobalt-deep px-5">
              <VoiceBars count={3} height="h-4" className="bg-white" />
            </span>
          </li>
        ) : null}
        {help ? (
          <li>
            {helpUnasked ? <p className="mb-2 font-semibold text-accent-ink">{t.practice.autoHelp}</p> : null}
            <HelpCard
              help={help}
              translationLocale={translationLocale(getLevel(practice.level), practice.locale)}
              onListen={() => speaker.play("help", help.suggestion)}
              onClose={() => setHelp(null)}
            />
          </li>
        ) : null}
        {/* Keeps the newest line above the answer panel, whatever its height. */}
        <li ref={endRef} aria-hidden="true" style={{ scrollMarginBottom: panelHeight + 16 }} />
      </ol>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {/* The answer dock floats over the conversation, which fades out under it. */}
      <div
        ref={panelRef}
        className="sticky bottom-0 z-10 -mx-4 space-y-3 bg-[linear-gradient(to_top,var(--bg)_86%,transparent)] px-4 pb-4 pt-12 sm:-mx-6 sm:px-6"
      >
        {showNotice ? (
          <div role="status" className="flex items-start gap-2 rounded-tile border border-warn bg-[#33290f] p-3.5 text-sm text-ink">
            <p className="flex-1">{t.practice.linkUnreadable}</p>
            <button type="button" onClick={() => setShowNotice(false)} aria-label={t.help.close} className="-m-2 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition duration-200 hover:bg-surface-2">
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        ) : null}
        {kept ? <p role="status" className="text-sm font-semibold text-sun">{t.practice.answerKept}</p> : null}
        {error || recorder.error ? (
          <div className="rounded-tile bg-surface-solid">
            <ErrorBanner message={error?.message ?? recorder.error ?? ""} topUpUrl={error?.topUpUrl} />
          </div>
        ) : null}
        {practice.limitReached ? <p className="display text-center text-lg leading-tight">{t.practice.limitReached}</p> : null}

        {typing && !practice.limitReached ? (
          <form
            className="panel-float space-y-3 rounded-card p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) void submit({ text: draft });
            }}
          >
            <label htmlFor="typed-answer" className="block font-semibold">
              {t.practice.answerLabel}
            </label>
            <textarea id="typed-answer" lang="en" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={1200} className={FIELD} />
            <div className="flex gap-2">
              <Button type="submit" disabled={busy || !draft.trim()} className="flex-1">
                <Send aria-hidden="true" className="size-4" /> {t.practice.send}
              </Button>
              <Button variant="secondary" onClick={() => setTyping(false)}>
                <Mic aria-hidden="true" className="size-4" /> {t.practice.useVoice}
              </Button>
            </div>
          </form>
        ) : null}

        {!typing && !practice.limitReached ? (
          <div>
            <p aria-hidden="true" className={`mb-3 text-center text-sm font-semibold ${recordingNow ? "text-accent-ink" : "text-muted"}`}>
              {micLabel(micState, t)}
            </p>
            {/* One floating bar: type on the left, help on the right, and the mic rising out of the middle. */}
            <div className="panel-float grid grid-cols-[1fr_auto_1fr] items-center gap-1 rounded-full p-1.5">
              <button type="button" onClick={() => setTyping(true)} disabled={busy || recordingNow} className={DOCK_ACTION}>
                <Keyboard aria-hidden="true" className="size-5 text-primary" />
                <span className="max-w-full truncate">{t.practice.type}</span>
              </button>
              <div className="-my-5 px-1">
                <RecordButton state={micState} onPress={() => void pressMic()} showLabel={false} level={micLevel} />
              </div>
              <button type="button" onClick={() => void askHelp()} disabled={busy || recordingNow} className={DOCK_ACTION}>
                <LifeBuoy aria-hidden="true" className="size-5 text-primary" />
                <span className="max-w-full truncate">{phase === "helping" ? t.practice.thinkingShort : t.practice.helpMe}</span>
              </button>
            </div>
          </div>
        ) : null}

        {practice.canFinish ? (
          <Button variant={practice.limitReached ? "primary" : "secondary"} className="w-full" disabled={busy || recordingNow} onClick={() => void finish()}>
            <Flag aria-hidden="true" className="size-4" />
            {phase === "finishing" ? t.practice.preparingFeedback : t.practice.finish}
          </Button>
        ) : (
          <p className="text-center text-sm text-muted">{t.practice.answerTwice}</p>
        )}
      </div>
    </div>
  );
}
