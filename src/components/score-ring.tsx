import { scoreTier } from "@/domain/feedback";
import { useI18n } from "@/i18n/provider";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** The score: a thick flat ring around a big number, in the ink of whatever it sits on. */
export function ScoreRing({ score }: { score: number }) {
  const { t } = useI18n();
  const offset = CIRCUMFERENCE * (1 - score / 100);
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 120 120" className="size-32 shrink-0 -rotate-90" role="img" aria-label={t.feedback.scoreAria(score)}>
        <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="13" stroke="currentColor" opacity="0.16" />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          strokeWidth="13"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700"
        />
        <text
          x="60"
          y="60"
          textAnchor="middle"
          dominantBaseline="central"
          transform="rotate(90 60 60)"
          fill="currentColor"
          className="display tabular text-[2.25rem] font-black"
        >
          {score}
        </text>
      </svg>
      <div className="min-w-0">
        <p className="font-semibold">{t.feedback.scoreLabel}</p>
        <p className="display mt-2 text-balance text-[1.75rem] font-black leading-[1.05]">{t.feedback.scoreWords[scoreTier(score)]}</p>
      </div>
    </div>
  );
}
