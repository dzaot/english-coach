"use client";

import { useState, type ReactNode } from "react";
import { MAX_CONTEXT_INPUT, MIN_CUSTOM_CONTEXT } from "@/domain/limits";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, ChevronDown, Mic, SlidersHorizontal } from "lucide-react";
import { getAvatar, type AvatarId } from "@/domain/avatars";
import type { LevelId } from "@/domain/levels";
import { CUSTOM_SCENARIO, OTHER_INDUSTRY, SCENARIOS, type IndustryId, type ScenarioId } from "@/domain/scenarios";
import type { Preferences } from "@/lib/hooks/use-preferences";
import { localToday } from "@/lib/progress";
import type { Progress } from "@/lib/types";
import { phraseOfTheDay } from "@/domain/power-phrases";
import { FOCUS_WITHIN, IndustryPicker, LevelPicker, PartnerPicker } from "./home-pickers";
import { PowerPhraseCard } from "./power-phrase-card";
import { ResultsCard } from "./results-card";
import { ShareCard } from "./share-card";
import { SCENARIO_ICONS } from "./scenario-meta";
import { StreakCard } from "./streak-card";
import { BookmarkSticker, CalendarSticker, ClockSticker, MicSticker, QuoteSticker, SparkSticker } from "./brand/stickers";
import { Button, FIELD } from "./ui";
import type { Messages } from "@/i18n/messages";
import { useI18n } from "@/i18n/provider";

