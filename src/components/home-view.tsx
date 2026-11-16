"use client";

import { useState } from "react";
import Image from "next/image";
import { BookmarkCheck, CalendarClock, ChevronDown, ChevronRight, History, Mic, SlidersHorizontal } from "lucide-react";
import { getAvatar, type AvatarId } from "@/domain/avatars";
import { getLevel, type LevelId } from "@/domain/levels";
import { SCENARIOS, type IndustryId, type ScenarioId } from "@/domain/scenarios";
import type { Progress } from "@/lib/types";
import { FOCUS_WITHIN, IndustryPicker, LevelPicker, PartnerPicker } from "./home-pickers";
import { ResultsCard } from "./results-card";
import { SCENARIO_ICONS, industryLabel } from "./scenario-meta";
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

const PARTNER_PHOTO = 64;

export function HomeView({ progress, starting, level, avatarId, onChangePrefs, onStart, onOpenPhrases, onOpenHistory }: HomeViewProps) {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("job_interview");
  const [industryId, setIndustryId] = useState<IndustryId>("general");
  const firstTime = !progress || progress.history.length === 0;
  const [customizing, setCustomizing] = useState(firstTime);
  const avatar = getAvatar(avatarId);

  return (
    <div className="animate-rise space-y-5">
      <header className="space-y-2 pt-1">
        <h1 className="font-display text-[2rem] font-extrabold leading-[1.1] tracking-tight">
          Say it out loud <span className="text-primary-ink">before it matters.</span>
        </h1>
        <p className="text-muted">Practice your work English on a call with a US coworker. Get feedback on every phrase.</p>
      </header>

      <section aria-labelledby="next-call" className="relative overflow-hidden rounded-[2rem] bg-night p-5 text-on-night shadow-card">
        <span aria-hidden="true" className="bg-brand absolute -right-16 -top-16 size-48 rounded-full opacity-40 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="relative shrink-0">
            <span aria-hidden="true" className="bg-brand absolute -inset-1.5 rounded-full opacity-80" />
            <Image src={avatar.image} alt={avatar.alt} width={PARTNER_PHOTO} height={PARTNER_PHOTO} priority className="relative rounded-full object-cover ring-2 ring-night" />
          </div>
          <div className="min-w-0">
            <h2 id="next-call" className="font-display text-xl font-bold leading-tight">
              Your call with {avatar.name}
            </h2>
            <p className="text-sm text-on-night/80">
              {getLevel(level).label} · {industryLabel(industryId)}
            </p>
          </div>
        </div>

        <fieldset className="relative mt-4">
          <legend className="mb-2 text-sm font-semibold text-on-night/80">What do you want to practice?</legend>
          <div className="grid gap-2">
            {SCENARIOS.map((s) => {
              const Icon = SCENARIO_ICONS[s.id];
              const checked = s.id === scenarioId;
              return (
                <label
                  key={s.id}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 transition duration-200 ${FOCUS_WITHIN} ${
                    checked ? "bg-on-night text-night" : "bg-on-night/10 hover:bg-on-night/15"
                  }`}
                >
                  <input type="radio" name="scenario" value={s.id} checked={checked} onChange={() => setScenarioId(s.id)} className="sr-only" />
                  <Icon aria-hidden="true" className="size-5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block font-semibold">{s.title}</span>
                    {checked ? <span className="block text-sm opacity-80">{s.description}</span> : null}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <Button size="lg" className="relative mt-4 w-full" disabled={starting} onClick={() => onStart(scenarioId, industryId)}>
          <Mic aria-hidden="true" className="size-5" />
          {starting ? "Getting ready…" : "Start talking"}
        </Button>
        <p className="relative mt-2 text-center text-sm text-on-night/80">About 5 minutes · push to talk or type</p>
      </section>

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

      <section aria-label="Partner, industry and level" className="rounded-3xl border border-border bg-surface">
        <button
          type="button"
          aria-expanded={customizing}
          aria-controls="customize-panel"
          onClick={() => setCustomizing((v) => !v)}
          className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-3xl px-4 text-left font-semibold transition duration-200 hover:bg-surface-2"
        >
          <SlidersHorizontal aria-hidden="true" className="size-5 text-primary-ink" />
          <span className="flex-1">Change partner, industry or level</span>
          <ChevronDown aria-hidden="true" className={`size-5 transition duration-200 ${customizing ? "rotate-180" : ""}`} />
        </button>
        {customizing ? (
          <div id="customize-panel" className="space-y-5 px-4 pb-5 pt-1">
            <PartnerPicker avatarId={avatarId} onChange={(id) => onChangePrefs({ avatarId: id })} />
            <IndustryPicker industryId={industryId} onChange={setIndustryId} />
            <LevelPicker level={level} onChange={(id) => onChangePrefs({ level: id })} />
          </div>
        ) : null}
      </section>

      {progress && progress.stats.practices > 0 ? <ResultsCard stats={progress.stats} /> : null}
      {progress ? <StreakCard progress={progress} /> : null}

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
