import { scoreLabel } from "@/domain/feedback";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreRing({ score }: { score: number }) {
  const offset = CIRCUMFERENCE * (1 - score / 100);
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 120 120" className="size-28 shrink-0 -rotate-90" role="img" aria-label={`Puntaje: ${score} de 100`}>
        <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="12" className="stroke-surface-2" />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="stroke-primary transition-[stroke-dashoffset] duration-700"
        />
        <text x="60" y="60" textAnchor="middle" dominantBaseline="central" transform="rotate(90 60 60)" className="fill-ink tabular text-[2rem] font-extrabold">
          {score}
        </text>
      </svg>
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-muted">Tu puntaje</p>
        <p className="text-2xl font-extrabold">{scoreLabel(score)}</p>
      </div>
    </div>
  );
}
