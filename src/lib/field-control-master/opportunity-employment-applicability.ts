/**
 * Opportunity form visibility by the Lead Information employment-type master.
 * This does not decide lender eligibility, Product Programme, recommendations,
 * Match %, ROI, FOIR, LTV, income policy, COMPASS, CHANAKYA, or Sarathi.
 * Contact employment, IDC employment, and customer category stay separate.
 */
import { LEAD_INFORMATION_EMPLOYMENT_OPTIONS } from "@/constants/lead-information-workspace";

export const OPPORTUNITY_FORM_EMPLOYMENT_TYPE_OPTIONS = LEAD_INFORMATION_EMPLOYMENT_OPTIONS;

const CANONICAL_CODES = new Set<string>(LEAD_INFORMATION_EMPLOYMENT_OPTIONS.map((option) => option.value));

export function opportunityFormEmploymentTypeCodes(): readonly string[] {
  return LEAD_INFORMATION_EMPLOYMENT_OPTIONS.map((option) => option.value);
}

export function isOpportunityFormEmploymentTypeCode(value: string): boolean {
  return CANONICAL_CODES.has(value);
}

/**
 * DECLARED false: do not restrict.
 * DECLARED true: visible only when the current Opportunity employmentTypeCode
 * is an exact member of the governed list.
 * A missing or non-canonical controlling value is hidden.
 */
export function employmentApplicabilityPermits(
  definition:
    | { employmentApplicabilityDeclared?: boolean; employmentTypeApplicabilityJson?: unknown }
    | undefined,
  domain: string,
  employmentTypeCode: string | null,
): boolean {
  if (domain !== "opportunity") return true;
  if (!definition || definition.employmentApplicabilityDeclared !== true) return true;
  const raw = definition.employmentTypeApplicabilityJson;
  const codes = Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
  if (!employmentTypeCode || !CANONICAL_CODES.has(employmentTypeCode)) return false;
  return codes.includes(employmentTypeCode);
}
