/**
 * CO-ACCOUNTING-INVOICE-OPERATIONS-015 — Narrow Accounting regulatory-tax configuration.
 *
 * Sources are official CBIC / taxinformation.cbic.gov.in Act text only.
 * This is NOT a general tax engine. Rates for invoices still require an
 * Administration-selected EnterpriseAccountingGstRate that matches the
 * configured default when applicable.
 */

export const ACCOUNTING_REGULATORY_TAX_SOURCE = "enterprise_accounting_regulatory_tax" as const;

export const ACCOUNTING_GST_DEFAULT_RATE_PERCENT = 18 as const;

export type AccountingGstTaxTreatment = "intra_state" | "inter_state";

export type AccountingRegulatoryTaxRuleStatus = "active" | "superseded" | "draft";

export type AccountingRegulatoryTaxRule = {
  ruleId: string;
  taxType: "GST";
  ratePercent: number;
  applicability: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  jurisdiction: "IN";
  sourceAuthority: string;
  sourceReference: string;
  sourceTitle: string;
  sourceUrl: string;
  lastVerifiedAt: string;
  status: AccountingRegulatoryTaxRuleStatus;
  notes: string;
};

/**
 * Official GST state codes (GSTIN prefix) — CBIC / GSTN state code list.
 * Kept for Place of Supply / location-of-supplier determination only.
 */
export const GSTIN_STATE_CODES: Readonly<Record<string, string>> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
};

/** Union Territories that levy UTGST rather than SGST for intra-UT supplies. */
export const GST_UNION_TERRITORY_CODES = new Set([
  "04", // Chandigarh
  "07", // Delhi (NCT — CGST+SGST practice; listed for label clarity)
  "26", // DNH & DD
  "31", // Lakshadweep
  "34", // Puducherry
  "35", // A&N
  "38", // Ladakh
]);

/**
 * Active Accounting GST rate rule — default 18% for facilitation / intermediary
 * commercial invoices when Administration GST Rate Master selects a matching rate.
 *
 * Rate catalogues remain Administration-owned (EnterpriseAccountingGstRate).
 * This rule documents the regulatory default and audit metadata only.
 */
export const ACCOUNTING_GST_RATE_RULE_18: AccountingRegulatoryTaxRule = {
  ruleId: "ACCT-GST-RATE-18-DEFAULT-V1",
  taxType: "GST",
  ratePercent: 18,
  applicability:
    "Default Accounting invoice GST rate for taxable supply of services where Administration GST Rate Master selects 18% and no superseding notification is configured.",
  effectiveFrom: "2017-07-01",
  effectiveTo: null,
  jurisdiction: "IN",
  sourceAuthority: "CBIC / Government of India",
  sourceReference: "IGST Act 2017 s.5; CGST Act 2017 s.9; GST rate notifications as administered",
  sourceTitle: "Integrated Goods and Services Tax Act, 2017 — Levy of IGST (s.5) / CGST Act s.9",
  sourceUrl:
    "https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/acts/2017_IGST_Act/active/chapteriii/section5_v1.00.html",
  lastVerifiedAt: "2026-08-26T00:00:00.000Z",
  status: "active",
  notes:
    "18% is the Accounting workflow default configuration — not a bypass of Place of Supply or intra/inter-state determination.",
};

export const ACCOUNTING_GST_POS_RULE_B2B_SERVICES: AccountingRegulatoryTaxRule = {
  ruleId: "ACCT-GST-POS-IGST-S12-2A-V1",
  taxType: "GST",
  ratePercent: ACCOUNTING_GST_DEFAULT_RATE_PERCENT,
  applicability:
    "Place of supply for services to a registered person (general rule): location of the registered recipient.",
  effectiveFrom: "2017-07-01",
  effectiveTo: null,
  jurisdiction: "IN",
  sourceAuthority: "CBIC",
  sourceReference: "IGST Act 2017 Section 12(2)(a)",
  sourceTitle:
    "Section 12 — Place of supply of services where location of supplier and recipient is in India",
  sourceUrl:
    "https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/acts/2017_IGST_Act/active/chapterv/section12_v1.00.html",
  lastVerifiedAt: "2026-08-26T00:00:00.000Z",
  status: "active",
  notes: "Used when Invoice Party is GST-registered (GSTIN present).",
};

