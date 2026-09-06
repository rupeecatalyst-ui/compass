import type { ProgrammeFieldError, StructuredProgrammePayload } from "@/types/product-programme-operations";
import { PROGRAMME_PROPERTY_TYPES } from "@/constants/product-programme-operations/controlled-masters";

const PROPERTY_PRODUCT_CODES = new Set(["HOME_LOAN", "HOME_LOAN_BT", "LAP"]);

export function evaluateProgrammeCompleteness(
  payload: StructuredProgrammePayload,
): { complete: boolean; errors: ProgrammeFieldError[] } {
  const errors: ProgrammeFieldError[] = [];
  const require = (field: string, ok: boolean, message: string) => {
    if (!ok) errors.push({ field, message });
  };

  require("lenderId", Boolean(payload.lenderId), "Lender is required.");
  require("productCode", Boolean(payload.productCode || payload.productId), "Product is required.");
  require("code", Boolean(payload.code), "Programme code is required.");
  require("label", Boolean(payload.label), "Programme name is required.");
  require("employmentTypes", payload.employmentTypes.length > 0, "Employment eligibility is required.");
  require("legalConstitutions", payload.legalConstitutions.length > 0, "Legal constitution is required.");
  require("residencyEligibility", payload.residencyEligibility.length > 0, "Residency eligibility is required.");
  require("minLoanAmountExact", Boolean(payload.minLoanAmountExact), "Minimum loan amount is required.");
  require("maxLoanAmountExact", Boolean(payload.maxLoanAmountExact), "Maximum loan amount is required.");
  require("minRoiExact", Boolean(payload.minRoiExact), "Minimum ROI is required.");
  require("maxRoiExact", Boolean(payload.maxRoiExact), "Maximum ROI is required.");
  require("rateType", Boolean(payload.rateType), "Rate type is required.");
  require("benchmarkCode", Boolean(payload.benchmarkCode), "Benchmark is required.");
  require("minCibil", payload.minCibil != null, "Minimum CIBIL is required.");
  require("minAge", payload.minAge != null, "Minimum age is required.");
  require("maxAge", payload.maxAge != null, "Maximum age is required.");
  require("minTenureMonths", payload.minTenureMonths != null, "Minimum tenure is required.");
  require("maxTenureMonths", payload.maxTenureMonths != null, "Maximum tenure is required.");
  require("geographyStates", payload.geographyStates.length > 0, "Eligible geography is required.");
  require("policyVersionId", Boolean(payload.policyVersionId), "A published policy version is required.");
  require(
    "requiredDocumentTypeIds",
    payload.requiredDocumentTypeIds.length > 0 || payload.requiredDocuments.length > 0,
    "Required documents / LOD is required.",
  );
  require("effectiveFrom", Boolean(payload.effectiveFrom), "Effective date is required.");
  require("reviewAt", Boolean(payload.reviewAt || payload.effectiveUntil), "Review or expiry date is required.");

  const salaried = payload.employmentTypes.includes("salaried");
  const selfEmployed = payload.employmentTypes.some((id) => id.startsWith("self-employed"));
  if (salaried || selfEmployed) {
    require("minIncomeExact", Boolean(payload.minIncomeExact), "Minimum income / turnover is required.");
    require(
      "incomeAssessmentMethods",
      payload.incomeAssessmentMethods.length > 0,
      "Income assessment method is required.",
    );
  }
  if (selfEmployed) {
    const usesBusinessMethod = payload.incomeAssessmentMethods.some((id) =>
      ["itr", "gst", "banking", "turnover"].includes(id),
    );
    require(
      "incomeAssessmentMethods",
      usesBusinessMethod,
      "Self-employed programmes require ITR, GST, banking or turnover assessment.",
    );
  }

  const productCode = (payload.productCode ?? "").toUpperCase();
  if (PROPERTY_PRODUCT_CODES.has(productCode)) {
    require("propertyTypes", payload.propertyTypes.length > 0, "Property type is required for this product.");
    require("minLtvExact", Boolean(payload.minLtvExact), "Minimum LTV is required.");
    require("maxLtvExact", Boolean(payload.maxLtvExact), "Maximum LTV is required.");
  } else if (payload.propertyTypes.some((id) => id !== "not_applicable")) {
    require(
      "propertyTypes",
      payload.propertyTypes.every((id) => id === "not_applicable") || payload.propertyTypes.length === 0,
      "Non-property products must record property type as Not applicable.",
    );
  } else if (payload.propertyTypes.length === 0 && productCode && !PROPERTY_PRODUCT_CODES.has(productCode)) {
    errors.push({
      field: "propertyTypes",
      message: "Non-property products must explicitly record property type as Not applicable.",
    });
  }

  if (productCode === "HOME_LOAN_BT" || payload.transactionTypes.includes("balance_transfer")) {
    require(
      "transactionTypes",
      payload.transactionTypes.includes("balance_transfer") || payload.transactionTypes.includes("bt_top_up"),
      "Home Loan Balance Transfer must include a BT transaction type.",
    );
  }

  require("minFoirExact", Boolean(payload.minFoirExact || payload.maxFoirExact), "FOIR range is required.");
  require("minDbrExact", Boolean(payload.minDbrExact || payload.maxDbrExact), "DBR range is required.");

  void PROGRAMME_PROPERTY_TYPES;
  return { complete: errors.length === 0, errors };
}
