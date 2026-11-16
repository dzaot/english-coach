import Image from "next/image";
import type { Avatar } from "@/domain/avatars";
import { captionWords } from "@/lib/caption";
import type { PortraitState } from "./avatar-portrait";

/** The practice as a video call: your coworker's photo, a glow that reacts to who is talking, and live captions. */

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

const PHOTO = 168;
/** How much the glow grows with your voice. */
const MIC_SCALE = 0.35;

export function CallStage({ avatar, role, state, caption, captionProgress, micLevel, status }: CallStageProps) {
  const glow =
    state === "speaking"
      ? "bg-brand opacity-80 animate-orb"
      : state === "listening"
        ? "bg-accent opacity-70 transition-transform duration-100"
        : "bg-brand opacity-25";
  const words = captionWords(caption, state === "speaking" ? captionProgress : null);

  return (
    <section aria-label={`Call with ${avatar.name}`} className="relative overflow-hidden rounded-[2rem] bg-night px-5 pb-6 pt-5 text-on-night shadow-card">
      <div className="flex items-center justify-between text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-on-night/10 px-2.5 py-1 font-semibold">
          <span aria-hidden="true" className="size-2 rounded-full bg-sun" /> Live practice
        </span>
        <span className="text-on-night/80">{role}</span>
      </div>

      <div className="mt-4 flex flex-col items-center text-center">
        <div className="relative" style={{ width: PHOTO, height: PHOTO }}>
          <span
            aria-hidden="true"
            className={`absolute -inset-4 rounded-full blur-xl ${glow}`}
            style={state === "listening" ? { transform: `scale(${1 + micLevel * MIC_SCALE})` } : undefined}
          />
          <Image
            src={avatar.image}
            alt={avatar.alt}
            width={PHOTO}
            height={PHOTO}
            priority
            className="relative size-full rounded-full object-cover ring-4 ring-on-night/15"
          />
        </div>
        <p className="mt-4 font-display text-2xl font-extrabold">{avatar.name}</p>
        <p className="mt-1 text-sm font-semibold text-on-night/80" aria-live="polite">
          {status}
        </p>
      </div>

      {caption ? (
        <p lang="en" className="mx-auto mt-5 max-w-[34ch] text-center font-display text-[1.375rem] font-semibold leading-snug" aria-hidden="true">
          {words.map((w, i) => (
            <span
              key={`${w.text}-${i}`}
              data-state={w.state}
              className={`rounded-md transition-colors duration-150 ${
                w.state === "now" ? "bg-sun px-1 text-on-sun" : w.state === "next" ? "text-on-night/60" : ""
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
