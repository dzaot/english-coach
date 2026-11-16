"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Flag, Keyboard, LifeBuoy, Mic, Send } from "lucide-react";
import { MAX_USER_TURNS, countUserTurns } from "@/domain/conversation";
import { getAvatar } from "@/domain/avatars";
import { getLevel } from "@/domain/levels";
import { getScenario } from "@/domain/scenarios";
import { ApiError, api } from "@/lib/api";
import { formatClock } from "@/lib/format";
import { useElapsedSeconds } from "@/lib/hooks/use-elapsed";
import { useRecorder } from "@/lib/hooks/use-recorder";
import { SLOW_RATE, useSpeaker } from "@/lib/hooks/use-speaker";
import type { FinishResult, Help, PracticeView as Practice, SpeechAudio } from "@/lib/types";
import { AvatarPortrait, type PortraitState } from "./avatar-portrait";
import { ChatBubble } from "./chat-bubble";
import { HelpCard } from "./help-card";
import { RecordButton, micLabel, type MicState } from "./record-button";
import { industryLabel } from "./scenario-meta";
import { Button, ErrorBanner, TopBar } from "./ui";

interface Props {
  initial: Practice;
  initialAudio: SpeechAudio | null;
  onFinished: (result: FinishResult) => void;
  onExit: () => void;
}

type Phase = "ready" | "sending" | "finishing" | "helping";
const turnKey = (i: number) => `turn-${i}`;

