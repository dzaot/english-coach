// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { installAudioStub, installSpeechStub } from "@/test/browser-stubs";
import { resetAudioUnlock, sharedAudio, unlockAudio } from "./audio-unlock";

afterEach(() => {
  resetAudioUnlock();
  vi.unstubAllGlobals();
});

describe("audio unlock (iPhone)", () => {
  it("plays a silent clip once on the shared element and wakes the browser voice", () => {
    const audios = installAudioStub();
    const speech = installSpeechStub();
    unlockAudio();
    unlockAudio();
    expect(audios).toHaveLength(1);
    expect(audios[0].src).toMatch(/^data:audio\/wav/);
    expect(audios[0].play).toHaveBeenCalledTimes(1);
    expect(speech.speak).toHaveBeenCalledTimes(1);
    expect(sharedAudio()).toBe(audios[0]);
  });

  it("tries again on the next tap when the browser refused", async () => {
    const audios = installAudioStub(() => Promise.reject(new Error("NotAllowedError")));
    installSpeechStub();
    unlockAudio();
    await Promise.resolve();
    await Promise.resolve();
    unlockAudio();
    expect(audios[0].play).toHaveBeenCalledTimes(2);
  });
});
