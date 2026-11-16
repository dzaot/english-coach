// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ResultsCard, sparklinePoints } from "./results-card";

afterEach(cleanup);

describe("ResultsCard", () => {
  it("shows words spoken, practices, phrases learned and the score trend", () => {
    render(<ResultsCard stats={{ wordsSpoken: 1240, practices: 6, phrasesLearned: 1, scores: [58, 70, 81] }} />);
    expect(screen.getByText("1,240")).toBeInTheDocument();
    expect(screen.getByText("words in English")).toBeInTheDocument();
    expect(screen.getByText("phrase learned")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Scores of your last 3 practices: 58, 70, 81" })).toBeInTheDocument();
    expect(screen.getByText("+23 since practice 1")).toBeInTheDocument();
  });

  it("hides the chart with fewer than two scores and handles a drop", () => {
    const { rerender } = render(<ResultsCard stats={{ wordsSpoken: 12, practices: 1, phrasesLearned: 0, scores: [70] }} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("practice")).toBeInTheDocument();
    rerender(<ResultsCard stats={{ wordsSpoken: 12, practices: 2, phrasesLearned: 2, scores: [70, 65] }} />);
    expect(screen.getByText("-5 since practice 1")).toBeInTheDocument();
    rerender(<ResultsCard stats={{ wordsSpoken: 12, practices: 2, phrasesLearned: 2, scores: [70, 70] }} />);
    expect(screen.getByText("steady")).toBeInTheDocument();
  });
});

describe("sparklinePoints", () => {
  it("maps scores onto the chart, lowest at the bottom", () => {
    expect(sparklinePoints([50, 100])).toBe("0,29 100,3");
    expect(sparklinePoints([80])).toBe("");
    expect(sparklinePoints([60, 60])).toBe("0,29 100,29");
  });
});
