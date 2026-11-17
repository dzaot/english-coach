// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/lib/api";
import { installAudioStub, installSpeechStub } from "@/test/browser-stubs";
import { feedback, finishResult, practice, progress } from "@/test/fixtures";
import { PREFERENCES_KEY, readPreferences } from "@/lib/hooks/use-preferences";
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
      speech: vi.fn(),
      help: vi.fn(),
      drill: vi.fn(),
      pronounce: vi.fn().mockResolvedValue({ words: [] }),
      onboarding: vi.fn().mockResolvedValue({ saved: true, completed: true }),
    },
  };
});
const mocked = vi.mocked(api);
const demo = { state: "ready", mode: "demo", account: null, usedPercent: null } as const;

beforeEach(() => {
  // Most tests start after the first-run questions.
  window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ onboarded: true }));
  mocked.onboarding.mockResolvedValue({ saved: true, completed: true });
  installSpeechStub();
  installAudioStub();
  mocked.telemetry.mockResolvedValue({ result: "skipped" });
  mocked.progress.mockResolvedValue(progress());
  mocked.speech.mockResolvedValue({ audio: null });
});
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("CoachApp", () => {
  it("goes from home to a practice, to feedback and back home", async () => {
    mocked.gate.mockResolvedValue(demo);
    mocked.start.mockResolvedValue({ practice: practice({ turns: [{ role: "counterpart", text: "Hi" }, { role: "user", text: "a" }, { role: "counterpart", text: "b?" }, { role: "user", text: "c" }, { role: "counterpart", text: "d?" }], canFinish: true }), audio: null });
    mocked.finish.mockResolvedValue(finishResult);
    render(<CoachApp />);
    expect(await screen.findByText("Demo mode: simulated AI")).toBeInTheDocument();
    await waitFor(() => expect(mocked.telemetry).toHaveBeenCalledWith("app_opened"));
    await screen.findByText("2 days");
    await userEvent.click(screen.getByRole("button", { name: /Start talking/ }));
    await userEvent.click(await screen.findByRole("button", { name: /Finish and see my feedback/ }));
    expect(await screen.findByText("Your feedback")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Practice again/ }));
    await waitFor(() => expect(mocked.start).toHaveBeenCalledTimes(2));
    // Repeats the practice on screen (the fixture's practice is a sales interview).
    expect(mocked.start).toHaveBeenLastCalledWith({ scenarioId: "job_interview", industryId: "sales", level: "intermediate", avatarId: "sarah", locale: "en" });
    await userEvent.click(await screen.findByRole("button", { name: "Leave the practice" }));
    expect(await screen.findByRole("button", { name: /Start talking/ })).toBeInTheDocument();
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
    expect(await screen.findByText(/You have used 12.5% of your publik plan/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Change how I pay for AI" }));
    expect(mocked.gateAction).toHaveBeenLastCalledWith({ action: "reset" });
  });

  it("explains a loading error and retries", async () => {
    mocked.gate.mockRejectedValueOnce(new Error("No hay conexión.")).mockResolvedValueOnce(demo);
    render(<CoachApp />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No hay conexión.");
    await userEvent.click(screen.getByRole("button", { name: /Try again/ }));
    expect(await screen.findByRole("button", { name: /Start talking/ })).toBeInTheDocument();
  });

  it("opens phrases and history, marks a phrase and opens a past feedback", async () => {
    mocked.gate.mockResolvedValue(demo);
    mocked.markPhrase.mockResolvedValue({ phrase: { ...progress().phrases[1], reviewedAt: "2026-11-15T12:00:00Z" } });
    mocked.getPractice.mockResolvedValue({ practice: practice({ feedback, score: 78, finishedAt: "2026-11-14T18:00:00Z" }) });
    render(<CoachApp />);
    await userEvent.click(await screen.findByRole("button", { name: /Phrases to review/ }));
    await userEvent.click(screen.getAllByLabelText("I know this one")[0]);
    await waitFor(() => expect(mocked.markPhrase).toHaveBeenCalledWith("ph2", true));
    expect(await screen.findByText(/left to learn/)).toHaveTextContent("0 left to learn");
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    await userEvent.click(await screen.findByRole("button", { name: /Practice history/ }));
    await userEvent.click(screen.getByRole("button", { name: /Client call/ }));
    expect(await screen.findByText("Your feedback")).toBeInTheDocument();
    expect(screen.queryByText(/streak\. Come back/)).not.toBeInTheDocument();
  });

  it("invites to today's review from home", async () => {
    mocked.gate.mockResolvedValue(demo);
    render(<CoachApp />);
    await userEvent.click(await screen.findByRole("button", { name: /Today's review/ }));
    expect(await screen.findByText("Due today")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Say it/ })).toBeInTheDocument();
  });

  it("shows API errors on the home screen", async () => {
    mocked.gate.mockResolvedValue(demo);
    mocked.start.mockRejectedValue(new ApiError("ai_balance", "Se acabó tu saldo de IA en publik.", "https://publikhq.com/wallet"));
    render(<CoachApp />);
    await userEvent.click(await screen.findByRole("button", { name: /Start talking/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Se acabó tu saldo");
  });

  it("shows errors on the phrases and history screens", async () => {
    mocked.gate.mockResolvedValue(demo);
    mocked.markPhrase.mockRejectedValue(new Error("No se pudo guardar."));
    mocked.getPractice.mockRejectedValue(new Error("No encontramos esa práctica."));
    render(<CoachApp />);
    await userEvent.click(await screen.findByRole("button", { name: /Phrases to review/ }));
    await userEvent.click(screen.getAllByLabelText("I know this one")[0]);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar.");
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    await userEvent.click(await screen.findByRole("button", { name: /Practice history/ }));
    await userEvent.click(screen.getByRole("button", { name: /Client call/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No encontramos esa práctica.");
  });

  it("reports when progress cannot load", async () => {
    mocked.gate.mockResolvedValue(demo);
    mocked.progress.mockRejectedValue(new Error("Progreso no disponible."));
    render(<CoachApp />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Progreso no disponible.");
  });

  it("asks the first-run questions, saves the answers and starts the first call with that setup", async () => {
    window.localStorage.clear();
    mocked.gate.mockResolvedValue(demo);
    mocked.start.mockResolvedValue({ practice: practice({ scenarioId: "client_call", avatarId: "james" }), audio: null });
    render(<CoachApp />);
    expect(await screen.findByRole("heading", { name: "Speak English at work without freezing." })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Get started/ }));
    // Each question has to be answered before going on.
    expect(screen.getByRole("button", { name: /Continue/ })).toBeDisabled();
    await userEvent.click(screen.getByLabelText(/Calls with clients/));
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    await userEvent.click(screen.getByLabelText(/I go blank mid-sentence/));
    await userEvent.click(screen.getByLabelText(/I worry about my accent/));
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    await userEvent.click(screen.getByLabelText("2 of 5: A little"));
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    // What they said gets in the way comes back with the part of Dilo that answers it.
    expect(screen.getByText(/get a phrase to say/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    await userEvent.click(screen.getByLabelText("Other"));
    expect(screen.getByRole("button", { name: /Continue/ })).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Your field"), "Nursing");
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    await userEvent.click(screen.getByLabelText(/Beginner/));
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    await userEvent.click(screen.getByLabelText(/James/));
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    await userEvent.click(await screen.findByRole("button", { name: /Start my first call/ }, { timeout: 4000 }));

    expect(mocked.onboarding).toHaveBeenCalledWith({
      locale: "en",
      goal: "clients",
      pains: ["blank", "pronunciation"],
      confidence: 2,
      industryId: "other",
      industryOther: "Nursing",
      level: "beginner",
      avatarId: "james",
      completed: true,
    });
    await waitFor(() =>
      expect(mocked.start).toHaveBeenCalledWith({ scenarioId: "client_call", industryId: "other", level: "beginner", avatarId: "james", locale: "en", industryOther: "Nursing" }),
    );
    expect(readPreferences()).toMatchObject({ onboarded: true, scenarioId: "client_call", industryId: "other", industryOther: "Nursing", level: "beginner", avatarId: "james" });
    expect(await screen.findByRole("button", { name: "Leave the practice" })).toBeInTheDocument();
  });

  it("lets the person skip the questions, saving what they answered so far", async () => {
    window.localStorage.clear();
    mocked.gate.mockResolvedValue(demo);
    mocked.onboarding.mockRejectedValue(new ApiError("offline", "No hay conexión."));
    render(<CoachApp />);
    await userEvent.click(await screen.findByRole("button", { name: /Get started/ }));
    await userEvent.click(screen.getByLabelText(/A job interview/));
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText(/A job interview/)).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(mocked.onboarding).toHaveBeenCalledWith(expect.objectContaining({ goal: "interview", pains: [], confidence: null, level: null, avatarId: null, completed: false }));
    // A survey that could not be saved never keeps anyone out of the app.
    expect(await screen.findByRole("button", { name: /Start talking/ })).toBeInTheDocument();
    expect(mocked.start).not.toHaveBeenCalled();
    expect(readPreferences().onboarded).toBe(true);
  });
});
