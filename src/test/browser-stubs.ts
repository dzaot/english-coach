import { vi } from "vitest";

/** Browser APIs jsdom does not have: speech synthesis, Audio playback, MediaRecorder, getUserMedia. */

export function installSpeechStub() {
  const speak = vi.fn((u: { onend?: (() => void) | null }) => u.onend?.());
  const cancel = vi.fn();
  const synth = { speak, cancel, getVoices: () => [{ lang: "en-US", name: "Samantha" }] };
  class Utterance {
    text: string;
    lang = "";
    rate = 1;
    voice: unknown = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onboundary: ((e: { charIndex: number }) => void) | null = null;
    constructor(text: string) {
      this.text = text;
    }
  }
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
  return { speak, cancel };
}

export function installAudioStub(play: () => Promise<void> = () => Promise.resolve()) {
  const created: { src: string; playbackRate: number; play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn>; onended: (() => void) | null }[] = [];
  class FakeAudio {
    src: string;
    playbackRate = 1;
    play = vi.fn(play);
    pause = vi.fn();
    onended: (() => void) | null = null;
    ontimeupdate: (() => void) | null = null;
    currentTime = 0;
    duration = Number.NaN;
    constructor(src: string) {
      this.src = src;
      created.push(this);
    }
  }
  vi.stubGlobal("Audio", FakeAudio);
  return created;
}

export interface RecorderStub {
  instances: FakeMediaRecorder[];
  trackStop: ReturnType<typeof vi.fn>;
  getUserMedia: ReturnType<typeof vi.fn>;
}

export class FakeMediaRecorder {
  static isTypeSupported = (t: string) => t === "audio/webm;codecs=opus";
  static instances: FakeMediaRecorder[] = [];
  state: "inactive" | "recording" = "inactive";
  mimeType: string;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(_stream: unknown, opts?: { mimeType?: string }) {
    this.mimeType = opts?.mimeType ?? "audio/webm";
    FakeMediaRecorder.instances.push(this);
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob([new Uint8Array(1000)], { type: this.mimeType }) });
    this.onstop?.();
  }
}

export function installRecorderStub(opts: { fail?: string } = {}): RecorderStub {
  FakeMediaRecorder.instances = [];
  const trackStop = vi.fn();
  const getUserMedia = vi.fn(async () => {
    if (opts.fail) throw Object.assign(new Error(opts.fail), { name: opts.fail });
    return { getTracks: () => [{ stop: trackStop }] };
  });
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
  return { instances: FakeMediaRecorder.instances, trackStop, getUserMedia };
}

export function removeRecorderSupport() {
  vi.stubGlobal("MediaRecorder", undefined);
  Object.defineProperty(navigator, "mediaDevices", { value: undefined, configurable: true });
}
