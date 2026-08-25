/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-006 — Cross-document comparison foundation.
 * Compares only extracted facts — never invents values to force a match.
 */

import type {
  ChanakyaCrossDocumentComparison,
  ChanakyaDocumentExtractedFact,
} from "@/types/chanakya-document-intelligence";

function normalizeAmountToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/₹|rs\.?|inr/g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function comparable(a: string, b: string): ChanakyaCrossDocumentComparison["status"] {
  const na = normalizeAmountToken(a);
  const nb = normalizeAmountToken(b);
  if (!na || !nb) return "unavailable";
  if (na === nb) return "corroborated";
  // Numeric core compare when both parse
  const numA = Number(na.replace(/[^0-9.]/g, ""));
  const numB = Number(nb.replace(/[^0-9.]/g, ""));
  if (Number.isFinite(numA) && Number.isFinite(numB) && numA > 0 && numB > 0) {
    const ratio = Math.min(numA, numB) / Math.max(numA, numB);
    if (ratio >= 0.98) return "corroborated";
    if (ratio >= 0.85) return "inconsistent";
    return "mismatch";
  }
  return "mismatch";
}

const COMPARE_KEYS = new Set([
  "revenue",
  "pat",
  "net_worth",
  "borrowings",
  "opening_balance",
  "closing_balance",
]);

export function buildCrossDocumentComparisons(
  facts: ChanakyaDocumentExtractedFact[],
): ChanakyaCrossDocumentComparison[] {
  const byKey = new Map<string, ChanakyaDocumentExtractedFact[]>();
  for (const f of facts) {
    if (!COMPARE_KEYS.has(f.key)) continue;
    const list = byKey.get(f.key) ?? [];
    list.push(f);
    byKey.set(f.key, list);
  }

  const out: ChanakyaCrossDocumentComparison[] = [];
  for (const [key, list] of byKey) {
    if (list.length < 2) continue;
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const left = list[i]!;
        const right = list[j]!;
        if (left.provenance.documentId === right.provenance.documentId) continue;
        const status = comparable(left.value, right.value);
        out.push({
          id: `xdoc:${key}:${left.id}:${right.id}`,
          leftFactId: left.id,
          rightFactId: right.id,
          factKey: key,
          status,
          note:
            status === "corroborated"
              ? `${left.label} values align across documents (normalized compare).`
              : status === "unavailable"
                ? "Comparison unavailable — one or both values could not be normalized."
                : `${left.label} differs across documents. Flagged for review with evidence — not labelled fraudulent.`,
        });
      }
    }
  }
  return out;
}
