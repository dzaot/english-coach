import { Loader2, Mic, Square } from "lucide-react";

export type MicState = "idle" | "starting" | "recording" | "busy";

const LABELS: Record<MicState, string> = {
  idle: "Tap to talk",
  starting: "Opening microphone…",
  recording: "Tap to send",
  busy: "One moment…",
};

/** How much the ring grows at full loudness. */
const VOICE_RING_SCALE = 0.6;

export function micLabel(state: MicState): string {
  return LABELS[state];
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
  const recording = state === "recording";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {recording && level > 0 ? (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-primary/40 transition-transform duration-100"
            style={{ transform: `scale(${1 + level * VOICE_RING_SCALE})` }}
          />
        ) : null}
        {recording && level === 0 ? <span aria-hidden="true" className="animate-ring absolute inset-0 rounded-full bg-primary" /> : null}
        <button
          type="button"
          onClick={onPress}
          disabled={disabled || state === "busy" || state === "starting"}
          aria-pressed={recording}
          aria-label={recording ? "Stop and send your answer" : "Record your answer"}
          className={`relative flex size-20 cursor-pointer items-center justify-center rounded-full shadow-card transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
            recording ? "bg-ink text-bg" : "bg-primary text-on-primary hover:brightness-110"
          }`}
        >
          {state === "busy" || state === "starting" ? (
            <Loader2 aria-hidden="true" className="size-8 animate-spin motion-reduce:animate-none" />
          ) : recording ? (
            <Square aria-hidden="true" className="size-7" fill="currentColor" />
          ) : (
            <Mic aria-hidden="true" className="size-8" />
          )}
        </button>
      </div>
      {showLabel ? (
        <p className="text-sm font-semibold text-muted" aria-hidden="true">
          {LABELS[state]}
        </p>
      ) : null}
    </div>
  );
}
