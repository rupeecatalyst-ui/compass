/**
 * CO-MARKETING-REDESIGN-014 — Fixture / dry-run email provider adapter.
 * Never contacts a live ESP. Never reads provider credentials. Zero network calls.
 */

import {
  ENTERPRISE_MARKETING_EXECUTION_ENABLED,
  ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
} from "@/constants/enterprise-marketing-engine";
import { MARKETING_PROVIDER_LIVE_DISABLED } from "@/constants/enterprise-marketing-engine/provider-contracts";
import type { MarketingEmailProviderPort } from "@/lib/enterprise-marketing-engine/ports/email-provider.port";
import {
  computeMarketingFixtureWebhookSignature,
  evaluateMarketingFixtureWebhookSignature,
  marketingProviderFailureIsRetryable,
  validateMarketingProviderSendRequest,
} from "@/lib/enterprise-marketing-engine/provider-contracts";
import type {
  MarketingProviderSendRequest,
  MarketingProviderSendResponse,
  MarketingProviderSignatureInput,
  MarketingProviderWebhookEnvelope,
} from "@/types/enterprise-marketing-provider-contracts";

function nowIso() {
  return new Date().toISOString();
}

function rejected(
  category: MarketingProviderSendResponse["failureCategory"],
  duplicate = false,
): MarketingProviderSendResponse {
  return {
    decision: "rejected",
    providerMessageId: null,
    providerStatus: "REJECTED",
    failureCategory: category,
    retryEligible: marketingProviderFailureIsRetryable(category),
    timestamp: nowIso(),
    dryRun: true,
    simulated: true,
    duplicate,
    networkCalls: 0,
  };
}

export function createFixtureEmailProviderPort(): MarketingEmailProviderPort {
  const sent = new Map<string, MarketingProviderSendResponse>();

  return {
    providerType: "fixture_dry_run",
    live: false,
    repliesSupported: true,

    async send(request: MarketingProviderSendRequest): Promise<MarketingProviderSendResponse> {
      if (request.sendMode === "production") {
        return rejected(MARKETING_PROVIDER_LIVE_DISABLED);
      }
      if (ENTERPRISE_MARKETING_EXECUTION_ENABLED || ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED) {
        return rejected(MARKETING_PROVIDER_LIVE_DISABLED);
      }
      const invalid = validateMarketingProviderSendRequest(request);
      if (invalid) return rejected(invalid.code);

      const existing = sent.get(request.idempotencyKey);
      if (existing) {
        return { ...existing, duplicate: true, networkCalls: 0 };
      }

      const timestamp = nowIso();
      const response: MarketingProviderSendResponse = {
        decision: "accepted",
        providerMessageId: `fixture-${request.idempotencyKey}`,
        providerStatus: "ACCEPTED",
        failureCategory: "NONE",
        retryEligible: false,
        timestamp,
        dryRun: true,
        simulated: true,
        duplicate: false,
        networkCalls: 0,
      };
      sent.set(request.idempotencyKey, response);
      return response;
    },

    verifyWebhookSignature(input: MarketingProviderSignatureInput) {
      return evaluateMarketingFixtureWebhookSignature(input);
    },

    parseWebhook(rawBody: string): MarketingProviderWebhookEnvelope[] {
      const parsed = JSON.parse(rawBody) as
        | MarketingProviderWebhookEnvelope
        | { events?: MarketingProviderWebhookEnvelope[] };
      const events = Array.isArray((parsed as { events?: MarketingProviderWebhookEnvelope[] }).events)
        ? (parsed as { events: MarketingProviderWebhookEnvelope[] }).events
        : [parsed as MarketingProviderWebhookEnvelope];
      return events.map((event) => ({
        ...event,
        repliesSupported: event.type === "reply" ? true : event.repliesSupported,
      }));
    },
  };
}

export function signMarketingFixtureWebhook(rawBody: string): string {
  return computeMarketingFixtureWebhookSignature(rawBody);
}
