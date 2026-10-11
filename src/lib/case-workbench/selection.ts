/** Summarize selected available IDs, independently of ordering or stale IDs. */
export function deskSelectionSummary(selected: string[], available: string[]): string {
  const options = [...new Set(available)];
  const ids = new Set(selected);
  const count = options.filter(id => ids.has(id)).length;
  return count === 0 ? "None" : options.every(id => ids.has(id)) ? "All" : count + " selected";
}