interface HomeViewProps {
  progress: Progress | null;
  starting: boolean;
  level: LevelId;
  avatarId: AvatarId;
  onChangePrefs: (patch: Partial<Preferences>) => void;
  /** Where the pickers start: what the person chose before (or in the first-run questions). */
  initialScenarioId?: ScenarioId;
  initialIndustryId?: IndustryId;
  initialIndustryOther?: string;
  onStart: (scenarioId: ScenarioId, industryId: IndustryId, context: string) => void;
  /** An error from starting, shown right above the Start button (where the person is looking). */
  startError?: ReactNode;
  /** publik's top-up link when the balance may not cover a practice. */
  lowBalanceUrl?: string | null;
  /** The price line, for people paying through publik. */
  showPrice?: boolean;
  /** The app's top row (logo, language), shown inside the orange stage. */
  top?: ReactNode;
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
  top,
  initialScenarioId = "job_interview",
  initialIndustryId = "general",
  initialIndustryOther = "",
}: HomeViewProps) {
  const [scenarioId, setScenarioIdState] = useState<ScenarioId>(initialScenarioId);
  const [industryId, setIndustryIdState] = useState<IndustryId>(initialIndustryId);
  const [industryOther, setIndustryOtherState] = useState(initialIndustryOther);
  // Each choice is also remembered, so the next visit (and the next call) starts from it.
  const setScenarioId = (id: ScenarioId) => {
    setScenarioIdState(id);
    onChangePrefs({ scenarioId: id });
  };
  const setIndustryId = (id: IndustryId) => {
    setIndustryIdState(id);
    onChangePrefs({ industryId: id });
  };
  const setIndustryOther = (text: string) => {
    setIndustryOtherState(text);
    onChangePrefs({ industryOther: text });
  };
  const industryName = industryId === OTHER_INDUSTRY && industryOther.trim() ? industryOther.trim() : null;
  const powerPhrase = phraseOfTheDay(localToday());
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
    <div className="animate-rise space-y-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] lg:items-start lg:gap-x-10 lg:space-y-0">
      <div className="space-y-8">
        {/* The stage: one flat block of orange with the promise and who you are about to call. */}
        <div className="stage stage-orange relative overflow-hidden">
          {top}
          <h1 className="display relative mt-8 text-balance text-[2.5rem] font-black sm:text-6xl">
            {t.home.titleStart} <span className="text-stage-pop">{t.home.titleEnd}</span>
          </h1>
          <p className="relative mt-5 max-w-[32ch] font-medium">{t.home.subtitle}</p>

          <section aria-labelledby="next-call" className="relative mt-16 flex items-center gap-4 rounded-card bg-night p-4 text-ink">
            <div aria-hidden="true" className="pointer-events-none absolute bottom-full right-3 -mb-2.5 flex items-end">
              <SparkSticker size={34} className="-rotate-12" />
              <QuoteSticker size={40} className="-ml-1 mb-3 rotate-6" />
              <MicSticker size={64} className="-ml-2 rotate-12" />
            </div>
            <div className="relative shrink-0">
              <Image
                src={avatar.image}
                alt={t.avatars[avatar.id].alt}
                width={PARTNER_PHOTO}
                height={PARTNER_PHOTO}
                priority
                className="rounded-full object-cover ring-[3px] ring-primary"
              />
              <span aria-hidden="true" className="absolute bottom-0 right-0 size-4 rounded-full bg-accent ring-[3px] ring-night" />
            </div>
            <div className="min-w-0">
              <h2 id="next-call" className="display text-lg leading-tight">
                {t.home.yourCallWith(avatar.name)}
              </h2>
              <p className="mt-1.5 text-sm font-medium text-muted">
                {t.levels[level].label} · {industryName ?? t.industries[industryId]}
              </p>
            </div>
          </section>
        </div>

        <fieldset>
          <legend className="kicker mb-3 text-base">{t.home.whatToPractice}</legend>
          <div className="grid grid-cols-2 gap-2">
            {SCENARIOS.map((s) => {
              const Icon = SCENARIO_ICONS[s.id];
              const checked = s.id === scenarioId;
              return (
                <label
                  key={s.id}
                  className={`flex min-h-16 cursor-pointer items-center gap-2.5 rounded-tile px-3 py-2.5 text-sm font-semibold leading-tight transition duration-200 active:scale-[0.98] ${FOCUS_WITHIN} ${
                    checked ? "bg-ink text-night" : "bg-surface hover:bg-surface-2"
                  }`}
                >
                  <input type="radio" name="scenario" value={s.id} checked={checked} onChange={() => setScenarioId(s.id)} className="sr-only" />
                  <Icon size={34} className={checked ? "[--sticker-edge:var(--night)]" : ""} />
                  <span className="min-w-0 hyphens-auto [overflow-wrap:anywhere]">{t.scenarios[s.id].title}</span>
                </label>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-muted">{t.scenarios[scenarioId].description}</p>
        </fieldset>

        <div className="space-y-1.5">
          <label htmlFor="practice-details" className="kicker block text-base">
            {copy.label}
          </label>
          <p id="practice-details-hint" className="text-sm text-muted">
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
            className={`${FIELD} mt-1.5`}
          />
        </div>

        {lowBalanceUrl ? (
          <p role="status" className="rounded-tile border border-warn bg-[#33290f] p-3.5 text-sm text-ink">
            {t.home.lowBalance}{" "}
            <a href={lowBalanceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-sun underline underline-offset-4">
              {t.ui.topUp}
            </a>
          </p>
        ) : null}
        {startError ? <div>{startError}</div> : null}

        <div>
          <Button size="lg" className="w-full" disabled={starting || needsDetails} onClick={() => onStart(scenarioId, industryId, details.trim())}>
            <span aria-hidden="true" className="-ml-3 flex size-10 items-center justify-center rounded-full bg-night text-primary">
              <Mic className="size-5" />
            </span>
            {starting ? (hasLink ? t.home.readingJob : t.home.gettingReady) : t.home.startTalking}
          </Button>
          <p className="mt-3 text-center text-sm text-muted">{t.home.duration}</p>
          {showPrice ? <p className="mt-1 text-center text-sm text-muted">{t.home.price}</p> : null}
        </div>

        <PowerPhraseCard phrase={powerPhrase} />

        {progress && progress.dueToday > 0 ? (
          <button
            type="button"
            onClick={onOpenPhrases}
            className="stage-cobalt flex w-full cursor-pointer items-center gap-4 rounded-card bg-cobalt p-5 text-left text-on-cobalt transition duration-200 hover:bg-cobalt-deep active:scale-[0.99]"
          >
            <CalendarSticker size={52} className="-rotate-6" />
            <span className="min-w-0 flex-1">
              <span className="display block text-lg leading-tight">{t.home.todaysReview}</span>
              <span className="mt-1.5 block text-sm font-medium">{t.home.phrasesWaiting(progress.dueToday)}</span>
            </span>
            <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-night">
              <ArrowRight className="size-5" />
            </span>
          </button>
        ) : null}
      </div>

      <div className="space-y-8">
        <section aria-label={t.home.customizeSection} className="panel rounded-card">
          <button
            type="button"
            aria-expanded={customizing}
            aria-controls="customize-panel"
            onClick={() => setCustomizing(!customizing)}
            className="flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-card px-5 text-left font-semibold transition duration-200 hover:bg-surface-2"
          >
            <SlidersHorizontal aria-hidden="true" className="size-5 shrink-0 text-primary" />
            <span className="flex-1">{t.home.customize}</span>
            <ChevronDown aria-hidden="true" className={`size-5 shrink-0 text-muted transition duration-300 ${customizing ? "rotate-180" : ""}`} />
          </button>
          {customizing ? (
            <div id="customize-panel" className="animate-rise space-y-7 px-5 pb-6 pt-2">
              <PartnerPicker avatarId={avatarId} onChange={(id) => onChangePrefs({ avatarId: id })} />
              <IndustryPicker industryId={industryId} onChange={setIndustryId} other={industryOther} onOtherChange={setIndustryOther} />
              <LevelPicker level={level} onChange={(id) => onChangePrefs({ level: id })} />
            </div>
          ) : null}
        </section>

        {progress ? <StreakCard progress={progress} /> : null}
        {progress && progress.stats.practices > 0 ? <ResultsCard stats={progress.stats} /> : null}

        <nav aria-label={t.home.progressNav} className="grid grid-cols-2 gap-3">
          <NavTile icon={<BookmarkSticker size={44} className="-rotate-6" />} label={t.home.phrasesToReview} count={progress?.toReview ?? 0} onClick={onOpenPhrases} />
          <NavTile icon={<ClockSticker size={44} className="rotate-6" />} label={t.home.practiceHistory} count={progress?.history.length ?? 0} onClick={onOpenHistory} />
        </nav>

        <ShareCard />
      </div>
    </div>
  );
}

interface NavTileProps {
  icon: ReactNode;
  label: string;
  count: number;
  onClick: () => void;
}

/** A way into a list: how many are in it, big, and where it leads. */
function NavTile({ icon, label, count, onClick }: NavTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="panel group flex min-h-36 cursor-pointer flex-col justify-between rounded-card p-4 text-left transition duration-200 hover:bg-surface-2 active:scale-[0.98]"
    >
      <span className="flex items-start justify-between">
        {icon}
        <ArrowUpRight aria-hidden="true" className="size-5 text-muted transition duration-200 group-hover:text-ink" />
      </span>
      <span>
        <span className="display tabular block text-[2rem]">{count}</span>
        <span className="mt-2 block text-sm font-semibold leading-snug text-muted">{label}</span>
      </span>
    </button>
  );
}
