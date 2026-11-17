import { Loader2, Mic, Square } from "lucide-react";
import type { Messages } from "@/i18n/messages";
import { useI18n } from "@/i18n/provider";

export type MicState = "idle" | "starting" | "recording" | "busy";

/** How much the ring grows at full loudness. */
const VOICE_RING_SCALE = 0.6;

export function micLabel(state: MicState, t: Messages): string {
  return t.mic[state];
}

/** The big push-to-talk control: tap to record, tap again to send. Space bar works too (see PracticeView). */
export function RecordButton({
  state,
  onPress,
  disabled,
  showLabel = true,
  level = 0,
}: {
  state: MicState;
  onPress: () => void;
  disabled?: boolean;
  /** false when the parent shows micLabel() itself, for example below a toolbar. */
  showLabel?: boolean;
  /** Microphone loudness 0 to 1: the ring follows your voice while recording. */
  level?: number;
}) {
  const { t } = useI18n();
  const recording = state === "recording";
  const waiting = state === "busy" || state === "starting";
  const face = recording
    ? "bg-accent text-on-accent"
    : waiting
      ? "bg-surface text-ink"
      : "bg-primary text-on-primary hover:bg-[#ff6e3a]";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {recording && level > 0 ? (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-accent/50 transition-transform duration-100"
            style={{ transform: `scale(${1 + level * VOICE_RING_SCALE})` }}
          />
        ) : null}
        {recording && level === 0 ? <span aria-hidden="true" className="animate-ring absolute inset-0 rounded-full bg-accent" /> : null}
        <button
          type="button"
          onClick={onPress}
          disabled={disabled || waiting}
          aria-pressed={recording}
          aria-label={recording ? t.mic.stop : t.mic.record}
          className={`relative flex size-20 cursor-pointer items-center justify-center rounded-full ring-4 ring-night transition duration-200 active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100 ${face}`}
        >
          {waiting ? (
            <Loader2 aria-hidden="true" className="size-8 animate-spin motion-reduce:animate-none" />
          ) : recording ? (
            <Square aria-hidden="true" className="size-7" fill="currentColor" />
          ) : (
            <Mic aria-hidden="true" className="size-8" strokeWidth={2.25} />
          )}
        </button>
      </div>
      {showLabel ? (
        <p className="text-sm font-semibold text-muted" aria-hidden="true">
          {t.mic[state]}
        </p>
      ) : null}
    </div>
  );
}
