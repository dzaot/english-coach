import { Check } from "lucide-react";
import { AVATARS, type AvatarId } from "@/domain/avatars";
import { LEVELS, type LevelId } from "@/domain/levels";
import { INDUSTRIES, type IndustryId } from "@/domain/scenarios";
import { AvatarPortrait } from "./avatar-portrait";

/** Partner, industry and level pickers. Radios styled as cards; the native input keeps keyboard support. */

export const FOCUS_WITHIN =
  "has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus";

const card = (checked: boolean) => (checked ? "border-primary bg-primary-soft" : "border-border bg-surface hover:bg-surface-2");

export function PartnerPicker({ avatarId, onChange }: { avatarId: AvatarId; onChange: (id: AvatarId) => void }) {
  return (
    <fieldset>
      <legend className="mb-3 font-display text-lg font-bold">Your partner</legend>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {AVATARS.map((a) => {
          const checked = a.id === avatarId;
          return (
            <label
              key={a.id}
              className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 p-3 text-center transition duration-200 ${FOCUS_WITHIN} ${card(checked)}`}
            >
              <input type="radio" name="avatar" value={a.id} checked={checked} onChange={() => onChange(a.id)} className="sr-only" />
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
  );
}

export function IndustryPicker({ industryId, onChange }: { industryId: IndustryId; onChange: (id: IndustryId) => void }) {
  return (
    <fieldset>
      <legend className="mb-3 font-display text-lg font-bold">Your industry</legend>
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
              {i.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function LevelPicker({ level, onChange }: { level: LevelId; onChange: (id: LevelId) => void }) {
  return (
    <fieldset>
      <legend className="mb-3 font-display text-lg font-bold">Your English level</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {LEVELS.map((l) => {
          const checked = l.id === level;
          return (
            <label key={l.id} className={`flex cursor-pointer flex-col rounded-2xl border-2 p-3 transition duration-200 ${FOCUS_WITHIN} ${card(checked)}`}>
              <input type="radio" name="level" value={l.id} checked={checked} onChange={() => onChange(l.id)} className="sr-only" />
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
  );
}
