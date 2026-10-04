import type { ProductJourneyApplicability, ProductJourneyFieldRow } from "@/types/product-journey-definition";

export function employmentFamilyFromValue(raw: string | null | undefined): "salaried" | "self_employed" | "unknown" {
  const value = (raw ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (value === "salaried" || value === "nri" || value.startsWith("salaried")) return "salaried";
  if (value.includes("self_employed") || value.includes("professional") || value === "business") return "self_employed";
  return "unknown";
}

export function fieldAppliesToEmployment(
  row: ProductJourneyFieldRow,
  employmentFamily: "salaried" | "self_employed" | "unknown" | null | undefined,
): boolean {
  if (row.applicability === "all") return true;
  if (!employmentFamily || employmentFamily === "unknown") {
    return row.applicability === "all";
  }
  return row.applicability === employmentFamily;
}

export function applicableJourneyFields(
  rows: readonly ProductJourneyFieldRow[],
  employmentFamily: "salaried" | "self_employed" | "unknown" | null | undefined,
): ProductJourneyFieldRow[] {
  return rows.filter((row) => fieldAppliesToEmployment(row, employmentFamily));
}

export function captureJourneyFields(
  rows: readonly ProductJourneyFieldRow[],
  employmentFamily: "salaried" | "self_employed" | "unknown" | null | undefined,
): ProductJourneyFieldRow[] {
  return applicableJourneyFields(rows, employmentFamily).filter((row) => row.capture);
}

export function mandatoryRecommendationFields(
  rows: readonly ProductJourneyFieldRow[],
  employmentFamily: "salaried" | "self_employed" | "unknown" | null | undefined,
): ProductJourneyFieldRow[] {
  return applicableJourneyFields(rows, employmentFamily).filter((row) => row.mandatoryForRecommendation);
}

export function journeyFieldMatchesIdcKey(row: ProductJourneyFieldRow, key: string): boolean {
  if (row.fieldId === `idc:${key}` || row.fieldId.endsWith(`:${key}`)) return true;
  return Boolean(row.idcKeys?.includes(key));
}

export type { ProductJourneyApplicability };
