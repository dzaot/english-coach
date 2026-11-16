"use client";

import { useState } from "react";
import { BookmarkCheck, CalendarClock, Check, ChevronRight, History, Mic } from "lucide-react";
import { AVATARS, type AvatarId } from "@/domain/avatars";
import { LEVELS, type LevelId } from "@/domain/levels";
import { INDUSTRIES, SCENARIOS, type IndustryId, type ScenarioId } from "@/domain/scenarios";
import type { Progress } from "@/lib/types";
import { AvatarPortrait } from "./avatar-portrait";
import { SCENARIO_ICONS } from "./scenario-meta";
import { StreakCard } from "./streak-card";
import { Button } from "./ui";

interface HomeViewProps {
  progress: Progress | null;
  starting: boolean;
  level: LevelId;
  avatarId: AvatarId;
  onChangePrefs: (patch: { level?: LevelId; avatarId?: AvatarId }) => void;
  onStart: (scenarioId: ScenarioId, industryId: IndustryId) => void;
  onOpenPhrases: () => void;
  onOpenHistory: () => void;
}

const FOCUS_WITHIN = "has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus";

export function HomeView({ progress, starting, level, avatarId, onChangePrefs, onStart, onOpenPhrases, onOpenHistory }: HomeViewProps) {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("job_interview");
  const [industryId, setIndustryId] = useState<IndustryId>("general");

  return (
    <div className="animate-rise space-y-6">
      <header className="space-y-2 pt-2">
        <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary-ink">
          <Mic aria-hidden="true" className="size-4" /> Free · out loud · 5 minutes
        </p>
        <h1 className="text-[2rem] font-extrabold leading-tight tracking-tight">
          Practice your work English <span className="text-primary-ink">out loud</span>
        </h1>
        <p className="text-muted">Pick a situation, talk with your partner in English and get instant feedback.</p>
      </header>

      {progress ? <StreakCard progress={progress} /> : null}

      {progress && progress.dueToday > 0 ? (
        <button
          type="button"
          onClick={onOpenPhrases}
          className="flex w-full cursor-pointer items-center gap-3 rounded-3xl border-2 border-primary bg-primary-soft p-4 text-left transition duration-200 hover:brightness-105"
        >
          <CalendarClock aria-hidden="true" className="size-7 shrink-0 text-primary-ink" />
          <span className="flex-1">
            <span className="block font-bold">Today&apos;s review</span>
            <span className="block text-sm">
              {progress.dueToday === 1 ? "1 phrase is waiting" : `${progress.dueToday} phrases are waiting`}. Say them out loud in 1 minute.
            </span>
          </span>
          <ChevronRight aria-hidden="true" className="size-5" />
        </button>
      ) : null}

      <fieldset>
        <legend className="mb-3 text-lg font-bold">1. Pick your partner</legend>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {AVATARS.map((a) => {
            const checked = a.id === avatarId;
            return (
              <label
                key={a.id}
                className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 p-3 text-center transition duration-200 ${FOCUS_WITHIN} ${
                  checked ? "border-primary bg-primary-soft" : "border-border bg-surface hover:bg-surface-2"
                }`}
              >
                <input type="radio" name="avatar" value={a.id} checked={checked} onChange={() => onChangePrefs({ avatarId: a.id })} className="sr-only" />
                {checked ? (
                  <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-on-primary">
                    <Check aria-hidden="true" className="size-4" strokeWidth={3} />
                  </span>
                ) : null}
                <AvatarPortrait avatar={a} size={72} />
                <span>
                  <span className="block font-semibold">{a.name}</span>
                  <span className="block text-xs text-muted">{a.vibe}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-3 text-lg font-bold">2. What do you want to practice?</legend>
        <div className="grid gap-2.5">
          {SCENARIOS.map((s) => {
            const Icon = SCENARIO_ICONS[s.id];
            const checked = s.id === scenarioId;
            return (
              <label
                key={s.id}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3.5 transition duration-200 ${FOCUS_WITHIN} ${
                  checked ? "border-primary bg-primary-soft" : "border-border bg-surface hover:bg-surface-2"
                }`}
              >
                <input type="radio" name="scenario" value={s.id} checked={checked} onChange={() => setScenarioId(s.id)} className="sr-only" />
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${checked ? "bg-primary text-on-primary" : "bg-surface-2 text-ink"}`}>
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{s.title}</span>
                  <span className="block text-sm text-muted">{s.description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-lg font-bold">3. Your industry</legend>
        <div className="flex flex-wrap gap-2">
          {INDUSTRIES.map((i) => {
            const checked = i.id === industryId;
            return (
              <label
                key={i.id}
                className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 px-4 text-sm font-semibold transition duration-200 ${FOCUS_WITHIN} ${
                  checked ? "border-ink bg-ink text-bg" : "border-border bg-surface hover:bg-surface-2"
                }`}
              >
                <input type="radio" name="industry" value={i.id} checked={checked} onChange={() => setIndustryId(i.id)} className="sr-only" />
                {i.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-lg font-bold">4. Your English level</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {LEVELS.map((l) => {
            const checked = l.id === level;
            return (
              <label
                key={l.id}
                className={`flex cursor-pointer flex-col rounded-2xl border-2 p-3 transition duration-200 ${FOCUS_WITHIN} ${
                  checked ? "border-primary bg-primary-soft" : "border-border bg-surface hover:bg-surface-2"
                }`}
              >
                <input type="radio" name="level" value={l.id} checked={checked} onChange={() => onChangePrefs({ level: l.id })} className="sr-only" />
                <span className="flex items-center gap-1.5 font-semibold">
                  {checked ? <Check aria-hidden="true" className="size-4 text-primary-ink" strokeWidth={3} /> : null}
                  {l.label}
                </span>
                <span className="text-sm text-muted">{l.description}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <Button size="lg" className="w-full" disabled={starting} onClick={() => onStart(scenarioId, industryId)}>
        <Mic aria-hidden="true" className="size-5" />
        {starting ? "Getting ready…" : "Start talking"}
      </Button>

      <nav aria-label="Your progress" className="grid gap-2.5">
        <NavRow icon={<BookmarkCheck aria-hidden="true" className="size-5" />} label="Phrases to review" count={progress?.toReview ?? 0} onClick={onOpenPhrases} />
        <NavRow icon={<History aria-hidden="true" className="size-5" />} label="Practice history" count={progress?.history.length ?? 0} onClick={onOpenHistory} />
      </nav>
    </div>
  );
}

function NavRow({ icon, label, count, onClick }: { icon: React.ReactNode; label: string; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface px-4 text-left font-semibold transition duration-200 hover:bg-surface-2"
    >
      <span className="text-primary-ink">{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="tabular rounded-full bg-surface-2 px-2.5 py-0.5 text-sm">{count}</span>
      <ChevronRight aria-hidden="true" className="size-5 text-muted" />
    </button>
  );
}
