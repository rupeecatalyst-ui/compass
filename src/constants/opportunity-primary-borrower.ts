/**
 * CO-DOM-001 — Primary borrower on Opportunity (Individual or Company).
 */

export const OPPORTUNITY_PRIMARY_BORROWER_KIND = {
  INDIVIDUAL: "individual",
  COMPANY: "company",
} as const;

export type OpportunityPrimaryBorrowerKind =
  (typeof OPPORTUNITY_PRIMARY_BORROWER_KIND)[keyof typeof OPPORTUNITY_PRIMARY_BORROWER_KIND];

export const OPPORTUNITY_PRIMARY_BORROWER_LABELS: Record<
  OpportunityPrimaryBorrowerKind,
  string
> = {
  individual: "Individual",
  company: "Company",
};

export function assertOpportunityPrimaryBorrowerKind(
  value: unknown,
): OpportunityPrimaryBorrowerKind {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (raw === OPPORTUNITY_PRIMARY_BORROWER_KIND.COMPANY) {
    return OPPORTUNITY_PRIMARY_BORROWER_KIND.COMPANY;
  }
  return OPPORTUNITY_PRIMARY_BORROWER_KIND.INDIVIDUAL;
}

export function isCompanyPrimaryBorrower(row: {
  primaryBorrowerKind?: string | null;
}): boolean {
  return row.primaryBorrowerKind === OPPORTUNITY_PRIMARY_BORROWER_KIND.COMPANY;
}
