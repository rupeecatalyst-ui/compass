/**
 * Executive Narrative Engine — utilities (no intelligence).
 */

export function createExecutiveIntelligenceId(prefix: string): string {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${stamp}_${rand}`;
}

export function uniqueSourceModules(ids: readonly string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

export function nowIso(): string {
  return new Date().toISOString();
}
