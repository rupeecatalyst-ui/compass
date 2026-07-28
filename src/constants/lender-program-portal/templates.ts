/**
 * CO-LEND-001 — Product-driven program templates (metadata SSOT).
 * Home Loan and HL BT+Top-up share one template.
 */

export type LenderProgramTemplateKey =
  | "home_loan"
  | "lap"
  | "business_loan"
  | "working_capital"
  | "commercial_purchase"
  | "construction_finance"
  | "personal_loan"
  | "generic";

export type LenderProgramFieldType =
  | "text"
  | "number"
  | "percent"
  | "currency"
  | "boolean"
  | "date"
  | "textarea"
  | "select";

export type LenderProgramFieldDef = {
  key: string;
  label: string;
  type: LenderProgramFieldType;
  section: string;
  required?: boolean;
  options?: string[];
  common?: boolean;
};

export type LenderProgramTemplate = {
  key: LenderProgramTemplateKey;
  label: string;
  /** Product codes from Product Master that use this template. */
  productCodes: string[];
  description: string;
  fields: LenderProgramFieldDef[];
};

const COMMON_FIELDS: LenderProgramFieldDef[] = [
  { key: "programName", label: "Program Name", type: "text", section: "Program", required: true, common: true },
  { key: "effectiveDate", label: "Effective Date", type: "date", section: "Program", common: true },
  { key: "expiryDate", label: "Expiry Date", type: "date", section: "Program", common: true },
  { key: "interestRate", label: "Interest Rate (%)", type: "percent", section: "Pricing", required: true, common: true },
  { key: "interestType", label: "Interest Type", type: "select", section: "Pricing", common: true, options: ["Floating", "Fixed", "Hybrid"] },
  { key: "processingFee", label: "Processing Fee", type: "text", section: "Pricing", common: true },
  { key: "minLoanAmount", label: "Minimum Loan", type: "currency", section: "Limits", common: true },
  { key: "maxLoanAmount", label: "Maximum Loan", type: "currency", section: "Limits", common: true },
  { key: "minIncome", label: "Minimum Income", type: "currency", section: "Eligibility", common: true },
  { key: "maxFoir", label: "Maximum FOIR (%)", type: "percent", section: "Eligibility", common: true },
  { key: "minCibil", label: "Minimum CIBIL", type: "number", section: "Eligibility", common: true },
  { key: "maxTenureMonths", label: "Maximum Tenure (months)", type: "number", section: "Limits", common: true },
  { key: "eligibleCustomerType", label: "Eligible Customer Type", type: "text", section: "Eligibility", common: true },
  { key: "eligiblePropertyType", label: "Eligible Property Type", type: "text", section: "Eligibility", common: true },
  { key: "requiredDocuments", label: "Required Documents", type: "textarea", section: "Documentation", common: true },
  { key: "specialConditions", label: "Special Conditions", type: "textarea", section: "Conditions", common: true },
  { key: "remarks", label: "Remarks", type: "textarea", section: "Conditions", common: true },
];

const HOME_LOAN_EXTRA: LenderProgramFieldDef[] = [
  { key: "ltvPercent", label: "LTV (%)", type: "percent", section: "Eligibility" },
  { key: "propertyEligibility", label: "Property Eligibility", type: "textarea", section: "Eligibility" },
  { key: "incomeCriteria", label: "Income Criteria", type: "textarea", section: "Eligibility" },
  { key: "foirDetails", label: "FOIR Details", type: "textarea", section: "Eligibility" },
  { key: "balanceTransferAllowed", label: "Balance Transfer Allowed", type: "boolean", section: "BT / Top-up" },
  { key: "topUpAllowed", label: "Top-up Allowed", type: "boolean", section: "BT / Top-up" },
  { key: "minExistingLoanVintageMonths", label: "Min Existing Loan Vintage (months)", type: "number", section: "BT / Top-up" },
  { key: "minEmisPaid", label: "Minimum EMIs Paid", type: "number", section: "BT / Top-up" },
  { key: "existingLenderRestrictions", label: "Existing Lender Restrictions", type: "textarea", section: "BT / Top-up" },
];

const LAP_EXTRA: LenderProgramFieldDef[] = [
  { key: "residentialLap", label: "Residential LAP", type: "boolean", section: "Property" },
  { key: "commercialLap", label: "Commercial LAP", type: "boolean", section: "Property" },
  { key: "industrialProperty", label: "Industrial Property", type: "boolean", section: "Property" },
  { key: "plotEligibility", label: "Plot Eligibility", type: "textarea", section: "Property" },
  { key: "ltvPercent", label: "LTV (%)", type: "percent", section: "Eligibility" },
  { key: "minVintageMonths", label: "Minimum Vintage (months)", type: "number", section: "Eligibility" },
  { key: "businessVintageMonths", label: "Business Vintage (months)", type: "number", section: "Eligibility" },
  { key: "turnoverCriteria", label: "Turnover Criteria", type: "textarea", section: "Eligibility" },
  { key: "incomeCriteria", label: "Income Criteria", type: "textarea", section: "Eligibility" },
];

