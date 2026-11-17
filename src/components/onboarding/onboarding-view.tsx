"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Mic } from "lucide-react";
import { getAvatar, type AvatarId } from "@/domain/avatars";
import type { LevelId } from "@/domain/levels";
import { GOAL_SCENARIO, type GoalId, type OnboardingAnswers, type PainId } from "@/domain/onboarding";
import { OTHER_INDUSTRY, type IndustryId } from "@/domain/scenarios";
import { useI18n } from "@/i18n/provider";
import { BrandMark } from "../brand-mark";
import { BubbleSticker, CheckSticker, MicSticker } from "../brand/stickers";
import { VoiceField } from "../brand/voice-bars";
import { IndustryPicker, LevelPicker, PartnerPicker } from "../home-pickers";
import { LanguageChoices } from "../language-menu";
import { Button, ROUND_BUTTON, ROUND_BUTTON_STAGE, VoiceBars } from "../ui";
import { ConfidenceStep, GoalStep, PainsStep, Question, SolutionStep } from "./onboarding-steps";

/**
 * The first run: what Dilo is for, a few questions about what the person needs, and their first call set up.
 * It visits the three voices of the brand: orange to say hello, lime for how Dilo helps, cobalt for the call that is ready.
 */

const STEPS = ["welcome", "goal", "pains", "confidence", "solution", "industry", "level", "partner", "ready"] as const;
type Step = (typeof STEPS)[number];
/** Steps counted in the progress bar: everything between the welcome and the ready screen. */
const COUNTED = STEPS.length - 2;
const READY_PHOTO = 132;

export interface OnboardingProps {
  readonly initial: { readonly level: LevelId; readonly avatarId: AvatarId };
  /** Called once, when the person finishes or skips. startNow: go straight into the first call. */
  readonly onFinish: (answers: OnboardingAnswers, startNow: boolean) => void;
  /** How long the "setting up your call" moment lasts. */
  readonly buildMs?: number;
}

const DEFAULT_BUILD_MS = 1400;

