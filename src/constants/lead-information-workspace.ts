/**
 * ADR-018 Wave 2 — Lead Information Workspace constants.
 * Product options are a selection catalog — never applied as silent defaults.
 */

export const LEAD_INFORMATION_ROUTE = "/lead-information";

/** Catalog for explicit user selection only (CAD: no fabricated default).
 * Phase 1 EDIE LOD products are included so Opportunity Creation can BAT Generate LOD. */
export const LEAD_INFORMATION_PRODUCT_OPTIONS = [
  { code: "HOME_LOAN", label: "Home Loan" },
  { code: "HOME_LOAN_BT", label: "Home Loan Balance Transfer" },
  { code: "LAP", label: "Loan Against Property" },
  { code: "PERSONAL_LOAN", label: "Personal Loan" },
  { code: "EDUCATION_LOAN", label: "Education Loan" },
  { code: "CAR_LOAN", label: "Car Loan" },
  { code: "GOLD_LOAN", label: "Gold Loan" },
  { code: "LOAN_AGAINST_SECURITIES", label: "Loan Against Securities" },
  { code: "UNSECURED_BUSINESS_LOAN", label: "Unsecured Business Loan" },
  /** Alias retained for existing Opportunities — same EDIE pack as Unsecured Business Loan */
  { code: "BUSINESS_LOAN", label: "Business Loan (Unsecured)" },
  { code: "WORKING_CAPITAL", label: "Working Capital" },
  { code: "PLOT_LOAN", label: "Plot Loan" },
] as const;

export const LEAD_INFORMATION_TRANSACTION_OPTIONS = [
  { value: "fresh", label: "Fresh" },
  { value: "balance_transfer", label: "Balance Transfer" },
] as const;

export const LEAD_INFORMATION_EMPLOYMENT_OPTIONS = [
  { value: "salaried", label: "Salaried" },
  { value: "self-employed-professional", label: "Self-Employed Professional" },
  { value: "self-employed-business", label: "Self-Employed Business" },
] as const;

/** Opportunity capture — Secured / Unsecured only (reuse LoanFile LendingType values). */
export const LEAD_INFORMATION_LENDING_TYPE_OPTIONS = [
  { value: "secured", label: "Secured" },
  { value: "unsecured", label: "Unsecured" },
] as const;

/** Select sentinel — maps to null / Not Specified (never a business default). */
export const LEAD_INFORMATION_NONE = "__none__";

export type LeadInformationFormState = {
  productCode: string;
  productLabel: string;
  requestedAmount: string;
  transactionType: string;
  /** Same values as LoanFile.lendingType — stored in lendingExtension. */
  lendingType: string;
  employmentTypeCode: string;
  /** CO-SPRINT-101 Approximate CIBIL Score (shared master) — Opportunity capture label: Expected CIBIL Score */
  approxCibilScore: string;
  cityLabel: string;
  stateLabel: string;
  remarks: string;
  /** Balance Transfer — Enterprise Lender Registry id */
  btInstitutionId: string;
  btInstitutionName: string;
  /** Balance Transfer — outstanding amount as entered (numeric string / empty) */
  btAmount: string;
};

export function emptyLeadInformationForm(): LeadInformationFormState {
  return {
    productCode: "",
    productLabel: "",
    requestedAmount: "",
    transactionType: "",
    lendingType: "",
    employmentTypeCode: "",
    approxCibilScore: "",
    cityLabel: "",
    stateLabel: "",
    remarks: "",
    btInstitutionId: "",
    btInstitutionName: "",
    btAmount: "",
  };
}

export type LeadInformationLendingExtension = {
  /** Historical only — no longer captured in UI; preserved on save when present. */
  purpose?: string | null;
  remarks?: string | null;
  /** Same key as LoanFile.approxCibilScore — no new DB column. */
  approxCibilScore?: string | null;
  /** Same key as LoanFile.lendingType — no new DB column. */
  lendingType?: string | null;
  btInstitutionId?: string | null;
  btInstitutionName?: string | null;
  btAmount?: number | null;
};

export function parseLeadInformationLendingExtension(
  value: unknown,
): LeadInformationLendingExtension {
  if (!value || typeof value !== "object") return {};
  const row = value as Record<string, unknown>;
  const btAmountRaw = row.btAmount;
  let btAmount: number | null = null;
  if (typeof btAmountRaw === "number" && Number.isFinite(btAmountRaw)) {
    btAmount = btAmountRaw;
  } else if (typeof btAmountRaw === "string" && btAmountRaw.trim()) {
    const n = Number(btAmountRaw.replace(/,/g, ""));
    if (Number.isFinite(n)) btAmount = n;
  }
  return {
    purpose: typeof row.purpose === "string" ? row.purpose : null,
    remarks: typeof row.remarks === "string" ? row.remarks : null,
    approxCibilScore:
      typeof row.approxCibilScore === "string" ? row.approxCibilScore : null,
    lendingType: typeof row.lendingType === "string" ? row.lendingType : null,
    btInstitutionId:
      typeof row.btInstitutionId === "string" ? row.btInstitutionId : null,
    btInstitutionName:
      typeof row.btInstitutionName === "string" ? row.btInstitutionName : null,
    btAmount,
  };
}

/**
 * Product Master–driven Lending Type default for Opportunity capture.
 * Returns "" when the product does not imply secured/unsecured.
 */
export function resolveDefaultLendingTypeForProduct(
  productCode?: string | null,
  productLabel?: string | null,
): "secured" | "unsecured" | "" {
  const code = productCode?.trim().toUpperCase() || "";
  const label = productLabel?.trim() || "";

  const byCode: Record<string, "secured" | "unsecured"> = {
    HOME_LOAN: "secured",
    HOME_LOAN_BT: "secured",
    LAP: "secured",
    WORKING_CAPITAL: "secured",
    PLOT_LOAN: "secured",
    PERSONAL_LOAN: "unsecured",
    EDUCATION_LOAN: "unsecured",
    CAR_LOAN: "secured",
    GOLD_LOAN: "secured",
    LOAN_AGAINST_SECURITIES: "secured",
    UNSECURED_BUSINESS_LOAN: "unsecured",
    BUSINESS_LOAN: "unsecured",
  };
  if (code && byCode[code]) return byCode[code];

  const normalized = label.toLowerCase();
  if (
    normalized.includes("personal loan") ||
    normalized.includes("credit card") ||
    (normalized.includes("business loan") && normalized.includes("unsecured"))
  ) {
    return "unsecured";
  }
  if (
    normalized.includes("home loan") ||
    normalized.includes("loan against property") ||
    normalized === "lap" ||
    normalized.includes("working capital") ||
    normalized.includes("plot loan") ||
    normalized.includes("construction finance") ||
    normalized.includes("commercial property") ||
    normalized.includes("lease rental") ||
    normalized.includes("machinery loan")
  ) {
    return "secured";
  }
  if (normalized.includes("business loan")) return "unsecured";

  return "";
}
