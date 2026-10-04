/**
 * Advantage Committed (₹) — display label and applicability SSOT.
 * Canonical stored field: advantageCommittedAmount (Opportunity-level).
 */

export const ADVANTAGE_COMMITTED_LABEL = "Advantage Committed (₹)" as const;

export const ADVANTAGE_COMMITTED_STATUS = {
  COMMITTED: "committed",
  NOT_COMMITTED: "not_committed",
  NOT_APPLICABLE: "not_applicable",
} as const;

export type AdvantageCommittedStatus =
  (typeof ADVANTAGE_COMMITTED_STATUS)[keyof typeof ADVANTAGE_COMMITTED_STATUS];

export const ADVANTAGE_COMMITTED_STATUS_LABEL: Record<AdvantageCommittedStatus, string> = {
  committed: ADVANTAGE_COMMITTED_LABEL,
  not_committed: "Not committed",
  not_applicable: "Not applicable",
};

/** Products where Compass Advantage currently applies (approved commercial rules). */
export const ADVANTAGE_COMMITTED_APPLICABLE_PRODUCT_CODES = [
  "HOME_LOAN",
  "HOME_LOAN_BT",
] as const;

export type AdvantageCommittedApplicableProductCode =
  (typeof ADVANTAGE_COMMITTED_APPLICABLE_PRODUCT_CODES)[number];

export const ADVANTAGE_COMMITTED_PRODUCT_ALIASES: Record<string, AdvantageCommittedApplicableProductCode> =
  {
    HOME_LOAN: "HOME_LOAN",
    HOMELOAN: "HOME_LOAN",
    HL: "HOME_LOAN",
    "HOME LOAN": "HOME_LOAN",
    HOME_LOAN_BT: "HOME_LOAN_BT",
    HOMELOANBT: "HOME_LOAN_BT",
    HLBT: "HOME_LOAN_BT",
    "HOME LOAN BT": "HOME_LOAN_BT",
    "HOME LOAN BALANCE TRANSFER": "HOME_LOAN_BT",
    "HOME LOAN — BALANCE TRANSFER": "HOME_LOAN_BT",
    "HOME LOAN – BALANCE TRANSFER": "HOME_LOAN_BT",
  };

export const ADVANTAGE_COMMITTED_CURRENCY = "INR" as const;

export const ADVANTAGE_COMMITTED_EVENT_KIND = {
  ORIGINAL_COMMIT: "original_commit",
  CORRECTION: "correction",
} as const;

export type AdvantageCommittedEventKind =
  (typeof ADVANTAGE_COMMITTED_EVENT_KIND)[keyof typeof ADVANTAGE_COMMITTED_EVENT_KIND];

export const ADVANTAGE_COMMITTED_PERMISSIONS = {
  VIEW: "opportunity.advantage_committed.view",
  CORRECT: "opportunity.advantage_committed.correct",
} as const;

export const ADVANTAGE_COMMITTED_FORBIDDEN_LABELS = [
  "Compass Advantage Commitment",
  "Advantage Commitment",
  "Advantage Locked",
  "Advantage Logged",
  "Wallet Amount",
] as const;

export const ADVANTAGE_COMMITTED_MUTATION_KEYS = [
  "advantageCommittedAmount",
  "advantageCommittedCurrency",
  "advantageCommittedAt",
  "advantageCommittedByUserId",
  "advantageCommittedProductCode",
  "advantageCommitmentId",
  "advantageCommitmentVersion",
] as const;
