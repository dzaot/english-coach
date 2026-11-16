// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installSpeechStub } from "@/test/browser-stubs";
import { feedback, finishResult, progress } from "@/test/fixtures";
import { FeedbackView } from "./feedback-view";
import { HistoryView } from "./history-view";
import { HomeView } from "./home-view";
import { PhrasesView } from "./phrases-view";
import { ChatBubble } from "./chat-bubble";
import { RecordButton } from "./record-button";
import { ErrorBanner, Spinner } from "./ui";

let speech: ReturnType<typeof installSpeechStub>;
beforeEach(() => {
  speech = installSpeechStub();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("HomeView", () => {
  it("starts the chosen scenario and industry", async () => {
    const onStart = vi.fn();
    render(<HomeView level="intermediate" avatarId="sarah" onChangePrefs={vi.fn()} progress={progress()} starting={false} onStart={onStart} onOpenPhrases={vi.fn()} onOpenHistory={vi.fn()} />);
    await userEvent.click(screen.getByLabelText(/Salary negotiation/));
    await userEvent.click(screen.getByLabelText("Construction"));
    await userEvent.click(screen.getByRole("button", { name: /Start talking/ }));
    expect(onStart).toHaveBeenCalledWith("salary_negotiation", "construction");
  });

  it("lets the person pick a partner and a level", async () => {
    const onChangePrefs = vi.fn();
    render(<HomeView level="intermediate" avatarId="sarah" onChangePrefs={onChangePrefs} progress={progress()} starting={false} onStart={vi.fn()} onOpenPhrases={vi.fn()} onOpenHistory={vi.fn()} />);
    expect(screen.getByAltText(/Priya, a woman/)).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/James/));
    expect(onChangePrefs).toHaveBeenCalledWith({ avatarId: "james" });
    await userEvent.click(screen.getByLabelText(/Beginner/));
    expect(onChangePrefs).toHaveBeenCalledWith({ level: "beginner" });
    expect(screen.getByLabelText(/Intermediate/)).toBeChecked();
  });

  it("shows the streak, the week and the counts", async () => {
    const onOpenPhrases = vi.fn();
    const onOpenHistory = vi.fn();
    render(<HomeView level="intermediate" avatarId="sarah" onChangePrefs={vi.fn()} progress={progress()} starting={false} onStart={vi.fn()} onOpenPhrases={onOpenPhrases} onOpenHistory={onOpenHistory} />);
    expect(screen.getByText("2 days")).toBeInTheDocument();
    expect(screen.getByText(/keep your streak/)).toBeInTheDocument();
    expect(screen.getAllByText(/practiced$/)).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: /Phrases to review/ }));
    await userEvent.click(screen.getByRole("button", { name: /Practice history/ }));
    expect(onOpenPhrases).toHaveBeenCalled();
    expect(onOpenHistory).toHaveBeenCalled();
  });

  it("invites to today's review when phrases are due", async () => {
    const onOpenPhrases = vi.fn();
    const { rerender } = render(<HomeView level="intermediate" avatarId="sarah" onChangePrefs={vi.fn()} progress={progress({ dueToday: 3 })} starting={false} onStart={vi.fn()} onOpenPhrases={onOpenPhrases} onOpenHistory={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Today's review/ }));
    expect(onOpenPhrases).toHaveBeenCalled();
    expect(screen.getByText(/3 phrases are waiting/)).toBeInTheDocument();
    rerender(<HomeView level="intermediate" avatarId="sarah" onChangePrefs={vi.fn()} progress={progress({ dueToday: 1 })} starting={false} onStart={vi.fn()} onOpenPhrases={onOpenPhrases} onOpenHistory={vi.fn()} />);
    expect(screen.getByText(/1 phrase is waiting/)).toBeInTheDocument();
    rerender(<HomeView level="intermediate" avatarId="sarah" onChangePrefs={vi.fn()} progress={progress({ dueToday: 0 })} starting={false} onStart={vi.fn()} onOpenPhrases={onOpenPhrases} onOpenHistory={vi.fn()} />);
    expect(screen.queryByText("Today's review")).not.toBeInTheDocument();
  });

  it("encourages a first session and disables the button while starting", () => {
    const p = progress({ streak: { current: 0, best: 0, practicedToday: false } });
    render(<HomeView level="intermediate" avatarId="sarah" onChangePrefs={vi.fn()} progress={p} starting onStart={vi.fn()} onOpenPhrases={vi.fn()} onOpenHistory={vi.fn()} />);
    expect(screen.getByText(/start your streak/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Getting ready/ })).toBeDisabled();
  });

  it("celebrates when today is done", () => {
    const p = progress({ streak: { current: 1, best: 1, practicedToday: true } });
    render(<HomeView level="intermediate" avatarId="sarah" onChangePrefs={vi.fn()} progress={p} starting={false} onStart={vi.fn()} onOpenPhrases={vi.fn()} onOpenHistory={vi.fn()} />);
    expect(screen.getByText(/You practiced today/)).toBeInTheDocument();
    expect(screen.getAllByText("1 day")).toHaveLength(2);
  });

  it("renders without progress yet", () => {
    render(<HomeView level="intermediate" avatarId="sarah" onChangePrefs={vi.fn()} progress={null} starting={false} onStart={vi.fn()} onOpenPhrases={vi.fn()} onOpenHistory={vi.fn()} />);
    expect(screen.queryByText("Tu racha")).not.toBeInTheDocument();
  });
});

