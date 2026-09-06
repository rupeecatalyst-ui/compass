import {
  PROGRAMME_BENCHMARKS,
  PROGRAMME_INCOME_ASSESSMENT_METHODS,
  PROGRAMME_PROPERTY_TYPES,
  PROGRAMME_RATE_TYPES,
  PROGRAMME_TRANSACTION_TYPES,
} from "@/constants/product-programme-operations/controlled-masters";
import { parseExactMoney, parseExactPercent } from "@/lib/product-programme-operations/money";
import {
  assertConstitutions,
  assertEmploymentTypes,
  assertResidency,
  deriveEmploymentFamily,
  isAmbiguousEmploymentText,
} from "@/lib/product-programme-operations/employment";
import {
  ProgrammeValidationError,
  type StructuredProgrammePayload,
} from "@/types/product-programme-operations";

const ALLOWED_WRITE_KEYS = new Set([
  "lenderId",
  "productId",
  "productCode",
  "productVariantCode",
  "code",
  "label",
  "description",
  "applicantTypes",
  "employmentTypes",
  "legalConstitutions",
  "residencyEligibility",
  "customerSegments",
  "propertyTypes",
  "transactionTypes",
  "eligibleStates",
  "eligibleCities",
  "geographyStates",
  "geographyCities",
  "minCibil",
  "maxCibil",
  "minAge",
  "maxAge",
  "incomeAssessmentMethods",
  "minTenureMonths",
  "maxTenureMonths",
  "minLoanAmountExact",
  "maxLoanAmountExact",
  "minIncomeExact",
  "maxIncomeExact",
  "processingFeeAmountExact",
  "minRoiExact",
  "maxRoiExact",
  "processingFeePctExact",
  "minLtvExact",
  "maxLtvExact",
  "minFoirExact",
  "maxFoirExact",
  "minDbrExact",
  "maxDbrExact",
  "spreadExact",
  "rateType",
  "benchmarkCode",
  "processingFeeLabel",
  "concessions",
  "deviationCategories",
  "policyVersionId",
  "creditRiskPolicyRef",
  "requiredDocumentTypeIds",
  "requiredDocuments",
  "averageTatDays",
  "effectiveFrom",
  "reviewAt",
  "effectiveUntil",
  "notes",
  "remarks",
  "lifecycleStatus",
  "status",
  "enabled",
  "expectedLockVersion",
  "createDraftRevision",
  "createdBy",
  "modifiedBy",
]);

function asStringArray(value: unknown, field: string): string[] {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw new ProgrammeValidationError("Invalid field type", [
      { field, message: `${field} must be an array of controlled identifiers.` },
    ]);
  }
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function asOptionalInt(value: unknown, field: string): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new ProgrammeValidationError("Invalid integer", [
      { field, message: `${field} must be an integer.` },
    ]);
  }
  return value;
}

function asOptionalId(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  return String(value).trim() || null;
}

function assertControlled(ids: string[], allowed: readonly { id: string }[], field: string): string[] {
  const set = new Set(allowed.map((item) => item.id));
  for (const id of ids) {
    if (!set.has(id)) {
      throw new ProgrammeValidationError("Unknown controlled value", [
        { field, message: `Unknown ${field} value “${id}”.` },
      ]);
    }
  }
  return ids;
}

export function rejectUnknownProgrammeFields(body: Record<string, unknown>): void {
  const unknown = Object.keys(body).filter((key) => !ALLOWED_WRITE_KEYS.has(key));
  if (unknown.length > 0) {
    throw new ProgrammeValidationError("Unknown fields are not allowed", [
      {
        field: unknown[0],
        message: `Unknown field(s): ${unknown.join(", ")}`,
      },
    ]);
  }
}

