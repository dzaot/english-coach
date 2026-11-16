import { ChevronRight, History } from "lucide-react";
import { formatDay } from "@/lib/format";
import type { HistoryItem } from "@/lib/types";
import { SCENARIO_ICONS, industryLabel, scenarioTitle } from "./scenario-meta";
import { Card, TopBar } from "./ui";

export function HistoryView({ history, onOpen, onBack }: { history: readonly HistoryItem[]; onOpen: (id: string) => void; onBack: () => void }) {
  return (
    <div className="animate-rise">
      <TopBar title="Practice history" onBack={onBack} />
      {history.length === 0 ? (
        <Card className="text-center">
          <History aria-hidden="true" className="mx-auto mb-2 size-8 text-muted" />
          <p className="font-semibold">You have not finished a practice yet.</p>
          <p className="text-muted">Your first practice will show up here with its score.</p>
        </Card>
      ) : (
        <ul className="space-y-2.5">
          {history.map((h) => {
            const Icon = SCENARIO_ICONS[h.scenarioId];
            return (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => onOpen(h.id)}
                  className="flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left transition duration-200 hover:bg-surface-2"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{scenarioTitle(h.scenarioId)}</span>
                    <span className="block text-sm text-muted">
                      {formatDay(h.finishedAt)} · {industryLabel(h.industryId)}
                    </span>
                  </span>
                  <span className="tabular text-lg font-extrabold" aria-label={`Score ${h.score ?? 0}`}>
                    {h.score ?? 0}
                  </span>
                  <ChevronRight aria-hidden="true" className="size-5 text-muted" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
