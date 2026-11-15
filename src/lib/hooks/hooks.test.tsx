// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installAudioStub, installRecorderStub, installSpeechStub, removeRecorderSupport } from "@/test/browser-stubs";
import { api } from "@/lib/api";
import { RECORDER_ERRORS, useRecorder } from "./use-recorder";
import { useSpeaker } from "./use-speaker";
import { useTelemetry, ACTIVE_SESSION_MS } from "./use-telemetry";
import { useElapsedSeconds } from "./use-elapsed";
import { GATE_POLL_LIMIT_MS, GATE_POLL_MS, useGate } from "./use-gate";

vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return { ...real, api: { gate: vi.fn(), gateAction: vi.fn(), telemetry: vi.fn() } };
});
const mocked = vi.mocked(api);

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function clock(start = 1_000) {
  let now = start;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  return { advance: (ms: number) => (now += ms) };
}

describe("useRecorder", () => {
  it("records and returns the audio", async () => {
    const stub = installRecorderStub();
    const t = clock();
    const { result } = renderHook(() => useRecorder());
    await act(async () => {
      expect(await result.current.start()).toBe(true);
    });
    expect(result.current.status).toBe("recording");
    expect(stub.instances[0].mimeType).toBe("audio/webm;codecs=opus");
    t.advance(2000);
    let blob: Blob | null = null;
    await act(async () => {
      blob = await result.current.stop();
    });
    expect(blob).not.toBeNull();
    expect(stub.trackStop).toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });

  it("drops a recording that is too short", async () => {
    installRecorderStub();
    clock();
    const { result } = renderHook(() => useRecorder());
    await act(async () => void (await result.current.start()));
    let blob: Blob | null = new Blob();
    await act(async () => {
      blob = await result.current.stop();
    });
    expect(blob).toBeNull();
    expect(result.current.error).toBe(RECORDER_ERRORS.tooShort);
    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });

  it("explains a denied microphone, a missing one and other failures", async () => {
    for (const [fail, message] of [
      ["NotAllowedError", RECORDER_ERRORS.denied],
      ["NotFoundError", RECORDER_ERRORS.noMic],
      ["AbortError", RECORDER_ERRORS.failed],
    ] as const) {
      installRecorderStub({ fail });
      const { result } = renderHook(() => useRecorder());
      await act(async () => {
        expect(await result.current.start()).toBe(false);
      });
      expect(result.current.error).toBe(message);
    }
  });

  it("says when the browser cannot record", async () => {
    removeRecorderSupport();
    const { result } = renderHook(() => useRecorder());
    await act(async () => void (await result.current.start()));
    expect(result.current.error).toBe(RECORDER_ERRORS.unsupported);
    expect(await result.current.stop()).toBeNull();
  });

  it("stops by itself at the maximum length and cancels cleanly", async () => {
    installRecorderStub();
    vi.useFakeTimers();
    const onAutoStop = vi.fn();
    const { result } = renderHook(() => useRecorder({ onAutoStop, maxMs: 5000 }));
    await act(async () => void (await result.current.start()));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5001);
    });
    expect(onAutoStop).toHaveBeenCalledWith(expect.any(Blob));
    await act(async () => void (await result.current.start()));
    act(() => result.current.cancel());
    expect(result.current.status).toBe("idle");
  });
});

describe("useSpeaker", () => {
  it("plays server audio and clears when it ends", async () => {
    const audios = installAudioStub();
    installSpeechStub();
    const { result } = renderHook(() => useSpeaker());
    act(() => result.current.play("a", "Hello", { base64: "AAA", mime: "audio/mpeg" }));
    expect(audios[0].src).toBe("data:audio/mpeg;base64,AAA");
    expect(result.current.speakingId).toBe("a");
    act(() => audios[0].onended?.());
    expect(result.current.speakingId).toBeNull();
  });

  it("falls back to the browser voice when playback is blocked", async () => {
    installAudioStub(() => Promise.reject(new Error("NotAllowedError")));
    const speech = installSpeechStub();
    const { result } = renderHook(() => useSpeaker());
    act(() => result.current.play("a", "Hello", { base64: "AAA", mime: "audio/mpeg" }));
    await waitFor(() => expect(speech.speak).toHaveBeenCalled());
  });

  it("uses the browser voice without server audio, and does nothing without speech support", () => {
    const speech = installSpeechStub();
    const { result } = renderHook(() => useSpeaker());
    act(() => result.current.play("b", "Hi"));
    expect(speech.speak).toHaveBeenCalledTimes(1);
    expect(result.current.speakingId).toBeNull();
    vi.unstubAllGlobals();
    vi.stubGlobal("SpeechSynthesisUtterance", undefined);
    const second = renderHook(() => useSpeaker());
    act(() => second.result.current.play("c", "Hi"));
    expect(second.result.current.speakingId).toBeNull();
  });
});

