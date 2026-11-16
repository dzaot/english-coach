import type { ButtonHTMLAttributes, ReactNode } from "react";
import { AlertCircle, ArrowLeft, RotateCcw } from "lucide-react";
import { useI18n } from "@/i18n/provider";

/** Small shared UI pieces. Every interactive element: 44px+ target, visible focus, pointer cursor. */

type Variant = "primary" | "secondary" | "ghost" | "accent";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-on-primary shadow-card hover:brightness-110",
  accent: "bg-accent text-on-accent shadow-card hover:brightness-110",
  secondary: "border border-border bg-surface text-ink hover:bg-surface-2",
  ghost: "text-ink hover:bg-surface-2",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "md" | "lg" }) {
  const sizing = size === "lg" ? "min-h-14 px-6 text-lg" : "min-h-11 px-4 text-base";
  return (
    <button
      type="button"
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "", as: Tag = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "li" | "article" }) {
  return <Tag className={`rounded-3xl border border-border bg-surface p-5 shadow-card ${className}`}>{children}</Tag>;
}

export function TopBar({ title, onBack, backLabel, right }: { title: string; onBack: () => void; backLabel?: string; right?: ReactNode }) {
  const { t } = useI18n();
  return (
    <header className="mb-4 flex items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel ?? t.ui.back}
        className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink transition duration-200 hover:bg-surface-2"
      >
        <ArrowLeft aria-hidden="true" className="size-5" />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-xl font-bold" title={title}>
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
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-error/40 bg-error-soft p-4 text-ink">
      <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-error" />
      <div className="min-w-0 flex-1 space-y-2">
        <p>{message}</p>
        <div className="flex flex-wrap gap-3">
          {topUpUrl ? (
            <a href={topUpUrl} target="_blank" rel="noopener noreferrer" className="cursor-pointer font-semibold text-primary-ink underline underline-offset-4">
              {t.ui.topUp}
            </a>
          ) : null}
          {onRetry ? (
            <button type="button" onClick={onRetry} className="inline-flex min-h-11 cursor-pointer items-center gap-1 font-semibold underline underline-offset-4">
              <RotateCcw aria-hidden="true" className="size-4" /> {t.ui.tryAgain}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <span className="flex h-6 items-center gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="animate-bar h-6 w-1.5 rounded-full bg-primary" style={{ animationDelay: `${i * 120}ms` }} />
        ))}
      </span>
      <span>{label}</span>
    </div>
  );
}