export function OnboardingView({ initial, onFinish, buildMs = DEFAULT_BUILD_MS }: OnboardingProps) {
  const { t, locale } = useI18n();
  const [index, setIndex] = useState(0);
  const [goal, setGoal] = useState<GoalId | null>(null);
  const [pains, setPains] = useState<readonly PainId[]>([]);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [industryId, setIndustryId] = useState<IndustryId | null>(null);
  const [industryOther, setIndustryOther] = useState("");
  const [level, setLevel] = useState<LevelId>(initial.level);
  const [avatarId, setAvatarId] = useState<AvatarId>(initial.avatarId);
  const [built, setBuilt] = useState(false);
  const step: Step = STEPS[index];
  const avatar = getAvatar(avatarId);

  useEffect(() => {
    window.scrollTo?.({ top: 0 });
  }, [index]);

  useEffect(() => {
    if (step !== "ready") return;
    const timer = setTimeout(() => setBuilt(true), buildMs);
    return () => clearTimeout(timer);
  }, [buildMs, step]);

  const answers = (completed: boolean): OnboardingAnswers => ({
    locale,
    goal,
    pains: [...pains],
    confidence,
    industryId,
    industryOther: industryId === OTHER_INDUSTRY ? industryOther.trim() : "",
    // Level and partner count as answers only once the person has seen those screens.
    level: completed || index > STEPS.indexOf("level") ? level : null,
    avatarId: completed || index > STEPS.indexOf("partner") ? avatarId : null,
    completed,
  });

  const canContinue =
    (step !== "goal" || goal !== null) &&
    (step !== "confidence" || confidence !== null) &&
    (step !== "industry" || (industryId !== null && (industryId !== OTHER_INDUSTRY || industryOther.trim().length > 0)));
  const next = () => setIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const back = () => {
    setBuilt(false);
    setIndex((i) => Math.max(i - 1, 0));
  };
  const togglePain = (pain: PainId) => setPains((cur) => (cur.includes(pain) ? cur.filter((p) => p !== pain) : [...cur, pain]));

  if (step === "welcome") {
    return (
      <div className="animate-rise flex flex-1 flex-col gap-8">
        <div className="stage stage-orange">
          <BrandMark compact tone="stage" />
          <h1 className="display mt-10 text-balance text-[2.5rem] font-black sm:text-6xl">{t.onboarding.welcome.title}</h1>
          <p className="mt-5 max-w-[34ch] text-lg font-medium">{t.onboarding.welcome.body}</p>
          <VoiceField className="mt-8 h-14" barClass="bg-night" />
        </div>

        <ol className="space-y-4">
          {[BubbleSticker, MicSticker, CheckSticker].map((Sticker, i) => (
            <li key={i} className="flex items-center gap-4">
              <Sticker size={44} className={i % 2 ? "rotate-6" : "-rotate-6"} />
              <p className="font-medium leading-snug">{t.onboarding.welcome.points[i]}</p>
            </li>
          ))}
        </ol>

        <section aria-labelledby="onboarding-language">
          <h2 id="onboarding-language" className="kicker mb-3 text-muted">
            {t.languageMenu}
          </h2>
          <LanguageChoices className="panel grid grid-cols-2 gap-1 rounded-tile p-1.5" />
        </section>

        <div className="mt-auto space-y-2 pb-2">
          <Button size="lg" className="w-full" onClick={next}>
            {t.onboarding.welcome.start} <ArrowRight aria-hidden="true" className="size-5" />
          </Button>
          <Button variant="ghost" className="w-full text-muted" onClick={() => onFinish(answers(false), false)}>
            {t.onboarding.skip}
          </Button>
        </div>
      </div>
    );
  }

  if (step === "ready") {
    return (
      <div className="flex flex-1 flex-col">
        <div className="stage stage-cobalt flex flex-1 flex-col lg:flex-none">
          <button type="button" onClick={back} aria-label={t.onboarding.back} className={ROUND_BUTTON_STAGE}>
            <ArrowLeft aria-hidden="true" className="size-5" />
          </button>
          {built ? (
            <div className="animate-rise flex flex-1 flex-col items-center pt-8 text-center">
              <div className="relative">
                <VoiceField className="absolute -inset-x-16 bottom-2 h-24" barClass="bg-cobalt-tint" />
                <Image
                  src={avatar.image}
                  alt={t.avatars[avatar.id].alt}
                  width={READY_PHOTO}
                  height={READY_PHOTO}
                  priority
                  className="relative rounded-full object-cover ring-[5px] ring-white"
                />
              </div>
              <h1 className="display mt-8 text-balance text-[2rem] font-black leading-[1.05]">{t.onboarding.ready.title(avatar.name)}</h1>
              <ul className="mt-6 flex flex-wrap justify-center gap-2 text-sm font-semibold">
                <li className="rounded-full bg-stage-soft px-3.5 py-1.5">{t.scenarios[GOAL_SCENARIO[goal ?? "interview"]].title}</li>
                <li className="rounded-full bg-stage-soft px-3.5 py-1.5">{t.levels[level].label}</li>
                <li className="rounded-full bg-stage-soft px-3.5 py-1.5">
                  {industryId === OTHER_INDUSTRY && industryOther.trim() ? industryOther.trim() : t.industries[industryId ?? "general"]}
                </li>
              </ul>
              <p className="mt-6 max-w-[30ch] font-medium">{t.onboarding.ready.note}</p>
              <div className="mt-auto w-full space-y-2 pt-10">
                <Button variant="accent" size="lg" className="w-full" onClick={() => onFinish(answers(true), true)}>
                  <Mic aria-hidden="true" className="size-5" /> {t.onboarding.ready.start}
                </Button>
                <button
                  type="button"
                  onClick={() => onFinish(answers(true), false)}
                  className="min-h-12 w-full cursor-pointer rounded-full font-semibold underline underline-offset-4 transition duration-200 hover:bg-stage-soft"
                >
                  {t.onboarding.ready.later}
                </button>
              </div>
            </div>
          ) : (
            <div role="status" className="flex flex-1 flex-col items-center justify-center gap-6 py-24 text-center">
              <VoiceBars className="bg-white" height="h-10" count={5} />
              <p className="display text-xl leading-tight">{t.onboarding.ready.building}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const onLime = step === "solution";
  const chrome = (
    <div className="flex items-center gap-3">
      <button type="button" onClick={back} aria-label={t.onboarding.back} className={onLime ? ROUND_BUTTON_STAGE : ROUND_BUTTON}>
        <ArrowLeft aria-hidden="true" className="size-5" />
      </button>
      <div
        role="progressbar"
        aria-label={t.onboarding.progress(index, COUNTED)}
        aria-valuemin={1}
        aria-valuemax={COUNTED}
        aria-valuenow={index}
        className="flex flex-1 gap-1.5"
      >
        {Array.from({ length: COUNTED }, (_, i) => (
          <span key={i} className={`h-2 flex-1 rounded-full transition-colors duration-300 ${i < index ? (onLime ? "bg-night" : "bg-primary") : onLime ? "bg-stage-soft" : "bg-surface-2"}`} />
        ))}
      </div>
      <button
        type="button"
        onClick={() => onFinish(answers(false), false)}
        className={`min-h-11 cursor-pointer rounded-full px-3 text-sm font-semibold transition duration-200 ${onLime ? "hover:bg-stage-soft" : "text-muted hover:bg-surface hover:text-ink"}`}
      >
        {t.onboarding.skip}
      </button>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col">
      {onLime ? (
        <div className="stage stage-lime">
          {chrome}
          <div className="mt-8">
            <SolutionStep pains={pains} />
          </div>
        </div>
      ) : (
        <>
          {chrome}
          <div className="mt-8">
            {step === "goal" ? <GoalStep value={goal} onChange={setGoal} /> : null}
            {step === "pains" ? <PainsStep value={pains} onToggle={togglePain} /> : null}
            {step === "confidence" ? <ConfidenceStep value={confidence} onChange={setConfidence} /> : null}
            {step === "industry" ? (
              <Question title={t.onboarding.industry.title} hint={t.onboarding.industry.hint}>
                <IndustryPicker industryId={industryId} onChange={setIndustryId} other={industryOther} onOtherChange={setIndustryOther} hideLegend />
              </Question>
            ) : null}
            {step === "level" ? (
              <Question title={t.onboarding.level.title} hint={t.onboarding.level.hint}>
                <LevelPicker level={level} onChange={setLevel} hideLegend />
              </Question>
            ) : null}
            {step === "partner" ? (
              <Question title={t.onboarding.partner.title} hint={t.onboarding.partner.hint}>
                <PartnerPicker avatarId={avatarId} onChange={setAvatarId} hideLegend photo={68} />
              </Question>
            ) : null}
          </div>
        </>
      )}

      <div className="sticky bottom-0 mt-auto bg-[linear-gradient(to_top,var(--bg)_70%,transparent)] pb-4 pt-8">
        <Button size="lg" className="w-full" disabled={!canContinue} onClick={next}>
          {t.onboarding.next} <ArrowRight aria-hidden="true" className="size-5" />
        </Button>
      </div>
    </div>
  );
}