describe("FeedbackView", () => {
  it("shows the score, the three better phrases and the vocabulary", async () => {
    const onAgain = vi.fn();
    const onHome = vi.fn();
    render(<FeedbackView practice={finishResult.practice} feedback={feedback} streak={finishResult.streak} onPracticeAgain={onAgain} onHome={onHome} />);
    expect(screen.getByRole("img", { name: "Score: 78 out of 100" })).toBeInTheDocument();
    expect(screen.getByText("Great job")).toBeInTheDocument();
    expect(screen.getByText("I created a process")).toBeInTheDocument();
    expect(screen.getByText("follow up")).toBeInTheDocument();
    expect(screen.getByText(/streak\. Come back/)).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: /Hear how it sounds/ })[0]);
    expect(speech.speak).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /Practice again/ }));
    await userEvent.click(screen.getByRole("button", { name: "Back to home" }));
    expect(onAgain).toHaveBeenCalled();
    expect(onHome).toHaveBeenCalled();
  });

  it("offers Say it on saved phrases", () => {
    const saved = [{ ...progress().phrases[1], better: "I created a process", practiceId: "p1" }];
    render(<FeedbackView practice={finishResult.practice} feedback={feedback} streak={null} phrases={saved} onPracticeAgain={vi.fn()} onHome={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: /Say it/ })).toHaveLength(1);
  });

  it("hides the streak banner and vocabulary when there are none", () => {
    render(<FeedbackView practice={finishResult.practice} feedback={{ ...feedback, vocabulary: [] }} streak={null} onPracticeAgain={vi.fn()} onHome={vi.fn()} />);
    expect(screen.queryByText(/streak\. Come back/)).not.toBeInTheDocument();
    expect(screen.queryByText("Vocabulary to keep")).not.toBeInTheDocument();
  });
});

describe("PhrasesView", () => {
  it("lists pending phrases first and toggles them", async () => {
    const onToggle = vi.fn();
    render(<PhrasesView phrases={progress().phrases} onToggle={onToggle} onBack={vi.fn()} />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Set up a meeting");
    expect(items[0]).toHaveTextContent("Due today");
    expect(screen.getByText(/due today/)).toBeInTheDocument();
    await userEvent.click(screen.getAllByLabelText("I know this one")[0]);
    expect(onToggle).toHaveBeenCalledWith("ph2", true);
    await userEvent.click(screen.getAllByRole("button", { name: /Listen/ })[0]);
    expect(speech.speak).toHaveBeenCalled();
  });

  it("shows the next review day for phrases not due yet", () => {
    const later = { ...progress().phrases[1], dueDay: "2099-01-05" };
    render(<PhrasesView phrases={[later]} onToggle={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText(/Next review/)).toBeInTheDocument();
    expect(screen.queryByText("Due today")).not.toBeInTheDocument();
  });

  it("explains the empty state", () => {
    render(<PhrasesView phrases={[]} onToggle={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText("No phrases yet.")).toBeInTheDocument();
  });
});

describe("HistoryView", () => {
  it("opens a past practice", async () => {
    const onOpen = vi.fn();
    render(<HistoryView history={progress().history} onOpen={onOpen} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Client call/ }));
    expect(onOpen).toHaveBeenCalledWith("h1");
  });

  it("explains the empty state and goes back", async () => {
    const onBack = vi.fn();
    render(<HistoryView history={[]} onOpen={vi.fn()} onBack={onBack} />);
    expect(screen.getByText(/You have not finished/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe("small pieces", () => {
  it("ErrorBanner shows one top-up link and a retry", async () => {
    const onRetry = vi.fn();
    render(<ErrorBanner message="Se acabó tu saldo" topUpUrl="https://publikhq.com/wallet" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Se acabó tu saldo");
    expect(screen.getByRole("link", { name: "Top up on publik" })).toHaveAttribute("href", "https://publikhq.com/wallet");
    await userEvent.click(screen.getByRole("button", { name: /Try again/ }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("Spinner announces its label", () => {
    render(<Spinner label="Loading…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("RecordButton reflects each state", () => {
    const { rerender } = render(<RecordButton state="idle" onPress={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Record your answer" })).toHaveAttribute("aria-pressed", "false");
    rerender(<RecordButton state="recording" onPress={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Stop and send/ })).toHaveAttribute("aria-pressed", "true");
    rerender(<RecordButton state="busy" onPress={vi.fn()} />);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByText("One moment…")).toBeInTheDocument();
    rerender(<RecordButton state="idle" onPress={vi.fn()} showLabel={false} />);
    expect(screen.queryByText("Tap to talk")).not.toBeInTheDocument();
  });

  it("ChatBubble labels who speaks and replays the counterpart", async () => {
    const onListen = vi.fn();
    const onListenSlow = vi.fn();
    const { rerender } = render(<ChatBubble turn={{ role: "counterpart", text: "Hi" }} speakerName="Sarah" speaking onListen={onListen} onListenSlow={onListenSlow} />);
    await userEvent.click(screen.getByRole("button", { name: /Slower/ }));
    expect(onListenSlow).toHaveBeenCalled();
    expect(screen.getByText("Sarah")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Playing/ }));
    expect(onListen).toHaveBeenCalled();
    rerender(<ChatBubble turn={{ role: "user", text: "Hello" }} speakerName="Sarah" />);
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