export const ACCOUNTING_GST_POS_RULE_FINANCIAL_SERVICES: AccountingRegulatoryTaxRule = {
  ruleId: "ACCT-GST-POS-IGST-S12-12-V1",
  taxType: "GST",
  ratePercent: ACCOUNTING_GST_DEFAULT_RATE_PERCENT,
  applicability:
    "Place of supply of banking and other financial services: location of the recipient on the supplier's records.",
  effectiveFrom: "2017-07-01",
  effectiveTo: null,
  jurisdiction: "IN",
  sourceAuthority: "CBIC",
  sourceReference: "IGST Act 2017 Section 12(12)",
  sourceTitle:
    "Section 12(12) — Place of supply of banking and other financial services",
  sourceUrl:
    "https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/acts/2017_IGST_Act/active/chapterv/section12_v1.00.html",
  lastVerifiedAt: "2026-08-26T00:00:00.000Z",
  status: "active",
  notes:
    "Preferred for Accounting commission / facilitation invoices when treated as financial services.",
};

export const ACCOUNTING_GST_INTRA_STATE_RULE: AccountingRegulatoryTaxRule = {
  ruleId: "ACCT-GST-INTRA-IGST-S8-V1",
  taxType: "GST",
  ratePercent: ACCOUNTING_GST_DEFAULT_RATE_PERCENT,
  applicability:
    "Intra-State supply of services when location of supplier and place of supply are in the same State or UT → CGST + SGST/UTGST.",
  effectiveFrom: "2017-07-01",
  effectiveTo: null,
  jurisdiction: "IN",
  sourceAuthority: "CBIC",
  sourceReference: "IGST Act 2017 Section 8(2); CGST Act 2017 Section 9",
  sourceTitle: "Section 8 — Intra-State supply",
  sourceUrl:
    "https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/acts/2017_IGST_Act/active/chapteriv/section8_v1.00.html",
  lastVerifiedAt: "2026-08-26T00:00:00.000Z",
  status: "active",
  notes: "Never combine with IGST on the same normal supply.",
};

export const ACCOUNTING_GST_INTER_STATE_RULE: AccountingRegulatoryTaxRule = {
  ruleId: "ACCT-GST-INTER-IGST-S7-V1",
  taxType: "GST",
  ratePercent: ACCOUNTING_GST_DEFAULT_RATE_PERCENT,
  applicability:
    "Inter-State supply when location of supplier and place of supply differ → IGST only.",
  effectiveFrom: "2017-07-01",
  effectiveTo: null,
  jurisdiction: "IN",
  sourceAuthority: "CBIC",
  sourceReference: "IGST Act 2017 Section 7; IGST Act 2017 Section 5",
  sourceTitle: "Section 7 — Inter-State supply / Section 5 — Levy of IGST",
  sourceUrl:
    "https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/acts/2017_IGST_Act/active/chapteriii/section5_v1.00.html",
  lastVerifiedAt: "2026-08-26T00:00:00.000Z",
  status: "active",
  notes: "Never combine IGST with CGST/SGST on the same normal supply.",
};

export const ACCOUNTING_REGULATORY_TAX_RULES: readonly AccountingRegulatoryTaxRule[] = [
  ACCOUNTING_GST_RATE_RULE_18,
  ACCOUNTING_GST_POS_RULE_B2B_SERVICES,
  ACCOUNTING_GST_POS_RULE_FINANCIAL_SERVICES,
  ACCOUNTING_GST_INTRA_STATE_RULE,
  ACCOUNTING_GST_INTER_STATE_RULE,
];

export function listActiveAccountingRegulatoryTaxRules(
  atIso = new Date().toISOString(),
): AccountingRegulatoryTaxRule[] {
  const at = Date.parse(atIso);
  return ACCOUNTING_REGULATORY_TAX_RULES.filter((rule) => {
    if (rule.status !== "active") return false;
    const from = Date.parse(rule.effectiveFrom);
    if (Number.isFinite(from) && at < from) return false;
    if (rule.effectiveTo) {
      const to = Date.parse(rule.effectiveTo);
      if (Number.isFinite(to) && at > to) return false;
    }
    return true;
  });
}
