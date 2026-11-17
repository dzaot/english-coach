import type { ComponentType, ReactNode } from "react";
import { Check } from "lucide-react";
import { CONFIDENCE_MAX, CONFIDENCE_MIN, GOAL_IDS, PAIN_IDS, type GoalId, type PainId } from "@/domain/onboarding";
import { useI18n } from "@/i18n/provider";
import {
  BoardSticker,
  BriefcaseSticker,
  BubbleSticker,
  BulbSticker,
  CheckSticker,
  HeadsetSticker,
  MicSticker,
  RaiseSticker,
  TeamSticker,
  type StickerProps,
} from "../brand/stickers";
import { FOCUS_WITHIN } from "../home-pickers";

/** The question screens of the first run. Each one is a real radio group or checkbox group, styled as big tiles. */

const GOAL_STICKERS: Readonly<Record<GoalId, ComponentType<StickerProps>>> = {
  interview: BriefcaseSticker,
  meetings: TeamSticker,
  clients: HeadsetSticker,
  presentations: BoardSticker,
  raise: RaiseSticker,
  everyday: BubbleSticker,
};

const TILE = `flex min-h-16 cursor-pointer items-center gap-3 rounded-tile px-4 py-3 font-semibold leading-snug transition duration-200 active:scale-[0.98] ${FOCUS_WITHIN}`;
const tileSkin = (checked: boolean) => (checked ? "bg-ink text-night" : "bg-surface hover:bg-surface-2");

/** The mark at the end of a tile: a filled lime check when chosen, an empty outline when not. */
function Mark({ checked, square = false }: { checked: boolean; square?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`ml-auto flex size-6 shrink-0 items-center justify-center ${square ? "rounded-md" : "rounded-full"} ${
        checked ? "bg-accent text-on-accent" : "border border-border-strong"
      }`}
    >
      {checked ? <Check className="size-4" strokeWidth={3.5} /> : null}
    </span>
  );
}

export function Question({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <fieldset className="animate-rise">
      <legend className="display text-balance text-[1.75rem] leading-[1.1]">{title}</legend>
      <p className="mb-6 mt-3 text-muted">{hint}</p>
      {children}
    </fieldset>
  );
}

export function GoalStep({ value, onChange }: { value: GoalId | null; onChange: (goal: GoalId) => void }) {
  const { t } = useI18n();
  return (
    <Question title={t.onboarding.goal.title} hint={t.onboarding.goal.hint}>
      <div className="grid gap-2">
        {GOAL_IDS.map((id) => {
          const Sticker = GOAL_STICKERS[id];
          const checked = id === value;
          return (
            <label key={id} className={`${TILE} ${tileSkin(checked)}`}>
              <input type="radio" name="goal" value={id} checked={checked} onChange={() => onChange(id)} className="sr-only" />
              <Sticker size={36} className={checked ? "[--sticker-edge:var(--night)]" : ""} />
              <span className="min-w-0">{t.onboarding.goal.options[id]}</span>
              <Mark checked={checked} />
            </label>
          );
        })}
      </div>
    </Question>
  );
}

export function PainsStep({ value, onToggle }: { value: readonly PainId[]; onToggle: (pain: PainId) => void }) {
  const { t } = useI18n();
  return (
    <Question title={t.onboarding.pains.title} hint={t.onboarding.pains.hint}>
      <div className="grid gap-2">
        {PAIN_IDS.map((id) => {
          const checked = value.includes(id);
          return (
            <label key={id} className={`${TILE} ${tileSkin(checked)}`}>
              <input type="checkbox" name="pains" value={id} checked={checked} onChange={() => onToggle(id)} className="sr-only" />
              <span className="min-w-0">{t.onboarding.pains.options[id]}</span>
              <Mark checked={checked} square />
            </label>
          );
        })}
      </div>
    </Question>
  );
}

const LEVELS = Array.from({ length: CONFIDENCE_MAX - CONFIDENCE_MIN + 1 }, (_, i) => CONFIDENCE_MIN + i);
/** The five steps of the scale as bars that grow: the same voice bars as the logo. */
const BAR_HEIGHTS = ["h-12", "h-16", "h-20", "h-24", "h-28"] as const;

export function ConfidenceStep({ value, onChange }: { value: number | null; onChange: (level: number) => void }) {
  const { t } = useI18n();
  return (
    <Question title={t.onboarding.confidence.title} hint={t.onboarding.confidence.hint}>
      <div className="grid grid-cols-5 items-end gap-2">
        {LEVELS.map((n, i) => {
          const checked = n === value;
          const reached = value !== null && n <= value;
          return (
            <label key={n} className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl ${FOCUS_WITHIN}`}>
              <input
                type="radio"
                name="confidence"
                value={n}
                checked={checked}
                onChange={() => onChange(n)}
                aria-label={`${t.onboarding.confidence.value(n)}: ${t.onboarding.confidence.scale[i]}`}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`display tabular flex w-full items-end justify-center rounded-2xl pb-3 text-xl transition duration-200 active:scale-[0.97] ${BAR_HEIGHTS[i]} ${
                  reached ? "bg-primary text-on-primary" : "bg-surface hover:bg-surface-2"
                }`}
              >
                {n}
              </span>
            </label>
          );
        })}
      </div>
      <div className="mt-3 flex justify-between text-sm text-muted" aria-hidden="true">
        <span>{t.onboarding.confidence.scale[0]}</span>
        <span>{t.onboarding.confidence.scale[LEVELS.length - 1]}</span>
      </div>
      <p className="display mt-6 min-h-8 text-xl" aria-live="polite">
        {value === null ? "" : t.onboarding.confidence.scale[value - CONFIDENCE_MIN]}
      </p>
    </Question>
  );
}

const PAIN_STICKERS: Readonly<Record<PainId, ComponentType<StickerProps>>> = {
  blank: BulbSticker,
  mistakes: CheckSticker,
  pronunciation: MicSticker,
  words: BubbleSticker,
  speed: HeadsetSticker,
  translating: TeamSticker,
};
const MAX_FIXES = 3;

/** Mirrors what they said gets in the way, with the part of Dilo that answers each one. Lives on the lime stage. */
export function SolutionStep({ pains }: { pains: readonly PainId[] }) {
  const { t } = useI18n();
  const shown = pains.slice(0, MAX_FIXES);
  return (
    <div className="animate-rise">
      <h2 className="display text-balance text-[1.75rem] leading-[1.1]">{t.onboarding.solution.title}</h2>
      {shown.length === 0 ? (
        <p className="mt-6 text-xl font-semibold leading-snug">{t.onboarding.solution.fallback}</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {shown.map((id) => {
            const Sticker = PAIN_STICKERS[id];
            return (
              <li key={id} className="flex gap-4 rounded-tile bg-night p-4 text-ink">
                <Sticker size={40} className="-rotate-6" />
                <div className="min-w-0">
                  <p className="text-sm text-muted line-through decoration-muted/60">{t.onboarding.pains.options[id]}</p>
                  <p className="mt-1 font-semibold leading-snug">{t.onboarding.solution.fixes[id]}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
