"use client";

import { useState, type ReactNode } from "react";
import { MAX_CONTEXT_INPUT, MIN_CUSTOM_CONTEXT } from "@/domain/limits";
import Image from "next/image";
import { BookmarkCheck, CalendarClock, ChevronDown, ChevronRight, History, Mic, SlidersHorizontal } from "lucide-react";
import { getAvatar, type AvatarId } from "@/domain/avatars";
import type { LevelId } from "@/domain/levels";
import { CUSTOM_SCENARIO, SCENARIOS, type IndustryId, type ScenarioId } from "@/domain/scenarios";
import type { Progress } from "@/lib/types";
import { FOCUS_WITHIN, IndustryPicker, LevelPicker, PartnerPicker } from "./home-pickers";
import { ResultsCard } from "./results-card";
import { SCENARIO_ICONS } from "./scenario-meta";
import { StreakCard } from "./streak-card";
import { Button } from "./ui";
import type { Messages } from "@/i18n/messages";
import { useI18n } from "@/i18n/provider";

interface HomeViewProps {
  progress: Progress | null;
  starting: boolean;
  level: LevelId;
  avatarId: AvatarId;
  onChangePrefs: (patch: { level?: LevelId; avatarId?: AvatarId }) => void;
  onStart: (scenarioId: ScenarioId, industryId: IndustryId, context: string) => void;
  /** An error from starting, shown right above the Start button (where the person is looking). */
  startError?: ReactNode;
  /** publik's top-up link when the balance may not cover a practice. */
  lowBalanceUrl?: string | null;
  /** The price line, for people paying through publik. */
  showPrice?: boolean;
  onOpenPhrases: () => void;
  onOpenHistory: () => void;
}

const PARTNER_PHOTO = 64;
const MAX_DETAILS = MAX_CONTEXT_INPUT;
const MIN_CUSTOM_DETAILS = MIN_CUSTOM_CONTEXT;

/** What to ask for, by scenario: a job post for interviews, the situation itself for "Your situation". */
function detailsCopy(id: ScenarioId, t: Messages): { label: string; hint: string; placeholder: string } {
  if (id === "job_interview") return t.home.details.job;
  if (id === CUSTOM_SCENARIO) return t.home.details.custom;
  return t.home.details.other;
}

