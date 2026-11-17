/** Where people land when someone shares Dilo: its page on publik. */
export const SHARE_URL = "https://publikhq.com/dilo";

export type ShareOutcome = "shared" | "copied" | "dismissed" | "failed";

/** Opens the phone's share sheet; on a computer, copies the message with the link. */
export async function shareDilo(text: string): Promise<ShareOutcome> {
  const data = { title: "Dilo", text, url: SHARE_URL };
  if (typeof navigator.share === "function") {
    try {
      await navigator.share(data);
      return "shared";
    } catch (e) {
      // Closing the sheet is a choice, not an error.
      if (e instanceof DOMException && e.name === "AbortError") return "dismissed";
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${SHARE_URL}`);
    return "copied";
  } catch {
    return "failed";
  }
}
