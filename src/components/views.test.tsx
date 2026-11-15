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
    render(<HomeView progress={progress()} starting={false} onStart={onStart} onOpenPhrases={vi.fn()} onOpenHistory={vi.fn()} />);
    await userEvent.click(screen.getByLabelText(/Negociar salario/));
    await userEvent.click(screen.getByLabelText("Construcción"));
    await userEvent.click(screen.getByRole("button", { name: /Empezar a hablar/ }));
    expect(onStart).toHaveBeenCalledWith("salary_negotiation", "construction");
  });

  it("shows the streak, the week and the counts", async () => {
    const onOpenPhrases = vi.fn();
    const onOpenHistory = vi.fn();
    render(<HomeView progress={progress()} starting={false} onStart={vi.fn()} onOpenPhrases={onOpenPhrases} onOpenHistory={onOpenHistory} />);
    expect(screen.getByText("2 días")).toBeInTheDocument();
    expect(screen.getByText(/no perder tu racha/)).toBeInTheDocument();
    expect(screen.getAllByText(/practicaste$/)).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: /Frases para repasar/ }));
    await userEvent.click(screen.getByRole("button", { name: /Historial/ }));
    expect(onOpenPhrases).toHaveBeenCalled();
    expect(onOpenHistory).toHaveBeenCalled();
  });

  it("encourages a first session and disables the button while starting", () => {
    const p = progress({ streak: { current: 0, best: 0, practicedToday: false } });
    render(<HomeView progress={p} starting onStart={vi.fn()} onOpenPhrases={vi.fn()} onOpenHistory={vi.fn()} />);
    expect(screen.getByText(/empieza tu racha/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Preparando/ })).toBeDisabled();
  });

  it("celebrates when today is done", () => {
    const p = progress({ streak: { current: 1, best: 1, practicedToday: true } });
    render(<HomeView progress={p} starting={false} onStart={vi.fn()} onOpenPhrases={vi.fn()} onOpenHistory={vi.fn()} />);
    expect(screen.getByText(/Ya practicaste hoy/)).toBeInTheDocument();
    expect(screen.getAllByText("1 día")).toHaveLength(2);
  });

  it("renders without progress yet", () => {
    render(<HomeView progress={null} starting={false} onStart={vi.fn()} onOpenPhrases={vi.fn()} onOpenHistory={vi.fn()} />);
    expect(screen.queryByText("Tu racha")).not.toBeInTheDocument();
  });
});

describe("FeedbackView", () => {
  it("shows the score, the three better phrases and the vocabulary", async () => {
    const onAgain = vi.fn();
    const onHome = vi.fn();
    render(<FeedbackView practice={finishResult.practice} feedback={feedback} streak={finishResult.streak} onPracticeAgain={onAgain} onHome={onHome} />);
    expect(screen.getByRole("img", { name: "Puntaje: 78 de 100" })).toBeInTheDocument();
    expect(screen.getByText("Muy bien")).toBeInTheDocument();
    expect(screen.getByText("I created a process")).toBeInTheDocument();
    expect(screen.getByText("follow up")).toBeInTheDocument();
    expect(screen.getByText(/Racha de/)).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: /Escuchar cómo se dice/ })[0]);
    expect(speech.speak).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /Practicar otra vez/ }));
    await userEvent.click(screen.getByRole("button", { name: "Volver al inicio" }));
    expect(onAgain).toHaveBeenCalled();
    expect(onHome).toHaveBeenCalled();
  });

  it("hides the streak banner and vocabulary when there are none", () => {
    render(<FeedbackView practice={finishResult.practice} feedback={{ ...feedback, vocabulary: [] }} streak={null} onPracticeAgain={vi.fn()} onHome={vi.fn()} />);
    expect(screen.queryByText(/Racha de/)).not.toBeInTheDocument();
    expect(screen.queryByText("Vocabulario para guardar")).not.toBeInTheDocument();
  });
});

describe("PhrasesView", () => {
  it("lists pending phrases first and toggles them", async () => {
    const onToggle = vi.fn();
    render(<PhrasesView phrases={progress().phrases} onToggle={onToggle} onBack={vi.fn()} />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Set up a meeting");
    await userEvent.click(screen.getAllByLabelText("Ya la practiqué")[0]);
    expect(onToggle).toHaveBeenCalledWith("ph2", true);
    await userEvent.click(screen.getAllByRole("button", { name: /Escuchar/ })[0]);
    expect(speech.speak).toHaveBeenCalled();
  });

  it("explains the empty state", () => {
    render(<PhrasesView phrases={[]} onToggle={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText("Aún no tienes frases.")).toBeInTheDocument();
  });
});

describe("HistoryView", () => {
  it("opens a past practice", async () => {
    const onOpen = vi.fn();
    render(<HistoryView history={progress().history} onOpen={onOpen} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Llamada con cliente/ }));
    expect(onOpen).toHaveBeenCalledWith("h1");
  });

  it("explains the empty state and goes back", async () => {
    const onBack = vi.fn();
    render(<HistoryView history={[]} onOpen={vi.fn()} onBack={onBack} />);
    expect(screen.getByText(/Todavía no terminas/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe("small pieces", () => {
  it("ErrorBanner shows one top-up link and a retry", async () => {
    const onRetry = vi.fn();
    render(<ErrorBanner message="Se acabó tu saldo" topUpUrl="https://publikhq.com/wallet" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Se acabó tu saldo");
    expect(screen.getByRole("link", { name: "Recargar en publik" })).toHaveAttribute("href", "https://publikhq.com/wallet");
    await userEvent.click(screen.getByRole("button", { name: /Reintentar/ }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("Spinner announces its label", () => {
    render(<Spinner label="Cargando…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando…");
  });

  it("RecordButton reflects each state", () => {
    const { rerender } = render(<RecordButton state="idle" onPress={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Grabar tu respuesta" })).toHaveAttribute("aria-pressed", "false");
    rerender(<RecordButton state="recording" onPress={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Detener y enviar/ })).toHaveAttribute("aria-pressed", "true");
    rerender(<RecordButton state="busy" onPress={vi.fn()} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("ChatBubble labels who speaks and replays the counterpart", async () => {
    const onListen = vi.fn();
    const { rerender } = render(<ChatBubble turn={{ role: "counterpart", text: "Hi" }} speakerName="Sarah" speaking onListen={onListen} />);
    expect(screen.getByText("Sarah")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Reproduciendo/ }));
    expect(onListen).toHaveBeenCalled();
    rerender(<ChatBubble turn={{ role: "user", text: "Hello" }} speakerName="Sarah" />);
    expect(screen.getByText("Tú")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
