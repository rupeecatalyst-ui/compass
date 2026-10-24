/**
 * Connects frozen-snapshot pacing to marketingEmailDeliveryService.
 * Live SMTP still requires both execution and provider-connect flags plus
 * an approved campaign. Dry-run ticks never construct this deliverer.
 */

import { isDeliveryOutcomeRetryable } from "@/lib/enterprise-marketing-engine/email-delivery/map-outcome";
import type {
  MarketingPacingDeliverer,
  MarketingPacingProviderProbe,
} from "@/lib/enterprise-marketing-engine/execution/snapshot-pacing-worker";
import type { MarketingCampaignVersion } from "@/types/enterprise-marketing-campaign";
import { marketingEmailDeliveryService } from "./email-delivery.service";

export function isMarketingSnapshotLiveDeliveryAuthorized(input: {
  executionEnabled: boolean;
  providerConnectEnabled: boolean;
  campaignStatus?: string | null;
  approvedAt?: string | null;
  channel?: string | null;
}): boolean {
  if (!input.executionEnabled || !input.providerConnectEnabled) return false;
  if (!input.approvedAt?.trim()) return false;
  if ((input.channel ?? "EMAIL") !== "EMAIL") return false;
  const status = input.campaignStatus ?? "";
  return status === "APPROVED" || status === "SCHEDULED" || status === "RUNNING";
}

export function createMarketingSnapshotLiveDeliverer(input: {
  organizationId: string;
  campaignId: string;
  campaignVersionId: string;
  campaignName?: string | null;
  product?: string | null;
  senderIdentityId?: string | null;
  fromAddressHint?: string | null;
  trackingEnabled: boolean;
  version: MarketingCampaignVersion;
  probe: MarketingPacingProviderProbe;
}): MarketingPacingDeliverer {
  return async (recipient, context) => {
    const result = await marketingEmailDeliveryService.deliverForExecutionClaim({
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      campaignVersionId: input.campaignVersionId,
      batchId: context?.batchId ?? "",
      idempotencyKey:
        context?.idempotencyKey ??
        `${input.organizationId}:${input.campaignId}:EMAIL:${recipient.normalizedEmail}`,
      recipientFingerprint: recipient.recipientFingerprint,
      recipientEmail: recipient.normalizedEmail,
      senderIdentityId: input.senderIdentityId,
      fromAddressHint: input.fromAddressHint,
      version: input.version,
      row: { Email: recipient.normalizedEmail },
      trackingEnabled: input.trackingEnabled,
      product: input.product,
      campaignName: input.campaignName,
    });
    const delivery = result.delivery;
    if (delivery.dryRun) {
      input.probe.dryRunDeliveries += 1;
    } else {
      input.probe.liveProviderCalls += 1;
    }
    const accepted = delivery.outcome === "ACCEPTED" || delivery.outcome === "SENT";
    const retryable = isDeliveryOutcomeRetryable(delivery.outcome);
    return {
      status: accepted ? "sent" : retryable ? "failed" : result.ledgerStatus === "skipped" ? "skipped" : "failed",
      retryable,
      dryRun: delivery.dryRun,
      providerMessageId: delivery.providerMessageId ?? null,
      liveProviderInvoked: !delivery.dryRun,
      failureKind: retryable ? "temporary_provider_rejection" : accepted ? "terminal_success" : "invalid_recipient",
    };
  };
}
