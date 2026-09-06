import { isPublishedCommercialProgram } from "@/lib/enterprise-lender-registry/program-architecture";
import { canonicalizeProductCode, productCodesEquivalent } from "@/lib/product-programme-operations/product-aliases";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";

export type ProgrammeMatchInput = {
  productCode?: string | null;
  employmentType?: string | null;
  constitution?: string | null;
  residency?: string | null;
  state?: string | null;
  city?: string | null;
  loanAmountExact?: string | null;
  cibil?: number | null;
  age?: number | null;
  transactionType?: string | null;
  propertyType?: string | null;
};

function inRange(value: number | null | undefined, min: number | null | undefined, max: number | null | undefined): boolean {
  if (value == null) return true;
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

function inExactRange(value: string | null | undefined, min: string | null | undefined, max: string | null | undefined): boolean {
  if (!value) return true;
  const n = Number(value);
  if (!Number.isFinite(n)) return true;
  if (min && n < Number(min)) return false;
  if (max && n > Number(max)) return false;
  return true;
}

export function matchPublishedProgramme(
  program: EnterpriseLenderProgramRecord,
  input: ProgrammeMatchInput,
): { matched: boolean; reason: string } {
  if (!isPublishedCommercialProgram(program)) {
    return { matched: false, reason: "Programme is not published and complete." };
  }
  if (input.productCode && !productCodesEquivalent(program.productCode, input.productCode)) {
    return { matched: false, reason: "Product does not match the published programme." };
  }
  if (input.employmentType && (program.employmentTypes ?? []).length > 0) {
    const wanted = input.employmentType;
    const ok =
      program.employmentTypes?.includes(wanted) ||
      (wanted === "salaried" && program.employmentTypes?.includes("salaried")) ||
      (wanted.includes("self-employed") &&
        program.employmentTypes?.some((id) => id.startsWith("self-employed")));
    if (!ok) return { matched: false, reason: "Employment profile is outside programme eligibility." };
  }
  if (input.constitution && (program.legalConstitutions ?? []).length > 0 && !program.legalConstitutions?.includes(input.constitution)) {
    return { matched: false, reason: "Legal constitution is outside programme eligibility." };
  }
  if (input.residency && (program.residencyEligibility ?? []).length > 0 && !program.residencyEligibility?.includes(input.residency)) {
    return { matched: false, reason: "Residency is outside programme eligibility." };
  }
  if (input.state && (program.eligibleStates ?? []).length > 0 && !program.eligibleStates?.includes(input.state)) {
    return { matched: false, reason: "Geography is outside programme coverage." };
  }
  if (input.transactionType && (program.transactionTypes ?? []).length > 0 && !program.transactionTypes?.includes(input.transactionType)) {
    return { matched: false, reason: "Transaction type is outside programme eligibility." };
  }
  if (!inRange(input.cibil, program.minCibil, program.maxCibil)) {
    return { matched: false, reason: "CIBIL is outside programme range." };
  }
  if (!inRange(input.age, program.minAge, program.maxAge)) {
    return { matched: false, reason: "Age is outside programme range." };
  }
  if (!inExactRange(input.loanAmountExact, program.minLoanAmountExact, program.maxLoanAmountExact)) {
    return { matched: false, reason: "Loan amount is outside programme range." };
  }
  return { matched: true, reason: `Matched published programme ${program.code} v${program.versionNumber}.` };
}

export function selectApplicablePublishedProgrammes(
  programmes: EnterpriseLenderProgramRecord[],
  input: ProgrammeMatchInput,
): EnterpriseLenderProgramRecord[] {
  const seen = new Set<string>();
  const out: EnterpriseLenderProgramRecord[] = [];
  for (const program of programmes) {
    const key = `${program.lenderId}:${program.lineageId ?? program.id}`;
    if (seen.has(key)) continue;
    const result = matchPublishedProgramme(program, input);
    if (!result.matched) continue;
    seen.add(key);
    out.push(program);
  }
  void canonicalizeProductCode;
  return out;
}
