/**
 * CO-CHANAKYA-CREDIT-CERTIFICATION-019C — Opportunity loan purpose SSOT.
 * Canonical IDC key: lendingExtension.loanPurpose (Enterprise Initial Data Collection).
 * Legacy keys (purpose, loan_purpose) are read-only fallbacks — never inferred from documents.
 */

import { resolveProductFieldFamily } from "@/lib/enterprise-initial-data-collection/resolve";

export const OPPORTUNITY_LOAN_PURPOSE_CANONICAL_KEY = "loanPurpose" as const;

const LENDING_EXTENSION_KEYS = [
  OPPORTUNITY_LOAN_PURPOSE_CANONICAL_KEY,
  "purpose",
  "loan_purpose",
  "requirementPurpose",
] as const;

const SNAPSHOT_KEYS = ["loanPurpose", "purpose", "loan_purpose"] as const;

function readTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readFromRecord(
  row: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const hit = readTrimmedString(row[key]);
    if (hit) return hit;
  }
  return null;
}

/** Resolve loan purpose from Opportunity Registry JSON — never from documents. */
export function resolveOpportunityLoanPurpose(
  opp: Record<string, unknown> | null | undefined,
): string | null {
  if (!opp) return null;

  const lending = opp.lendingExtension;
  if (lending && typeof lending === "object" && !Array.isArray(lending)) {
    const fromExt = readFromRecord(lending as Record<string, unknown>, LENDING_EXTENSION_KEYS);
    if (fromExt) return fromExt;
  }

  const snapshot = opp.snapshot;
  if (snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)) {
    const fromSnap = readFromRecord(snapshot as Record<string, unknown>, SNAPSHOT_KEYS);
    if (fromSnap) return fromSnap;
  }

  return null;
}

/** IDC-aligned visibility — loan purpose applies to business-loan product families. */
export function isLoanPurposeCaptureVisible(
  productCode?: string | null,
  productLabel?: string | null,
): boolean {
  const code = productCode?.trim() || "";
  if (code) return resolveProductFieldFamily(code) === "BUSINESS_LOAN";

  const label = (productLabel ?? "").trim().toLowerCase();
  return (
    label.includes("business loan") ||
    label.includes("working capital") ||
    label.includes("msme") ||
    label.includes("commercial purchase")
  );
}

/** Merge canonical loanPurpose into lendingExtension without dropping sibling keys. */
export function mergeLoanPurposeIntoLendingExtension(
  existing: unknown,
  loanPurpose: string | null | undefined,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};

  const trimmed = readTrimmedString(loanPurpose ?? "");
  if (trimmed) {
    base[OPPORTUNITY_LOAN_PURPOSE_CANONICAL_KEY] = trimmed;
    // Legacy readers still check `purpose` — keep in sync on write.
    base.purpose = trimmed;
  } else {
    delete base[OPPORTUNITY_LOAN_PURPOSE_CANONICAL_KEY];
  }

  return base;
}
