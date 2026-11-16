// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import type { DrillResult, WordGuide } from "@/lib/types";
import { installRecorderStub, installSpeechStub } from "@/test/browser-stubs";
import { progress } from "@/test/fixtures";
import { SayItButton } from "./say-it-button";

vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return { ...real, api: { drill: vi.fn(), pronounce: vi.fn() } };
});
const mocked = vi.mocked(api);
const phrase = progress().phrases[1]; // "Set up a meeting"

const plain = (text: string): WordGuide => ({ text, key: text.toLowerCase(), respelling: text.toUpperCase(), syllables: 1, stressed: 0, tips: [], focus: false });
const guide: WordGuide[] = [
  plain("Set"),
  plain("up"),
  plain("a"),
  {
    text: "meeting",
    key: "meeting",
    respelling: "MEE-ding",
    syllables: 2,
    stressed: 0,
    focus: true,
    tips: [{ id: "flap_t", label: "Soft t", example: "water", tipEs: "Entre vocales la t suena suave.", tipEn: "Between vowels the t is soft." }],
  },
];

const result = (over: Partial<DrillResult>): DrillResult => ({
  said: "Set up a meeting",
  score: 100,
  passed: true,
  missing: [],
  words: guide.map((g) => ({ text: g.text, status: "clear" as const, heardAs: null })),
  pace: { wordsPerMinute: 140, longPauses: 0 },
  timings: [],
  phrase,
  ...over,
});

let now = 1000;
beforeEach(() => {
  installRecorderStub();
  installSpeechStub();
  vi.spyOn(Date, "now").mockImplementation(() => now);
  mocked.pronounce.mockResolvedValue({ words: guide });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function sayIt() {
  await userEvent.click(screen.getByRole("button", { name: /Say it|Try again/ }));
  await screen.findByRole("button", { name: /Tap to finish/ });
  now += 2000;
  await userEvent.click(screen.getByRole("button", { name: /Tap to finish/ }));
}

describe("SayItButton (sound check)", () => {
  it("shows how each word sounds and which sounds to watch", async () => {
    render(<SayItButton phraseId={phrase.id} text={phrase.better} tipsInSpanish />);
    const word = await screen.findByRole("button", { name: /meeting/ });
    expect(word).toHaveAccessibleName(/practice this one: 1 sound to watch/);
    await userEvent.click(word);
    expect(screen.getByText("MEE-ding")).toBeInTheDocument();
    expect(screen.getByText("Entre vocales la t suena suave.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Hear it slowly/ }));
  });

  it("gives English tips when the learner is advanced", async () => {
    render(<SayItButton phraseId={phrase.id} text={phrase.better} />);
    await userEvent.click(await screen.findByRole("button", { name: /meeting/ }));
    expect(screen.getByText("Between vowels the t is soft.")).toBeInTheDocument();
  });

  it("celebrates a phrase said clearly, with its pace, and reports the new schedule", async () => {
    const updated = { ...phrase, step: 1, dueDay: "2026-11-16" };
    mocked.drill.mockResolvedValueOnce(result({ phrase: updated }));
    const onDrilled = vi.fn();
    render(<SayItButton phraseId={phrase.id} text={phrase.better} onDrilled={onDrilled} />);
    await sayIt();
    expect(await screen.findByText(/Well said!/)).toBeInTheDocument();
    expect(screen.getByText(/4 of 4 words clear/)).toBeInTheDocument();
    expect(screen.getByText(/140 words a minute/)).toBeInTheDocument();
    expect(mocked.drill).toHaveBeenCalledWith(phrase.id, expect.any(Blob));
    await waitFor(() => expect(onDrilled).toHaveBeenCalledWith(updated));
    expect(screen.getByRole("button", { name: /Try again/ })).toBeInTheDocument();
  });

  it("marks the words that were not understood and what was heard instead", async () => {
    mocked.drill.mockResolvedValueOnce(
      result({
        said: "set up a eating",
        score: 75,
        passed: false,
        missing: ["meeting"],
        words: [...guide.slice(0, 3).map((g) => ({ text: g.text, status: "clear" as const, heardAs: null })), { text: "meeting", status: "missed", heardAs: "eating" }],
        pace: { wordsPerMinute: 70, longPauses: 2 },
      }),
    );
    render(<SayItButton phraseId={phrase.id} text={phrase.better} />);
    await sayIt();
    expect(await screen.findByText(/3 of 4 words clear/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /meeting: not understood/ })).toBeInTheDocument();
    expect(screen.getByText(/We heard “eating”/)).toBeInTheDocument();
    expect(screen.getByText(/2 long pauses/)).toBeInTheDocument();
  });

  it("still works when the sound guide cannot load", async () => {
    mocked.pronounce.mockRejectedValueOnce(new Error("offline"));
    render(<SayItButton phraseId={phrase.id} text={phrase.better} />);
    expect(await screen.findByRole("button", { name: /meeting/ })).toBeInTheDocument();
  });

  it("shows a friendly error", async () => {
    mocked.drill.mockRejectedValueOnce(new Error("We could not understand the audio."));
    render(<SayItButton phraseId={phrase.id} text={phrase.better} />);
    await sayIt();
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not understand the audio.");
  });
});