const BL_EXTRA: LenderProgramFieldDef[] = [
  { key: "businessVintageMonths", label: "Business Vintage (months)", type: "number", section: "Eligibility" },
  { key: "turnoverCriteria", label: "Turnover", type: "textarea", section: "Eligibility" },
  { key: "gstRequired", label: "GST Requirement", type: "boolean", section: "Eligibility" },
  { key: "itrRequired", label: "ITR Requirement", type: "boolean", section: "Eligibility" },
  { key: "bankingCriteria", label: "Banking Criteria", type: "textarea", section: "Eligibility" },
  { key: "minProfit", label: "Minimum Profit", type: "currency", section: "Eligibility" },
];

const WC_EXTRA: LenderProgramFieldDef[] = [
  { key: "ccLimit", label: "CC Limit", type: "currency", section: "Facilities" },
  { key: "odLimit", label: "OD Limit", type: "currency", section: "Facilities" },
  { key: "invoiceFinance", label: "Invoice Finance", type: "textarea", section: "Facilities" },
  { key: "tradeFinance", label: "Trade Finance", type: "textarea", section: "Facilities" },
  { key: "stockStatements", label: "Stock Statements", type: "textarea", section: "Requirements" },
  { key: "bankingRequirements", label: "Banking Requirements", type: "textarea", section: "Requirements" },
  { key: "collateralRequirements", label: "Collateral Requirements", type: "textarea", section: "Requirements" },
];

const COMM_PURCHASE_EXTRA: LenderProgramFieldDef[] = [
  { key: "eligiblePropertyTypes", label: "Eligible Property Types", type: "textarea", section: "Property" },
  { key: "ltvPercent", label: "Maximum LTV (%)", type: "percent", section: "Eligibility" },
  { key: "minBusinessVintageMonths", label: "Minimum Business Vintage (months)", type: "number", section: "Eligibility" },
  { key: "companyTypes", label: "Company Types", type: "textarea", section: "Eligibility" },
  { key: "incomeRequirements", label: "Income Requirements", type: "textarea", section: "Eligibility" },
  { key: "leaseRentalConsideration", label: "Lease Rental Consideration", type: "textarea", section: "Eligibility" },
  { key: "propertyDocumentation", label: "Property Documentation", type: "textarea", section: "Documentation" },
];

export const LENDER_PROGRAM_TEMPLATES: LenderProgramTemplate[] = [
  {
    key: "home_loan",
    label: "Home Loan / Home Loan BT + Top-up",
    productCodes: ["HOME_LOAN", "HL", "HL_BT", "HL_BT_TOPUP", "HOME_LOAN_BT", "HOME_LOAN_BT_TOPUP"],
    description:
      "Single shared template for Home Loan and Home Loan Balance Transfer + Top-up.",
    fields: [...COMMON_FIELDS, ...HOME_LOAN_EXTRA],
  },
  {
    key: "lap",
    label: "Loan Against Property (LAP)",
    productCodes: ["LAP", "LOAN_AGAINST_PROPERTY"],
    description: "Dedicated LAP template including residential, commercial, and industrial.",
    fields: [...COMMON_FIELDS, ...LAP_EXTRA],
  },
  {
    key: "business_loan",
    label: "Business Loan (Unsecured)",
    productCodes: ["BUSINESS_LOAN", "BL", "UNSECURED_BL"],
    description: "Unsecured business loan eligibility and banking criteria.",
    fields: [...COMMON_FIELDS, ...BL_EXTRA],
  },
  {
    key: "working_capital",
    label: "Working Capital",
    productCodes: ["WORKING_CAPITAL", "WC", "CC_OD"],
    description: "CC/OD, invoice and trade finance facilities.",
    fields: [...COMMON_FIELDS, ...WC_EXTRA],
  },
  {
    key: "commercial_purchase",
    label: "Commercial Purchase",
    productCodes: ["COMM_PURCHASE", "COMMERCIAL_PURCHASE"],
    description: "Commercial property purchase programs.",
    fields: [...COMMON_FIELDS, ...COMM_PURCHASE_EXTRA],
  },
  {
    key: "construction_finance",
    label: "Construction Finance",
    productCodes: ["CONSTRUCTION_FINANCE", "CF"],
    description: "Construction finance — uses common program fields plus remarks.",
    fields: [...COMMON_FIELDS],
  },
  {
    key: "personal_loan",
    label: "Personal Loan",
    productCodes: ["PERSONAL_LOAN", "PL"],
    description: "Personal loan programs.",
    fields: [...COMMON_FIELDS],
  },
  {
    key: "generic",
    label: "Generic Product Program",
    productCodes: ["*"],
    description: "Fallback template for future Product Master products.",
    fields: [...COMMON_FIELDS],
  },
];

export function resolveProgramTemplateForProductCode(
  productCode: string | null | undefined,
): LenderProgramTemplate {
  const code = (productCode || "").trim().toUpperCase().replace(/\s+/g, "_");
  const hit = LENDER_PROGRAM_TEMPLATES.find(
    (t) => t.key !== "generic" && t.productCodes.some((c) => c.toUpperCase() === code),
  );
  return hit ?? LENDER_PROGRAM_TEMPLATES.find((t) => t.key === "generic")!;
}

export function emptyPayloadForTemplate(
  template: LenderProgramTemplate,
): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const f of template.fields) {
    if (f.type === "boolean") out[f.key] = false;
    else out[f.key] = "";
  }
  return out;
}
