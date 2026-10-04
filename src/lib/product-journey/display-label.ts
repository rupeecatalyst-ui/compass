import { PRODUCT_JOURNEY_BOOTSTRAP } from "@/constants/product-journey/bootstrap";

/** Approved friendly labels for configured journey IDs. Canonical IDs stay unchanged. */
export const APPROVED_JOURNEY_FIELD_LABELS: Record<string, string> = {
  "assessment:borrower.ageYears": "Age",
};

export function resolveProductJourneyFieldLabel(
  fieldId: string,
  explicitLabel?: string | null,
): string {
  const trimmed = explicitLabel?.trim() ?? "";
  if (trimmed && trimmed !== fieldId) return trimmed;
  const approved = APPROVED_JOURNEY_FIELD_LABELS[fieldId];
  if (approved) return approved;
  for (const rows of Object.values(PRODUCT_JOURNEY_BOOTSTRAP)) {
    const hit = rows.find((row) => row.fieldId === fieldId && row.label && row.label !== row.fieldId);
    if (hit?.label) return hit.label;
  }
  return trimmed || fieldId;
}
