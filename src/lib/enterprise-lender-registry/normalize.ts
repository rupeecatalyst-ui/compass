/**
 * CO-ARCH-004 — Lender name normalization for duplicate detection.
 */

const LEGAL_SUFFIXES = [
  "limited",
  "ltd",
  "pvt",
  "private",
  "co-operative",
  "cooperative",
  "co op",
  "bank",
  "finance",
  "financiers",
  "housing",
  "hfl",
  "nbFc",
];

/** Collapse punctuation / case for fuzzy compare. */
export function normalizeLenderNameKey(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Aggressive key used for duplicate clustering (strips common legal suffixes). */
export function normalizeLenderDuplicateKey(raw: string): string {
  let key = normalizeLenderNameKey(raw);
  for (const suffix of LEGAL_SUFFIXES) {
    const re = new RegExp(`\\b${suffix}\\b`, "gi");
    key = key.replace(re, " ");
  }
  return key.replace(/\s+/g, " ").trim();
}

export function mergeAliasLists(...lists: Array<string[] | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const item of list ?? []) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      const key = normalizeLenderNameKey(trimmed);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
    }
  }
  return out;
}
