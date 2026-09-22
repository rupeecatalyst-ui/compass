import type { AssessableProgramme } from "@/lib/home-loan-recommendation/engine";

export function governedList(value: unknown): string[] | null {
  if (value == null) return null;
  if (!Array.isArray(value) || value.some(item => typeof item !== "string" || !item.trim())) {
    throw new Error("PROGRAMME_CONFIGURATION_INVALID");
  }
  return value.length ? [...value] : null;
}

export function governedNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error("PROGRAMME_CONFIGURATION_INVALID");
  return value;
}

export function governedExact(value: unknown): string | null {
  if (value == null) return null;
  const raw = String(value);
  if (!/^\d+(\.\d+)?$/.test(raw) || !Number.isFinite(Number(raw))) throw new Error("PROGRAMME_CONFIGURATION_INVALID");
  return raw;
}

/** Only existing engine settings are recognized. Unknown JSON must not disappear. */
export function projectAssessmentSettings(value: unknown): Partial<AssessableProgramme> {
  const numbers = ["maxAgeAtMaturityYears", "requiredSeasoningMonths", "maxDelayedEmis"] as const;
  const booleans = ["acceptsCoApplicantIncome", "selfEmployedMethodologyPresent", "repaymentCleanRequired", "topUpAllowed", "topUpPurposeRequired"] as const;
  const lists = ["allowedPropertyKinds", "allowedConstructionStatuses", "allowedOccupancy", "allowedPossession", "allowedRegistration"] as const;
  const known = new Set<string>([...numbers, ...booleans, ...lists, "ageGoverningParty"]);
  if (value != null && (typeof value !== "object" || Array.isArray(value))) throw new Error("PROGRAMME_CONFIGURATION_INVALID");
  const row = (value ?? {}) as Record<string, unknown>;
  if (Object.keys(row).some(key => !known.has(key))) throw new Error("UNSUPPORTED_GOVERNED_RULE");
  const result: Record<string, unknown> = {};
  for (const key of numbers) {
    result[key] = governedNumber(row[key]);
    if (result[key] != null && !Number.isInteger(result[key])) throw new Error("PROGRAMME_CONFIGURATION_INVALID");
  }
  for (const key of booleans) {
    if (row[key] != null && typeof row[key] !== "boolean") throw new Error("PROGRAMME_CONFIGURATION_INVALID");
    result[key] = row[key] ?? null;
  }
  for (const key of lists) result[key] = governedList(row[key]);
  if (row.ageGoverningParty != null && !["applicant", "co_applicant", "younger", "older"].includes(String(row.ageGoverningParty))) {
    throw new Error("PROGRAMME_CONFIGURATION_INVALID");
  }
  result.ageGoverningParty = row.ageGoverningParty ?? null;
  return result as Partial<AssessableProgramme>;
}
