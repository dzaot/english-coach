import type { ReactNode } from "react";

/**
 * Dilo's stickers: flat drawings in the three brand colors with a die-cut edge, like stickers on a laptop.
 * They are decoration and wayfinding, never the only label: every one is aria-hidden and sits next to text.
 * Same 64-unit grid and the same shapes as the logo (pills, circles, rounded squares).
 */

const O = "var(--primary)";
const B = "var(--cobalt)";
const L = "var(--accent)";
const Y = "var(--sun)";
const K = "var(--night)";
const W = "#ffffff";
const LINE = { fill: "none", stroke: K, strokeWidth: 5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export interface StickerProps {
  /** Rendered size in px. */
  readonly size?: number;
  readonly className?: string;
}

function Sticker({ size = 48, className = "", children }: StickerProps & { children: ReactNode }) {
  return (
    <svg viewBox="-6 -6 76 76" width={size} height={size} aria-hidden="true" focusable="false" className={`shrink-0 overflow-visible ${className}`}>
      <g className="sticker-cut">{children}</g>
      {children}
    </svg>
  );
}

/** The logo's shape: a speech bubble. */
export const BUBBLE_PATH =
  "M22 5h20c9.94 0 18 8.06 18 18v6c0 9.94-8.06 18-18 18H27l-12.6 10.8c-1.3 1.11-3.27.04-3.06-1.66L12.6 45.3C7.4 42.2 4 36.5 4 29v-6C4 13.06 12.06 5 22 5Z";
const STAR_PATH = "M32 4C34 20 44 30 60 32 44 34 34 44 32 60 30 44 20 34 4 32 20 30 30 20 32 4Z";

export function BubbleSticker(props: StickerProps) {
  return (
    <Sticker {...props}>
      <path d={BUBBLE_PATH} fill={O} />
      <rect x="19" y="20" width="6" height="14" rx="3" fill={K} />
      <rect x="29" y="14" width="6" height="26" rx="3" fill={K} />
      <rect x="39" y="22" width="6" height="10" rx="3" fill={K} />
    </Sticker>
  );
}

export function MicSticker(props: StickerProps) {
  return (
    <Sticker {...props}>
      <rect x="22" y="4" width="20" height="34" rx="10" fill={O} />
      <path d="M13 30a19 19 0 0 0 38 0" {...LINE} />
      <path d="M32 49v9M22 59h20" {...LINE} />
    </Sticker>
  );
}

export function FlameSticker(props: StickerProps) {
  return (
    <Sticker {...props}>
      <path d="M34 3c1 11 16 17 16 34a18 18 0 0 1-36 0c0-8 4-13 8-18 1 5 3 7 6 8-1-9 2-17 6-24Z" fill={O} />
      <path d="M32 33c3 5 8 8 8 14a8 8 0 0 1-16 0c0-6 5-9 8-14Z" fill={Y} />
    </Sticker>
  );
}

export function SparkSticker(props: StickerProps) {
  return (
    <Sticker {...props}>
      <path d={STAR_PATH} fill={Y} />
    </Sticker>
  );
}

export function CheckSticker(props: StickerProps) {
  return (
    <Sticker {...props}>
      <rect x="9" y="9" width="46" height="46" rx="13" fill={L} />
      <rect x="9" y="9" width="46" height="46" rx="13" fill={L} transform="rotate(45 32 32)" />
      <path d="M21 33l8 8 15-17" {...LINE} strokeWidth={6} />
    </Sticker>
  );
}

export function QuoteSticker(props: StickerProps) {
  const mark = "M5 40c0-16 7-26 19-29l3 7c-6 3-9 7-10 12 6 0 10 4 10 10a11 11 0 0 1-22 0Z";
  return (
    <Sticker {...props}>
      <path d={mark} fill={B} />
      <path d={mark} fill={B} transform="translate(30 0)" />
    </Sticker>
  );
}

export function WaveSticker(props: StickerProps) {
  return (
    <Sticker {...props}>
      <rect x="2" y="12" width="60" height="40" rx="20" fill={K} />
      <rect x="13" y="26" width="6" height="12" rx="3" fill={L} />
      <rect x="23" y="20" width="6" height="24" rx="3" fill={L} />
      <rect x="33" y="24" width="6" height="16" rx="3" fill={L} />
      <rect x="43" y="19" width="6" height="26" rx="3" fill={L} />
    </Sticker>
  );
}

export function BriefcaseSticker(props: StickerProps) {
  return (
    <Sticker {...props}>
      <path d="M22 20v-6a6 6 0 0 1 6-6h8a6 6 0 0 1 6 6v6" {...LINE} />
      <rect x="4" y="18" width="56" height="38" rx="10" fill={O} />
      <rect x="4" y="32" width="56" height="6" fill={K} />
      <rect x="26" y="29" width="12" height="12" rx="4" fill={W} />
    </Sticker>
  );
}

export function TeamSticker(props: StickerProps) {
  return (
    <Sticker {...props}>
      <circle cx="14" cy="24" r="8" fill={B} />
      <path d="M2 54v-6a12 12 0 0 1 24 0v6Z" fill={B} />
      <circle cx="50" cy="24" r="8" fill={L} />
      <path d="M38 54v-6a12 12 0 0 1 24 0v6Z" fill={L} />
      <circle cx="32" cy="17" r="10" fill={O} />
      <path d="M16 58v-9a16 16 0 0 1 32 0v9Z" fill={O} />
    </Sticker>
  );
}

export function HeadsetSticker(props: StickerProps) {
  return (
    <Sticker {...props}>
      <path d="M11 34v-5a21 21 0 0 1 42 0v5" {...LINE} />
      <rect x="3" y="30" width="15" height="22" rx="7.5" fill={B} />
      <rect x="46" y="30" width="15" height="22" rx="7.5" fill={B} />
      <path d="M53 52v1a7 7 0 0 1-7 7h-7" {...LINE} strokeWidth={4} />
      <rect x="27" y="55" width="14" height="9" rx="4.5" fill={O} />
    </Sticker>
  );
}

export function BoardSticker(props: StickerProps) {
  return (
    <Sticker {...props}>
      <path d="M32 44v7M21 61l11-10 11 10" {...LINE} />
      <rect x="3" y="5" width="58" height="40" rx="9" fill={L} />
      <rect x="14" y="27" width="8" height="10" rx="2.5" fill={K} />
      <rect x="28" y="20" width="8" height="17" rx="2.5" fill={K} />
      <rect x="42" y="13" width="8" height="24" rx="2.5" fill={O} />
    </Sticker>
  );
}

export function RaiseSticker(props: StickerProps) {
  return (
    <Sticker {...props}>
      <circle cx="32" cy="32" r="28" fill={Y} />
      <path d="M32 45V21M21 31l11-11 11 11" {...LINE} strokeWidth={6} />
    </Sticker>
  );
}

export function SituationSticker(props: StickerProps) {
  return (
    <Sticker {...props}>
      <path d={BUBBLE_PATH} fill={B} />
      <path d={STAR_PATH} fill={Y} transform="translate(32 26) scale(0.5) translate(-32 -32)" />
    </Sticker>
  );
}

export function BookmarkSticker(props: StickerProps) {
  return (
    <Sticker {...props}>
      <path d="M17 4h30a7 7 0 0 1 7 7v49L32 46 10 60V11a7 7 0 0 1 7-7Z" fill={L} />
      <path d="M22 24l7 7 13-14" {...LINE} />
    </Sticker>
  );
}

export function ClockSticker(props: StickerProps) {
  return (
    <Sticker {...props}>
      <circle cx="32" cy="32" r="28" fill={B} />
      <path d="M32 17v16l11 7" fill="none" stroke={W} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
    </Sticker>
  );
}

export function CalendarSticker(props: StickerProps) {
  return (
    <Sticker {...props}>
      <rect x="5" y="10" width="54" height="50" rx="12" fill={W} />
      <path d="M5 22a12 12 0 0 1 12-12h30a12 12 0 0 1 12 12v6H5Z" fill={O} />
      <rect x="18" y="2" width="6" height="15" rx="3" fill={K} />
      <rect x="40" y="2" width="6" height="15" rx="3" fill={K} />
      <circle cx="32" cy="43" r="8" fill={K} />
    </Sticker>
  );
}

export function BulbSticker(props: StickerProps) {
  return (
    <Sticker {...props}>
      <path d="M32 2a21 21 0 0 1 12 38v6H20v-6A21 21 0 0 1 32 2Z" fill={Y} />
      <rect x="21" y="48" width="22" height="6" rx="3" fill={K} />
      <rect x="25" y="57" width="14" height="6" rx="3" fill={K} />
    </Sticker>
  );
}

/** Every sticker with its name, for the brand page. */
export const STICKERS = [
  { name: "Bubble", Component: BubbleSticker },
  { name: "Mic", Component: MicSticker },
  { name: "Wave", Component: WaveSticker },
  { name: "Flame", Component: FlameSticker },
  { name: "Spark", Component: SparkSticker },
  { name: "Check", Component: CheckSticker },
  { name: "Quote", Component: QuoteSticker },
  { name: "Bulb", Component: BulbSticker },
  { name: "Interview", Component: BriefcaseSticker },
  { name: "Meeting", Component: TeamSticker },
  { name: "Client call", Component: HeadsetSticker },
  { name: "Presentation", Component: BoardSticker },
  { name: "Raise", Component: RaiseSticker },
  { name: "Your situation", Component: SituationSticker },
  { name: "Phrases", Component: BookmarkSticker },
  { name: "History", Component: ClockSticker },
  { name: "Review", Component: CalendarSticker },
] as const;
