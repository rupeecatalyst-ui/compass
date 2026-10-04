/**
 * Launch-closure rules for the existing lender programme portal.
 * Does not own Product Programme policy. Maps a submission into the
 * certified programme write shape and keeps OTP material off the client.
 */
import {
  PROGRAMME_BENCHMARKS,
  PROGRAMME_EMPLOYMENT_ID_SET,
  PROGRAMME_INCOME_ASSESSMENT_METHODS,
  PROGRAMME_LEGAL_CONSTITUTIONS,
  PROGRAMME_PROPERTY_TYPES,
  PROGRAMME_RATE_TYPES,
  PROGRAMME_RESIDENCY_ID_SET,
  type ProgrammeEmploymentTypeId,
  type ProgrammeLegalConstitutionId,
  type ProgrammeResidencyId,
} from "@/constants/product-programme-operations/controlled-masters";
import {
  LENDER_PORTAL_OTP_MAX_FAILURES,
  LENDER_PORTAL_OTP_MAX_REQUESTS,
} from "@/constants/lender-program-portal";
import type { LenderProgramPayload } from "@/types/lender-program-portal";

const SELF_EMPLOYED_INCOME = new Set(["itr", "gst", "banking", "turnover"]);
const PROPERTY_PRODUCTS = new Set(["HOME_LOAN", "HOME_LOAN_BT", "LAP"]);

export class PortalLaunchError extends Error {
  statusCode: number;
  code: string;
  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function normalizeRecipientEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function assertPortalAdministrator(role: string | undefined): void {
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new PortalLaunchError(403, "FORBIDDEN", "Administrator access is required.");
  }
}

export function assertRecipientEmail(value: string | null | undefined): string {
  const email = normalizeRecipientEmail(value ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new PortalLaunchError(400, "RECIPIENT_EMAIL_REQUIRED", "A lender recipient email is required.");
  }
  return email;
}

export function emailsMatch(left: string, right: string): boolean {
  return normalizeRecipientEmail(left) === normalizeRecipientEmail(right);
}

export function decideOtpAttempt(input: { recentRequests: number; recentFailures: number }):
  | { ok: true }
  | { ok: false; code: "OTP_RATE_LIMITED" | "OTP_LOCKED" } {
  if (input.recentRequests >= LENDER_PORTAL_OTP_MAX_REQUESTS) {
    return { ok: false, code: "OTP_RATE_LIMITED" };
  }
  if (input.recentFailures >= LENDER_PORTAL_OTP_MAX_FAILURES) {
    return { ok: false, code: "OTP_LOCKED" };
  }
  return { ok: true };
}

/** Browser payload after a successful email send. The code is never included. */
export function publicOtpDelivery(): { ok: true; channel: "email"; delivered: true } {
  return { ok: true, channel: "email", delivered: true };
}

export function submissionCanPublish(status: string): boolean {
  return status === "approved";
}

export function isRecommendationAuthority(input: {
  isLivePublished: boolean;
  publicationState: string;
  completenessState: string;
  enabled: boolean;
  isDeleted: boolean;
}): boolean {
  return (
    input.enabled &&
    !input.isDeleted &&
    input.isLivePublished === true &&
    input.publicationState === "published" &&
    input.completenessState === "complete"
  );
}

