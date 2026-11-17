// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
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

  it("uses the saved choice over the browser's language, and shows its flag", async () => {
    window.localStorage.setItem(LOCALE_KEY, "de");
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["es-MX"]);
    const { container } = setup();
    expect(await screen.findByRole("button", { name: "Sprache: Deutsch" })).toBeInTheDocument();
    expect(container.querySelector('[data-flag="de"]')).not.toBeNull();
  });

  it("opens the list of languages with their flags, changes every text at once and remembers the choice", async () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-US"]);
    const { container } = setup();
    expect(screen.getByRole("heading", { name: "Start talking" })).toBeInTheDocument();
    const trigger = screen.getByRole("button", { name: "Language: English" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(container.querySelectorAll("li [data-flag]")).toHaveLength(6);
    // The list opens on the current language, named in its own words.
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "English" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Português" })).toHaveAttribute("lang", "pt");
    await userEvent.click(screen.getByRole("button", { name: "Français" }));
    expect(screen.getByRole("heading")).not.toHaveTextContent("Start talking");
    expect(window.localStorage.getItem(LOCALE_KEY)).toBe("fr");
    expect(document.documentElement.lang).toBe("fr");
    // Choosing closes the list and returns to the pill, now in French.
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Langue: Français" })).toHaveFocus();
  });

  it("closes with Escape or a tap outside, without changing the language", async () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-US"]);
    setup();
    const trigger = screen.getByRole("button", { name: "Language: English" });
    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("heading"));
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(LOCALE_KEY)).toBeNull();
  });
});
