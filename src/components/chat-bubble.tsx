import { Volume2 } from "lucide-react";
import type { Turn } from "@/domain/conversation";

export function ChatBubble({
  turn,
  speakerName,
  speaking,
  onListen,
}: {
  turn: Turn;
  speakerName: string;
  speaking?: boolean;
  onListen?: () => void;
}) {
  const mine = turn.role === "user";
  return (
    <li className={`animate-rise flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-3xl px-4 py-3 ${mine ? "rounded-br-lg bg-primary-soft" : "rounded-bl-lg border border-border bg-surface shadow-card"}`}
      >
        <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-muted">{mine ? "Tú" : speakerName}</p>
        <p lang="en" className="text-[1.0625rem] leading-relaxed">
          {turn.text}
        </p>
        {!mine && onListen ? (
          <button
            type="button"
            onClick={onListen}
            className="mt-1 -ml-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-primary-ink transition duration-200 hover:bg-surface-2"
          >
            <Volume2 aria-hidden="true" className="size-4" />
            {speaking ? "Reproduciendo…" : "Escuchar"}
          </button>
        ) : null}
      </div>
    </li>
  );
}
