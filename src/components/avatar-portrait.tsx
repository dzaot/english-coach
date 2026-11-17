import Image from "next/image";
import type { Avatar } from "@/domain/avatars";
import { useI18n } from "@/i18n/provider";

export type PortraitState = "idle" | "speaking" | "listening";

interface AvatarPortraitProps {
  avatar: Avatar;
  size?: number;
  state?: PortraitState;
  /** The chosen partner wears the orange ring. */
  selected?: boolean;
}

/** The practice partner's photo. A flat ring shows who is talking: the partner (speaking) or you (listening). */
export function AvatarPortrait({ avatar, size = 160, state = "idle", selected = false }: AvatarPortraitProps) {
  const { t } = useI18n();
  const halo = state === "listening" ? "bg-accent" : state === "speaking" || selected ? "bg-primary" : "bg-surface-2";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {state !== "idle" ? (
        <span aria-hidden="true" className={`animate-ring absolute inset-0 rounded-full ${state === "speaking" ? "bg-primary" : "bg-accent"}`} />
      ) : null}
      <span aria-hidden="true" className={`absolute -inset-[3px] rounded-full transition duration-300 ${halo}`} />
      <Image
        src={avatar.image}
        alt={t.avatars[avatar.id].alt}
        width={size}
        height={size}
        priority={size > 100}
        className="relative size-full rounded-full object-cover ring-[3px] ring-night"
      />
    </div>
  );
}
