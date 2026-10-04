/**
 * CO-MARKETING-REDESIGN-014 — Fixture provider send + webhook ingest.
 * No live provider. No credentials. No external network. Org isolation is mandatory.
 */

import {
  ENTERPRISE_MARKETING_EXECUTION_ENABLED,
} from "@/constants/enterprise-marketing-engine";
import {
  MARKETING_WEBHOOK_ORG_ISOLATION,
  MARKETING_WEBHOOK_SIGNATURE_INVALID,
  MARKETING_WEBHOOK_SIGNATURE_MISSING,
} from "@/constants/enterprise-marketing-engine/provider-contracts";
import { EnterpriseMarketingSafetyError } from "@/lib/enterprise-marketing-engine/safety";
import {
  assertMarketingOrganizationIsolated,
  marketingProviderRawReference,
  marketingWebhookEngagementType,
  marketingWebhookEventIsSuppressionTrigger,
  marketingWebhookQualifiesRecipient,
  marketingWebhookSuppressionKind,
  redactMarketingProviderPayload,
} from "@/lib/enterprise-marketing-engine/provider-contracts";
import type { MarketingEmailProviderPort } from "@/lib/enterprise-marketing-engine/ports/email-provider.port";
import type {
  MarketingProviderMappedEvent,
  MarketingProviderSendRequest,
  MarketingProviderSendResponse,
  MarketingProviderWebhookIngestResult,
} from "@/types/enterprise-marketing-provider-contracts";
import { createFixtureEmailProviderPort } from "./adapters/fixture-email-provider.adapter";
import { marketingEngagementEventStore } from "./engagement-event-store";
import { marketingProviderWebhookStore } from "./provider-webhook-store";
import { marketingSuppressionStore } from "./suppression-store";

function nowIso() {
  return new Date().toISOString();
}

function requireOrg(organizationId: string): string {
  const trimmed = (organizationId ?? "").trim();
  if (!trimmed || trimmed === "default") {
    throw Object.assign(new Error("Marketing requires an authenticated organization"), {
      statusCode: 400,
      code: "ORGANIZATION_REQUIRED",
    });
  }
  return trimmed;
}

let fixturePort: MarketingEmailProviderPort = createFixtureEmailProviderPort();

export const marketingProviderContractService = {
  reset() {
    fixturePort = createFixtureEmailProviderPort();
    marketingProviderWebhookStore.reset();
  },

  port(): MarketingEmailProviderPort {
    return fixturePort;
  },

  async send(request: MarketingProviderSendRequest): Promise<MarketingProviderSendResponse> {
    if (ENTERPRISE_MARKETING_EXECUTION_ENABLED && request.sendMode === "production") {
      throw new EnterpriseMarketingSafetyError("email.provider.production");
    }
    requireOrg(request.organizationId);
    const response = await fixturePort.send(request);
    if (response.networkCalls !== 0) {
      throw new EnterpriseMarketingSafetyError("email.provider.network");
    }
    marketingProviderWebhookStore.rememberSend(request, response);
    return response;
  },

  ingestWebhook(input: {
    claimedOrganizationId: string;
    rawBody: string;
    signature: string | null | undefined;
  }): MarketingProviderWebhookIngestResult {
    if (ENTERPRISE_MARKETING_EXECUTION_ENABLED) {
      throw new EnterpriseMarketingSafetyError("email.provider.webhook.unexpected_execution");
    }
    const claimedOrganizationId = requireOrg(input.claimedOrganizationId);
    const verified = fixturePort.verifyWebhookSignature({
      rawBody: input.rawBody,
      signature: input.signature,
    });
    if (!verified.ok) {
      throw Object.assign(new Error("Webhook signature was rejected"), {
        statusCode: 401,
        code:
          verified.code === "WEBHOOK_SIGNATURE_MISSING"
            ? MARKETING_WEBHOOK_SIGNATURE_MISSING
            : MARKETING_WEBHOOK_SIGNATURE_INVALID,
      });
    }

    const redacted = redactMarketingProviderPayload(JSON.parse(input.rawBody));
    void redacted;
    const envelopes = fixturePort.parseWebhook(input.rawBody);
    const mapped: MarketingProviderMappedEvent[] = [];
    let anyDuplicate = false;

    for (const envelope of envelopes) {
      const intent = marketingProviderWebhookStore.getIntentByMessageId(envelope.providerMessageId);
      const mappedOrganizationId = intent?.organizationId ?? envelope.organizationId;
      try {
        assertMarketingOrganizationIsolated({
          claimedOrganizationId,
          mappedOrganizationId,
        });
      } catch (err) {
        throw Object.assign(err instanceof Error ? err : new Error("Organisation isolation"), {
          statusCode: 403,
          code: MARKETING_WEBHOOK_ORG_ISOLATION,
        });
      }
      if (intent && envelope.recipientLedgerId && envelope.recipientLedgerId !== intent.recipientLedgerId) {
        throw Object.assign(new Error("Webhook must not change another organisation's recipient"), {
          statusCode: 403,
          code: MARKETING_WEBHOOK_ORG_ISOLATION,
        });
      }

      const recordedAt = nowIso();
      const next: MarketingProviderMappedEvent = {
        organizationId: claimedOrganizationId,
        campaignId: intent?.campaignId ?? envelope.campaignId,
        campaignVersionId: intent?.campaignVersionId ?? envelope.campaignVersionId ?? null,
        recipientLedgerId: intent?.recipientLedgerId ?? envelope.recipientLedgerId,
        recipientFingerprint: intent?.recipientFingerprint ?? envelope.recipientFingerprint,
        type: envelope.type,
        providerEventId: envelope.providerEventId,
        providerMessageId: envelope.providerMessageId,
        occurredAt: envelope.occurredAt,
        recordedAt,
        engagementType: marketingWebhookEngagementType(envelope.type),
        qualifiesRecipient: marketingWebhookQualifiesRecipient(envelope.type),
        suppressionKind: marketingWebhookEventIsSuppressionTrigger(envelope.type, envelope.bounceKind)
          ? marketingWebhookSuppressionKind(envelope)
          : null,
        rawProviderReference: marketingProviderRawReference({
          providerEventId: envelope.providerEventId,
          providerMessageId: envelope.providerMessageId,
          type: envelope.type,
        }),
        duplicate: false,
      };

      const stored = marketingProviderWebhookStore.append(next);
      if (stored.duplicate) {
        anyDuplicate = true;
        mapped.push({ ...stored.event, duplicate: true });
        continue;
      }

      if (envelope.type === "delivery_status") {
        marketingProviderWebhookStore.markDelivered(envelope.providerMessageId, envelope.occurredAt);
      }

      if (next.engagementType) {
        marketingEngagementEventStore.record({
          organizationId: next.organizationId,
          campaignId: next.campaignId,
          campaignVersionId: next.campaignVersionId,
          channel: "EMAIL",
          type: next.engagementType,
          recipientFingerprint: next.recipientFingerprint,
          occurredAt: next.occurredAt,
          providerEventId: next.providerEventId,
        });
      }

      if (next.suppressionKind) {
        marketingSuppressionStore.upsert({
          organizationId: next.organizationId,
          fingerprint: next.recipientFingerprint,
          reason: next.suppressionKind,
          kind: next.suppressionKind,
          source: "PROVIDER",
          campaignId: next.campaignId,
          providerEventId: next.providerEventId,
        });
      }

      mapped.push(stored.event);
    }

    return {
      accepted: true,
      duplicate: anyDuplicate,
      events: mapped,
    };
  },
};