describe("useTelemetry", () => {
  it("reports app_opened, then active_session every 30 minutes", async () => {
    vi.useFakeTimers();
    mocked.telemetry.mockResolvedValue({ result: "sent" });
    renderHook(() => useTelemetry(true));
    expect(mocked.telemetry).toHaveBeenCalledWith("app_opened");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ACTIVE_SESSION_MS);
    });
    expect(mocked.telemetry).toHaveBeenCalledWith("active_session");
  });

  it("stays quiet before the gate passes", () => {
    mocked.telemetry.mockClear();
    renderHook(() => useTelemetry(false));
    expect(mocked.telemetry).not.toHaveBeenCalled();
  });
});

describe("useElapsedSeconds", () => {
  it("counts seconds since the start", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-15T10:00:10Z"));
    const { result } = renderHook(() => useElapsedSeconds("2026-11-15T10:00:00Z"));
    expect(result.current).toBe(10);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(result.current).toBe(12);
    expect(renderHook(() => useElapsedSeconds("not a date")).result.current).toBe(0);
  });
});

const signIn = { state: "screen", screen: { id: "sign_in", title: "Sign in with publik", body: "", note: null, buttons: [] }, links: { signIn: "https://c" } } as const;
const choose = { state: "screen", screen: { id: "choose", title: "Choose how to pay for AI", body: "", note: null, buttons: [] }, links: {} } as const;
const connect = { ...choose, screen: { ...choose.screen, title: "Connect your plan" } } as const;
const ready = { state: "ready", mode: "publik", account: "ana", usedPercent: 3 } as const;

describe("useGate", () => {
  it("loads the state, waits for sign-in in the browser and stops polling when done", async () => {
    vi.useFakeTimers();
    mocked.gate.mockResolvedValueOnce(signIn).mockResolvedValueOnce(signIn).mockResolvedValueOnce(ready);
    const { result } = renderHook(() => useGate());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.state).toEqual(signIn);
    act(() => result.current.startWaiting("sign_in"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(GATE_POLL_MS * 2);
    });
    expect(result.current.state).toEqual(ready);
    expect(result.current.waiting).toBeNull();
  });

  it("waits for a plan until Connect your plan shows up", async () => {
    vi.useFakeTimers();
    mocked.gate.mockResolvedValueOnce(choose).mockResolvedValueOnce(connect);
    const { result } = renderHook(() => useGate());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    act(() => result.current.startWaiting("get_plan"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(GATE_POLL_MS);
    });
    expect(result.current.waiting).toBeNull();
    expect(result.current.state).toEqual(connect);
  });

  it("gives up after 10 minutes", async () => {
    vi.useFakeTimers();
    mocked.gate.mockResolvedValue(signIn);
    const { result } = renderHook(() => useGate());
    act(() => result.current.startWaiting("sign_in"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(GATE_POLL_LIMIT_MS + GATE_POLL_MS * 2);
    });
    expect(result.current.waiting).toBeNull();
    expect(result.current.timedOut).toBe("sign_in");
  });

  it("shows errors from loading and from actions, and applies answers", async () => {
    mocked.gate.mockRejectedValueOnce(new Error("Sin conexión")).mockResolvedValueOnce(choose);
    const { result } = renderHook(() => useGate());
    await waitFor(() => expect(result.current.error).toBe("Sin conexión"));
    await act(async () => result.current.refresh());
    expect(result.current.state).toEqual(choose);
    mocked.gateAction.mockRejectedValueOnce(new Error("Clave inválida")).mockResolvedValueOnce(ready);
    let ok = true;
    await act(async () => {
      ok = await result.current.act({ action: "own_key", key: "x" });
    });
    expect(ok).toBe(false);
    expect(result.current.error).toBe("Clave inválida");
    await act(async () => {
      ok = await result.current.act({ action: "connect" });
    });
    expect(ok).toBe(true);
    expect(result.current.state).toEqual(ready);
  });

  it("refresh reports a failure", async () => {
    mocked.gate.mockResolvedValueOnce(choose).mockRejectedValueOnce(new Error("Caído"));
    const { result } = renderHook(() => useGate());
    await waitFor(() => expect(result.current.state).toEqual(choose));
    await act(async () => result.current.refresh());
    expect(result.current.error).toBe("Caído");
  });
});
