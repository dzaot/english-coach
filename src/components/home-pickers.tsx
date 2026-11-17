import { Check } from "lucide-react";
import { AVATARS, getAvatar, type AvatarId } from "@/domain/avatars";
import { LEVELS, type LevelId } from "@/domain/levels";
import { INDUSTRIES, MAX_INDUSTRY_OTHER, OTHER_INDUSTRY, type IndustryId } from "@/domain/scenarios";
import { useI18n } from "@/i18n/provider";
import { AvatarPortrait } from "./avatar-portrait";
import { FIELD } from "./ui";

/** Partner, industry and level pickers. Radios styled as faces, pills and rows; the native input keeps keyboard support. */

export const FOCUS_WITHIN =
  "has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus";

const LEGEND = "kicker mb-3";
/** In the first-run questions the screen's title already asks the question, so the legend is for screen readers only. */
const legendClass = (hidden: boolean) => (hidden ? "sr-only" : LEGEND);

interface PickerChrome {
  /** Hide the visible legend (the screen already shows the question). */
  readonly hideLegend?: boolean;
}
const PARTNER_PHOTO = 60;

export function PartnerPicker({ avatarId, onChange, hideLegend = false, photo = PARTNER_PHOTO }: { avatarId: AvatarId; onChange: (id: AvatarId) => void; photo?: number } & PickerChrome) {
  const { t } = useI18n();
  const chosen = getAvatar(avatarId);
  return (
    <fieldset>
      <legend className={legendClass(hideLegend)}>{t.home.yourPartner}</legend>
      {/* Four faces in a row: only the short name sits under each, so no language can push one out. */}
      <div className="grid grid-cols-4 gap-2">
        {AVATARS.map((a) => {
          const checked = a.id === avatarId;
          return (
            <label
              key={a.id}
              className={`flex min-w-0 cursor-pointer flex-col items-center gap-2 rounded-tile py-2 text-center transition duration-200 active:scale-[0.97] ${FOCUS_WITHIN} ${
                checked ? "" : "opacity-70 hover:opacity-100"
              }`}
            >
              <input type="radio" name="avatar" value={a.id} checked={checked} onChange={() => onChange(a.id)} className="sr-only" />
              <span className="relative">
                <AvatarPortrait avatar={a} size={photo} selected={checked} />
                {checked ? (
                  <span className="absolute -bottom-0.5 -right-0.5 z-10 flex size-5 items-center justify-center rounded-full bg-ink text-night ring-2 ring-night">
                    <Check aria-hidden="true" className="size-3.5" strokeWidth={3.5} />
                  </span>
                ) : null}
              </span>
              <span className={`text-sm ${checked ? "font-bold text-ink" : "font-medium text-muted"}`}>{a.name}</span>
            </label>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-muted" aria-live="polite">
        <span className="font-semibold text-ink">{chosen.name}</span> · {t.avatars[chosen.id].vibe}
      </p>
    </fieldset>
  );
}

interface IndustryPickerProps extends PickerChrome {
  /** null while nothing is chosen yet (first run). */
  industryId: IndustryId | null;
  onChange: (id: IndustryId) => void;
  /** The person's own field, asked for when they choose "Other". */
  other?: string;
  onOtherChange?: (text: string) => void;
}

export function IndustryPicker({ industryId, onChange, other = "", onOtherChange, hideLegend = false }: IndustryPickerProps) {
  const { t } = useI18n();
  return (
    <fieldset>
      <legend className={legendClass(hideLegend)}>{t.home.yourIndustry}</legend>
      <div className="flex flex-wrap gap-2">
        {INDUSTRIES.map((i) => {
          const checked = i.id === industryId;
          return (
            <label
              key={i.id}
              className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-semibold transition duration-200 active:scale-[0.97] ${FOCUS_WITHIN} ${
                checked ? "border-transparent bg-ink text-night" : "border-transparent bg-surface-2 hover:bg-[#3b332e]"
              }`}
            >
              <input type="radio" name="industry" value={i.id} checked={checked} onChange={() => onChange(i.id)} className="sr-only" />
              {t.industries[i.id]}
            </label>
          );
        })}
      </div>
      {industryId === OTHER_INDUSTRY && onOtherChange ? (
        <div className="animate-rise mt-4 space-y-1.5">
          <label htmlFor="industry-other" className="block font-semibold">
            {t.onboarding.industry.otherLabel}
          </label>
          <input
            id="industry-other"
            type="text"
            value={other}
            onChange={(e) => onOtherChange(e.target.value)}
            maxLength={MAX_INDUSTRY_OTHER}
            placeholder={t.onboarding.industry.otherPlaceholder}
            autoComplete="organization-title"
            className={`${FIELD} min-h-12 py-2`}
          />
        </div>
      ) : null}
    </fieldset>
  );
}

export function LevelPicker({ level, onChange, hideLegend = false }: { level: LevelId; onChange: (id: LevelId) => void } & PickerChrome) {
  const { t } = useI18n();
  return (
    <fieldset>
      <legend className={legendClass(hideLegend)}>{t.home.yourLevel}</legend>
      {/* One grouped list, like a settings panel: the chosen row is lit and carries the check. */}
      <div className="overflow-hidden rounded-tile bg-well">
        {LEVELS.map((l, index) => {
          const checked = l.id === level;
          return (
            <label
              key={l.id}
              className={`flex cursor-pointer items-center gap-3 px-4 py-3.5 transition duration-200 ${FOCUS_WITHIN} ${index > 0 ? "divider-dashed" : ""} ${
                checked ? "bg-surface-2" : "hover:bg-surface"
              }`}
            >
              <input type="radio" name="level" value={l.id} checked={checked} onChange={() => onChange(l.id)} className="sr-only" />
              <span className="min-w-0 flex-1">
                <span className={`block font-semibold ${checked ? "text-ink" : "text-ink/85"}`}>{t.levels[l.id].label}</span>
                <span className="block text-sm text-muted">{t.levels[l.id].description}</span>
              </span>
              <span
                aria-hidden="true"
                className={`flex size-6 shrink-0 items-center justify-center rounded-full transition duration-200 ${
                  checked ? "bg-accent text-on-accent" : "border border-border-strong"
                }`}
              >
                {checked ? <Check className="size-4" strokeWidth={3.5} /> : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
