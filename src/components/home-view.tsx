"use client";

import { useState } from "react";
import { BookmarkCheck, ChevronRight, History, Mic } from "lucide-react";
import { INDUSTRIES, SCENARIOS, type IndustryId, type ScenarioId } from "@/domain/scenarios";
import type { Progress } from "@/lib/types";
import { SCENARIO_ICONS } from "./scenario-meta";
import { StreakCard } from "./streak-card";
import { Button } from "./ui";

interface HomeViewProps {
  progress: Progress | null;
  starting: boolean;
  onStart: (scenarioId: ScenarioId, industryId: IndustryId) => void;
  onOpenPhrases: () => void;
  onOpenHistory: () => void;
}

export function HomeView({ progress, starting, onStart, onOpenPhrases, onOpenHistory }: HomeViewProps) {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("job_interview");
  const [industryId, setIndustryId] = useState<IndustryId>("general");

  return (
    <div className="animate-rise space-y-6">
      <header className="space-y-2 pt-2">
        <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary-ink">
          <Mic aria-hidden="true" className="size-4" /> Gratis · en voz alta · 5 minutos
        </p>
        <h1 className="text-[2rem] font-extrabold leading-tight tracking-tight">
          Practica tu inglés de trabajo <span className="text-primary-ink">en voz alta</span>
        </h1>
        <p className="text-muted">Elige una situación, habla con tu contraparte en inglés y recibe feedback al instante.</p>
      </header>

      {progress ? <StreakCard progress={progress} /> : null}

      <fieldset className="space-y-3">
        <legend className="mb-3 text-lg font-bold">1. ¿Qué quieres practicar?</legend>
        <div className="grid gap-2.5">
          {SCENARIOS.map((s) => {
            const Icon = SCENARIO_ICONS[s.id];
            const checked = s.id === scenarioId;
            return (
              <label
                key={s.id}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3.5 transition duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${
                  checked ? "border-primary bg-primary-soft" : "border-border bg-surface hover:bg-surface-2"
                }`}
              >
                <input
                  type="radio"
                  name="scenario"
                  value={s.id}
                  checked={checked}
                  onChange={() => setScenarioId(s.id)}
                  className="sr-only"
                />
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${checked ? "bg-primary text-on-primary" : "bg-surface-2 text-ink"}`}>
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{s.titleEs}</span>
                  <span className="block text-sm text-muted">{s.descriptionEs}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-lg font-bold">2. Tu industria</legend>
        <div className="flex flex-wrap gap-2">
          {INDUSTRIES.map((i) => {
            const checked = i.id === industryId;
            return (
              <label
                key={i.id}
                className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 px-4 text-sm font-semibold transition duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${
                  checked ? "border-ink bg-ink text-bg" : "border-border bg-surface hover:bg-surface-2"
                }`}
              >
                <input type="radio" name="industry" value={i.id} checked={checked} onChange={() => setIndustryId(i.id)} className="sr-only" />
                {i.labelEs}
              </label>
            );
          })}
        </div>
      </fieldset>

      <Button size="lg" className="w-full" disabled={starting} onClick={() => onStart(scenarioId, industryId)}>
        <Mic aria-hidden="true" className="size-5" />
        {starting ? "Preparando…" : "Empezar a hablar"}
      </Button>

      <nav aria-label="Tu progreso" className="grid gap-2.5">
        <NavRow icon={<BookmarkCheck aria-hidden="true" className="size-5" />} label="Frases para repasar" count={progress?.toReview ?? 0} onClick={onOpenPhrases} />
        <NavRow icon={<History aria-hidden="true" className="size-5" />} label="Historial de prácticas" count={progress?.history.length ?? 0} onClick={onOpenHistory} />
      </nav>
    </div>
  );
}

function NavRow({ icon, label, count, onClick }: { icon: React.ReactNode; label: string; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface px-4 text-left font-semibold transition duration-200 hover:bg-surface-2"
    >
      <span className="text-primary-ink">{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="tabular rounded-full bg-surface-2 px-2.5 py-0.5 text-sm">{count}</span>
      <ChevronRight aria-hidden="true" className="size-5 text-muted" />
    </button>
  );
}
