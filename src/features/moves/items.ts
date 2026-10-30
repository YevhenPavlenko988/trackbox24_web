/** Item lines as typed: one item per line, blank lines dropped, each cut to what a label holds. */
export function itemLines(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.slice(0, 200))
}
