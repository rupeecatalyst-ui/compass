/**
 * CO-ARCH — Active Opportunity uniqueness (Contact + Product + Active).
 * Single source for product key normalization and planning-active detection.
 */

/** Canonical product keys for common lending / wealth products. */
const PRODUCT_KEY_ALIASES: Record<string, string> = {
  home_loan: "home_loan",
  "home loan": "home_loan",
  "home-loan": "home_loan",
  hl: "home_loan",
  "product:home-loan": "home_loan",
  personal_loan: "personal_loan",
  "personal loan": "personal_loan",
  "personal-loan": "personal_loan",
  pl: "personal_loan",
  loan_against_property: "loan_against_property",
  "loan against property": "loan_against_property",
  lap: "loan_against_property",
  business_loan: "business_loan",
  "business loan": "business_loan",
  mutual_fund: "mutual_fund",
  "mutual fund": "mutual_fund",
  mf: "mutual_fund",
};

/** Default product when Start Loan Journey does not specify one (lending). */
export const DEFAULT_START_LOAN_JOURNEY_PRODUCT = {
  productFamily: "lending" as const,
  productCode: "HOME_LOAN",
  productLabel: "Home Loan",
  productUniquenessKey: "home_loan",
};

export type OpportunityProductIdentity = {
  productId?: string | null;
  productCode?: string | null;
  productLabel?: string | null;
};

/**
 * Normalize Contact+Product uniqueness key.
 * Prefer productId; else productCode; else productLabel; apply aliases.
 */
export function resolveProductUniquenessKey(
  input: OpportunityProductIdentity,
): string | null {
  const id = input.productId?.trim();
  if (id) return `id:${id.toLowerCase()}`;

  const raw = (input.productCode?.trim() || input.productLabel?.trim() || "").trim();
  if (!raw) return null;

  const normalized = raw
    .toLowerCase()
    .replace(/^product:/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (PRODUCT_KEY_ALIASES[normalized]) {
    return PRODUCT_KEY_ALIASES[normalized];
  }
  if (PRODUCT_KEY_ALIASES[raw.toLowerCase()]) {
    return PRODUCT_KEY_ALIASES[raw.toLowerCase()];
  }

  return normalized.replace(/\s+/g, "_");
}

/** Lifecycle values that block another Opportunity for the same Contact+Product (CO-OPP-002). */
export const ACTIVE_PLANNING_LIFECYCLE_STATUSES = [
  "requirement_captured",
  "in_progress",
  "converted_to_deal",
  "on_hold",
  /** legacy synonym of In Progress — historical rows only */
  "active",
] as const;

export type ActivePlanningLifecycleStatus =
  (typeof ACTIVE_PLANNING_LIFECYCLE_STATUSES)[number];

/**
 * Opportunity participates in Contact+Product uniqueness while Requirement Captured,
 * In Progress, Converted to Deal, or On Hold — not Dialogue (or legacy Draft).
 */
export function isOpportunityPlanningActive(row: {
  lifecycleStatus?: string | null;
  archived?: boolean | null;
  isDeleted?: boolean | null;
  closedAt?: Date | string | null;
}): boolean {
  if (row.isDeleted) return false;
  if (row.archived) return false;
  if (row.closedAt) return false;
  const status = (row.lifecycleStatus || "in_progress").toLowerCase();
  return (ACTIVE_PLANNING_LIFECYCLE_STATUSES as readonly string[]).includes(status);
}

export function formatProductDisplayLabel(input: OpportunityProductIdentity): string {
  return (
    input.productLabel?.trim() ||
    input.productCode?.trim()?.replace(/_/g, " ") ||
    "this product"
  );
}
