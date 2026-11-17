/**
 * iPhone Safari only lets a page play sound that starts from a tap. The partner's voice arrives after a
 * network wait, outside the tap, so the app plays a silent clip on the first taps (Start talking, the mic,
 * Send) on one shared audio element and then reuses that element for every voice: once unlocked, it stays
 * allowed to play. The browser voice is unlocked the same way with an empty utterance.
 */

/** 0.1 s of silence (WAV). */
const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

let shared: HTMLAudioElement | null = null;
let unlocked = false;

/** The one audio element every voice plays on. Recreated if the page's Audio class changed (tests). */
export function sharedAudio(): HTMLAudioElement {
  if (!shared || !(shared instanceof Audio)) {
    shared = new Audio();
    unlocked = false;
  }
  return shared;
}

/** Call inside a tap or click handler. Safe to call many times; does nothing once unlocked. */
export function unlockAudio(): void {
  if (typeof window === "undefined" || unlocked) return;
  try {
    const el = sharedAudio();
    el.src = SILENT_WAV;
    const played = el.play();
    unlocked = true;
    played?.catch?.(() => {
      unlocked = false;
    });
    if ("speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined") {
      const blank = new SpeechSynthesisUtterance(" ");
      blank.volume = 0;
      window.speechSynthesis.speak(blank);
    }
  } catch {
    unlocked = false;
  }
}

/** For tests. */
export function resetAudioUnlock(): void {
  shared = null;
  unlocked = false;
}
