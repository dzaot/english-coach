import { Snail, Volume2 } from "lucide-react";
import type { Turn } from "@/domain/conversation";
import { AnswerCheck, MarkedAnswer } from "./answer-check";
import { useI18n } from "@/i18n/provider";
import { SparkSticker } from "./brand/stickers";

export function ChatBubble({
  turn,
  speakerName,
  speaking,
  onListen,
  onListenSlow,
  checking,
  onListenAlternative,
  playingAlternative,
  usedPowerPhrase = false,
}: {
  turn: Turn;
  speakerName: string;
  speaking?: boolean;
  onListen?: () => void;
  onListenSlow?: () => void;
  /** Your answer: its check is still on the way. */
  checking?: boolean;
  onListenAlternative?: (index: number) => void;
  playingAlternative?: number | null;
  /** Your answer used the phrase of the day. */
  usedPowerPhrase?: boolean;
}) {
  const { t } = useI18n();
  const mine = turn.role === "user";
  return (
    <li className={`animate-rise flex flex-col gap-2.5 ${mine ? "items-end" : "items-start"}`}>
      {/* Cobalt is your coworker's voice; yours sits on the floor so its corrections can be read. */}
      <div className={`max-w-[88%] px-4 py-3.5 ${mine ? "rounded-[1.5rem] rounded-br-md bg-surface-2" : "rounded-[1.5rem] rounded-bl-md bg-cobalt-deep text-on-cobalt"}`}>
        <p className={`mb-1 text-sm font-bold ${mine ? "text-primary-ink" : ""}`}>{mine ? t.practice.you : speakerName}</p>
        <p lang="en" className="text-lg leading-relaxed">
          {mine ? <MarkedAnswer text={turn.text} check={turn.check} /> : turn.text}
        </p>
        {!mine && onListen ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={onListen} className={BUBBLE_ACTION}>
              <Volume2 aria-hidden="true" className="size-4" />
              {speaking ? t.practice.playing : t.practice.listen}
            </button>
            {onListenSlow ? (
              <button type="button" onClick={onListenSlow} className={BUBBLE_ACTION}>
                <Snail aria-hidden="true" className="size-4" /> {t.practice.slower}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {mine && usedPowerPhrase ? (
        <p className="animate-pop inline-flex items-center gap-2 rounded-full bg-accent py-1 pl-1.5 pr-3.5 text-sm font-bold text-on-accent">
          <SparkSticker size={24} className="[--sticker-edge:var(--night)]" /> {t.power.used}
        </p>
      ) : null}
      {mine ? (
        <div className="w-full max-w-[94%]">
          <AnswerCheck check={turn.check} checking={checking} onListenAlternative={onListenAlternative} playingAlternative={playingAlternative} />
        </div>
      ) : null}
    </li>
  );
}

const BUBBLE_ACTION =
  "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full bg-white/15 px-4 text-sm font-semibold text-white transition duration-200 hover:bg-white/25 active:scale-[0.97]";
