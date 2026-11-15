import "@testing-library/jest-dom/vitest";

if (typeof window !== "undefined") {
  window.scrollTo = (() => undefined) as typeof window.scrollTo;
}
