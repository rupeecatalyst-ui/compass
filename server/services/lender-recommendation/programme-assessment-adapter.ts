import type { AssessableProgramme } from "@/lib/home-loan-recommendation/engine";
import type { RecommendationLenderCategory } from "@/lib/home-loan-recommendation/cibil-category";
import type { CanonicalRecommendationProduct } from "@/types/canonical-lender-recommendation";
import { parseCanonicalPolicyRules, type ParsedCanonicalPolicyRules } from "./policy-rule-parser";

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
  lender: { displayName: string | null; label: string; code: string };
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
  };
};

function list(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.filter((item): item is string => typeof item === "string" && item.length > 0);
  return items.length ? items : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function exact(value: unknown): string | null {
  return value == null ? null : String(value);
}

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
  if (version.policy.productCode && version.policy.productCode !== product) return "POLICY_PRODUCT_MISMATCH";
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

  const transactionTypes = list(row.transactionTypes);
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
    minIncomeRupees: exact(r.minIncomeExact),
    maxIncomeRupees: exact(r.maxIncomeExact),
    minLoanAmountRupees: exact(r.minLoanAmountExact),
    maxLoanAmountRupees: exact(r.maxLoanAmountExact),
    minAge: num(r.minAge),
    maxAge: num(r.maxAge),
    minTenureMonths: num(r.minTenureMonths),
    maxTenureMonths: num(r.maxTenureMonths),
    minFoirPercent: exact(r.minFoirExact),
    maxFoirPercent: exact(r.maxFoirExact),
    minDbrPercent: exact(r.minDbrExact),
    maxDbrPercent: exact(r.maxDbrExact),
    minRoiPercent: exact(r.minRoiExact),
    maxRoiPercent: exact(r.maxRoiExact),
    minLtvPercent: exact(r.minLtvExact),
    maxLtvPercent: exact(r.maxLtvExact),
    requiredDocumentTypeIds: list(r.requiredDocumentTypeIds),
  };

  return {
    ...(r as unknown as AssessableProgramme),
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
