import { Check } from "lucide-react";
import { AVATARS, type AvatarId } from "@/domain/avatars";
import { LEVELS, type LevelId } from "@/domain/levels";
import { INDUSTRIES, type IndustryId } from "@/domain/scenarios";
import { useI18n } from "@/i18n/provider";
import { AvatarPortrait } from "./avatar-portrait";

/** Partner, industry and level pickers. Radios styled as cards; the native input keeps keyboard support. */

export const FOCUS_WITHIN =
  "has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus";

const card = (checked: boolean) => (checked ? "border-primary bg-primary-soft" : "border-border bg-surface hover:bg-surface-2");

export function PartnerPicker({ avatarId, onChange }: { avatarId: AvatarId; onChange: (id: AvatarId) => void }) {
  const { t } = useI18n();
  return (
    <fieldset>
      <legend className="mb-3 font-display text-lg font-bold">{t.home.yourPartner}</legend>
      {/* Always two columns: four squeezed the cards until the last one overflowed. */}
      <div className="grid grid-cols-2 gap-2.5">
        {AVATARS.map((a) => {
          const checked = a.id === avatarId;
          return (
            <label
              key={a.id}
              className={`flex min-w-0 cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 p-3 text-center transition duration-200 ${FOCUS_WITHIN} ${card(checked)}`}
            >
              <input type="radio" name="avatar" value={a.id} checked={checked} onChange={() => onChange(a.id)} className="sr-only" />
              <span className="relative">
                <AvatarPortrait avatar={a} size={72} />
                {checked ? (
                  <span className="absolute -bottom-0.5 -right-0.5 z-10 flex size-6 items-center justify-center rounded-full bg-primary text-on-primary ring-2 ring-surface">
                    <Check aria-hidden="true" className="size-4" strokeWidth={3} />
                  </span>
                ) : null}
              </span>
              <span>
                <span className="block font-semibold">{a.name}</span>
                <span className="block text-xs text-muted">{t.avatars[a.id].vibe}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function IndustryPicker({ industryId, onChange }: { industryId: IndustryId; onChange: (id: IndustryId) => void }) {
  const { t } = useI18n();
  return (
    <fieldset>
      <legend className="mb-3 font-display text-lg font-bold">{t.home.yourIndustry}</legend>
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
              <input type="radio" name="industry" value={i.id} checked={checked} onChange={() => onChange(i.id)} className="sr-only" />
              {t.industries[i.id]}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function LevelPicker({ level, onChange }: { level: LevelId; onChange: (id: LevelId) => void }) {
  const { t } = useI18n();
  return (
    <fieldset>
      <legend className="mb-3 font-display text-lg font-bold">{t.home.yourLevel}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {LEVELS.map((l) => {
          const checked = l.id === level;
          return (
            <label key={l.id} className={`flex cursor-pointer flex-col rounded-2xl border-2 p-3 transition duration-200 ${FOCUS_WITHIN} ${card(checked)}`}>
              <input type="radio" name="level" value={l.id} checked={checked} onChange={() => onChange(l.id)} className="sr-only" />
              <span className="flex items-center gap-1.5 font-semibold">
                {checked ? <Check aria-hidden="true" className="size-4 text-primary-ink" strokeWidth={3} /> : null}
                {t.levels[l.id].label}
              </span>
              <span className="text-sm text-muted">{t.levels[l.id].description}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
