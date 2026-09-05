/**
 * CO-MARKETING-REDESIGN-013 — Sender identity and deliverability readiness.
 * Fixture / simulated observations only. Never treat DNS lookups as permanent truth.
 */

export const MARKETING_SENDER_APPROVAL_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
] as const;
export type MarketingSenderApprovalStatus = (typeof MARKETING_SENDER_APPROVAL_STATUSES)[number];

export const MARKETING_DELIVERABILITY_STATES = [
  "VERIFIED",
  "PENDING",
  "FAILED",
  "NOT_CONFIGURED",
  "UNAVAILABLE",
] as const;
export type MarketingDeliverabilityState = (typeof MARKETING_DELIVERABILITY_STATES)[number];

export const MARKETING_DELIVERABILITY_CHECK_IDS = [
  "provider_connection",
  "sender_verification",
  "spf",
  "dkim",
  "dmarc",
  "reply_mailbox",
  "bounce_handling",
  "complaint_handling",
  "unsubscribe_handling",
  "tracking_domain",
  "daily_provider_limits",
  "last_validation",
] as const;
export type MarketingDeliverabilityCheckId = (typeof MARKETING_DELIVERABILITY_CHECK_IDS)[number];

export const MARKETING_DELIVERABILITY_CHECK_LABELS: Record<MarketingDeliverabilityCheckId, string> = {
  provider_connection: "Provider connection",
  sender_verification: "Sender verification",
  spf: "SPF",
  dkim: "DKIM",
  dmarc: "DMARC",
  reply_mailbox: "Reply mailbox",
  bounce_handling: "Bounce handling",
  complaint_handling: "Complaint handling",
  unsubscribe_handling: "Unsubscribe handling",
  tracking_domain: "Tracking-domain readiness",
  daily_provider_limits: "Daily / provider limits",
  last_validation: "Last validation time",
};

export const MARKETING_SENDER_CAMPAIGN_CATEGORIES = [
  "Home Loan",
  "LAP",
  "Personal Loan",
  "Business Loan",
  "Unspecified",
] as const;

export const MARKETING_DELIVERABILITY_FRESHNESS_MS = 24 * 60 * 60 * 1000;

export const MARKETING_SENDER_SIMULATED_NOTICE =
  "Fixture sender identities are simulated. Simulated checks are never shown as verified. DNS results are not stored as permanent truth." as const;

export const MARKETING_DELIVERABILITY_UNAVAILABLE_NOTICE =
  "Unavailable — deliverability providers are not connected for this organisation." as const;

export const MARKETING_SENDER_VERIFY_EMAIL_FORBIDDEN = "SENDER_VERIFY_EMAIL_FORBIDDEN" as const;
export const MARKETING_SENDER_NOT_APPROVED = "SENDER_NOT_APPROVED" as const;
export const MARKETING_SENDER_SIMULATED_NOT_VERIFIED = "SENDER_SIMULATED_NOT_VERIFIED" as const;
export const MARKETING_DNS_MUTATION_FORBIDDEN = "DNS_MUTATION_FORBIDDEN" as const;
