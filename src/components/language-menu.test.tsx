// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider, LOCALE_KEY, useI18n } from "@/i18n/provider";
import { runtimeMessages } from "@/i18n/messages";
import { LanguageMenu } from "./language-menu";

function Title() {
  const { t } = useI18n();
  return <h1>{t.home.startTalking}</h1>;
}

const setup = () =>
  render(
    <I18nProvider>
      <LanguageMenu />
      <Title />
    </I18nProvider>,
  );

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
  document.documentElement.lang = "en";
});

describe("LanguageMenu", () => {
  it("starts in the browser's language when nothing is saved", async () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["es-MX", "en"]);
    setup();
    expect(await screen.findByRole("heading", { name: "Empezar a hablar" })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("es");
    expect(runtimeMessages().home.startTalking).toBe("Empezar a hablar");
  });

  it("uses the saved choice over the browser's language", async () => {
    window.localStorage.setItem(LOCALE_KEY, "de");
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["es-MX"]);
    setup();
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Sprache" })).toHaveValue("de"));
  });

  it("changes every text at once and remembers the choice", async () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-US"]);
    setup();
    expect(screen.getByRole("heading", { name: "Start talking" })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Language" }), "fr");
    expect(screen.getByRole("heading")).not.toHaveTextContent("Start talking");
    expect(window.localStorage.getItem(LOCALE_KEY)).toBe("fr");
    expect(document.documentElement.lang).toBe("fr");
    expect(screen.getByRole("option", { name: "Português" })).toHaveAttribute("lang", "pt");
  });
});