export function HomeView({
  progress,
  starting,
  level,
  avatarId,
  onChangePrefs,
  onStart,
  onOpenPhrases,
  onOpenHistory,
  startError,
  lowBalanceUrl,
  showPrice = false,
}: HomeViewProps) {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("job_interview");
  const [industryId, setIndustryId] = useState<IndustryId>("general");
  const [details, setDetails] = useState("");
  // Open the first time only; progress arrives after the first paint, so decide when it does.
  const [customizingChoice, setCustomizing] = useState<boolean | null>(null);
  const customizing = customizingChoice ?? (progress !== null && progress.history.length === 0);
  const { t } = useI18n();
  const avatar = getAvatar(avatarId);
  const copy = detailsCopy(scenarioId, t);
  const needsDetails = scenarioId === CUSTOM_SCENARIO && details.trim().length < MIN_CUSTOM_DETAILS;
  const hasLink = /https?:\/\//i.test(details);

  return (
    <div className="animate-rise space-y-5">
      <header className="space-y-2 pt-1">
        <h1 className="font-display text-[2rem] font-extrabold leading-[1.1] tracking-tight">
          {t.home.titleStart} <span className="text-primary-ink">{t.home.titleEnd}</span>
        </h1>
        <p className="text-muted">{t.home.subtitle}</p>
      </header>

      <section aria-labelledby="next-call" className="relative overflow-hidden rounded-[2rem] bg-night p-5 text-on-night shadow-card">
        <span aria-hidden="true" className="bg-brand absolute -right-16 -top-16 size-48 rounded-full opacity-40 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="relative shrink-0">
            <span aria-hidden="true" className="bg-brand absolute -inset-1.5 rounded-full opacity-80" />
            <Image src={avatar.image} alt={t.avatars[avatar.id].alt} width={PARTNER_PHOTO} height={PARTNER_PHOTO} priority className="relative rounded-full object-cover ring-2 ring-night" />
          </div>
          <div className="min-w-0">
            <h2 id="next-call" className="font-display text-xl font-bold leading-tight">
              {t.home.yourCallWith(avatar.name)}
            </h2>
            <p className="text-sm text-on-night/80">
              {t.levels[level].label} · {t.industries[industryId]}
            </p>
          </div>
        </div>

        <fieldset className="relative mt-4">
          <legend className="mb-2 text-sm font-semibold text-on-night/80">{t.home.whatToPractice}</legend>
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
                    <span className="block font-semibold">{t.scenarios[s.id].title}</span>
                    {checked ? <span className="block text-sm opacity-80">{t.scenarios[s.id].description}</span> : null}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="relative mt-4 space-y-1.5">
          <label htmlFor="practice-details" className="block text-sm font-semibold">
            {copy.label}
          </label>
          <p id="practice-details-hint" className="text-sm text-on-night/80">
            {copy.hint}
          </p>
          <textarea
            id="practice-details"
            aria-describedby="practice-details-hint"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={MAX_DETAILS}
            rows={3}
            placeholder={copy.placeholder}
            className="w-full rounded-2xl border border-on-night/30 bg-on-night/10 p-3 text-base text-on-night placeholder:text-on-night/70"
          />
        </div>

        {lowBalanceUrl ? (
          <p role="status" className="relative mt-4 rounded-2xl bg-warn-soft p-3 text-sm text-ink">
            {t.home.lowBalance}{" "}
            <a href={lowBalanceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-ink underline underline-offset-4">
              {t.ui.topUp}
            </a>
          </p>
        ) : null}
        {startError ? <div className="relative mt-4">{startError}</div> : null}

        <Button size="lg" className="relative mt-4 w-full" disabled={starting || needsDetails} onClick={() => onStart(scenarioId, industryId, details.trim())}>
          <Mic aria-hidden="true" className="size-5" />
          {starting ? (hasLink ? t.home.readingJob : t.home.gettingReady) : t.home.startTalking}
        </Button>
        <p className="relative mt-2 text-center text-sm text-on-night/80">{t.home.duration}</p>
        {showPrice ? <p className="relative mt-1 text-center text-sm text-on-night/80">{t.home.price}</p> : null}
      </section>

      {progress && progress.dueToday > 0 ? (
        <button
          type="button"
          onClick={onOpenPhrases}
          className="flex w-full cursor-pointer items-center gap-3 rounded-3xl border-2 border-primary bg-primary-soft p-4 text-left transition duration-200 hover:brightness-105"
        >
          <CalendarClock aria-hidden="true" className="size-7 shrink-0 text-primary-ink" />
          <span className="flex-1">
            <span className="block font-bold">{t.home.todaysReview}</span>
            <span className="block text-sm">{t.home.phrasesWaiting(progress.dueToday)}</span>
          </span>
          <ChevronRight aria-hidden="true" className="size-5" />
        </button>
      ) : null}

      <section aria-label={t.home.customizeSection} className="rounded-3xl border border-border bg-surface">
        <button
          type="button"
          aria-expanded={customizing}
          aria-controls="customize-panel"
          onClick={() => setCustomizing(!customizing)}
          className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-3xl px-4 text-left font-semibold transition duration-200 hover:bg-surface-2"
        >
          <SlidersHorizontal aria-hidden="true" className="size-5 text-primary-ink" />
          <span className="flex-1">{t.home.customize}</span>
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

      <nav aria-label={t.home.progressNav} className="grid gap-2.5">
        <NavRow icon={<BookmarkCheck aria-hidden="true" className="size-5" />} label={t.home.phrasesToReview} count={progress?.toReview ?? 0} onClick={onOpenPhrases} />
        <NavRow icon={<History aria-hidden="true" className="size-5" />} label={t.home.practiceHistory} count={progress?.history.length ?? 0} onClick={onOpenHistory} />
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
