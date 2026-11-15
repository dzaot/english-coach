"use client";

import { useCallback, useEffect, useState } from "react";
import type { IndustryId, ScenarioId } from "@/domain/scenarios";
import { ApiError, api } from "@/lib/api";
import { useGate } from "@/lib/hooks/use-gate";
import { useTelemetry } from "@/lib/hooks/use-telemetry";
import type { Feedback, PracticeView as Practice, Progress, SpeechAudio, Streak } from "@/lib/types";
import { BrandMark } from "./brand-mark";
import { FeedbackView } from "./feedback-view";
import { GatePanel } from "./gate-panel";
import { HistoryView } from "./history-view";
import { HomeView } from "./home-view";
import { PhrasesView } from "./phrases-view";
import { PracticeView } from "./practice-view";
import { ErrorBanner, Spinner } from "./ui";

type View =
  | { name: "home" }
  | { name: "practice"; practice: Practice; audio: SpeechAudio | null }
  | { name: "feedback"; practice: Practice; feedback: Feedback; streak: Streak | null }
  | { name: "phrases" }
  | { name: "history" };

type ShownError = { message: string; topUpUrl: string | null };
const toShown = (e: unknown): ShownError => ({
  message: e instanceof Error ? e.message : String(e),
  topUpUrl: e instanceof ApiError ? e.topUpUrl : null,
});

export function CoachApp() {
  const gate = useGate();
  const ready = gate.state?.state === "ready";
  useTelemetry(ready);

  const [view, setView] = useState<View>({ name: "home" });
  const [progress, setProgress] = useState<Progress | null>(null);
  const [lastChoice, setLastChoice] = useState<{ scenarioId: ScenarioId; industryId: IndustryId } | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<ShownError | null>(null);

  const loadProgress = useCallback(async () => {
    try {
      setProgress(await api.progress());
    } catch (e) {
      setError(toShown(e));
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    api.progress().then(
      (p) => alive && setProgress(p),
      (e: unknown) => alive && setError(toShown(e)),
    );
    return () => {
      alive = false;
    };
  }, [ready]);

  useEffect(() => {
    window.scrollTo?.({ top: 0 });
  }, [view.name]);

  const goHome = useCallback(() => {
    setError(null);
    setView({ name: "home" });
    void loadProgress();
  }, [loadProgress]);

  const start = useCallback(async (scenarioId: ScenarioId, industryId: IndustryId) => {
    setStarting(true);
    setError(null);
    setLastChoice({ scenarioId, industryId });
    try {
      const { practice, audio } = await api.start(scenarioId, industryId);
      setView({ name: "practice", practice, audio });
    } catch (e) {
      setError(toShown(e));
      setView({ name: "home" });
    } finally {
      setStarting(false);
    }
  }, []);

  const openPractice = useCallback(async (id: string) => {
    setError(null);
    try {
      const { practice } = await api.getPractice(id);
      if (practice.feedback) setView({ name: "feedback", practice, feedback: practice.feedback, streak: null });
    } catch (e) {
      setError(toShown(e));
    }
  }, []);

  const togglePhrase = useCallback(async (id: string, reviewed: boolean) => {
    try {
      const { phrase } = await api.markPhrase(id, reviewed);
      setProgress((p) =>
        p ? { ...p, phrases: p.phrases.map((x) => (x.id === id ? phrase : x)), toReview: p.toReview + (reviewed ? -1 : 1) } : p,
      );
    } catch (e) {
      setError(toShown(e));
    }
  }, []);

  if (!gate.state) {
    return gate.error ? (
      <div className="flex flex-1 flex-col justify-center gap-6">
        <BrandMark />
        <ErrorBanner message={gate.error} onRetry={() => void gate.refresh()} />
      </div>
    ) : (
      <Spinner label="Cargando…" />
    );
  }

  if (gate.state.state === "screen") {
    return (
      <GatePanel
        gate={gate.state}
        error={gate.error}
        waiting={gate.waiting}
        timedOut={gate.timedOut}
        busy={gate.busy}
        onRetry={() => void gate.refresh()}
        onWait={gate.startWaiting}
        onConnect={() => void gate.act({ action: "connect" })}
        onOwnKey={(key) => gate.act({ action: "own_key", key })}
      />
    );
  }

  const mode = gate.state;
  const banner = error ? <ErrorBanner message={error.message} topUpUrl={error.topUpUrl} /> : null;

  switch (view.name) {
    case "practice":
      return (
        <PracticeView
          key={view.practice.id}
          initial={view.practice}
          initialAudio={view.audio}
          onExit={goHome}
          onFinished={(r) => setView({ name: "feedback", practice: r.practice, feedback: r.feedback, streak: r.streak })}
        />
      );
    case "feedback":
      return (
        <FeedbackView
          practice={view.practice}
          feedback={view.feedback}
          streak={view.streak}
          onHome={goHome}
          onPracticeAgain={() => void start(lastChoice?.scenarioId ?? view.practice.scenarioId, lastChoice?.industryId ?? view.practice.industryId)}
        />
      );
    case "phrases":
      return (
        <>
          {banner}
          <PhrasesView phrases={progress?.phrases ?? []} onToggle={(id, r) => void togglePhrase(id, r)} onBack={goHome} />
        </>
      );
    case "history":
      return (
        <>
          {banner}
          <HistoryView history={progress?.history ?? []} onOpen={(id) => void openPractice(id)} onBack={goHome} />
        </>
      );
    default:
      return (
        <>
          <div className="mb-2 flex items-center justify-between">
            <BrandMark compact />
            {mode.mode === "demo" ? (
              <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">Modo demo: IA simulada</span>
            ) : null}
          </div>
          {banner ? <div className="mb-4">{banner}</div> : null}
          <HomeView
            progress={progress}
            starting={starting}
            onStart={(s, i) => void start(s, i)}
            onOpenPhrases={() => setView({ name: "phrases" })}
            onOpenHistory={() => setView({ name: "history" })}
          />
          <AppFooter mode={mode.mode} usedPercent={mode.usedPercent} onChangePayment={() => void gate.act({ action: "reset" })} />
        </>
      );
  }
}

function AppFooter({ mode, usedPercent, onChangePayment }: { mode: "demo" | "publik" | "own_key"; usedPercent: number | null; onChangePayment: () => void }) {
  return (
    <footer className="mt-8 space-y-2 border-t border-border pt-4 text-sm text-muted">
      {usedPercent !== null ? <p className="tabular">Usaste {usedPercent}% de tu plan de publik este periodo.</p> : null}
      {mode !== "demo" ? (
        <button type="button" onClick={onChangePayment} className="min-h-11 cursor-pointer font-semibold text-ink underline underline-offset-4">
          Cambiar cómo pago la IA
        </button>
      ) : null}
      <p>
        Código abierto. La IA corre con publik. Tu voz se transcribe para la práctica y no se guarda el audio.
      </p>
    </footer>
  );
}
