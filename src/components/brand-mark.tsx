import { useI18n } from "@/i18n/provider";
import { BUBBLE_PATH } from "./brand/stickers";

/** Where the mark sits: on the dark floor (orange bubble) or on a color stage (ink bubble, bars in the stage color). */
export type BrandTone = "floor" | "stage";

/** Dilo ("say it"): a speech bubble with three voice bars. Flat, one color. Same shapes as public/brand/dilo-icon.svg. */
export function BrandIcon({ size = 32, tone = "floor" }: { size?: number; tone?: BrandTone }) {
  const bubble = tone === "stage" ? "var(--night)" : "var(--primary)";
  const bars = tone === "stage" ? "var(--stage, var(--primary))" : "var(--night)";
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false" className="shrink-0">
      <path fill={bubble} d={BUBBLE_PATH} />
      <rect x="19" y="20" width="6" height="14" rx="3" fill={bars} />
      <rect x="29" y="14" width="6" height="26" rx="3" fill={bars} />
      <rect x="39" y="22" width="6" height="10" rx="3" fill={bars} />
    </svg>
  );
}

export function BrandMark({ compact = false, tone = "floor" }: { compact?: boolean; tone?: BrandTone }) {
  const { t } = useI18n();
  return (
    <p className={`display flex items-center gap-2 font-black ${compact ? "text-2xl" : "text-[1.75rem]"}`}>
      <BrandIcon size={compact ? 32 : 38} tone={tone} />
      dilo
      <span className="sr-only">{t.app.brandSuffix}</span>
    </p>
  );
}
