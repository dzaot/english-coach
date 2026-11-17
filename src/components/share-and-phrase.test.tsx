// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getPowerPhrase } from "@/domain/power-phrases";
import { SHARE_URL } from "@/lib/share";
import { installSpeechStub } from "@/test/browser-stubs";
import { PowerPhraseCard } from "./power-phrase-card";
import { ShareCard } from "./share-card";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const stubNavigator = (over: { share?: unknown; writeText?: unknown }) => {
  Object.defineProperty(navigator, "share", { value: over.share, configurable: true, writable: true });
  Object.defineProperty(navigator, "clipboard", { value: { writeText: over.writeText }, configurable: true, writable: true });
};

describe("ShareCard", () => {
  it("opens the share sheet with Dilo's publik page", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ share, writeText: vi.fn() });
    render(<ShareCard />);
    await userEvent.click(screen.getByRole("button", { name: /Share Dilo/ }));
    expect(share).toHaveBeenCalledWith({ title: "Dilo", text: expect.stringContaining("Dilo"), url: "https://publikhq.com/dilo" });
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("copies the link where there is no share sheet, and says so", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ share: undefined, writeText });
    render(<ShareCard />);
    await userEvent.click(screen.getByRole("button", { name: /Share Dilo/ }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining(SHARE_URL));
    expect(screen.getByRole("status")).toHaveTextContent("Link copied");
  });

  it("stays quiet when the sheet is closed, and shows the link if nothing works", async () => {
    stubNavigator({ share: vi.fn().mockRejectedValue(new DOMException("closed", "AbortError")), writeText: vi.fn() });
    render(<ShareCard />);
    await userEvent.click(screen.getByRole("button", { name: /Share Dilo/ }));
    expect(screen.getByRole("status")).toHaveTextContent("");
    cleanup();

    stubNavigator({ share: vi.fn().mockRejectedValue(new Error("blocked")), writeText: vi.fn().mockRejectedValue(new Error("denied")) });
    render(<ShareCard />);
    await userEvent.click(screen.getByRole("button", { name: /Share Dilo/ }));
    expect(screen.getByRole("status")).toHaveTextContent(SHARE_URL);
  });
});

describe("PowerPhraseCard", () => {
  it("shows the phrase, what it means, the bonus, and says the example out loud", async () => {
    const speech = installSpeechStub();
    const phrase = getPowerPhrase("follow_up")!;
    render(<PowerPhraseCard phrase={phrase} />);
    expect(screen.getByRole("heading", { name: "Phrase of the day" })).toBeInTheDocument();
    expect(screen.getByText("follow up")).toBeInTheDocument();
    expect(screen.getByText(phrase.meaning)).toBeInTheDocument();
    expect(screen.getByText("Say it in a call today for +5 points.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Hear it/ }));
    expect(speech.speak).toHaveBeenCalledTimes(1);
  });
});
