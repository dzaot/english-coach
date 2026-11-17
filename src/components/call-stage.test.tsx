// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { getAvatar } from "@/domain/avatars";
import { CallStage } from "./call-stage";

afterEach(cleanup);
const avatar = getAvatar("emily");
const base = { avatar, role: "Hiring manager", caption: "Tell me about your last job.", captionProgress: null, micLevel: 0, status: "Your turn" };

describe("CallStage", () => {
  it("shows the call with your coworker and the status", () => {
    render(<CallStage {...base} state="idle" />);
    expect(screen.getByRole("region", { name: "Call with Emily" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: avatar.alt })).toBeInTheDocument();
    expect(screen.getByText("Your turn")).toBeInTheDocument();
    expect(document.querySelectorAll('[data-state="said"]')).toHaveLength(6);
  });

  it("highlights the word being said while the coworker talks", () => {
    render(<CallStage {...base} state="speaking" captionProgress={0.4} />);
    const now = document.querySelector('[data-state="now"]');
    expect(now).toHaveTextContent("about");
  });

  it("looks like a video call: their picture, their name and role, and your own tile", () => {
    render(<CallStage {...base} state="idle" />);
    expect(screen.getByRole("img", { name: avatar.alt })).toHaveAttribute("width", "480");
    expect(screen.getByText("Emily")).toBeInTheDocument();
    expect(screen.getByText("Hiring manager")).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Live practice")).toBeInTheDocument();
  });

  it("grows the glow with your voice while you talk", () => {
    const { container } = render(<CallStage {...base} state="listening" micLevel={1} />);
    expect((container.querySelector('[style*="scale"]') as HTMLElement).style.transform).toBe("scale(1.35)");
  });
});