function text(payload: LenderProgramPayload, key: string): string {
  const value = payload[key];
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function numberOrNull(payload: LenderProgramPayload, key: string): number | null {
  const value = payload[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function exactDecimal(payload: LenderProgramPayload, key: string, scale: 2 | 6): string | null {
  const value = numberOrNull(payload, key);
  if (value == null) return null;
  return value.toFixed(scale);
}

function oneOf<T extends string>(value: string, allowed: ReadonlySet<string>, field: string): T {
  if (!allowed.has(value)) {
    throw new PortalLaunchError(400, "CONTROLLED_VALUE_REQUIRED", `${field} must use a controlled Product Programme value.`);
  }
  return value as T;
}

export function mapPortalPayloadToProgrammeBody(input: {
  lenderId: string;
  productId: string | null;
  productCode: string;
  programName: string;
  payload: LenderProgramPayload;
  policyVersionId: string;
}): Record<string, unknown> {
  const employment = oneOf<ProgrammeEmploymentTypeId>(
    text(input.payload, "employmentType"),
    PROGRAMME_EMPLOYMENT_ID_SET,
    "Employment category",
  );
  const incomeMethod = oneOf(
    text(input.payload, "incomeAssessmentMethod"),
    new Set(PROGRAMME_INCOME_ASSESSMENT_METHODS.map((item) => item.id)),
    "Income assessment",
  );
  const selfEmployed = employment.startsWith("self-employed");
  if (employment === "salaried" && incomeMethod !== "salary") {
    throw new PortalLaunchError(
      400,
      "INCOME_MODEL_MISMATCH",
      "Salaried programmes use salary assessment. FOIR is a salaried limit, not a self-employed income method.",
    );
  }
  if (selfEmployed && !SELF_EMPLOYED_INCOME.has(incomeMethod)) {
    throw new PortalLaunchError(
      400,
      "INCOME_MODEL_MISMATCH",
      "Self-employed programmes require ITR, GST, banking, or turnover assessment. Salaried FOIR is not that method.",
    );
  }
  const constitution = oneOf<ProgrammeLegalConstitutionId>(
    text(input.payload, "legalConstitution"),
    new Set(PROGRAMME_LEGAL_CONSTITUTIONS.map((item) => item.id)),
    "Legal constitution",
  );
  const residency = oneOf<ProgrammeResidencyId>(
    text(input.payload, "residencyEligibility"),
    PROGRAMME_RESIDENCY_ID_SET,
    "Residency",
  );
  const rateType = oneOf(
    text(input.payload, "interestType"),
    new Set(PROGRAMME_RATE_TYPES.map((item) => item.id)),
    "Rate type",
  );
  const benchmark = oneOf(
    text(input.payload, "benchmarkCode"),
    new Set(PROGRAMME_BENCHMARKS.map((item) => item.id)),
    "Benchmark",
  );
  const property = oneOf(
    text(input.payload, "propertyType"),
    new Set(PROGRAMME_PROPERTY_TYPES.map((item) => item.id)),
    "Property type",
  );
  const productCode = input.productCode.toUpperCase().replaceAll("-", "_");
  const propertyTypes = PROPERTY_PRODUCTS.has(productCode)
    ? property === "not_applicable"
      ? []
      : [property]
    : ["not_applicable"];
  if (PROPERTY_PRODUCTS.has(productCode) && propertyTypes.length === 0) {
    throw new PortalLaunchError(400, "CONTROLLED_VALUE_REQUIRED", "Property type is required for this product.");
  }
  const state = text(input.payload, "geographyState");
  if (!state) {
    throw new PortalLaunchError(400, "CONTROLLED_VALUE_REQUIRED", "Eligible state is required.");
  }
  const documents = text(input.payload, "requiredDocuments")
    .split(/[,;\n]/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((label) => ({
      typeRef: label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "lender_document",
      mandatory: true,
      label,
    }));
  return {
    lenderId: input.lenderId,
    productId: input.productId,
    productCode: input.productCode,
    code: `${input.productCode}_${input.programName}`.toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 40),
    label: input.programName,
    applicantTypes: ["primary_applicant"],
    employmentTypes: [employment],
    legalConstitutions: [constitution],
    residencyEligibility: [residency],
    customerSegments: [],
    propertyTypes,
    propertyCategories: [],
    constructionStatuses: [],
    transactionTypes: productCode === "HOME_LOAN_BT" ? ["balance_transfer"] : ["fresh"],
    geographyStates: [state],
    geographyCities: [],
    minCibil: numberOrNull(input.payload, "minCibil"),
    minAge: numberOrNull(input.payload, "minAge"),
    maxAge: numberOrNull(input.payload, "maxAge"),
    incomeAssessmentMethods: [incomeMethod],
    minTenureMonths: numberOrNull(input.payload, "minTenureMonths"),
    maxTenureMonths: numberOrNull(input.payload, "maxTenureMonths"),
    minLoanAmountExact: exactDecimal(input.payload, "minLoanAmount", 2),
    maxLoanAmountExact: exactDecimal(input.payload, "maxLoanAmount", 2),
    minIncomeExact: exactDecimal(input.payload, "minIncome", 2),
    minRoiExact: exactDecimal(input.payload, "interestRate", 6),
    maxRoiExact: exactDecimal(input.payload, "interestRate", 6),
    maxLtvExact: exactDecimal(input.payload, "ltvPercent", 6),
    maxFoirExact: employment === "salaried" ? exactDecimal(input.payload, "maxFoir", 6) : null,
    rateType,
    benchmarkCode: benchmark,
    policyVersionId: input.policyVersionId,
    requiredDocuments: documents,
    requiredDocumentTypeIds: [],
    effectiveFrom: text(input.payload, "effectiveDate") || null,
    effectiveUntil: text(input.payload, "expiryDate") || null,
    reviewAt: text(input.payload, "expiryDate") || null,
    remarks: text(input.payload, "remarks") || null,
    notes: text(input.payload, "specialConditions") || null,
    processingFeeLabel: text(input.payload, "processingFee") || null,
  };
}
