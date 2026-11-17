import Image from "next/image";
import type { Avatar } from "@/domain/avatars";
import { useI18n } from "@/i18n/provider";
import { captionWords } from "@/lib/caption";
import type { PortraitState } from "./avatar-portrait";
import { VoiceField } from "./brand/voice-bars";
import { CHIP_STAGE } from "./ui";

/** The practice as a video call on the cobalt stage: the other person's picture large, your own tile in the corner, and live captions. */

interface CallStageProps {
  readonly avatar: Avatar;
  readonly role: string;
  readonly state: PortraitState;
  /** The line your coworker is saying (or said last). */
  readonly caption: string;
  /** Playback progress of that line, 0 to 1; null when it is not playing. */
  readonly captionProgress: number | null;
  /** Microphone loudness 0 to 1 while you talk. */
  readonly micLevel: number;
  readonly status: string;
}

/** The photos are 480px squares: shown as large as the phone allows, like the other person's video. */
const PHOTO = 480;
/** How much your own tile's ring grows with your voice. */
const MIC_SCALE = 0.35;

export function CallStage({ avatar, role, state, caption, captionProgress, micLevel, status }: CallStageProps) {
  const { t } = useI18n();
  const speaking = state === "speaking";
  const listening = state === "listening";
  const dot = listening ? "bg-accent animate-breathe" : speaking ? "bg-white animate-breathe" : "bg-white/60";
  const words = captionWords(caption, speaking ? captionProgress : null);

  return (
    <section aria-label={t.practice.callWith(avatar.name)} className="relative">
      {/* Their video: the whole picture, edge to edge, with a frame that lights up while they talk. */}
      <div
        className={`relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-[2rem] bg-cobalt-deep outline outline-[5px] -outline-offset-[5px] transition-[outline-color] duration-300 ${
          speaking ? "outline-white" : "outline-transparent"
        }`}
      >
        <Image src={avatar.image} alt={t.avatars[avatar.id].alt} width={PHOTO} height={PHOTO} priority className="size-full object-cover" />

        <span className="absolute left-3 top-3 inline-flex min-h-8 items-center gap-2 rounded-full bg-night/85 px-3 text-sm font-semibold text-ink">
          <span aria-hidden="true" className="animate-breathe size-2 rounded-full bg-accent" /> {t.practice.live}
        </span>

        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3">
          <div className="min-w-0 rounded-2xl bg-night/85 px-3.5 py-2 text-ink">
            <p className="display truncate text-lg">{avatar.name}</p>
            <p className="truncate text-sm text-muted">{role}</p>
          </div>

          {/* Your side of the call: it turns lime and follows your volume while you talk. */}
          <div className="relative flex size-[4.5rem] shrink-0 items-center justify-center">
            <span
              aria-hidden="true"
              className={`absolute inset-0 rounded-2xl transition-transform duration-100 ${listening ? "bg-accent" : "bg-night/85"}`}
              style={listening ? { transform: `scale(${1 + micLevel * MIC_SCALE})` } : undefined}
            />
            <div className="relative flex size-full flex-col items-center justify-center gap-1 rounded-2xl bg-night p-2">
              <VoiceField active={listening} count={5} barClass={listening ? "bg-accent" : "bg-surface-2"} className="h-6 w-9" />
              <span className="text-xs font-semibold text-ink">{t.practice.you}</span>
            </div>
          </div>
        </div>

        {speaking ? <VoiceField active count={5} barClass="bg-white" className="absolute right-3 top-3 h-8 w-10 rounded-full bg-night/85 px-2 py-1.5" /> : null}
      </div>

      <p className={`${CHIP_STAGE} mx-auto mt-5 flex w-fit`} aria-live="polite">
        <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${dot}`} />
        {status}
      </p>

      {caption ? (
        <p lang="en" className="mx-auto mt-5 max-w-[30ch] text-balance text-center text-2xl font-bold leading-[1.3]" aria-hidden="true">
          {words.map((w, i) => (
            <span
              key={`${w.text}-${i}`}
              data-state={w.state}
              className={`rounded-md transition-colors duration-150 ${
                w.state === "now" ? "bg-accent px-1 text-night" : w.state === "next" ? "text-white/65" : ""
              }`}
            >
              {w.text}{" "}
            </span>
          ))}
        </p>
      ) : null}
    </section>
  );
}
