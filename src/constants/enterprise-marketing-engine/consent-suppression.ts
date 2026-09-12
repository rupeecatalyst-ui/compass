/**
 * CO-MARKETING-REDESIGN-012 — Consent and Suppression Centre constants.
 * Fixture identities only. Never treat missing consent as granted.
 */

export const MARKETING_CONSENT_RECORD_KINDS = [
  "CONSENT_GRANTED",
  "CONSENT_WITHDRAWN",
  "UNSUBSCRIBED",
  "INVALID_ADDRESS",
  "HARD_BOUNCE",
  "SOFT_BOUNCE",
  "SPAM_COMPLAINT",
  "MANUAL_SUPPRESSION",
  "LEGAL_COMPLIANCE",
  "TEMPORARY_SUPPRESSION",
  "CAMPAIGN_EXCLUSION",
] as const;

export type MarketingConsentRecordKind = (typeof MARKETING_CONSENT_RECORD_KINDS)[number];

export const MARKETING_CONSENT_RECORD_KIND_LABELS: Record<MarketingConsentRecordKind, string> = {
  CONSENT_GRANTED: "Consent granted",
  CONSENT_WITHDRAWN: "Consent withdrawn",
  UNSUBSCRIBED: "Unsubscribed",
  INVALID_ADDRESS: "Invalid address",
  HARD_BOUNCE: "Hard bounce",
  SOFT_BOUNCE: "Soft bounce",
  SPAM_COMPLAINT: "Spam complaint",
  MANUAL_SUPPRESSION: "Manual suppression",
  LEGAL_COMPLIANCE: "Legal / compliance suppression",
  TEMPORARY_SUPPRESSION: "Temporary suppression",
  CAMPAIGN_EXCLUSION: "Campaign-specific exclusion",
};

export const MARKETING_CONSENT_RECORD_STATUSES = ["ACTIVE", "EXPIRED", "LIFTED", "SUPERSEDED"] as const;
export type MarketingConsentRecordStatus = (typeof MARKETING_CONSENT_RECORD_STATUSES)[number];

export const MARKETING_CONSENT_DURATIONS = ["PERMANENT", "TEMPORARY"] as const;
export type MarketingConsentDuration = (typeof MARKETING_CONSENT_DURATIONS)[number];

export const MARKETING_CONSENT_SOURCES = [
  "SHEET_MAPPING",
  "MANUAL",
  "PROVIDER",
  "CAMPAIGN",
  "LEGAL",
  "SYSTEM_FIXTURE",
  "PUBLIC_UNSUBSCRIBE",
] as const;
export type MarketingConsentSource = (typeof MARKETING_CONSENT_SOURCES)[number];

export const MARKETING_CONSENT_CHANNELS = ["EMAIL", "WHATSAPP", "ALL"] as const;
export type MarketingConsentChannel = (typeof MARKETING_CONSENT_CHANNELS)[number];

/** Always block subsequent email delivery, even if audience org-suppression is off. */
export const MARKETING_ALWAYS_BLOCK_EMAIL_KINDS: readonly MarketingConsentRecordKind[] = [
  "UNSUBSCRIBED",
  "HARD_BOUNCE",
  "SPAM_COMPLAINT",
  "CONSENT_WITHDRAWN",
  "LEGAL_COMPLIANCE",
];

export const MARKETING_DEFAULT_CONSENT_GRANTED_VALUES = [
  "yes",
  "y",
  "true",
  "1",
  "granted",
  "opt-in",
  "optin",
  "consented",
] as const;

export const MARKETING_DEFAULT_SOFT_BOUNCE_TTL_MS = 72 * 60 * 60 * 1000;

export const MARKETING_CONSENT_CENTRE_NOTICE =
  "Consent and Suppression Centre uses organisation fixture records only. Missing consent is never treated as granted. Historical campaign snapshots are never silently rewritten." as const;

export const MARKETING_CONSENT_UNAVAILABLE_NOTICE =
  "Unavailable — Consent and Suppression Centre is not connected for this organisation." as const;
