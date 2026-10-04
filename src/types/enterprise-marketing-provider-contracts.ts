/**
 * CO-MARKETING-REDESIGN-014 — Provider-neutral email send + webhook contracts.
 * No vendor-specific fields. Live adapters are not implemented.
 */

export type MarketingProviderSendMode = "internal_test" | "production";

export type MarketingProviderDecision = "accepted" | "rejected";

export type MarketingProviderStatus =
  | "ACCEPTED"
  | "REJECTED"
  | "DELIVERED"
  | "BOUNCED"
  | "COMPLAINED"
  | "OPENED"
  | "CLICKED"
  | "UNSUBSCRIBED"
  | "REPLIED"
  | "FAILED";

export type MarketingProviderFailureCategory =
  | "NONE"
  | "MALFORMED"
  | "MISSING_CONTEXT"
  | "LIVE_PROVIDER_DISABLED"
  | "RATE_LIMITED"
  | "TEMPORARY"
  | "PERMANENT"
  | "BLOCKED"
  | "SIGNATURE"
  | "ORG_ISOLATION";

export type MarketingProviderWebhookEventType =
  | "delivery_status"
  | "bounce"
  | "complaint"
  | "open"
  | "click"
  | "unsubscribe"
  | "reply";

export type MarketingProviderSender = {
  senderIdentityId: string;
  displayName: string;
  fromAddress: string;
  replyTo: string | null;
};

export type MarketingProviderTrackingMeta = {
  enabled: boolean;
  campaignId: string;
  campaignVersionId: string;
  batchId: string;
  recipientFingerprint: string;
};

export type MarketingProviderSendRequest = {
  sendMode: MarketingProviderSendMode;
  organizationId: string;
  campaignId: string;
  campaignVersionId: string;
  recipientLedgerId: string;
  idempotencyKey: string;
  sender: MarketingProviderSender;
  replyTo: string | null;
  subject: string;
  preheader: string;
  renderedHtml: string;
  safeTextAlternative: string;
  unsubscribeIdentity: string;
  tracking: MarketingProviderTrackingMeta;
};

export type MarketingProviderSendResponse = {
  decision: MarketingProviderDecision;
  providerMessageId: string | null;
  providerStatus: MarketingProviderStatus;
  failureCategory: MarketingProviderFailureCategory;
  retryEligible: boolean;
  timestamp: string;
  dryRun: true;
  simulated: true;
  duplicate: boolean;
  networkCalls: 0;
};

export type MarketingProviderSignatureInput = {
  rawBody: string;
  signature: string | null | undefined;
};

export type MarketingProviderSignatureResult = {
  ok: boolean;
  code: "WEBHOOK_SIGNATURE_OK" | "WEBHOOK_SIGNATURE_MISSING" | "WEBHOOK_SIGNATURE_INVALID";
};

export type MarketingProviderWebhookEnvelope = {
  providerEventId: string;
  type: MarketingProviderWebhookEventType;
  providerMessageId: string;
  organizationId: string;
  campaignId: string;
  campaignVersionId?: string | null;
  recipientLedgerId: string;
  recipientFingerprint: string;
  bounceKind?: "hard" | "soft" | null;
  repliesSupported?: boolean;
  occurredAt: string;
  providerStatus?: MarketingProviderStatus;
};

export type MarketingProviderMappedEvent = {
  organizationId: string;
  campaignId: string;
  campaignVersionId: string | null;
  recipientLedgerId: string;
  recipientFingerprint: string;
  type: MarketingProviderWebhookEventType;
  providerEventId: string;
  providerMessageId: string;
  occurredAt: string;
  recordedAt: string;
  engagementType:
    | "DELIVERED"
    | "OPENED"
    | "CLICKED"
    | "REPLIED"
    | "UNSUBSCRIBED"
    | "BOUNCED"
    | "SUPPRESSED"
    | null;
  qualifiesRecipient: false;
  suppressionKind: "UNSUBSCRIBED" | "HARD_BOUNCE" | "SPAM_COMPLAINT" | null;
  rawProviderReference: string;
  duplicate: boolean;
};

export type MarketingProviderWebhookIngestResult = {
  accepted: boolean;
  duplicate: boolean;
  events: MarketingProviderMappedEvent[];
  code?: string;
};
