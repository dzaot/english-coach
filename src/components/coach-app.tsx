"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { getLevel, translationLocale } from "@/domain/levels";
import { GOAL_SCENARIO, type OnboardingAnswers } from "@/domain/onboarding";
import { OTHER_INDUSTRY, type IndustryId, type ScenarioId } from "@/domain/scenarios";
import { ApiError, api } from "@/lib/api";
import { useGate } from "@/lib/hooks/use-gate";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { useTelemetry } from "@/lib/hooks/use-telemetry";
import { replacePhrase } from "@/lib/progress";
import type { Feedback, Phrase, PracticeView as Practice, Progress, SpeechAudio, Streak } from "@/lib/types";
import { BrandMark } from "./brand-mark";
import { FeedbackView } from "./feedback-view";
import { GatePanel } from "./gate-panel";
import { HistoryView } from "./history-view";
import { HomeView } from "./home-view";
import { OnboardingView } from "./onboarding/onboarding-view";
import { PhrasesView } from "./phrases-view";
import { PracticeView } from "./practice-view";
import { ErrorBanner, Spinner } from "./ui";
import { useI18n } from "@/i18n/provider";
import { LanguageMenu } from "./language-menu";
import { MAX_CONTEXT_INPUT } from "@/domain/limits";
import { unlockAudio } from "@/lib/audio-unlock";

