/**
 * CO-MARKETING-MKT-09 — Provider-neutral WhatsApp delivery domain types.
 * Template-only messaging — no free-form bulk body.
 */

/** Provider-neutral delivery outcomes (aligned with email). */
export type MarketingWhatsAppDeliveryOutcome =
  | "ACCEPTED"
  | "SENT"
  | "FAILED"
  | "RETRYABLE_FAILURE"
  | "PERMANENT_FAILURE"
  | "RATE_LIMITED"
  | "BLOCKED"
  | "CANCELLED";

export type MarketingWhatsAppTemplateCategory =
  | "MARKETING"
  | "UTILITY"
  | "AUTHENTICATION"
  | "SERVICE";

export type MarketingWhatsAppTemplateApprovalState =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "DISABLED";

export type MarketingWhatsAppProviderType =
  | "dry_run"
  | "meta_cloud"
  | "twilio"
  | "gupshup"
  | "other";

export type MarketingWhatsAppTemplateVariable = {
  key: string;
  label: string;
  required: boolean;
  /** Example for dry-run preview. */
  example?: string | null;
};

/** Approved WhatsApp template registry entry — credentials never stored here. */
export type MarketingWhatsAppTemplate = {
  id: string;
  organizationId: string;
  name: string;
  category: MarketingWhatsAppTemplateCategory;
  language: string;
  /** Body with {{var}} placeholders — template-bound only. */
  body: string;
  variables: MarketingWhatsAppTemplateVariable[];
  active: boolean;
  approvalState: MarketingWhatsAppTemplateApprovalState;
  providerMapping: {
    providerType: MarketingWhatsAppProviderType;
    /** Opaque provider template id — never API keys. */
    providerTemplateId: string | null;
    credentialConfigured: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

/** Structured delivery request — provider-neutral. */
export type MarketingWhatsAppDeliveryRequest = {
  idempotencyKey: string;
  organizationId: string;
  campaignId: string;
  campaignVersionId: string;
  batchId: string;
  executionId: string;
  recipientFingerprint: string;
  /** E.164-style digits preferred; validated before deliver. */
  recipientPhone: string;
  templateId: string;
  templateName: string;
  language: string;
  variables: Record<string, string>;
  /** Rendered preview body for observability (dry-run). */
  renderedBody: string;
};

export type MarketingWhatsAppDeliveryResult = {
  idempotencyKey: string;
  outcome: MarketingWhatsAppDeliveryOutcome;
  providerMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  dryRun: boolean;
  duplicate?: boolean;
  renderedBody?: string | null;
  variables?: Record<string, string>;
};

export type MarketingWhatsAppDeliveryRecord = {
  id: string;
  idempotencyKey: string;
  organizationId: string;
  campaignId: string;
  batchId: string;
  executionId: string;
  templateId: string;
  recipientFingerprint: string;
  /** Redacted phone for observability. */
  recipientPhoneRedacted: string;
  outcome: MarketingWhatsAppDeliveryOutcome;
  providerMessageId: string | null;
  errorCode: string | null;
  dryRun: boolean;
  createdAt: string;
};
