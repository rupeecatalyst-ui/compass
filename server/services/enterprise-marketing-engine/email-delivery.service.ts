/**
 * CO-MARKETING-MKT-07 — Email delivery application service.
 * Resolves provider port, enforces safety, idempotency, and ledger integration.
 */

import {
  ENTERPRISE_MARKETING_EMAIL_MODE,
  ENTERPRISE_MARKETING_EXECUTION_ENABLED,
  ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
} from "@/constants/enterprise-marketing-engine";
import { applyPersonalization } from "@/lib/enterprise-marketing-engine/personalization";
import {
  renderMarketingEmailHtml,
  renderMarketingEmailPlaintext,
} from "@/lib/enterprise-marketing-engine/email-render";
import { mapDeliveryOutcomeToLedgerStatus } from "@/lib/enterprise-marketing-engine/email-delivery/map-outcome";
import { redactMarketingEmail } from "@/lib/enterprise-marketing-engine/email-delivery/redact-email";
import { validateMarketingEmailDeliveryRequest } from "@/lib/enterprise-marketing-engine/email-delivery/validate-request";
import type { MarketingEmailDeliveryPort } from "@/lib/enterprise-marketing-engine/ports/email-delivery.port";
import {
  assertEmailDeliveryAllowed,
  EnterpriseMarketingSafetyError,
} from "@/lib/enterprise-marketing-engine/safety";
import type {
  MarketingEmailDeliveryRecord,
  MarketingEmailDeliveryRequest,
  MarketingEmailDeliveryResult,
  MarketingEmailDeliverySender,
} from "@/types/enterprise-marketing-email-delivery";
import type { MarketingCampaignVersion } from "@/types/enterprise-marketing-campaign";
import { recordMarketingAuditEvent } from "./audit";
import { createDryRunEmailDeliveryPort } from "./adapters/dry-run-email-delivery.adapter";
import { marketingEmailDeliveryRecordStore } from "./delivery-record-store";
import { marketingExecutionLedgerStore } from "./execution-ledger-store";
import {
  emitMarketingEngagementEvent,
  engagementTypeFromDeliveryOutcome,
} from "./engagement.service";
import { marketingSenderIdentityStore } from "./sender-identity-store";

function nowIso() {
  return new Date().toISOString();
}

function resolvePort(): MarketingEmailDeliveryPort {
  if (ENTERPRISE_MARKETING_EMAIL_MODE === "off") {
    throw new EnterpriseMarketingSafetyError("email.delivery.mode_off");
  }
  if (ENTERPRISE_MARKETING_EMAIL_MODE === "live") {
    if (!ENTERPRISE_MARKETING_EXECUTION_ENABLED || !ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED) {
      throw new EnterpriseMarketingSafetyError("email.delivery.live_not_authorized");
    }
    throw new EnterpriseMarketingSafetyError("email.delivery.live_adapter_not_implemented");
  }
  return createDryRunEmailDeliveryPort();
}

function resolveSender(input: {
  organizationId: string;
  senderIdentityId?: string | null;
  fromAddressHint?: string | null;
}): MarketingEmailDeliverySender | null {
  if (input.senderIdentityId) {
    const byId = marketingSenderIdentityStore.get(
      input.senderIdentityId,
      input.organizationId,
    );
    if (byId?.active) {
      return {
        senderIdentityId: byId.id,
        displayName: byId.displayName,
        fromAddress: byId.fromAddress,
        replyTo: byId.replyTo,
      };
    }
  }
  if (input.fromAddressHint) {
    const matched = marketingSenderIdentityStore.resolveByFromAddress(
      input.organizationId,
      input.fromAddressHint,
    );
    if (matched) {
      return {
        senderIdentityId: matched.id,
        displayName: matched.displayName,
        fromAddress: matched.fromAddress,
        replyTo: matched.replyTo,
      };
    }
  }
  const fallback = marketingSenderIdentityStore.getDefaultActive(input.organizationId);
  if (!fallback) return null;
  return {
    senderIdentityId: fallback.id,
    displayName: fallback.displayName,
    fromAddress: fallback.fromAddress,
    replyTo: fallback.replyTo,
  };
}

