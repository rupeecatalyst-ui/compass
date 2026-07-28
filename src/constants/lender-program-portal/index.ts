/**
 * CO-LEND-001 — Lender Program Portal constants.
 */
export {
  LENDER_PROGRAM_TEMPLATES,
  resolveProgramTemplateForProductCode,
  emptyPayloadForTemplate,
  type LenderProgramTemplateKey,
  type LenderProgramTemplate,
  type LenderProgramFieldDef,
} from "./templates";

export const LENDER_PROGRAM_PORTAL_TOKEN_PREFIX = "lendtok_";

/** Default invite TTL — 14 days (admin may override). */
export const LENDER_PROGRAM_PORTAL_DEFAULT_TTL_DAYS = 14;

export const LENDER_PROGRAM_OTP_TTL_MINUTES = 10;

export const LENDER_PROGRAM_DOCUMENT_KINDS = [
  { id: "product_circular", label: "Product Circular" },
  { id: "credit_policy", label: "Credit Policy" },
  { id: "rate_sheet", label: "Rate Sheet" },
  { id: "product_brochure", label: "Product Brochure" },
  { id: "processing_fee_circular", label: "Processing Fee Circular" },
  { id: "campaign_offer", label: "Campaign Offer" },
  { id: "supporting", label: "Supporting Document" },
] as const;

export const LENDER_PROGRAM_SUBMISSION_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_review: "Pending Review",
  clarification_requested: "Clarification Requested",
  rejected: "Rejected",
  approved: "Approved",
  published: "Published",
  scheduled: "Scheduled",
};
