import Image from "next/image";
import type { Avatar } from "@/domain/avatars";
import { useI18n } from "@/i18n/provider";

export type PortraitState = "idle" | "speaking" | "listening";

/** The practice partner's photo. Rings show who is talking: the partner (speaking) or you (listening). */
export function AvatarPortrait({ avatar, size = 160, state = "idle" }: { avatar: Avatar; size?: number; state?: PortraitState }) {
  const { t } = useI18n();
  const ring = state === "speaking" ? "ring-primary" : state === "listening" ? "ring-accent" : "ring-border";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {state !== "idle" ? (
        <span aria-hidden="true" className={`animate-ring absolute inset-0 rounded-full ${state === "speaking" ? "bg-primary" : "bg-accent"}`} />
      ) : null}
      <Image
        src={avatar.image}
        alt={t.avatars[avatar.id].alt}
        width={size}
        height={size}
        priority={size > 100}
        className={`relative size-full rounded-full object-cover ring-4 transition duration-300 ${ring}`}
      />
    </div>
  );
}
