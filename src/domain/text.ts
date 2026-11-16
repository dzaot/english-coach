/** Text cleanup for model output shown to people. House style: no em dash characters. */
export function cleanDashes(text: string): string {
  return text
    .replace(/\s*—\s*(?=\S)/g, ", ")
    .replace(/\s*—\s*$/g, "")
    .replace(/,\s*,/g, ",");
}
