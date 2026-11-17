import type { Locale } from "@/domain/locales";

/**
 * Small flat flags for the language picker. A flag stands for a language here, not a country:
 * it always sits next to the language's own name, and is hidden from screen readers.
 */

const FLAGS: Readonly<Record<Locale, React.ReactNode>> = {
  en: (
    <>
      <rect width="28" height="20" fill="#ffffff" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} y={i * 5.72} width="28" height="2.86" fill="#b22234" />
      ))}
      <rect width="13" height="11.44" fill="#3c3b6e" />
      {[2.6, 6.5, 10.4].map((x) => [2.9, 5.7, 8.5].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.8" fill="#ffffff" />))}
    </>
  ),
  es: (
    <>
      <rect width="28" height="20" fill="#aa151b" />
      <rect y="5" width="28" height="10" fill="#f1bf00" />
    </>
  ),
  pt: (
    <>
      <rect width="28" height="20" fill="#009c3b" />
      <path d="M14 2.6 25 10 14 17.4 3 10Z" fill="#ffdf00" />
      <circle cx="14" cy="10" r="4.2" fill="#002776" />
    </>
  ),
  fr: (
    <>
      <rect width="28" height="20" fill="#ffffff" />
      <rect width="9.34" height="20" fill="#0055a4" />
      <rect x="18.66" width="9.34" height="20" fill="#ef4135" />
    </>
  ),
  it: (
    <>
      <rect width="28" height="20" fill="#ffffff" />
      <rect width="9.34" height="20" fill="#009246" />
      <rect x="18.66" width="9.34" height="20" fill="#ce2b37" />
    </>
  ),
  de: (
    <>
      <rect width="28" height="20" fill="#dd0000" />
      <rect width="28" height="6.67" fill="#000000" />
      <rect y="13.33" width="28" height="6.67" fill="#ffce00" />
    </>
  ),
};

export function Flag({ locale, className = "" }: { locale: Locale; className?: string }) {
  return (
    <span aria-hidden="true" data-flag={locale} className={`inline-block h-5 w-7 shrink-0 overflow-hidden rounded-[5px] ring-1 ring-black/15 ${className}`}>
      <svg viewBox="0 0 28 20" className="size-full" focusable="false">
        {FLAGS[locale]}
      </svg>
    </span>
  );
}
