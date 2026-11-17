/** The brand's graphic device: the logo's voice bars, as a row. Structured, flat, and alive when someone talks. */

const HEIGHTS = [38, 62, 84, 54, 100, 70, 46, 88, 58, 76, 42, 66] as const;

export interface VoiceFieldProps {
  /** Bars move while someone is talking. */
  readonly active?: boolean;
  /** Tailwind classes for the bars' color. */
  readonly barClass?: string;
  readonly className?: string;
  readonly count?: number;
}

export function VoiceField({ active = false, barClass = "bg-stage-soft", className = "", count = HEIGHTS.length }: VoiceFieldProps) {
  return (
    <div aria-hidden="true" className={`flex items-end justify-between gap-1.5 ${className}`}>
      {HEIGHTS.slice(0, count).map((h, i) => (
        <span
          key={i}
          className={`flex-1 rounded-full transition-colors duration-300 ${barClass} ${active ? "animate-bar-up" : ""}`}
          style={{ height: `${h}%`, animationDelay: `${(i * 137) % 900}ms` }}
        />
      ))}
    </div>
  );
}
