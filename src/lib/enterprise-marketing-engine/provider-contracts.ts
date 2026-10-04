/**
 * CO-MARKETING-REDESIGN-014 — Pure provider-contract helpers.
 * No network. No credentials. DNS is never consulted.
 */

import {
  MARKETING_FIXTURE_WEBHOOK_SIGNATURE_SCHEME,
  MARKETING_PROVIDER_ENGAGEMENT_EVENT_TYPES,
  MARKETING_PROVIDER_RETRYABLE_FAILURES,
  MARKETING_PROVIDER_SUPPRESSION_EVENT_TYPES,
} from "@/constants/enterprise-marketing-engine/provider-contracts";
import { evaluateMarketingQualificationState } from "@/lib/enterprise-marketing-engine/qualification/evaluate";
import { marketingOpenOrClickQualifies } from "@/lib/enterprise-marketing-engine/qualification/inbox-boundary";
import type {
  MarketingProviderFailureCategory,
  MarketingProviderMappedEvent,
  MarketingProviderSendRequest,
  MarketingProviderSignatureResult,
  MarketingProviderWebhookEnvelope,
  MarketingProviderWebhookEventType,
} from "@/types/enterprise-marketing-provider-contracts";

const SECRET_KEY = /secret|password|apikey|api_key|token|authorization|smtp/i;

export function marketingProviderFailureIsRetryable(
  category: MarketingProviderFailureCategory,
): boolean {
  return (MARKETING_PROVIDER_RETRYABLE_FAILURES as readonly string[]).includes(category);
}

export function marketingProviderAcceptanceIsDelivery(
  providerStatus: string,
): boolean {
  return providerStatus === "DELIVERED";
}

export function marketingWebhookEventIsSuppressionTrigger(
  type: MarketingProviderWebhookEventType,
  bounceKind?: "hard" | "soft" | null,
): boolean {
  if (type === "unsubscribe" || type === "complaint") return true;
  return type === "bounce" && bounceKind !== "soft";
}

export function marketingWebhookEventIsEngagement(
  type: MarketingProviderWebhookEventType,
): boolean {
  return (MARKETING_PROVIDER_ENGAGEMENT_EVENT_TYPES as readonly string[]).includes(type);
}

export function marketingWebhookSuppressionKind(
  event: Pick<MarketingProviderWebhookEnvelope, "type" | "bounceKind">,
): MarketingProviderMappedEvent["suppressionKind"] {
  if (event.type === "unsubscribe") return "UNSUBSCRIBED";
  if (event.type === "complaint") return "SPAM_COMPLAINT";
  if (event.type === "bounce" && event.bounceKind !== "soft") return "HARD_BOUNCE";
  return null;
}

export function marketingWebhookEngagementType(
  type: MarketingProviderWebhookEventType,
): MarketingProviderMappedEvent["engagementType"] {
  if (type === "delivery_status") return "DELIVERED";
  if (type === "open") return "OPENED";
  if (type === "click") return "CLICKED";
  if (type === "reply") return "REPLIED";
  if (type === "unsubscribe") return "UNSUBSCRIBED";
  if (type === "bounce") return "BOUNCED";
  if (type === "complaint") return "SUPPRESSED";
  return null;
}

export function marketingOpenClickIsQualification(): false {
  if (marketingOpenOrClickQualifies("open") || marketingOpenOrClickQualifies("click")) {
    throw new Error("Opens and clicks must not qualify a recipient");
  }
  return false;
}

export function marketingWebhookQualifiesRecipient(
  type: MarketingProviderWebhookEventType,
): false {
  if (type === "open" || type === "click") {
    const state = evaluateMarketingQualificationState({ intent: type });
    if (state === "QUALIFIED") {
      throw new Error("Opens and clicks are engagement, not qualification");
    }
  }
  return false;
}

export function redactMarketingProviderPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactMarketingProviderPayload);
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SECRET_KEY.test(key) ? "[redacted]" : redactMarketingProviderPayload(entry);
  }
  return out;
}

