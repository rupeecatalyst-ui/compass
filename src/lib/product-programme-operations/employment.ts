import {
  PROGRAMME_CONSTITUTION_ID_SET,
  PROGRAMME_EMPLOYMENT_ID_SET,
  PROGRAMME_EMPLOYMENT_TYPES,
  PROGRAMME_RESIDENCY_ID_SET,
  type ProgrammeEmploymentTypeId,
  type ProgrammeLegalConstitutionId,
  type ProgrammeResidencyId,
} from "@/constants/product-programme-operations/controlled-masters";

export type EmploymentFamily = "salaried" | "self_employed" | "not_applicable" | "both";

export function assertEmploymentTypes(ids: string[]): ProgrammeEmploymentTypeId[] {
  const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  for (const id of unique) {
    if (!PROGRAMME_EMPLOYMENT_ID_SET.has(id as ProgrammeEmploymentTypeId)) {
      throw new Error(`Unknown employment type “${id}”.`);
    }
  }
  if (unique.includes("not_applicable") && unique.length > 1) {
    throw new Error("“Not applicable” cannot be combined with other employment types.");
  }
  return unique as ProgrammeEmploymentTypeId[];
}

export function deriveEmploymentFamily(ids: ProgrammeEmploymentTypeId[]): EmploymentFamily | null {
  if (ids.length === 0) return null;
  if (ids.length === 1 && ids[0] === "not_applicable") return "not_applicable";
  const families = new Set(
    ids
      .map((id) => PROGRAMME_EMPLOYMENT_TYPES.find((item) => item.id === id)?.family)
      .filter((family): family is "salaried" | "self_employed" | "not_applicable" => Boolean(family)),
  );
  families.delete("not_applicable");
  if (families.has("salaried") && families.has("self_employed")) return "both";
  if (families.has("salaried")) return "salaried";
  if (families.has("self_employed")) return "self_employed";
  return null;
}

export function assertConstitutions(ids: string[]): ProgrammeLegalConstitutionId[] {
  const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  for (const id of unique) {
    if (!PROGRAMME_CONSTITUTION_ID_SET.has(id as ProgrammeLegalConstitutionId)) {
      throw new Error(`Unknown legal constitution “${id}”.`);
    }
  }
  return unique as ProgrammeLegalConstitutionId[];
}

export function assertResidency(ids: string[]): ProgrammeResidencyId[] {
  const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  for (const id of unique) {
    if (!PROGRAMME_RESIDENCY_ID_SET.has(id as ProgrammeResidencyId)) {
      throw new Error(`Unknown residency eligibility “${id}”.`);
    }
    if (id === "nri" && unique.includes("individual") === false) {
      /* NRI is residency; constitution remains independent. */
    }
  }
  return unique as ProgrammeResidencyId[];
}

/** Legacy free-text must never be treated as a stored employment value. */
export function isAmbiguousEmploymentText(value: string | null | undefined): boolean {
  const raw = (value ?? "").trim().toLowerCase();
  return raw === "both" || raw === "salaried / both" || raw === "salaried/both";
}
