/**
 * Opportunity Workspace field display — no fabricated business values.
 * Uncaptured fields render as "Not Specified".
 */

export const OPPORTUNITY_FIELD_NOT_SPECIFIED = "Not Specified";

export function displayOpportunityText(
  value: string | null | undefined,
): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : OPPORTUNITY_FIELD_NOT_SPECIFIED;
}

/** Amount only when explicitly captured (null/undefined/NaN → Not Specified). Zero is allowed if captured. */
export function displayOpportunityAmount(
  value: number | null | undefined,
  options?: { captured?: boolean },
): string {
  if (options?.captured === false) return OPPORTUNITY_FIELD_NOT_SPECIFIED;
  if (value == null || Number.isNaN(value)) return OPPORTUNITY_FIELD_NOT_SPECIFIED;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function displayOpportunityEnumLabel(
  value: string | null | undefined,
): string {
  const trimmed = value?.trim();
  if (!trimmed) return OPPORTUNITY_FIELD_NOT_SPECIFIED;
  return trimmed.replace(/_/g, " ");
}

/**
 * BAT #18 — Opportunity requirement-stage display only.
 * Engine / DB code `raw_lead` stays unchanged; UI label is "Planning".
 */
export function displayOpportunityRequirementStageLabel(
  value: string | null | undefined,
): string {
  const trimmed = value?.trim();
  if (!trimmed) return OPPORTUNITY_FIELD_NOT_SPECIFIED;
  const normalized = trimmed.toLowerCase().replace(/\s+/g, "_");
  if (
    normalized === "raw_lead" ||
    normalized === "raw_opportunity" ||
    trimmed.toLowerCase() === "raw lead" ||
    trimmed.toLowerCase() === "raw opportunity"
  ) {
    return "Planning";
  }
  return trimmed.replace(/_/g, " ");
}