export function marketingProviderRawReference(input: {
  providerEventId: string;
  providerMessageId: string;
  type: MarketingProviderWebhookEventType;
}): string {
  return `fixture:${input.type}:${input.providerMessageId}:${input.providerEventId}`;
}

function fixtureDigest(rawBody: string): string {
  let hash = 2166136261;
  for (let i = 0; i < rawBody.length; i += 1) {
    hash ^= rawBody.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${rawBody.length.toString(16)}:${(hash >>> 0).toString(16)}`;
}

export function computeMarketingFixtureWebhookSignature(rawBody: string): string {
  return `${MARKETING_FIXTURE_WEBHOOK_SIGNATURE_SCHEME}:${fixtureDigest(rawBody)}`;
}

export function evaluateMarketingFixtureWebhookSignature(input: {
  rawBody: string;
  signature: string | null | undefined;
}): MarketingProviderSignatureResult {
  const signature = (input.signature ?? "").trim();
  if (!signature) {
    return { ok: false, code: "WEBHOOK_SIGNATURE_MISSING" };
  }
  const expected = computeMarketingFixtureWebhookSignature(input.rawBody);
  if (signature !== expected) {
    return { ok: false, code: "WEBHOOK_SIGNATURE_INVALID" };
  }
  return { ok: true, code: "WEBHOOK_SIGNATURE_OK" };
}

export function assertMarketingOrganizationIsolated(input: {
  claimedOrganizationId: string;
  mappedOrganizationId: string;
}): void {
  if (input.claimedOrganizationId.trim() !== input.mappedOrganizationId.trim()) {
    throw Object.assign(new Error("Webhook must not change another organisation's recipient"), {
      statusCode: 403,
      code: "ORG_ISOLATION_VIOLATION",
    });
  }
}

export function marketingProviderEventChronologyPreserved(input: {
  previousOccurredAt: string;
  previousRecordedAt: string;
  nextOccurredAt: string;
  nextRecordedAt: string;
  duplicate: boolean;
}): boolean {
  if (input.duplicate) {
    return input.nextOccurredAt === input.previousOccurredAt && input.nextRecordedAt === input.previousRecordedAt;
  }
  return input.nextRecordedAt >= input.previousRecordedAt;
}

export function validateMarketingProviderSendRequest(
  request: MarketingProviderSendRequest,
): { code: MarketingProviderFailureCategory; message: string } | null {
  if (!request.organizationId?.trim() || request.organizationId.trim() === "default") {
    return { code: "MISSING_CONTEXT", message: "Organisation is required" };
  }
  if (
    !request.campaignId?.trim() ||
    !request.campaignVersionId?.trim() ||
    !request.recipientLedgerId?.trim() ||
    !request.idempotencyKey?.trim()
  ) {
    return { code: "MISSING_CONTEXT", message: "Campaign, version, recipient ledger, and idempotency key are required" };
  }
  if (!request.sender?.fromAddress?.includes("@") || !request.sender.displayName?.trim()) {
    return { code: "MALFORMED", message: "Sender identity is incomplete" };
  }
  if (!request.subject?.trim() || !request.renderedHtml?.trim() || !request.safeTextAlternative?.trim()) {
    return { code: "MALFORMED", message: "Subject, HTML, and safe text alternative are required" };
  }
  if (!request.unsubscribeIdentity?.trim()) {
    return { code: "MISSING_CONTEXT", message: "Unsubscribe identity is required" };
  }
  if (!request.preheader?.trim()) {
    return { code: "MALFORMED", message: "Preheader is required" };
  }
  if (!isMarketingFixtureRecipientIdentity(request.unsubscribeIdentity)) {
    return { code: "BLOCKED", message: "Fixture adapters accept @example.com identities only" };
  }
  return null;
}

export function isMarketingFixtureRecipientIdentity(identity: string): boolean {
  const raw = identity.trim().toLowerCase();
  const email = raw.startsWith("email:") ? raw.slice(6) : raw;
  if (!email.includes("@")) return true;
  return email.endsWith("@example.com");
}

export { MARKETING_PROVIDER_SUPPRESSION_EVENT_TYPES };
