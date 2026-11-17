// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BrandBoard } from "./brand-board";
import { STICKERS } from "./stickers";
import { VoiceField } from "./voice-bars";

afterEach(cleanup);

describe("BrandBoard", () => {
  it("shows the logo, the three voices, the type and every sticker by name", () => {
    render(<BrandBoard />);
    expect(screen.getByRole("heading", { level: 1, name: "dilo" })).toBeInTheDocument();
    for (const voice of ["Orange", "Cobalt", "Lime"]) expect(screen.getByText(voice)).toBeInTheDocument();
    expect(screen.getByText("#FF5A1F")).toBeInTheDocument();
    for (const { name } of STICKERS) expect(screen.getByText(name)).toBeInTheDocument();
  });

  it("keeps stickers out of the accessibility tree: they always sit next to text", () => {
    const { container } = render(<BrandBoard />);
    const drawings = container.querySelectorAll("svg");
    expect(drawings.length).toBeGreaterThanOrEqual(STICKERS.length);
    for (const svg of drawings) expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});

describe("VoiceField", () => {
  it("moves its bars only while someone talks", () => {
    const { container, rerender } = render(<VoiceField count={5} />);
    expect(container.querySelectorAll("span")).toHaveLength(5);
    expect(container.querySelector(".animate-bar-up")).toBeNull();
    rerender(<VoiceField count={5} active />);
    expect(container.querySelectorAll(".animate-bar-up")).toHaveLength(5);
  });
});
