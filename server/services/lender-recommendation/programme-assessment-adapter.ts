import type { AssessableProgramme } from "@/lib/home-loan-recommendation/engine";
import type { RecommendationLenderCategory } from "@/lib/home-loan-recommendation/cibil-category";
import { productCodesEquivalent } from "@/lib/product-programme-operations/product-aliases";
import type { CanonicalRecommendationProduct } from "@/types/canonical-lender-recommendation";
import { parseCanonicalPolicyRules, type ParsedCanonicalPolicyRules } from "./policy-rule-parser";
import { governedList as list, governedNumber as num, governedExact as exact, projectAssessmentSettings } from "./programme-assessment-settings";

export type CanonicalPolicyLink = {
  id: string;
  organizationId: string;
  policyId: string;
  versionNumber: number;
  status: string;
  eligibilityRules: unknown;
  creditRules: unknown;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  policy: {
    id: string;
    organizationId: string;
    lenderId: string | null;
    productCode: string | null;
    status: string;
    currentPublishedVersionId: string | null;
    isDeleted: boolean;
  };
};

export type CanonicalProgrammeRow = Record<string, unknown> & {
  id: string;
  organizationId: string;
  lenderId: string;
  productCode: string | null;
  code: string;
  label: string;
  versionNumber: number;
  transactionTypes: unknown;
  policyVersionId: string | null;
  policyVersion: CanonicalPolicyLink | null;
  lender: { displayName: string | null; label: string; code: string; organizationId?: string;
    enabled?: boolean; isDeleted?: boolean; lifecycleStatus?: string; operationalStatus?: string;
    effectiveFrom?: Date | string | null; effectiveUntil?: Date | string | null };
};

export type CanonicalAssessmentProgramme = AssessableProgramme & {
  canonicalProduct: CanonicalRecommendationProduct;
  policyId: string;
  policyVersionId: string;
  policyVersionNumber: number;
  parsedPolicyRules: ParsedCanonicalPolicyRules;
  canonicalConstraints: {
    residency: string[] | null;
    employmentTypes: string[] | null;
    legalConstitutions: string[] | null;
    eligibleStates: string[] | null;
    eligibleCities: string[] | null;
    propertyCategories: string[] | null;
    constructionStatuses: string[] | null;
    transactionTypes: string[] | null;
    minCibil: number | null;
    maxCibil: number | null;
    minIncomeRupees: string | null;
    maxIncomeRupees: string | null;
    minLoanAmountRupees: string | null;
    maxLoanAmountRupees: string | null;
    minAge: number | null;
    maxAge: number | null;
    minTenureMonths: number | null;
    maxTenureMonths: number | null;
    minFoirPercent: string | null;
    maxFoirPercent: string | null;
    minDbrPercent: string | null;
    maxDbrPercent: string | null;
    minRoiPercent: string | null;
    maxRoiPercent: string | null;
    minLtvPercent: string | null;
    maxLtvPercent: string | null;
    requiredDocumentTypeIds: string[] | null;
    unsupportedConstraintPresent: boolean;
  };
};

function dateValid(asOf: Date, from: Date | null, until: Date | null): boolean {
  return (!from || from <= asOf) && (!until || until >= asOf);
}

export function validateCanonicalPolicyLink(
  row: CanonicalProgrammeRow,
  product: CanonicalRecommendationProduct,
  asOf: Date,
): string | null {
  const version = row.policyVersion;
  if (!row.policyVersionId || !version || version.id !== row.policyVersionId) return "POLICY_VERSION_MISSING";
  if (version.organizationId !== row.organizationId || version.policy.organizationId !== row.organizationId) return "POLICY_ORGANIZATION_MISMATCH";
  if (version.policyId !== version.policy.id) return "POLICY_LINEAGE_MISMATCH";
  if (version.policy.lenderId !== row.lenderId) return "POLICY_LENDER_MISMATCH";
  if (!productCodesEquivalent(version.policy.productCode, product)) return "POLICY_PRODUCT_MISMATCH";
  if (version.status !== "published" || version.policy.status !== "published" || version.policy.isDeleted) return "POLICY_NOT_PUBLISHED";
  if (version.policy.currentPublishedVersionId !== version.id) return "POLICY_CURRENT_VERSION_MISMATCH";
  if (!dateValid(asOf, version.effectiveFrom, version.effectiveUntil)) return "POLICY_NOT_EFFECTIVE";
  return null;
}

