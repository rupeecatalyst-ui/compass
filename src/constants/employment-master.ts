/** UX-02 — Employment type master for loan origination workbench. */

export const EMPLOYMENT_TYPES = [
  { id: "salaried", label: "Salaried" },
  { id: "self_employed", label: "Self Employed" },
  { id: "professional", label: "Professional" },
  { id: "other", label: "Other" },
] as const;

export type EmploymentTypeId = (typeof EMPLOYMENT_TYPES)[number]["id"];

export function normalizeEmploymentType(value?: string): EmploymentTypeId {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "salaried") return "salaried";
  if (v === "self employed" || v === "self_employed") return "self_employed";
  if (v === "professional") return "professional";
  return "other";
}

export function getEmploymentTypeLabel(id: EmploymentTypeId): string {
  return EMPLOYMENT_TYPES.find((t) => t.id === id)?.label ?? "Other";
}

export function employmentTypeToLabel(id: EmploymentTypeId): string {
  return getEmploymentTypeLabel(id);
}