export function PracticeView({ initial, initialAudio, onFinished, onExit }: Props) {
  const [practice, setPractice] = useState(initial);
  const [phase, setPhase] = useState<Phase>("ready");
  const [error, setError] = useState<{ message: string; topUpUrl: string | null } | null>(null);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [help, setHelp] = useState<Help | null>(null);
  const speaker = useSpeaker();
  const { play, stop: stopSpeaking } = speaker;
  const audioCache = useRef(new Map<number, SpeechAudio | null>(initialAudio ? [[0, initialAudio]] : []));
  const voiceToken = useRef(0);
  const elapsed = useElapsedSeconds(initial.startedAt);
  const endRef = useRef<HTMLLIElement | null>(null);
  const scenario = getScenario(practice.scenarioId);
  const { roleEn } = scenario.counterpart;
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

  const submit = useCallback(
    async (answer: { audio: Blob } | { text: string }) => {
      setPhase("sending");
      setError(null);
      setHelp(null);
      setAnnouncement("Sending your answer…");
      try {
        const result = await api.turn(practice.id, answer);
        setPractice(result.practice);
        setDraft("");
        setAnnouncement(`${name} says: ${result.replyText}`);
        void voice(result.practice.turns.length - 1, result.replyText);
      } catch (e) {
        setError({ message: e instanceof Error ? e.message : String(e), topUpUrl: e instanceof ApiError ? e.topUpUrl : null });
        setAnnouncement("");
      } finally {
        setPhase("ready");
      }
    },
    [name, practice.id, voice],
  );

  const recorder = useRecorder({ onAutoStop: (audio) => void submit({ audio }) });

  useEffect(() => {
    void voice(0, initial.turns[0]?.text ?? "");
    // Speak the opener once, when the practice opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [practice.turns.length, phase]);

  const pressMic = useCallback(async () => {
    if (recorder.status === "recording") {
      const audio = await recorder.stop();
      if (audio) await submit({ audio });
      return;
    }
    silence();
    if (await recorder.start()) setAnnouncement("Recording. Tap again to send.");
  }, [recorder, silence, submit]);

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

  const askHelp = async () => {
    setPhase("helping");
    setError(null);
    try {
      const next = await api.help(practice.id);
      setHelp(next);
      setAnnouncement(`You could say: ${next.suggestion}`);
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : String(e), topUpUrl: e instanceof ApiError ? e.topUpUrl : null });
    } finally {
      setPhase("ready");
    }
  };

  const finish = async () => {
    setPhase("finishing");
    setError(null);
    silence();
    try {
      onFinished(await api.finish(practice.id));
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : String(e), topUpUrl: e instanceof ApiError ? e.topUpUrl : null });
      setPhase("ready");
    }
  };

  const answered = countUserTurns(practice.turns);
  const counterpartSpeaking = speaker.speakingId !== null && speaker.speakingId.startsWith("turn-");
  const portraitState: PortraitState = recorder.status === "recording" ? "listening" : counterpartSpeaking ? "speaking" : "idle";
  const micState: MicState = phase !== "ready" ? "busy" : recorder.status;
  const busy = phase !== "ready";

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col">
      <TopBar
        title={scenario.title}
        onBack={() => {
          recorder.cancel();
          silence();
          onExit();
        }}
        backLabel="Leave the practice"
        right={
          <span className="tabular rounded-full bg-surface-2 px-3 py-1 text-sm font-semibold" aria-label={`Time: ${formatClock(elapsed)}`}>
            {formatClock(elapsed)}
          </span>
        }
      />

      <div className="mb-4 flex flex-col items-center gap-2 rounded-3xl border border-border bg-surface px-4 pb-4 pt-5 text-center shadow-card">
        <AvatarPortrait avatar={avatar} size={144} state={portraitState} />
        <p className="mt-1 text-xl font-bold">{name}</p>
        <p className="text-sm text-muted">
          {roleEn} · {industryLabel(practice.industryId)}
        </p>
        <p className="text-sm font-semibold" aria-live="polite">
          {portraitState === "speaking" ? `${name} is talking…` : portraitState === "listening" ? `${name} is listening…` : `Your turn · ${answered}/${MAX_USER_TURNS} answers`}
        </p>
      </div>

      <ol className="flex-1 space-y-3 pb-4" aria-label="Conversation">
        {practice.turns.map((t, i) => (
          <ChatBubble
            key={turnKey(i)}
            turn={t}
            speakerName={name}
            speaking={speaker.speakingId === turnKey(i)}
            onListen={t.role === "counterpart" ? () => void voice(i, t.text) : undefined}
            onListenSlow={t.role === "counterpart" ? () => void voice(i, t.text, SLOW_RATE) : undefined}
          />
        ))}
        {phase === "sending" ? (
          <li className="flex justify-start" aria-hidden="true">
            <span className="flex h-12 items-center gap-1 rounded-3xl rounded-bl-lg border border-border bg-surface px-5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="animate-bar h-4 w-1.5 rounded-full bg-muted" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </span>
          </li>
        ) : null}
        <li ref={endRef} aria-hidden="true" className="scroll-mb-72" />
      </ol>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="sticky bottom-0 -mx-4 space-y-3 border-t border-border bg-bg/95 px-4 pb-4 pt-3 backdrop-blur">
        {help ? <HelpCard help={help} inSpanish={getLevel(practice.level).helpTranslation === "Spanish"} onListen={() => speaker.play("help", help.suggestion)} onClose={() => setHelp(null)} /> : null}
        {error || recorder.error ? <ErrorBanner message={error?.message ?? recorder.error ?? ""} topUpUrl={error?.topUpUrl} /> : null}
        {practice.limitReached ? <p className="text-center font-semibold">You reached the end of this practice. See your feedback.</p> : null}

        {typing && !practice.limitReached ? (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) void submit({ text: draft });
            }}
          >
            <label htmlFor="typed-answer" className="block font-semibold">
              Your answer in English
            </label>
            <textarea
              id="typed-answer"
              lang="en"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              maxLength={1200}
              className="w-full rounded-2xl border border-border bg-surface p-3 text-base text-ink"
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={busy || !draft.trim()} className="flex-1">
                <Send aria-hidden="true" className="size-4" /> Send
              </Button>
              <Button variant="secondary" onClick={() => setTyping(false)}>
                <Mic aria-hidden="true" className="size-4" /> Use voice
              </Button>
            </div>
          </form>
        ) : null}

        {!typing && !practice.limitReached ? (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <Button variant="ghost" onClick={() => setTyping(true)} disabled={busy || recorder.status === "recording"} className="justify-self-start whitespace-nowrap px-2 text-sm">
              <Keyboard aria-hidden="true" className="size-4" /> Type
            </Button>
            <RecordButton state={micState} onPress={() => void pressMic()} showLabel={false} />
            <Button variant="ghost" onClick={() => void askHelp()} disabled={busy || recorder.status === "recording"} className="justify-self-end whitespace-nowrap px-2 text-sm">
              <LifeBuoy aria-hidden="true" className="size-4" /> {phase === "helping" ? "Thinking…" : "Help me"}
            </Button>
            <p aria-hidden="true" className="col-span-3 -mt-1 text-center text-sm font-semibold text-muted">
              {micLabel(micState)}
            </p>
          </div>
        ) : null}

        {practice.canFinish ? (
          <Button variant={practice.limitReached ? "primary" : "secondary"} className="w-full" disabled={busy || recorder.status === "recording"} onClick={() => void finish()}>
            <Flag aria-hidden="true" className="size-4" />
            {phase === "finishing" ? "Preparing your feedback…" : "Finish and see my feedback"}
          </Button>
        ) : (
          <p className="text-center text-sm text-muted">Answer twice to unlock your feedback.</p>
        )}
      </div>
    </div>
  );
}