export function mapCanonicalProgramme(input: {
  row: CanonicalProgrammeRow;
  product: CanonicalRecommendationProduct;
  lenderCategory: RecommendationLenderCategory | null;
  asOf: Date;
}): CanonicalAssessmentProgramme {
  const { row, product, asOf } = input;
  if (row.productCode !== product) throw new Error("PROGRAMME_PRODUCT_MISMATCH");
  const policyError = validateCanonicalPolicyLink(row, product, asOf);
  if (policyError) throw new Error(policyError);

  const transactionTypes = list(row.transactionTypes === "" ? null : row.transactionTypes);
  if (product === "HOME_LOAN_BT" && !transactionTypes?.includes("balance_transfer")) {
    throw new Error("HLBT_TRANSACTION_TYPE_MISMATCH");
  }
  // HOME_LOAN intentionally accepts a null/blank transactionTypes list.

  const policyVersion = row.policyVersion!;
  const eligibilityRules = parseCanonicalPolicyRules(policyVersion.eligibilityRules);
  const creditRules = parseCanonicalPolicyRules(policyVersion.creditRules);
  const parsedPolicyRules: ParsedCanonicalPolicyRules = {
    cibilRanges: [...eligibilityRules.cibilRanges, ...creditRules.cibilRanges],
  };
  const r = row as Record<string, unknown>;
  const settings = projectAssessmentSettings(r.policyAssessmentJson);
  // Preserve legacy bounds too: use the stricter configured bound, never ignore a populated constraint.
  const bound = (primary: unknown, legacy: unknown, minimum = false): string | null => {
    const values = [exact(primary), exact(legacy)].filter((v): v is string => v != null).map(Number);
    return values.length ? String(minimum ? Math.max(...values) : Math.min(...values)) : null;
  };
  const constraints = {
    residency: list(r.residencyEligibility),
    employmentTypes: list(r.employmentTypes),
    legalConstitutions: list(r.legalConstitutions),
    eligibleStates: list(r.eligibleStates),
    eligibleCities: list(r.eligibleCities),
    propertyCategories: list(r.propertyCategories),
    constructionStatuses: list(r.constructionStatuses),
    transactionTypes,
    minCibil: num(r.minCibil),
    maxCibil: num(r.maxCibil),
    minIncomeRupees: bound(r.minIncomeExact, r.minIncomeAmount, true),
    maxIncomeRupees: exact(r.maxIncomeExact),
    minLoanAmountRupees: bound(r.minLoanAmountExact, r.minFundingAmount, true),
    maxLoanAmountRupees: bound(r.maxLoanAmountExact, r.maxFundingAmount),
    minAge: num(r.minAge),
    maxAge: num(r.maxAge),
    minTenureMonths: num(r.minTenureMonths),
    maxTenureMonths: num(r.maxTenureMonths),
    minFoirPercent: exact(r.minFoirExact),
    maxFoirPercent: bound(r.maxFoirExact, r.maxFoirPercent),
    minDbrPercent: exact(r.minDbrExact),
    maxDbrPercent: bound(r.maxDbrExact, r.maxDbrPercent),
    minRoiPercent: bound(r.minRoiExact, r.minRoiPercent ?? r.roiPercent, true),
    maxRoiPercent: bound(r.maxRoiExact, r.maxRoiPercent),
    minLtvPercent: exact(r.minLtvExact),
    maxLtvPercent: bound(r.maxLtvExact, r.maxLtvPercent),
    requiredDocumentTypeIds: list(r.requiredDocumentTypeIds),
    unsupportedConstraintPresent: [r.applicantTypes, r.customerSegments, r.propertyTypes, r.concessions, r.deviationCategories]
      .some(value => value != null && (!Array.isArray(value) || value.length > 0))
      || Boolean(r.borrowerType || r.employmentType)
      || (list(r.incomeAssessmentMethods)?.some(method => method !== "salary") ?? false),
  };

  for (const [min, max] of [[constraints.minCibil, constraints.maxCibil], [constraints.minAge, constraints.maxAge],
    [constraints.minTenureMonths, constraints.maxTenureMonths], [constraints.minIncomeRupees, constraints.maxIncomeRupees],
    [constraints.minLoanAmountRupees, constraints.maxLoanAmountRupees], [constraints.minFoirPercent, constraints.maxFoirPercent],
    [constraints.minDbrPercent, constraints.maxDbrPercent], [constraints.minRoiPercent, constraints.maxRoiPercent],
    [constraints.minLtvPercent, constraints.maxLtvPercent]]) {
    if (min != null && max != null && Number(min) > Number(max)) throw new Error("PROGRAMME_CONFIGURATION_INVALID");
  }
  for (const percentage of [constraints.minFoirPercent, constraints.maxFoirPercent, constraints.minLtvPercent, constraints.maxLtvPercent]) {
    if (percentage != null && Number(percentage) > 100) throw new Error("PROGRAMME_CONFIGURATION_INVALID");
  }
  for (const integer of [constraints.minCibil, constraints.maxCibil, constraints.minAge, constraints.maxAge,
    constraints.minTenureMonths, constraints.maxTenureMonths]) {
    if (integer != null && !Number.isInteger(integer)) throw new Error("PROGRAMME_CONFIGURATION_INVALID");
  }

  return {
    ...(r as unknown as AssessableProgramme),
    ...settings,
    productCode: product,
    lenderDisplayName: row.lender.displayName || row.lender.label || row.lender.code,
    lenderCategory: input.lenderCategory,
    lenderScore: null,
    lenderScoreVersion: null,
    calculationComplete: true,
    minLoanAmountExact: constraints.minLoanAmountRupees,
    maxLoanAmountExact: constraints.maxLoanAmountRupees,
    minRoiExact: constraints.minRoiPercent,
    maxRoiExact: constraints.maxRoiPercent,
    minFoirExact: constraints.minFoirPercent,
    maxFoirExact: constraints.maxFoirPercent,
    minLtvExact: constraints.minLtvPercent,
    maxLtvExact: constraints.maxLtvPercent,
    canonicalProduct: product,
    policyId: policyVersion.policyId,
    policyVersionId: policyVersion.id,
    policyVersionNumber: policyVersion.versionNumber,
    parsedPolicyRules,
    canonicalConstraints: constraints,
  };
}
