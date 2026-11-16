import { useId } from "react";
import { useI18n } from "@/i18n/provider";

/** Dilo ("say it"): a speech bubble with three voice bars, coral to sun. Same shapes as public/brand/dilo-icon.svg. */
export function BrandIcon({ size = 32 }: { size?: number }) {
  const gradient = useId();
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradient} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF5B3A" />
          <stop offset="1" stopColor="#FFC233" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradient})`}
        d="M22 5h20c9.94 0 18 8.06 18 18v6c0 9.94-8.06 18-18 18H27l-12.6 10.8c-1.3 1.11-3.27.04-3.06-1.66L12.6 45.3C7.4 42.2 4 36.5 4 29v-6C4 13.06 12.06 5 22 5Z"
      />
      <rect x="19" y="20" width="6" height="14" rx="3" fill="#1A1530" />
      <rect x="29" y="14" width="6" height="26" rx="3" fill="#1A1530" />
      <rect x="39" y="22" width="6" height="10" rx="3" fill="#1A1530" />
    </svg>
  );
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <p className={`flex items-center gap-2 font-display font-extrabold tracking-tight ${compact ? "text-xl" : "text-2xl"}`}>
      <BrandIcon size={compact ? 30 : 36} />
      dilo
      <span className="sr-only">{t.app.brandSuffix}</span>
    </p>
  );
}
