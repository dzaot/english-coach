"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Flag, Keyboard, LifeBuoy, Mic, Send } from "lucide-react";
import { MAX_USER_TURNS, countUserTurns } from "@/domain/conversation";
import { getScenario } from "@/domain/scenarios";
import { ApiError, api } from "@/lib/api";
import { formatClock } from "@/lib/format";
import { useElapsedSeconds } from "@/lib/hooks/use-elapsed";
import { useRecorder } from "@/lib/hooks/use-recorder";
import { SLOW_RATE, useSpeaker } from "@/lib/hooks/use-speaker";
import type { FinishResult, Help, PracticeView as Practice, SpeechAudio } from "@/lib/types";
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
  const { name, roleEn } = scenario.counterpart;

  /** Plays a counterpart line. Its audio is fetched once, after the text is already on screen. */
  const voice = useCallback(
    async (index: number, text: string, rate = 1) => {
      const token = ++voiceToken.current;
      let audio = audioCache.current.get(index);
      if (audio === undefined) {
        audio = await api.speech(initial.id, index).then((r) => r.audio, () => null);
        audioCache.current.set(index, audio);
      }
      if (token === voiceToken.current) play(turnKey(index), text, audio, rate);
    },
    [initial.id, play],
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
      setAnnouncement("Enviando tu respuesta…");
      try {
        const result = await api.turn(practice.id, answer);
        setPractice(result.practice);
        setDraft("");
        setAnnouncement(`${name} responde: ${result.replyText}`);
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
    if (await recorder.start()) setAnnouncement("Grabando. Toca otra vez para enviar.");
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
      setAnnouncement(`Puedes decir: ${next.suggestion}`);
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
        backLabel="Salir de la práctica"
        right={
          <span className="tabular rounded-full bg-surface-2 px-3 py-1 text-sm font-semibold" aria-label={`Tiempo: ${formatClock(elapsed)}`}>
            {formatClock(elapsed)}
          </span>
        }
      />

      <div className="mb-4 flex items-center gap-3 rounded-3xl border border-border bg-surface p-3.5 shadow-card">
        <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-xl font-bold text-on-accent">
          {name[0]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{name}</p>
          <p className="text-sm text-muted">
            <span lang="en">{roleEn}</span> · {industryLabel(practice.industryId)}
          </p>
        </div>
        <p className="tabular text-right text-sm text-muted">
          <span className="block font-semibold text-ink">{`${answered}/${MAX_USER_TURNS}`}</span>respuestas
        </p>
      </div>

      <ol className="flex-1 space-y-3 pb-4" aria-label="Conversación">
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
        {help ? <HelpCard help={help} onListen={() => speaker.play("help", help.suggestion)} onClose={() => setHelp(null)} /> : null}
        {error || recorder.error ? <ErrorBanner message={error?.message ?? recorder.error ?? ""} topUpUrl={error?.topUpUrl} /> : null}
        {practice.limitReached ? <p className="text-center font-semibold">Llegaste al final de esta práctica. Mira tu feedback.</p> : null}

        {typing && !practice.limitReached ? (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) void submit({ text: draft });
            }}
          >
            <label htmlFor="typed-answer" className="block font-semibold">
              Tu respuesta en inglés
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
                <Send aria-hidden="true" className="size-4" /> Enviar
              </Button>
              <Button variant="secondary" onClick={() => setTyping(false)}>
                <Mic aria-hidden="true" className="size-4" /> Usar voz
              </Button>
            </div>
          </form>
        ) : null}

        {!typing && !practice.limitReached ? (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <Button variant="ghost" onClick={() => setTyping(true)} disabled={busy || recorder.status === "recording"} className="justify-self-start whitespace-nowrap px-2 text-sm">
              <Keyboard aria-hidden="true" className="size-4" /> Escribir
            </Button>
            <RecordButton state={micState} onPress={() => void pressMic()} showLabel={false} />
            <Button variant="ghost" onClick={() => void askHelp()} disabled={busy || recorder.status === "recording"} className="justify-self-end whitespace-nowrap px-2 text-sm">
              <LifeBuoy aria-hidden="true" className="size-4" /> {phase === "helping" ? "Pensando…" : "¿Qué digo?"}
            </Button>
            <p aria-hidden="true" className="col-span-3 -mt-1 text-center text-sm font-semibold text-muted">
              {micLabel(micState)}
            </p>
          </div>
        ) : null}

        {practice.canFinish ? (
          <Button variant={practice.limitReached ? "primary" : "secondary"} className="w-full" disabled={busy || recorder.status === "recording"} onClick={() => void finish()}>
            <Flag aria-hidden="true" className="size-4" />
            {phase === "finishing" ? "Preparando tu feedback…" : "Terminar y ver mi feedback"}
          </Button>
        ) : (
          <p className="text-center text-sm text-muted">Responde 2 veces para desbloquear tu feedback.</p>
        )}
      </div>
    </div>
  );
}
