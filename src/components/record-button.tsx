import { Loader2, Mic, Square } from "lucide-react";

export type MicState = "idle" | "starting" | "recording" | "busy";

const LABELS: Record<MicState, string> = {
  idle: "Toca para hablar",
  starting: "Abriendo micrófono…",
  recording: "Toca para enviar",
  busy: "Espera un momento…",
};

export function micLabel(state: MicState): string {
  return LABELS[state];
}

/** The big push-to-talk control: tap to record, tap again to send. Space bar works too (see PracticeView). */
export function RecordButton({
  state,
  onPress,
  disabled,
  showLabel = true,
}: {
  state: MicState;
  onPress: () => void;
  disabled?: boolean;
  /** false when the parent shows micLabel() itself, for example below a toolbar. */
  showLabel?: boolean;
}) {
  const recording = state === "recording";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {recording ? <span aria-hidden="true" className="animate-ring absolute inset-0 rounded-full bg-primary" /> : null}
        <button
          type="button"
          onClick={onPress}
          disabled={disabled || state === "busy" || state === "starting"}
          aria-pressed={recording}
          aria-label={recording ? "Detener y enviar tu respuesta" : "Grabar tu respuesta"}
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