function personalizationFromRow(row: Record<string, unknown>, columns: {
  emailColumn: string | null;
}) {
  const str = (key: string) => {
    const v = row[key];
    return typeof v === "string" ? v : v != null ? String(v) : "";
  };
  const fullName = str("Full Name") || str("Name") || str("full name");
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ") || (parts[0] ?? ""),
    fullName: fullName || "Subscriber",
    city: str("City") || str("city"),
    state: str("State") || str("state"),
    profession: str("Profession") || str("profession"),
    company: str("Company") || str("company"),
    product: str("Product") || str("product"),
  };
}

export const marketingEmailDeliveryService = {
  getMode() {
    return {
      emailMode: ENTERPRISE_MARKETING_EMAIL_MODE,
      executionEnabled: ENTERPRISE_MARKETING_EXECUTION_ENABLED,
      providerConnectEnabled: ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
      liveSendAuthorized:
        ENTERPRISE_MARKETING_EMAIL_MODE === "live" &&
        ENTERPRISE_MARKETING_EXECUTION_ENABLED &&
        ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
    };
  },

  listSenderIdentities(organizationId: string) {
    return marketingSenderIdentityStore
      .list(organizationId)
      .map((i) => marketingSenderIdentityStore.toPublicDto(i));
  },

  upsertSenderIdentity(
    organizationId: string,
    input: Parameters<typeof marketingSenderIdentityStore.upsert>[0],
  ) {
    const saved = marketingSenderIdentityStore.upsert({ ...input, organizationId });
    recordMarketingAuditEvent({
      kind: "email.sender_identity.upsert",
      organizationId,
      detail: { senderIdentityId: saved.id, fromAddress: saved.fromAddress },
    });
    return marketingSenderIdentityStore.toPublicDto(saved);
  },

  async deliver(request: MarketingEmailDeliveryRequest): Promise<MarketingEmailDeliveryResult> {
    assertEmailDeliveryAllowed("email.deliver");

    const existing = marketingEmailDeliveryRecordStore.getByIdempotencyKey(request.idempotencyKey);
    if (existing) {
      return {
        idempotencyKey: request.idempotencyKey,
        outcome: existing.outcome,
        providerMessageId: existing.providerMessageId,
        errorCode: existing.errorCode,
        dryRun: existing.dryRun,
        duplicate: true,
      };
    }

    const validationError = validateMarketingEmailDeliveryRequest(request);
    if (validationError) {
      const result: MarketingEmailDeliveryResult = {
        idempotencyKey: request.idempotencyKey,
        outcome: validationError.code === "MALFORMED_EMAIL" ? "BLOCKED" : "FAILED",
        errorCode: validationError.code,
        errorMessage: validationError.message,
        providerMessageId: null,
        dryRun: ENTERPRISE_MARKETING_EMAIL_MODE !== "live",
      };
      this.persistRecord(request, result);
      this.emitDeliveryEvent(request, result);
      return result;
    }

    const port = resolvePort();
    const result = await port.deliver(request);
    this.persistRecord(request, result);
    this.emitDeliveryEvent(request, result);

    recordMarketingAuditEvent({
      kind: "email.delivery.dry_run",
      organizationId: request.organizationId,
      detail: {
        campaignId: request.campaignId,
        batchId: request.batchId,
        outcome: result.outcome,
        idempotencyKey: request.idempotencyKey,
        recipient: redactMarketingEmail(request.recipientEmail),
        dryRun: result.dryRun,
        duplicate: result.duplicate ?? false,
      },
    });

    return result;
  },

  persistRecord(request: MarketingEmailDeliveryRequest, result: MarketingEmailDeliveryResult) {
    const record: MarketingEmailDeliveryRecord = {
      id: `mkt-del-${Date.now()}-${marketingEmailDeliveryRecordStore.listByCampaign(request.campaignId).length + 1}`,
      idempotencyKey: request.idempotencyKey,
      organizationId: request.organizationId,
      campaignId: request.campaignId,
      batchId: request.batchId,
      recipientFingerprint: request.recipientFingerprint,
      recipientEmailRedacted: redactMarketingEmail(request.recipientEmail),
      senderIdentityId: request.sender.senderIdentityId,
      outcome: result.outcome,
      providerMessageId: result.providerMessageId ?? null,
      errorCode: result.errorCode ?? null,
      dryRun: result.dryRun,
      createdAt: nowIso(),
    };
    marketingEmailDeliveryRecordStore.record(record);
    return record;
  },

  emitDeliveryEvent(request: MarketingEmailDeliveryRequest, result: MarketingEmailDeliveryResult) {
    const type = engagementTypeFromDeliveryOutcome(result.outcome);
    if (!type) return;
    await emitMarketingEngagementEvent({
      organizationId: request.organizationId,
      campaignId: request.campaignId,
      campaignVersionId: request.campaignVersionId,
      channel: "EMAIL",
      type,
      recipientFingerprint: request.recipientFingerprint,
      idempotencyKey: request.idempotencyKey,
      batchId: request.batchId,
      errorCode: result.errorCode ?? null,
    });
  },

  /** Build + deliver for MKT-06 execution ledger integration. */
  async deliverForExecutionClaim(input: {
    organizationId: string;
    campaignId: string;
    campaignVersionId: string;
    batchId: string;
    idempotencyKey: string;
    recipientFingerprint: string;
    recipientEmail: string;
    senderIdentityId?: string | null;
    fromAddressHint?: string | null;
    version: MarketingCampaignVersion;
    row: Record<string, unknown>;
    trackingEnabled: boolean;
  }): Promise<{
    delivery: MarketingEmailDeliveryResult;
    ledgerStatus: ReturnType<typeof mapDeliveryOutcomeToLedgerStatus>;
    countsAsProcessed: boolean;
    countsAsFailed: boolean;
  }> {
    const sender = resolveSender({
      organizationId: input.organizationId,
      senderIdentityId: input.senderIdentityId,
      fromAddressHint: input.fromAddressHint,
    });
    if (!sender) {
      const delivery: MarketingEmailDeliveryResult = {
        idempotencyKey: input.idempotencyKey,
        outcome: "FAILED",
        errorCode: "MISSING_SENDER",
        errorMessage: "No active verified sender identity configured",
        providerMessageId: null,
        dryRun: true,
      };
      await emitMarketingEngagementEvent({
        organizationId: input.organizationId,
        campaignId: input.campaignId,
        campaignVersionId: input.campaignVersionId,
        channel: "EMAIL",
        type: "FAILED",
        recipientFingerprint: input.recipientFingerprint,
        idempotencyKey: input.idempotencyKey,
        batchId: input.batchId,
        errorCode: "MISSING_SENDER",
      });
      return {
        delivery,
        ledgerStatus: "failed",
        countsAsProcessed: false,
        countsAsFailed: true,
      };
    }

    const personalization = personalizationFromRow(input.row, { emailColumn: "Email" });
    const subject = applyPersonalization(input.version.subject, personalization);
    const htmlBody = renderMarketingEmailHtml({
      content: input.version.content,
      subject,
      previewText: input.version.previewText,
      mode: "desktop",
      personalization,
    });
    const textBody = renderMarketingEmailPlaintext({
      content: input.version.content,
      personalization,
    });

    const request: MarketingEmailDeliveryRequest = {
      idempotencyKey: input.idempotencyKey,
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      campaignVersionId: input.campaignVersionId,
      batchId: input.batchId,
      recipientFingerprint: input.recipientFingerprint,
      recipientEmail: input.recipientEmail,
      sender,
      subject,
      htmlBody,
      textBody,
      assetRefs: [],
      tracking: {
        enabled: input.trackingEnabled,
        campaignId: input.campaignId,
        batchId: input.batchId,
        campaignVersionId: input.campaignVersionId,
        recipientFingerprint: input.recipientFingerprint,
      },
    };

    const delivery = await this.deliver(request);
    const ledgerStatus = mapDeliveryOutcomeToLedgerStatus(delivery.outcome);
    const success = delivery.outcome === "SENT" || delivery.outcome === "ACCEPTED";
    marketingExecutionLedgerStore.finalize(input.idempotencyKey, {
      status: ledgerStatus,
      processedAt: nowIso(),
      lastError: success ? null : delivery.errorCode ?? delivery.outcome,
    });

    return {
      delivery,
      ledgerStatus,
      countsAsProcessed: success,
      countsAsFailed: !success,
    };
  },

  listDeliveryRecords(campaignId: string, limit = 20) {
    return marketingEmailDeliveryRecordStore.listByCampaign(campaignId, limit);
  },
};
