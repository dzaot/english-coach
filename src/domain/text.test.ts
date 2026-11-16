import { describe, expect, it } from "vitest";
import { cleanDashes } from "./text";

describe("cleanDashes", () => {
  it("replaces em dashes with commas, spaced or not", () => {
    expect(cleanDashes("I'm a perfectionist — though I've learned")).toBe("I'm a perfectionist, though I've learned");
    expect(cleanDashes("one—two")).toBe("one, two");
    expect(cleanDashes("end —")).toBe("end");
  });

  it("leaves other text alone", () => {
    expect(cleanDashes("2 – 3 days, well-known")).toBe("2 – 3 days, well-known");
  });
});
