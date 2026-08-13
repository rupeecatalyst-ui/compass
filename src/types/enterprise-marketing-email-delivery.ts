/**
 * CO-MARKETING-MKT-07 — Provider-neutral email delivery domain types.
 * No vendor-specific fields in core engine.
 */

/** Provider-neutral delivery outcomes (core domain). */
export type MarketingEmailDeliveryOutcome =
  | "ACCEPTED"
  | "SENT"
  | "FAILED"
  | "RETRYABLE_FAILURE"
  | "PERMANENT_FAILURE"
  | "RATE_LIMITED"
  | "BLOCKED"
  | "CANCELLED";

export type MarketingSenderVerificationStatus =
  | "UNVERIFIED"
  | "PENDING"
  | "VERIFIED"
  | "FAILED";

export type MarketingEmailProviderType =
  | "dry_run"
  | "resend"
  | "sendgrid"
  | "ses"
  | "smtp"
  | "other";

/** Configurable org sender — credentials live in server env only. */
export type MarketingSenderIdentity = {
  id: string;
  organizationId: string;
  displayName: string;
  fromAddress: string;
  replyTo: string | null;
  active: boolean;
  verificationStatus: MarketingSenderVerificationStatus;
  providerMapping: {
    providerType: MarketingEmailProviderType;
    /** Opaque provider profile reference — never API keys or passwords. */
    providerProfileId: string | null;
    /** Derived flag — true when server env has credentials for this mapping. */
    credentialConfigured: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

/** Resolved sender snapshot attached to a delivery (not stored on campaign). */
export type MarketingEmailDeliverySender = {
  senderIdentityId: string;
  displayName: string;
  fromAddress: string;
  replyTo: string | null;
};

export type MarketingEmailDeliveryTrackingMeta = {
  enabled: boolean;
  campaignId: string;
  batchId: string;
  campaignVersionId: string;
  recipientFingerprint: string;
};

/** Structured delivery request — provider-neutral. */
export type MarketingEmailDeliveryRequest = {
  idempotencyKey: string;
  organizationId: string;
  campaignId: string;
  campaignVersionId: string;
  batchId: string;
  recipientFingerprint: string;
  recipientEmail: string;
  sender: MarketingEmailDeliverySender;
  subject: string;
  htmlBody: string;
  textBody: string;
  assetRefs?: string[];
  tracking?: MarketingEmailDeliveryTrackingMeta;
};

export type MarketingEmailDeliveryResult = {
  idempotencyKey: string;
  outcome: MarketingEmailDeliveryOutcome;
  /** Present when provider accepted / sent (dry-run uses synthetic ids). */
  providerMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  dryRun: boolean;
  duplicate?: boolean;
};

/** Minimal delivery audit record — no unnecessary PII. */
export type MarketingEmailDeliveryRecord = {
  id: string;
  idempotencyKey: string;
  organizationId: string;
  campaignId: string;
  batchId: string;
  recipientFingerprint: string;
  /** Redacted recipient email for observability. */
  recipientEmailRedacted: string;
  senderIdentityId: string;
  outcome: MarketingEmailDeliveryOutcome;
  providerMessageId: string | null;
  errorCode: string | null;
  dryRun: boolean;
  createdAt: string;
};
