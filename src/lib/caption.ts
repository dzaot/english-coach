/** Live captions: which words of a line the partner has already said, given playback progress (0 to 1). */

export type CaptionState = "said" | "now" | "next";

export interface CaptionWord {
  readonly text: string;
  readonly state: CaptionState;
}

/** `ratio` null means not playing: the whole line is shown as said. */
export function captionWords(text: string, ratio: number | null): CaptionWord[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (ratio === null || ratio >= 1) return words.map((w) => ({ text: w, state: "said" }));
  const total = words.reduce((n, w) => n + w.length + 1, 0);
  let seen = 0;
  const ends = words.map((w) => (seen += w.length + 1) / total);
  const current = Math.max(0, ends.findIndex((end) => end > ratio));
  return words.map((w, i) => ({ text: w, state: i < current ? "said" : i === current ? "now" : "next" }));
}
