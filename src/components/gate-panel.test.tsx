// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GateState } from "@/lib/types";
import { GatePanel } from "./gate-panel";

type Screen = Extract<GateState, { state: "screen" }>;
const base = { error: null, waiting: null, timedOut: null, busy: false, onRetry: vi.fn(), onWait: vi.fn(), onConnect: vi.fn(), onOwnKey: vi.fn() };

const signIn: Screen = {
  state: "screen",
  screen: { id: "sign_in", title: "Sign in with publik", body: "This app uses your publik account.", note: null, buttons: [{ action: "sign_in", label: "Sign in with publik" }] },
  links: { signIn: "https://publikhq.com/claim/1" },
};
const choose: Screen = {
  state: "screen",
  screen: { id: "choose", title: "Choose how to pay for AI", body: "x", note: null, buttons: [{ action: "get_plan", label: "Get a plan" }, { action: "own_key", label: "Use my own key" }] },
  links: { getPlan: "https://publikhq.com/wallet" },
};
const connect: Screen = {
  state: "screen",
  screen: { id: "choose", title: "Connect your plan", body: "x", note: null, buttons: [{ action: "connect", label: "Connect your plan" }] },
  links: {},
};
const unreachable: Screen = {
  state: "screen",
  screen: { id: "unreachable", title: "Sign in with publik", body: "publik is not reachable. Check your connection.", note: null, buttons: [{ action: "retry", label: "Retry" }] },
  links: {},
};

afterEach(cleanup);

describe("GatePanel", () => {
  it("opens publik sign-in in a new tab and starts waiting", async () => {
    const onWait = vi.fn();
    render(<GatePanel {...base} gate={signIn} onWait={onWait} />);
    const link = screen.getByRole("link", { name: /Sign in with publik/ });
    expect(link).toHaveAttribute("href", "https://publikhq.com/claim/1");
    expect(link).toHaveAttribute("target", "_blank");
    link.addEventListener("click", (e) => e.preventDefault());
    await userEvent.click(link);
    expect(onWait).toHaveBeenCalledWith("sign_in");
    expect(screen.getByText(/Sign in for free/)).toBeInTheDocument();
  });

  it("shows the waiting and timeout notes in English and Spanish", () => {
    const { rerender } = render(<GatePanel {...base} gate={signIn} waiting="sign_in" />);
    expect(screen.getByRole("status")).toHaveTextContent("Waiting for you to sign in in your browser.");
    rerender(<GatePanel {...base} gate={choose} timedOut="get_plan" />);
    expect(screen.getByRole("status")).toHaveTextContent("No plan after 10 minutes.");
  });

  it("offers Get a plan and saves an own key", async () => {
    const onWait = vi.fn();
    const onOwnKey = vi.fn().mockResolvedValue(true);
    render(<GatePanel {...base} gate={choose} onWait={onWait} onOwnKey={onOwnKey} />);
    const plan = screen.getByRole("link", { name: /Get a plan/ });
    plan.addEventListener("click", (e) => e.preventDefault());
    await userEvent.click(plan);
    expect(onWait).toHaveBeenCalledWith("get_plan");
    await userEvent.click(screen.getByRole("button", { name: /Use my own key/ }));
    const input = screen.getByLabelText(/Your OpenAI key/);
    expect(input).toHaveAttribute("type", "password");
    await userEvent.type(input, "sk-test");
    await userEvent.click(screen.getByRole("button", { name: "Save key" }));
    expect(onOwnKey).toHaveBeenCalledWith("sk-test");
    expect(input).toHaveValue("");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText(/Your OpenAI key/)).not.toBeInTheDocument();
  });

  it("connects a plan and retries when publik is unreachable", async () => {
    const onConnect = vi.fn();
    const onRetry = vi.fn();
    const { rerender } = render(<GatePanel {...base} gate={connect} onConnect={onConnect} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect your plan" }));
    expect(onConnect).toHaveBeenCalled();
    rerender(<GatePanel {...base} gate={unreachable} onRetry={onRetry} error="Ups" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Ups");
    await userEvent.click(screen.getByRole("button", { name: /Retry/ }));
    expect(onRetry).toHaveBeenCalled();
  });
});
