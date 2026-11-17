import type { ButtonHTMLAttributes, ReactNode } from "react";
import { AlertCircle, ArrowLeft, RotateCcw } from "lucide-react";
import { useI18n } from "@/i18n/provider";

/** Small shared UI pieces. Every interactive element: 44px+ target, visible focus, pointer cursor. Flat color, no shadows. */

type Variant = "primary" | "secondary" | "ghost" | "accent";
/** One shape for every action: a pill. Orange is the main action, lime is "say it", the rest stay quiet. */
const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-[#ff6e3a]",
  accent: "bg-accent text-on-accent hover:bg-[#d6ff5c]",
  secondary: "border border-border-strong bg-surface text-ink hover:bg-surface-2",
  ghost: "text-ink hover:bg-surface",
};

/** Small quiet action inside a panel: listen, slower, hear it. Still a 44px target. */
export const QUIET_ACTION =
  "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full bg-surface-2 px-4 text-sm font-semibold text-ink transition duration-200 hover:bg-[#3b332e] active:scale-[0.97]";

/** A text field: a darker well, so typed words are the brightest thing in it. */
export const FIELD =
  "w-full rounded-tile border border-border bg-well p-3.5 text-base text-ink transition duration-200 placeholder:text-muted hover:border-border-strong focus:border-border-strong";

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "md" | "lg" }) {
  const sizing = size === "lg" ? "min-h-16 px-7 text-lg font-bold" : "min-h-12 px-5 text-base font-semibold";
  return (
    <button
      type="button"
      className={`inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-full transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${sizing} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "", as: Tag = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "li" | "article" }) {
  return <Tag className={`panel rounded-card p-5 ${className}`}>{children}</Tag>;
}

/** Where a control sits: on the dark floor, or on a color stage (it then takes the stage's own ink). */
export type Tone = "floor" | "stage";

const ROUND_BASE = "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition duration-200 active:scale-95";
/** Round button for the corners of a screen (back, close, listen). */
export const ROUND_BUTTON = `${ROUND_BASE} bg-surface-2 text-ink hover:bg-[#3b332e]`;
export const ROUND_BUTTON_STAGE = `${ROUND_BASE} bg-stage-soft text-stage-ink hover:brightness-110`;
/** A small pill of information (timer, status). */
export const CHIP = "inline-flex min-h-9 items-center gap-2 rounded-full bg-surface-2 px-3.5 text-sm font-semibold";
export const CHIP_STAGE = "inline-flex min-h-9 items-center gap-2 rounded-full bg-stage-soft px-3.5 text-sm font-semibold text-stage-ink";

export function TopBar({ title, onBack, backLabel, right, tone = "floor" }: { title: string; onBack: () => void; backLabel?: string; right?: ReactNode; tone?: Tone }) {
  const { t } = useI18n();
  return (
    <header className="mb-5 flex items-center gap-3">
      <button type="button" onClick={onBack} aria-label={backLabel ?? t.ui.back} className={tone === "stage" ? ROUND_BUTTON_STAGE : ROUND_BUTTON}>
        <ArrowLeft aria-hidden="true" className="size-5" />
      </button>
      <h1 className="display min-w-0 flex-1 truncate py-1 text-lg font-bold" title={title}>
        {title}
      </h1>
      {right}
    </header>
  );
}

/** An error the person can act on. publik's 402 rule: its message plus exactly one link. */
export function ErrorBanner({ message, topUpUrl, onRetry }: { message: string; topUpUrl?: string | null; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="flex items-start gap-3 rounded-tile border border-error bg-[#3a1a22] p-4 text-ink">
      <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-error" />
      <div className="min-w-0 flex-1 space-y-2">
        <p>{message}</p>
        <div className="flex flex-wrap gap-3">
          {topUpUrl ? (
            <a href={topUpUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-sun underline underline-offset-4">
              {t.ui.topUp}
            </a>
          ) : null}
          {onRetry ? (
            <button type="button" onClick={onRetry} className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 font-semibold underline underline-offset-4">
              <RotateCcw aria-hidden="true" className="size-4" /> {t.ui.tryAgain}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Voice bars: the same shape as the logo, moving. */
export function VoiceBars({ className = "bg-primary", count = 4, height = "h-6" }: { className?: string; count?: number; height?: string }) {
  return (
    <span className={`flex items-center gap-1 ${height}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={`animate-bar w-1.5 rounded-full ${height} ${className}`} style={{ animationDelay: `${i * 130}ms` }} />
      ))}
    </span>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-muted">
      <VoiceBars height="h-8" />
      <span>{label}</span>
    </div>
  );
}

/** "Nothing here yet", with the next step and a sticker. */
export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-6 -rotate-6">{icon}</span>
      <p className="display text-xl leading-tight">{title}</p>
      <p className="mt-2 max-w-[30ch] text-muted">{hint}</p>
    </div>
  );
}
