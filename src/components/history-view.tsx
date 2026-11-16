import { ChevronRight, History } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { formatDay } from "@/lib/format";
import type { HistoryItem } from "@/lib/types";
import { SCENARIO_ICONS } from "./scenario-meta";
import { Card, TopBar } from "./ui";

export function HistoryView({ history, onOpen, onBack }: { history: readonly HistoryItem[]; onOpen: (id: string) => void; onBack: () => void }) {
  const { t, locale } = useI18n();
  return (
    <div className="animate-rise">
      <TopBar title={t.history.title} onBack={onBack} />
      {history.length === 0 ? (
        <Card className="text-center">
          <History aria-hidden="true" className="mx-auto mb-2 size-8 text-muted" />
          <p className="font-semibold">{t.history.empty}</p>
          <p className="text-muted">{t.history.emptyHint}</p>
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
                    <span className="block font-semibold">{t.scenarios[h.scenarioId].title}</span>
                    <span className="block text-sm text-muted">
                      {formatDay(h.finishedAt, locale)} · {t.industries[h.industryId]}
                    </span>
                  </span>
                  <span className="tabular text-lg font-extrabold" aria-label={t.history.score(h.score ?? 0)}>
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