type View =
  | { name: "home" }
  | { name: "practice"; practice: Practice; audio: SpeechAudio | null; notice: "link_unreadable" | null }
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

  const { t, locale } = useI18n();
  const prefs = usePreferences();
  const { level, avatarId, industryOther } = prefs;
  const [view, setView] = useState<View>({ name: "home" });
  const [progress, setProgress] = useState<Progress | null>(null);
  /** What the person typed for their last practice, to repeat it exactly (the stored context may hold a link summary). */
  const [lastChoice, setLastChoice] = useState<{ practiceId: string; context: string } | null>(null);
  const [starting, setStarting] = useState(false);
  const [firstCall, setFirstCall] = useState<{ scenarioId: ScenarioId; industryId: IndustryId } | null>(null);
  const startingRef = useRef(false);
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

  const start = useCallback(async (scenarioId: ScenarioId, industryId: IndustryId, context = "") => {
    if (startingRef.current) return; // a second tap while the first one loads
    startingRef.current = true;
    unlockAudio(); // inside the tap, so the partner's voice can play on iPhone
    setStarting(true);
    setError(null);
    try {
      const ownField = industryId === OTHER_INDUSTRY && industryOther.trim() ? { industryOther: industryOther.trim() } : {};
      const { practice, audio, notice } = await api.start({ scenarioId, industryId, level, avatarId, locale, ...ownField, ...(context ? { context } : {}) });
      setLastChoice({ practiceId: practice.id, context });
      setView({ name: "practice", practice, audio, notice: notice ?? null });
    } catch (e) {
      setError(toShown(e));
      setView({ name: "home" });
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  }, [avatarId, industryOther, level, locale]);

  const openPractice = useCallback(async (id: string) => {
    setError(null);
    try {
      const { practice } = await api.getPractice(id);
      if (practice.feedback) setView({ name: "feedback", practice, feedback: practice.feedback, streak: null });
    } catch (e) {
      setError(toShown(e));
    }
  }, []);

  /** The first-run answers set up the app and are saved to learn what people need. Saving never blocks the person. */
  const finishOnboarding = useCallback(
    (answers: OnboardingAnswers, startNow: boolean) => {
      const scenarioId = answers.goal ? GOAL_SCENARIO[answers.goal] : prefs.scenarioId;
      const industryId = answers.industryId ?? prefs.industryId;
      prefs.update({
        onboarded: true,
        scenarioId,
        industryId,
        industryOther: answers.industryOther,
        ...(answers.level ? { level: answers.level } : {}),
        ...(answers.avatarId ? { avatarId: answers.avatarId } : {}),
      });
      api.onboarding(answers).catch(() => undefined); // their setup is already applied; the survey copy is best effort
      if (startNow) setFirstCall({ scenarioId, industryId });
    },
    [prefs],
  );

  // Start the first call once the new setup (level, partner, field) is in place.
  useEffect(() => {
    if (!firstCall || !prefs.onboarded) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- consumes the one-shot request made by the first-run screen
    setFirstCall(null);
    void start(firstCall.scenarioId, firstCall.industryId);
  }, [firstCall, prefs.onboarded, start]);

  const onDrilled = useCallback((phrase: Phrase) => {
    setProgress((p) => (p ? replacePhrase(p, phrase) : p));
  }, []);

  const togglePhrase = useCallback(async (id: string, reviewed: boolean) => {
    try {
      const { phrase } = await api.markPhrase(id, reviewed);
      setProgress((p) => (p ? replacePhrase(p, phrase) : p));
    } catch (e) {
      setError(toShown(e));
    }
  }, []);

  if (!gate.state) {
    return gate.error ? (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6">
        <div className="flex items-center justify-between gap-2">
          <BrandMark />
          <LanguageMenu />
        </div>
        <ErrorBanner message={gate.error} onRetry={() => void gate.refresh()} />
      </div>
    ) : (
      <Spinner label={t.app.loading} />
    );
  }

  if (gate.state.state === "screen") {
    return (
      <Narrow>
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
      </Narrow>
    );
  }

  if (!prefs.onboarded) {
    return (
      <Narrow>
        <OnboardingView initial={{ level, avatarId }} onFinish={finishOnboarding} />
      </Narrow>
    );
  }

  const mode = gate.state;
  const banner = error ? <ErrorBanner message={error.message} topUpUrl={error.topUpUrl} /> : null;
  const lowBalance = mode.state === "ready" && mode.lowBalance ? (mode.topUpUrl ?? null) : null;

  switch (view.name) {
    case "practice":
      return (
        <Narrow>
        <PracticeView
          key={view.practice.id}
          initial={view.practice}
          initialAudio={view.audio}
          notice={view.notice}
          onExit={goHome}
          onFinished={(r) => {
            setView({ name: "feedback", practice: r.practice, feedback: r.feedback, streak: r.streak });
            void loadProgress();
          }}
        />
        </Narrow>
      );
    case "feedback":
      return (
        <Narrow>
        <FeedbackView
          practice={view.practice}
          feedback={view.feedback}
          streak={view.streak}
          phrases={progress?.phrases.filter((p) => p.practiceId === view.practice.id)}
          onDrilled={onDrilled}
          onHome={goHome}
          starting={starting}
          onPracticeAgain={() =>
            // Repeat the practice on screen: what was typed for it when known, else its saved details.
            void start(
              view.practice.scenarioId,
              view.practice.industryId,
              lastChoice?.practiceId === view.practice.id ? lastChoice.context : (view.practice.context?.slice(0, MAX_CONTEXT_INPUT) ?? ""),
            )
          }
        />
        </Narrow>
      );
    case "phrases":
      return (
        <Narrow>
          {banner ? <div className="mb-4">{banner}</div> : null}
          <PhrasesView
            phrases={progress?.phrases ?? []}
            onToggle={(id, r) => void togglePhrase(id, r)}
            onDrilled={onDrilled}
            tipsLocale={translationLocale(getLevel(prefs.level), locale)}
            onBack={goHome}
          />
        </Narrow>
      );
    case "history":
      return (
        <Narrow>
          {banner ? <div className="mb-4">{banner}</div> : null}
          <HistoryView history={progress?.history ?? []} onOpen={(id) => void openPractice(id)} onBack={goHome} />
        </Narrow>
      );
    default:
      return (
        <>
          <HomeView
            top={
              <>
                <div className="flex items-center justify-between gap-3">
                  <BrandMark compact tone="stage" />
                  <LanguageMenu tone="stage" />
                </div>
                {mode.mode === "demo" ? (
                  <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-stage-soft px-3 py-1 text-sm font-semibold">
                    <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-night" />
                    {t.app.demoMode}
                  </p>
                ) : null}
              </>
            }
            startError={banner}
            lowBalanceUrl={lowBalance}
            showPrice={mode.mode === "publik"}
            progress={progress}
            starting={starting}
            level={level}
            avatarId={avatarId}
            onChangePrefs={prefs.update}
            initialScenarioId={prefs.scenarioId}
            initialIndustryId={prefs.industryId}
            initialIndustryOther={prefs.industryOther}
            onStart={(s, i, c) => void start(s, i, c)}
            onOpenPhrases={() => setView({ name: "phrases" })}
            onOpenHistory={() => setView({ name: "history" })}
          />
          <AppFooter mode={mode.mode} usedPercent={mode.usedPercent} onChangePayment={() => void gate.act({ action: "reset" })} />
        </>
      );
  }
}

/** Every screen but the home is one phone-wide column, centered on larger screens. */
function Narrow({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">{children}</div>;
}

function AppFooter({ mode, usedPercent, onChangePayment }: { mode: "demo" | "publik" | "own_key"; usedPercent: number | null; onChangePayment: () => void }) {
  const { t } = useI18n();
  return (
    <footer className="mt-14 text-sm text-muted">
      <div className="divider-dashed space-y-3 pt-6">
        {usedPercent !== null ? (
          <div>
            <p className="tabular">{t.app.usedPlan(usedPercent)}</p>
            <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, usedPercent))}%` }} />
            </div>
          </div>
        ) : null}
        {mode !== "demo" ? (
          <button type="button" onClick={onChangePayment} className="min-h-11 cursor-pointer font-semibold text-ink underline underline-offset-4">
            {t.app.changePayment}
          </button>
        ) : null}
        <p className="max-w-[52ch]">{t.app.footer}</p>
      </div>
      {/* The wordmark as a watermark: the last thing on the page, barely there. */}
      <p aria-hidden="true" className="display mt-8 select-none text-[5.5rem] font-black text-surface-2 sm:text-[7rem]">
        dilo
      </p>
    </footer>
  );
}