export function parseStructuredProgrammePayload(
  body: Record<string, unknown>,
  options?: { partial?: boolean },
): StructuredProgrammePayload {
  rejectUnknownProgrammeFields(body);
  const partial = options?.partial === true;

  const employmentTypes = assertEmploymentTypes(asStringArray(body.employmentTypes, "employmentTypes"));
  if (typeof body.employmentType === "string" && isAmbiguousEmploymentText(body.employmentType)) {
    throw new ProgrammeValidationError("Employment must be a controlled multi-select", [
      {
        field: "employmentTypes",
        message: "Do not store “Both” as free text. Select both employment families instead.",
      },
    ]);
  }

  const payload: StructuredProgrammePayload = {
    lenderId: String(body.lenderId ?? ""),
    productId: asOptionalId(body.productId),
    productCode: asOptionalId(body.productCode),
    productVariantCode: asOptionalId(body.productVariantCode),
    code: String(body.code ?? "").trim(),
    label: String(body.label ?? "").trim(),
    description: asOptionalId(body.description),
    applicantTypes: asStringArray(body.applicantTypes, "applicantTypes"),
    employmentTypes,
    employmentFamily: deriveEmploymentFamily(employmentTypes),
    legalConstitutions: assertConstitutions(asStringArray(body.legalConstitutions, "legalConstitutions")),
    residencyEligibility: assertResidency(asStringArray(body.residencyEligibility, "residencyEligibility")),
    customerSegments: asStringArray(body.customerSegments, "customerSegments"),
    propertyTypes: assertControlled(
      asStringArray(body.propertyTypes, "propertyTypes"),
      PROGRAMME_PROPERTY_TYPES,
      "propertyTypes",
    ),
    transactionTypes: assertControlled(
      asStringArray(body.transactionTypes, "transactionTypes"),
      PROGRAMME_TRANSACTION_TYPES,
      "transactionTypes",
    ),
    geographyStates: asStringArray(body.geographyStates ?? body.eligibleStates, "geographyStates"),
    geographyCities: asStringArray(body.geographyCities ?? body.eligibleCities, "geographyCities"),
    minCibil: asOptionalInt(body.minCibil, "minCibil"),
    maxCibil: asOptionalInt(body.maxCibil, "maxCibil"),
    minAge: asOptionalInt(body.minAge, "minAge"),
    maxAge: asOptionalInt(body.maxAge, "maxAge"),
    incomeAssessmentMethods: assertControlled(
      asStringArray(body.incomeAssessmentMethods, "incomeAssessmentMethods"),
      PROGRAMME_INCOME_ASSESSMENT_METHODS,
      "incomeAssessmentMethods",
    ),
    minTenureMonths: asOptionalInt(body.minTenureMonths, "minTenureMonths"),
    maxTenureMonths: asOptionalInt(body.maxTenureMonths, "maxTenureMonths"),
    minLoanAmountExact: parseExactMoney(body.minLoanAmountExact, "minLoanAmountExact"),
    maxLoanAmountExact: parseExactMoney(body.maxLoanAmountExact, "maxLoanAmountExact"),
    minIncomeExact: parseExactMoney(body.minIncomeExact, "minIncomeExact"),
    maxIncomeExact: parseExactMoney(body.maxIncomeExact, "maxIncomeExact"),
    processingFeeAmountExact: parseExactMoney(body.processingFeeAmountExact, "processingFeeAmountExact"),
    minRoiExact: parseExactPercent(body.minRoiExact, "minRoiExact"),
    maxRoiExact: parseExactPercent(body.maxRoiExact, "maxRoiExact"),
    processingFeePctExact: parseExactPercent(body.processingFeePctExact, "processingFeePctExact"),
    minLtvExact: parseExactPercent(body.minLtvExact, "minLtvExact"),
    maxLtvExact: parseExactPercent(body.maxLtvExact, "maxLtvExact"),
    minFoirExact: parseExactPercent(body.minFoirExact, "minFoirExact"),
    maxFoirExact: parseExactPercent(body.maxFoirExact, "maxFoirExact"),
    minDbrExact: parseExactPercent(body.minDbrExact, "minDbrExact"),
    maxDbrExact: parseExactPercent(body.maxDbrExact, "maxDbrExact"),
    spreadExact: parseExactPercent(body.spreadExact, "spreadExact"),
    rateType: asOptionalId(body.rateType),
    benchmarkCode: asOptionalId(body.benchmarkCode),
    processingFeeLabel: asOptionalId(body.processingFeeLabel),
    concessions: asStringArray(body.concessions, "concessions"),
    deviationCategories: asStringArray(body.deviationCategories, "deviationCategories"),
    policyVersionId: asOptionalId(body.policyVersionId),
    creditRiskPolicyRef: asOptionalId(body.creditRiskPolicyRef),
    requiredDocumentTypeIds: asStringArray(body.requiredDocumentTypeIds, "requiredDocumentTypeIds"),
    requiredDocuments: Array.isArray(body.requiredDocuments)
      ? (body.requiredDocuments as StructuredProgrammePayload["requiredDocuments"])
      : [],
    averageTatDays: asOptionalInt(body.averageTatDays, "averageTatDays"),
    effectiveFrom: asOptionalId(body.effectiveFrom),
    reviewAt: asOptionalId(body.reviewAt),
    effectiveUntil: asOptionalId(body.effectiveUntil),
    notes: asOptionalId(body.notes),
    remarks: asOptionalId(body.remarks),
  };

  if (payload.rateType && !PROGRAMME_RATE_TYPES.some((item) => item.id === payload.rateType)) {
    throw new ProgrammeValidationError("Unknown rate type", [
      { field: "rateType", message: `Unknown rate type “${payload.rateType}”.` },
    ]);
  }
  if (
    payload.benchmarkCode &&
    !PROGRAMME_BENCHMARKS.some((item) => item.id === payload.benchmarkCode)
  ) {
    throw new ProgrammeValidationError("Unknown benchmark", [
      { field: "benchmarkCode", message: `Unknown benchmark “${payload.benchmarkCode}”.` },
    ]);
  }

  if (!partial) {
    if (!payload.lenderId) {
      throw new ProgrammeValidationError("Lender is required", [
        { field: "lenderId", message: "Lender is required." },
      ]);
    }
    if (!payload.code) {
      throw new ProgrammeValidationError("Programme code is required", [
        { field: "code", message: "Programme code is required." },
      ]);
    }
    if (!payload.label) {
      throw new ProgrammeValidationError("Programme name is required", [
        { field: "label", message: "Programme name is required." },
      ]);
    }
  }

  return payload;
}
