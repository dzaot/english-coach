import { ChevronRight } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { formatDay } from "@/lib/format";
import type { HistoryItem } from "@/lib/types";
import { ClockSticker } from "./brand/stickers";
import { SCENARIO_ICONS } from "./scenario-meta";
import { EmptyState, TopBar } from "./ui";

export function HistoryView({ history, onOpen, onBack }: { history: readonly HistoryItem[]; onOpen: (id: string) => void; onBack: () => void }) {
  const { t, locale } = useI18n();
  return (
    <div className="animate-rise">
      <TopBar title={t.history.title} onBack={onBack} />
      {history.length === 0 ? (
        <EmptyState icon={<ClockSticker size={84} />} title={t.history.empty} hint={t.history.emptyHint} />
      ) : (
        <ul className="space-y-3">
          {history.map((h) => {
            const Icon = SCENARIO_ICONS[h.scenarioId];
            return (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => onOpen(h.id)}
                  className="panel flex min-h-20 w-full cursor-pointer items-center gap-4 rounded-card px-4 py-3 text-left transition duration-200 hover:bg-surface-2 active:scale-[0.99]"
                >
                  <Icon size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{t.scenarios[h.scenarioId].title}</span>
                    <span className="block text-sm text-muted">
                      {formatDay(h.finishedAt, locale)} · {t.industries[h.industryId]}
                    </span>
                  </span>
                  <span className="display tabular text-2xl" aria-label={t.history.score(h.score ?? 0)}>
                    {h.score ?? 0}
                  </span>
                  <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
