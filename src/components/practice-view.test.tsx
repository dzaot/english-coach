// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/lib/api";
import { installAudioStub, installRecorderStub, installSpeechStub } from "@/test/browser-stubs";
import { finishResult, practice } from "@/test/fixtures";
import { PracticeView } from "./practice-view";

vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return { ...real, api: { turn: vi.fn(), finish: vi.fn(), help: vi.fn(), speech: vi.fn() } };
});
const mocked = vi.mocked(api);

const afterTurns = (n: number) =>
  practice({
    turns: [
      { role: "counterpart", text: "Tell me about yourself." },
      ...Array.from({ length: n }, (_, i) => [
        { role: "user" as const, text: `answer ${i}` },
        { role: "counterpart" as const, text: `question ${i}?` },
      ]).flat(),
    ],
    canFinish: n >= 2,
  });

let speech: ReturnType<typeof installSpeechStub>;
let audios: ReturnType<typeof installAudioStub>;
beforeEach(() => {
  speech = installSpeechStub();
  audios = installAudioStub();
  mocked.speech.mockResolvedValue({ audio: null });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PracticeView", () => {
  it("speaks the opener and shows the counterpart", async () => {
    render(<PracticeView initial={practice()} initialAudio={null} onFinished={vi.fn()} onExit={vi.fn()} />);
    await waitFor(() => expect(speech.speak).toHaveBeenCalled());
    expect(mocked.speech).toHaveBeenCalledWith("p1", 0);
    expect(screen.getAllByText("Sarah").length).toBeGreaterThan(0);
    expect(screen.getByText(/0\/12 answers/)).toBeInTheDocument();
    expect(screen.getByText(/Answer twice/)).toBeInTheDocument();
  });

  it("shows the partner's photo and who is talking", async () => {
    installRecorderStub();
    render(<PracticeView initial={practice({ avatarId: "daniel", level: "beginner" })} initialAudio={null} onFinished={vi.fn()} onExit={vi.fn()} />);
    expect(screen.getByAltText(/Daniel/)).toBeInTheDocument();
    await screen.findByText(/Your turn/);
    await userEvent.click(screen.getByRole("button", { name: "Record your answer" }));
    expect(await screen.findByText("Daniel is listening…")).toBeInTheDocument();
  });

  it("labels the help translation by level", async () => {
    mocked.help.mockResolvedValue({ translation: "Cuéntame de ti.", suggestion: "I'm a rep.", tip: "Sé breve." });
    const { unmount } = render(<PracticeView initial={practice({ level: "beginner" })} initialAudio={null} onFinished={vi.fn()} onExit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Help me/ }));
    expect(await screen.findByText("In Spanish:")).toBeInTheDocument();
    unmount();
    render(<PracticeView initial={practice({ level: "advanced" })} initialAudio={null} onFinished={vi.fn()} onExit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Help me/ }));
    expect(await screen.findByText("In other words:")).toBeInTheDocument();
  });

  it("shows the reply text first, then plays its server voice, and replays slower from cache", async () => {
    mocked.speech.mockResolvedValueOnce({ audio: null }).mockResolvedValueOnce({ audio: { base64: "BB", mime: "audio/mpeg" } });
    mocked.turn.mockResolvedValueOnce({ userText: "hi", replyText: "question 0?", audio: null, practice: afterTurns(1) });
    render(<PracticeView initial={practice()} initialAudio={null} onFinished={vi.fn()} onExit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Type/ }));
    await userEvent.type(screen.getByLabelText("Your answer in English"), "hi");
    await userEvent.click(screen.getByRole("button", { name: /Send/ }));
    await waitFor(() => expect(mocked.speech).toHaveBeenCalledWith("p1", 2));
    await waitFor(() => expect(audios.at(-1)?.src).toBe("data:audio/mpeg;base64,BB"));
    await userEvent.click(screen.getAllByRole("button", { name: /Slower/ })[1]);
    expect(audios.at(-1)?.playbackRate).toBe(0.75);
    expect(mocked.speech).toHaveBeenCalledTimes(2);
  });

  it("helps when the person is stuck: translation, suggested answer and tip", async () => {
    mocked.help.mockResolvedValueOnce({ translation: "Háblame de ti.", suggestion: "I'm a sales rep.", tip: "Empieza por tu rol." });
    render(<PracticeView initial={practice()} initialAudio={null} onFinished={vi.fn()} onExit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Help me/ }));
    const card = await screen.findByRole("region", { name: "Help to answer" });
    expect(card).toHaveTextContent("Háblame de ti.");
    expect(card).toHaveTextContent("I'm a sales rep.");
    expect(card).toHaveTextContent("Empieza por tu rol.");
    await waitFor(() => expect(speech.speak).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole("button", { name: /Listen to the suggestion/ }));
    expect(speech.speak).toHaveBeenCalledTimes(2);
    await userEvent.click(screen.getByRole("button", { name: "Close help" }));
    expect(screen.queryByRole("region", { name: "Help to answer" })).not.toBeInTheDocument();
  });

  it("shows an error when help fails", async () => {
    mocked.help.mockRejectedValueOnce(new Error("No pudimos preparar una ayuda."));
    render(<PracticeView initial={practice()} initialAudio={null} onFinished={vi.fn()} onExit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Help me/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos preparar una ayuda.");
  });

  it("sends a typed answer, then finishes and returns the feedback", async () => {
    mocked.turn.mockResolvedValueOnce({ userText: "answer 1", replyText: "question 1?", audio: null, practice: afterTurns(2) });
    mocked.finish.mockResolvedValueOnce(finishResult);
    const onFinished = vi.fn();
    render(<PracticeView initial={afterTurns(1)} initialAudio={null} onFinished={onFinished} onExit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Type/ }));
    await userEvent.type(screen.getByLabelText("Your answer in English"), "I sold software.");
    await userEvent.click(screen.getByRole("button", { name: /Send/ }));
    expect(mocked.turn).toHaveBeenCalledWith("p1", { text: "I sold software." });
    await screen.findByText(/2\/12 answers/);
    await userEvent.click(screen.getByRole("button", { name: /Finish and see my feedback/ }));
    await waitFor(() => expect(onFinished).toHaveBeenCalledWith(finishResult));
    await userEvent.click(screen.getByRole("button", { name: /Use voice/ }));
    expect(screen.queryByLabelText("Your answer in English")).not.toBeInTheDocument();
  });

  it("records with the microphone and sends the audio", async () => {
    installRecorderStub();
    let now = 1000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    mocked.turn.mockResolvedValueOnce({ userText: "hi", replyText: "ok?", audio: { base64: "AA", mime: "audio/mpeg" }, practice: afterTurns(1) });
    render(<PracticeView initial={practice()} initialAudio={null} onFinished={vi.fn()} onExit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Record your answer" }));
    await screen.findByRole("button", { name: /Stop and send/ });
    now += 3000;
    await userEvent.click(screen.getByRole("button", { name: /Stop and send/ }));
    await waitFor(() => expect(mocked.turn).toHaveBeenCalledWith("p1", { audio: expect.any(Blob) }));
    await screen.findByText(/1\/12 answers/);
  });

  it("toggles recording with the space bar and cancels with Escape", async () => {
    installRecorderStub();
    render(<PracticeView initial={practice()} initialAudio={null} onFinished={vi.fn()} onExit={vi.fn()} />);
    await act(async () => {
      fireEvent.keyDown(window, { code: "Space", key: " " });
    });
    await screen.findByRole("button", { name: /Stop and send/ });
    await act(async () => {
      fireEvent.keyDown(window, { key: "Escape" });
    });
    await screen.findByRole("button", { name: "Record your answer" });
  });

  it("shows a friendly error with the top-up link when the balance is empty", async () => {
    mocked.turn.mockRejectedValueOnce(new ApiError("ai_balance", "Se acabó tu saldo de IA en publik.", "https://publikhq.com/wallet"));
    render(<PracticeView initial={practice()} initialAudio={null} onFinished={vi.fn()} onExit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Type/ }));
    await userEvent.type(screen.getByLabelText("Your answer in English"), "Hello");
    await userEvent.click(screen.getByRole("button", { name: /Send/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Se acabó tu saldo");
    expect(screen.getByRole("link", { name: "Top up on publik" })).toBeInTheDocument();
  });

  it("keeps the person in the practice when feedback fails", async () => {
    mocked.finish.mockRejectedValueOnce(new Error("No pudimos preparar tu feedback."));
    render(<PracticeView initial={afterTurns(2)} initialAudio={null} onFinished={vi.fn()} onExit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Finish and see my feedback/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos preparar tu feedback.");
  });

  it("asks for feedback at the turn limit and can exit", async () => {
    const onExit = vi.fn();
    render(<PracticeView initial={{ ...afterTurns(12), limitReached: true }} initialAudio={null} onFinished={vi.fn()} onExit={onExit} />);
    expect(screen.getByText(/You reached the end/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Record your answer" })).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Listen" })[0]);
    await userEvent.click(screen.getByRole("button", { name: "Leave the practice" }));
    expect(onExit).toHaveBeenCalled();
  });
});
