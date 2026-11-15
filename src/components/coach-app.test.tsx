// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/lib/api";
import { installAudioStub, installSpeechStub } from "@/test/browser-stubs";
import { feedback, finishResult, practice, progress } from "@/test/fixtures";
import { CoachApp } from "./coach-app";

vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return {
    ...real,
    api: {
      gate: vi.fn(),
      gateAction: vi.fn(),
      telemetry: vi.fn().mockResolvedValue({ result: "skipped" }),
      start: vi.fn(),
      getPractice: vi.fn(),
      turn: vi.fn(),
      finish: vi.fn(),
      progress: vi.fn(),
      markPhrase: vi.fn(),
    },
  };
});
const mocked = vi.mocked(api);
const demo = { state: "ready", mode: "demo", account: null, usedPercent: null } as const;

beforeEach(() => {
  installSpeechStub();
  installAudioStub();
  mocked.telemetry.mockResolvedValue({ result: "skipped" });
  mocked.progress.mockResolvedValue(progress());
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("CoachApp", () => {
  it("goes from home to a practice, to feedback and back home", async () => {
    mocked.gate.mockResolvedValue(demo);
    mocked.start.mockResolvedValue({ practice: practice({ turns: [{ role: "counterpart", text: "Hi" }, { role: "user", text: "a" }, { role: "counterpart", text: "b?" }, { role: "user", text: "c" }, { role: "counterpart", text: "d?" }], canFinish: true }), audio: null });
    mocked.finish.mockResolvedValue(finishResult);
    render(<CoachApp />);
    expect(await screen.findByText("Modo demo: IA simulada")).toBeInTheDocument();
    expect(mocked.telemetry).toHaveBeenCalledWith("app_opened");
    await screen.findByText("2 días");
    await userEvent.click(screen.getByRole("button", { name: /Empezar a hablar/ }));
    await userEvent.click(await screen.findByRole("button", { name: /Terminar y ver mi feedback/ }));
    expect(await screen.findByText("Tu feedback")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Practicar otra vez/ }));
    await waitFor(() => expect(mocked.start).toHaveBeenCalledTimes(2));
    await userEvent.click(await screen.findByRole("button", { name: "Salir de la práctica" }));
    expect(await screen.findByRole("button", { name: /Empezar a hablar/ })).toBeInTheDocument();
  });

  it("shows the publik gate until the person is signed in", async () => {
    mocked.gate.mockResolvedValue({
      state: "screen",
      screen: { id: "choose", title: "Connect your plan", body: "x", note: null, buttons: [{ action: "connect", label: "Connect your plan" }] },
      links: {},
    });
    mocked.gateAction.mockResolvedValue({ state: "ready", mode: "publik", account: "ana", usedPercent: 12.5 });
    render(<CoachApp />);
    await userEvent.click(await screen.findByRole("button", { name: "Connect your plan" }));
    expect(await screen.findByText(/Usaste 12.5% de tu plan/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cambiar cómo pago la IA" }));
    expect(mocked.gateAction).toHaveBeenLastCalledWith({ action: "reset" });
  });

  it("explains a loading error and retries", async () => {
    mocked.gate.mockRejectedValueOnce(new Error("No hay conexión.")).mockResolvedValueOnce(demo);
    render(<CoachApp />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No hay conexión.");
    await userEvent.click(screen.getByRole("button", { name: /Reintentar/ }));
    expect(await screen.findByRole("button", { name: /Empezar a hablar/ })).toBeInTheDocument();
  });

  it("opens phrases and history, marks a phrase and opens a past feedback", async () => {
    mocked.gate.mockResolvedValue(demo);
    mocked.markPhrase.mockResolvedValue({ phrase: { ...progress().phrases[1], reviewedAt: "2026-11-15T12:00:00Z" } });
    mocked.getPractice.mockResolvedValue({ practice: practice({ feedback, score: 78, finishedAt: "2026-11-14T18:00:00Z" }) });
    render(<CoachApp />);
    await userEvent.click(await screen.findByRole("button", { name: /Frases para repasar/ }));
    await userEvent.click(screen.getAllByLabelText("Ya la practiqué")[0]);
    await waitFor(() => expect(mocked.markPhrase).toHaveBeenCalledWith("ph2", true));
    expect(await screen.findByText(/Te quedan/)).toHaveTextContent("Te quedan 0 por repasar");
    await userEvent.click(screen.getByRole("button", { name: "Volver" }));
    await userEvent.click(await screen.findByRole("button", { name: /Historial/ }));
    await userEvent.click(screen.getByRole("button", { name: /Llamada con cliente/ }));
    expect(await screen.findByText("Tu feedback")).toBeInTheDocument();
    expect(screen.queryByText(/Racha de/)).not.toBeInTheDocument();
  });

  it("shows API errors on the home screen", async () => {
    mocked.gate.mockResolvedValue(demo);
    mocked.start.mockRejectedValue(new ApiError("ai_balance", "Se acabó tu saldo de IA en publik.", "https://publikhq.com/wallet"));
    render(<CoachApp />);
    await userEvent.click(await screen.findByRole("button", { name: /Empezar a hablar/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Se acabó tu saldo");
  });

  it("shows errors on the phrases and history screens", async () => {
    mocked.gate.mockResolvedValue(demo);
    mocked.markPhrase.mockRejectedValue(new Error("No se pudo guardar."));
    mocked.getPractice.mockRejectedValue(new Error("No encontramos esa práctica."));
    render(<CoachApp />);
    await userEvent.click(await screen.findByRole("button", { name: /Frases para repasar/ }));
    await userEvent.click(screen.getAllByLabelText("Ya la practiqué")[0]);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar.");
    await userEvent.click(screen.getByRole("button", { name: "Volver" }));
    await userEvent.click(await screen.findByRole("button", { name: /Historial/ }));
    await userEvent.click(screen.getByRole("button", { name: /Llamada con cliente/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No encontramos esa práctica.");
  });

  it("reports when progress cannot load", async () => {
    mocked.gate.mockResolvedValue(demo);
    mocked.progress.mockRejectedValue(new Error("Progreso no disponible."));
    render(<CoachApp />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Progreso no disponible.");
  });
});
