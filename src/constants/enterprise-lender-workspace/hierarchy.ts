import type {
  ElwHierarchyRank,
  ElwProductPolicySection,
} from "@/types/enterprise-lender-workspace";

/** @deprecated CO-LENDER-HIERARCHY-REMEDIATION-001 — ranks retired; key kept for purge only */
export const ELW_HIERARCHY_STORAGE_KEY = "catalyst.elw.hierarchy-assignments.v1";

/**
 * @deprecated Hardcoded vacant ranks retired. Hierarchy is ECM reports_to projection.
 * Kept only so legacy imports do not crash; production UI must not render these ranks.
 */
export const ELW_HIERARCHY_RANKS: ReadonlyArray<{
  rank: ElwHierarchyRank;
  label: string;
  accent: string;
}> = [];

export const ELW_DEFAULT_PRODUCTS = [
  { productRef: "product:home-loan", label: "Home Loan", id: "home-loan" },
  { productRef: "product:lap", label: "Loan Against Property", id: "lap" },
  { productRef: "product:business-loan", label: "Business Loan", id: "business-loan" },
  { productRef: "product:working-capital", label: "Working Capital", id: "working-capital" },
  { productRef: "product:construction-finance", label: "Construction Finance", id: "construction-finance" },
] as const;

export const ELW_PRODUCT_POLICY_SECTIONS: readonly ElwProductPolicySection[] = [
  {
    id: "eligibility",
    title: "Eligibility",
    placeholder: "Eligibility criteria will be supplied by the Credit Knowledge Framework.",
  },
  {
    id: "credit_programs",
    title: "Credit Programs",
    placeholder: "Credit programme matrix placeholder — future-ready structure.",
  },
  {
    id: "financial_programs",
    title: "Financial Programs",
    placeholder: "Financial programme placeholders (no calculations in Phase 1).",
  },
  {
    id: "documents",
    title: "Documents",
    placeholder: "Document checklist by product will attach here.",
  },
  {
    id: "property",
    title: "Property",
    placeholder: "Property norms and technical requirements — placeholder.",
  },
  {
    id: "income",
    title: "Income",
    placeholder: "Income assessment structure reserved for future engine.",
  },
  {
    id: "risk",
    title: "Risk",
    placeholder: "Risk posture and deviation lanes — placeholder.",
  },
  {
    id: "special_conditions",
    title: "Special Conditions",
    placeholder: "Special conditions and exceptions — placeholder.",
  },
  {
    id: "version_history",
    title: "Version History",
    placeholder: "Policy version timeline will appear here.",
  },
];
