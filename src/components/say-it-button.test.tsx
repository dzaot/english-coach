// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { installRecorderStub } from "@/test/browser-stubs";
import { progress } from "@/test/fixtures";
import { SayItButton } from "./say-it-button";

vi.mock("@/lib/api", async (orig) => {
  const real = await orig<typeof import("@/lib/api")>();
  return { ...real, api: { drill: vi.fn() } };
});
const mocked = vi.mocked(api);
const phrase = progress().phrases[1];

let now = 1000;
beforeEach(() => {
  installRecorderStub();
  vi.spyOn(Date, "now").mockImplementation(() => now);
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

describe("SayItButton", () => {
  it("celebrates a phrase said right and reports the new schedule", async () => {
    const updated = { ...phrase, step: 1, dueDay: "2026-11-16" };
    mocked.drill.mockResolvedValueOnce({ said: "Set up a meeting", score: 100, passed: true, missing: [], phrase: updated });
    const onDrilled = vi.fn();
    render(<SayItButton phraseId={phrase.id} onDrilled={onDrilled} />);
    await sayIt();
    expect(await screen.findByText(/Well said!/)).toBeInTheDocument();
    expect(mocked.drill).toHaveBeenCalledWith(phrase.id, expect.any(Blob));
    await waitFor(() => expect(onDrilled).toHaveBeenCalledWith(updated));
    expect(screen.getByRole("button", { name: /Try again/ })).toBeInTheDocument();
  });

  it("shows the missing words when it was not quite right", async () => {
    mocked.drill.mockResolvedValueOnce({ said: "a meeting", score: 50, passed: false, missing: ["set", "up"], phrase });
    render(<SayItButton phraseId={phrase.id} />);
    await sayIt();
    expect(await screen.findByText(/Missing/)).toHaveTextContent("set, up");
    expect(screen.getByText(/We heard/)).toHaveTextContent("a meeting");
  });

  it("shows a friendly error", async () => {
    mocked.drill.mockRejectedValueOnce(new Error("No entendimos el audio."));
    render(<SayItButton phraseId={phrase.id} />);
    await sayIt();
    expect(await screen.findByRole("alert")).toHaveTextContent("No entendimos el audio.");
  });
});
