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
    expect(screen.getByText("0/12")).toBeInTheDocument();
    expect(screen.getByText(/Responde 2 veces/)).toBeInTheDocument();
  });

  it("shows the reply text first, then plays its server voice, and replays slower from cache", async () => {
    mocked.speech.mockResolvedValueOnce({ audio: null }).mockResolvedValueOnce({ audio: { base64: "BB", mime: "audio/mpeg" } });
    mocked.turn.mockResolvedValueOnce({ userText: "hi", replyText: "question 0?", audio: null, practice: afterTurns(1) });
    render(<PracticeView initial={practice()} initialAudio={null} onFinished={vi.fn()} onExit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Escribir/ }));
    await userEvent.type(screen.getByLabelText("Tu respuesta en inglés"), "hi");
    await userEvent.click(screen.getByRole("button", { name: /Enviar/ }));
    await waitFor(() => expect(mocked.speech).toHaveBeenCalledWith("p1", 2));
    await waitFor(() => expect(audios.at(-1)?.src).toBe("data:audio/mpeg;base64,BB"));
    await userEvent.click(screen.getAllByRole("button", { name: /Más lento/ })[1]);
    expect(audios.at(-1)?.playbackRate).toBe(0.75);
    expect(mocked.speech).toHaveBeenCalledTimes(2);
  });

  it("helps when the person is stuck: translation, suggested answer and tip", async () => {
    mocked.help.mockResolvedValueOnce({ translation: "Háblame de ti.", suggestion: "I'm a sales rep.", tip: "Empieza por tu rol." });
    render(<PracticeView initial={practice()} initialAudio={null} onFinished={vi.fn()} onExit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /¿Qué digo\?/ }));
    const card = await screen.findByRole("region", { name: "Ayuda para responder" });
    expect(card).toHaveTextContent("Háblame de ti.");
    expect(card).toHaveTextContent("I'm a sales rep.");
    expect(card).toHaveTextContent("Empieza por tu rol.");
    await waitFor(() => expect(speech.speak).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole("button", { name: /Escuchar la sugerencia/ }));
    expect(speech.speak).toHaveBeenCalledTimes(2);
    await userEvent.click(screen.getByRole("button", { name: "Cerrar ayuda" }));
    expect(screen.queryByRole("region", { name: "Ayuda para responder" })).not.toBeInTheDocument();
  });

  it("shows an error when help fails", async () => {
    mocked.help.mockRejectedValueOnce(new Error("No pudimos preparar una ayuda."));
    render(<PracticeView initial={practice()} initialAudio={null} onFinished={vi.fn()} onExit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /¿Qué digo\?/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos preparar una ayuda.");
  });

  it("sends a typed answer, then finishes and returns the feedback", async () => {
    mocked.turn.mockResolvedValueOnce({ userText: "answer 1", replyText: "question 1?", audio: null, practice: afterTurns(2) });
    mocked.finish.mockResolvedValueOnce(finishResult);
    const onFinished = vi.fn();
    render(<PracticeView initial={afterTurns(1)} initialAudio={null} onFinished={onFinished} onExit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Escribir/ }));
    await userEvent.type(screen.getByLabelText("Tu respuesta en inglés"), "I sold software.");
    await userEvent.click(screen.getByRole("button", { name: /Enviar/ }));
    expect(mocked.turn).toHaveBeenCalledWith("p1", { text: "I sold software." });
    await screen.findByText("2/12");
    await userEvent.click(screen.getByRole("button", { name: /Terminar y ver mi feedback/ }));
    await waitFor(() => expect(onFinished).toHaveBeenCalledWith(finishResult));
    await userEvent.click(screen.getByRole("button", { name: /Usar voz/ }));
    expect(screen.queryByLabelText("Tu respuesta en inglés")).not.toBeInTheDocument();
  });

  it("records with the microphone and sends the audio", async () => {
    installRecorderStub();
    let now = 1000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    mocked.turn.mockResolvedValueOnce({ userText: "hi", replyText: "ok?", audio: { base64: "AA", mime: "audio/mpeg" }, practice: afterTurns(1) });
    render(<PracticeView initial={practice()} initialAudio={null} onFinished={vi.fn()} onExit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Grabar tu respuesta" }));
    await screen.findByRole("button", { name: /Detener y enviar/ });
    now += 3000;
    await userEvent.click(screen.getByRole("button", { name: /Detener y enviar/ }));
    await waitFor(() => expect(mocked.turn).toHaveBeenCalledWith("p1", { audio: expect.any(Blob) }));
    await screen.findByText("1/12");
  });

  it("toggles recording with the space bar and cancels with Escape", async () => {
    installRecorderStub();
    render(<PracticeView initial={practice()} initialAudio={null} onFinished={vi.fn()} onExit={vi.fn()} />);
    await act(async () => {
      fireEvent.keyDown(window, { code: "Space", key: " " });
    });
    await screen.findByRole("button", { name: /Detener y enviar/ });
    await act(async () => {
      fireEvent.keyDown(window, { key: "Escape" });
    });
    await screen.findByRole("button", { name: "Grabar tu respuesta" });
  });

  it("shows a friendly error with the top-up link when the balance is empty", async () => {
    mocked.turn.mockRejectedValueOnce(new ApiError("ai_balance", "Se acabó tu saldo de IA en publik.", "https://publikhq.com/wallet"));
    render(<PracticeView initial={practice()} initialAudio={null} onFinished={vi.fn()} onExit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Escribir/ }));
    await userEvent.type(screen.getByLabelText("Tu respuesta en inglés"), "Hello");
    await userEvent.click(screen.getByRole("button", { name: /Enviar/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Se acabó tu saldo");
    expect(screen.getByRole("link", { name: "Recargar en publik" })).toBeInTheDocument();
  });

  it("keeps the person in the practice when feedback fails", async () => {
    mocked.finish.mockRejectedValueOnce(new Error("No pudimos preparar tu feedback."));
    render(<PracticeView initial={afterTurns(2)} initialAudio={null} onFinished={vi.fn()} onExit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Terminar y ver mi feedback/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos preparar tu feedback.");
  });

  it("asks for feedback at the turn limit and can exit", async () => {
    const onExit = vi.fn();
    render(<PracticeView initial={{ ...afterTurns(12), limitReached: true }} initialAudio={null} onFinished={vi.fn()} onExit={onExit} />);
    expect(screen.getByText(/Llegaste al final/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Grabar tu respuesta" })).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Escuchar" })[0]);
    await userEvent.click(screen.getByRole("button", { name: "Salir de la práctica" }));
    expect(onExit).toHaveBeenCalled();
  });
});
