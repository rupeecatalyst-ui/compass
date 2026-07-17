import type { EckfProductBlueprint } from "@/types/enterprise-credit-knowledge-framework";

/**
 * Home Loan — Master Product Blueprint (Phase 1 knowledge only).
 * No rules, calculations, or lender logic.
 */
export const HOME_LOAN_BLUEPRINT: EckfProductBlueprint = {
  productId: "home-loan",
  overview: {
    productName: "Home Loan",
    description:
      "Enterprise master blueprint for secured home financing. This knowledge center defines the product architecture used by Credit & Risk, Analyze Deal, Document Intelligence, and future lender matching — without encoding eligibility math in Phase 1.",
    purpose:
      "Fund purchase, construction, or improvement of residential property under a standardised underwriting knowledge model.",
    typicalBorrower:
      "Salaried professionals and self-employed individuals seeking long-tenor secured housing finance with clear income and property documentation.",
    securityType: "Residential property mortgage / equitable mortgage (indicative)",
    repaymentType: "EMI / amortising schedule (indicative)",
    futureNotes:
      "Detailed LTV bands, FOIR ceilings, and program matrices will attach in later phases. This section remains narrative knowledge only.",
  },
  customerCategories: [
    {
      id: "salaried",
      kind: "salaried",
      title: "Salaried",
      summary: "Employment-linked income paths under the Home Loan master blueprint.",
      placeholderBody:
        "Placeholder — salary credits, employer profile, and employment tenure knowledge will live here. No calculations or rules in Phase 1. Aligns with Context-Aware Data Collection (salaried family).",
    },
    {
      id: "self_employed",
      kind: "self_employed",
      title: "Self Employed",
      summary: "Business and professional income paths under the Home Loan master blueprint.",
      placeholderBody:
        "Placeholder — turnover, GST, ITR, banking, and vintage knowledge will live here. No calculations or rules in Phase 1. Aligns with Context-Aware Data Collection (self-employed family).",
    },
  ],
  creditPrograms: [
    {
      id: "normal_income",
      title: "Normal Income",
      description: "Standard documented income assessment path for conventional profiles.",
      purpose: "Anchor the default underwriting narrative when income is fully evidenced.",
      applicableCustomerType: "Salaried · Self Employed",
      status: "blueprint",
      futureNotes: "Program parameters and evidence checklists arrive with Credit Knowledge engines.",
    },
    {
      id: "banking_surrogate",
      title: "Banking Surrogate",
      description: "Banking-behaviour based income surrogate path (knowledge placeholder).",
      purpose: "Structure conversation when banking credits are the primary income signal.",
      applicableCustomerType: "Self Employed · Select Salaried",
      status: "planned",
      futureNotes: "No surrogate formulas in Phase 1.",
    },
    {
      id: "low_ltv",
      title: "Low LTV",
      description: "Lower loan-to-value posture for stronger security comfort.",
      purpose: "Document when conservative LTV is the primary risk mitigator.",
      applicableCustomerType: "All categories",
      status: "blueprint",
      futureNotes: "LTV matrices reserved for future phases.",
    },
    {
      id: "gst_program",
      title: "GST Program",
      description: "GST-linked business income narrative for registered entities.",
      purpose: "Organise GST-led assessment knowledge without encoding tax maths.",
      applicableCustomerType: "Self Employed Business",
      status: "planned",
      futureNotes: "GST program rules deferred.",
    },
    {
      id: "rental_income",
      title: "Rental Income",
      description: "Rental cash-flow as a supporting or primary income component.",
      purpose: "Capture rental-led underwriting knowledge structure.",
      applicableCustomerType: "Salaried · Self Employed",
      status: "blueprint",
      futureNotes: "Rental add-back logic deferred.",
    },
    {
      id: "gross_margin",
      title: "Gross Margin",
      description: "Gross-margin oriented business income interpretation.",
      purpose: "Placeholder for trading / manufacturing margin narratives.",
      applicableCustomerType: "Self Employed Business",
      status: "planned",
      futureNotes: "No margin calculations in Phase 1.",
    },
    {
      id: "liquid_income",
      title: "Liquid Income",
      description: "Liquid / surplus income framing for selective profiles.",
      purpose: "Knowledge slot for surplus and liquidity-led programs.",
      applicableCustomerType: "Salaried · Self Employed",
      status: "planned",
      futureNotes: "Liquidity tests deferred.",
    },
    {
      id: "repayment_surrogate",
      title: "Repayment Surrogate",
      description: "Repayment track record as a surrogate underwriting signal.",
      purpose: "Structure knowledge when repayment history is the dominant comfort.",
      applicableCustomerType: "All categories",
      status: "planned",
      futureNotes: "No surrogate scoring in Phase 1.",
    },
    {
      id: "cma_program",
      title: "CMA Program",
      description: "CMA / projected financials narrative for business borrowers.",
      purpose: "Reserve structure for CMA-led credit programs.",
      applicableCustomerType: "Self Employed Business",
      status: "planned",
      futureNotes: "CMA worksheets deferred.",
    },
  ],
  placeholders: [
    {
      id: "income_assessment",
      title: "Income Assessment",
      headline: "Future income assessment workspace",
      body: "This section will host structured income assessment knowledge for Home Loan — without becoming a calculator in Phase 1.",
    },
    {
      id: "eligibility",
      title: "Eligibility Parameters",
      headline: "Future eligibility parameters workspace",
      body: "Eligibility bands, FOIR/DBR references, and age/tenure norms will be catalogued here later. No calculations now.",
    },
    {
      id: "property_rules",
      title: "Property Rules",
      headline: "Future property rules workspace",
      body: "Property type, technical, and legal knowledge will attach to this blueprint section in a later phase.",
    },
    {
      id: "documentation",
      title: "Documentation",
      headline: "Future documentation workspace",
      body: "Document packs by customer category and credit program will be organised here — complementary to Document Intelligence.",
    },
    {
      id: "risk_exceptions",
      title: "Risk & Exceptions",
      headline: "Future risk & exceptions workspace",
      body: "Deviation lanes, exception catalogues, and escalation knowledge reserved for future phases.",
    },
    {
      id: "special_programs",
      title: "Special Programs",
      headline: "Future special programs workspace",
      body: "Campaign and special underwriting programs will plug into this section without redesigning the framework.",
    },
  ],
  lenderVariationsNote:
    "Every lender will eventually override this master Home Loan blueprint. Phase 1 shows the architecture only — no lender-specific policy logic.",
  versionHistory: [
    {
      id: "v1",
      version: "1.0.0-blueprint",
      at: "2026-07-18",
      summary: "Phase 1 — Enterprise Credit Knowledge Framework foundation for Home Loan.",
      author: "Catalyst One · Credit Architecture",
    },
    {
      id: "v0",
      version: "0.1.0-draft",
      at: "2026-07-01",
      summary: "Information architecture draft — Master Product hierarchy approved.",
      author: "Catalyst One · Product Office",
    },
  ],
};
