/**
 * CO-MARKETING-MKT-07 — Email delivery application service.
 * Resolves provider port, enforces safety, idempotency, and ledger integration.
 */

import {
  ENTERPRISE_MARKETING_EMAIL_MODE,
  ENTERPRISE_MARKETING_EXECUTION_ENABLED,
  ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
  isMarketingControlledTestSendEnabled,
} from "@/constants/enterprise-marketing-engine";
import { applyPersonalization } from "@/lib/enterprise-marketing-engine/personalization";
import {
  failClosedMarketingDeliverySuppression,
  marketingDeliveryFingerprints,
} from "@/lib/enterprise-marketing-engine/delivery-suppression";
import {
  bindMarketingUnsubscribeUrl,
  tryMintMarketingUnsubscribeUrl,
} from "@/lib/enterprise-marketing-engine/unsubscribe-token";
import {
  renderMarketingEmailHtml,
  renderMarketingEmailPlaintext,
} from "@/lib/enterprise-marketing-engine/email-render";
import { resolveLiveHomeLoanCampaignEntry } from "@/lib/enterprise-marketing-engine/campaign-entry-gate";
import { issueCampaignRecipientToken } from "@/lib/product-journey/campaign-link";
import { withCampaignEntryCtas } from "@/lib/product-journey/campaign-entry-url";
import { lookupDurableMarketingSend, marketingDurableSendAlreadyCompleted } from "@/lib/enterprise-marketing-engine/durable-send-idempotency";
import { isMarketingPhase1Sender } from "@/lib/enterprise-marketing-engine/phase1-sender";
import { marketingPhase1DeliverySender } from "@/lib/enterprise-marketing-engine/phase1-sender-identity";
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
import { createHostingerSmtpEmailDeliveryPort } from "./adapters/hostinger-smtp.adapter";
import { createHostingerSmtpTransport } from "./adapters/hostinger-smtp-transport";
import { marketingEmailDeliveryRecordStore } from "./delivery-record-store";
import { marketingExecutionLedgerStore } from "./execution-ledger-store";
import {
  emitMarketingEngagementEvent,
  engagementTypeFromDeliveryOutcome,
} from "./engagement.service";
import { marketingSenderIdentityStore } from "./sender-identity-store";
import { marketingSuppressionStore } from "./suppression-store";

function nowIso() {
  return new Date().toISOString();
}

function resolvePort(request?: Pick<MarketingEmailDeliveryRequest, "controlledTestSend">): MarketingEmailDeliveryPort {
  if (ENTERPRISE_MARKETING_EMAIL_MODE === "off") {
    throw new EnterpriseMarketingSafetyError("email.delivery.mode_off");
  }
  if (ENTERPRISE_MARKETING_EMAIL_MODE === "live") {
    if (request?.controlledTestSend) {
      if (!isMarketingControlledTestSendEnabled()) {
        throw new EnterpriseMarketingSafetyError("email.controlled_test_send:live_not_authorized");
      }
      return createHostingerSmtpEmailDeliveryPort({
        transport: createHostingerSmtpTransport({
          gates: {
            executionEnabled: false,
            providerConnectEnabled: false,
            controlledTestSendEnabled: true,
          },
        }),
        gates: {
          executionEnabled: false,
          providerConnectEnabled: false,
          controlledTestSendEnabled: true,
        },
      });
    }
    if (!ENTERPRISE_MARKETING_EXECUTION_ENABLED || !ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED) {
      throw new EnterpriseMarketingSafetyError("email.delivery.live_not_authorized");
    }
    return createHostingerSmtpEmailDeliveryPort({
      transport: createHostingerSmtpTransport(),
    });
  }
  return createDryRunEmailDeliveryPort();
}

function applyUnsubscribePlaceholders(request: MarketingEmailDeliveryRequest): MarketingEmailDeliveryRequest {
  const url = tryMintMarketingUnsubscribeUrl({
    organizationId: request.organizationId,
    recipientFingerprint: request.recipientFingerprint,
    campaignId: request.campaignId,
  });
  if (!url) return request;
  return {
    ...request,
    htmlBody: bindMarketingUnsubscribeUrl(request.htmlBody, url),
    textBody: bindMarketingUnsubscribeUrl(request.textBody, url),
  };
}

function evaluateDeliverySuppression(request: MarketingEmailDeliveryRequest) {
  if (!request.recipientFingerprint?.trim()) {
    return failClosedMarketingDeliverySuppression({ fingerprints: [] });
  }
  const fingerprints = marketingDeliveryFingerprints(request);
  const decision = marketingSuppressionStore.evaluateDelivery({
    organizationId: request.organizationId,
    fingerprints,
    channel: "EMAIL",
    phase: "delivery",
    campaignId: request.campaignId,
  });
  return failClosedMarketingDeliverySuppression({ fingerprints, decision });
}

async function resolveSender(input: {
  organizationId: string;
  senderIdentityId?: string | null;
  fromAddressHint?: string | null;
}): Promise<MarketingEmailDeliverySender | null> {
  if (input.senderIdentityId) {
    const byId = await marketingSenderIdentityStore.get(
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
    const matched = await marketingSenderIdentityStore.resolveByFromAddress(
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
  const fallback = await marketingSenderIdentityStore.getDefaultActive(input.organizationId);
  if (ENTERPRISE_MARKETING_EMAIL_MODE === "live") {
    const phase1 = (await marketingSenderIdentityStore.list(input.organizationId)).find((identity) =>
      isMarketingPhase1Sender({
        fromAddress: identity.fromAddress,
        displayName: identity.displayName,
        replyTo: identity.replyTo,
      }),
    );
    if (phase1?.active) {
      return {
        senderIdentityId: phase1.id,
        displayName: phase1.displayName,
        fromAddress: phase1.fromAddress,
        replyTo: phase1.replyTo,
      };
    }
    return marketingPhase1DeliverySender();
  }
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
  const emailHeader = columns.emailColumn;
  const emailValue = emailHeader ? str(emailHeader) : "";
  const fullName = str("Full Name") || str("Name") || str("full name") || emailValue;
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

function campaignLinkSecret(): string {
  return (
    process.env.COMPASS_JOURNEY_SESSION_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    ""
  );
}

function campaignRecipientToken(input: {
  campaignId: string;
  campaignName?: string | null;
  productCode: string;
  row: Record<string, unknown>;
  recipientFingerprint: string;
}): string | null {
  const secret = campaignLinkSecret();
  if (!secret) return null;
  const rawRef = ["contactId", "ContactId", "recipientRef", "ecmContactId"]
    .map((key) => input.row[key])
    .find((value) => typeof value === "string" && value.trim() && !value.includes("@"));
  const recipientRef =
    typeof rawRef === "string" && rawRef.trim()
      ? rawRef.trim()
      : `audience:${input.recipientFingerprint}`;
  try {
    return issueCampaignRecipientToken(
      {
        campaignId: input.campaignId,
        recipientRef,
        productCode: input.productCode,
        sourceCode: "marketing_email",
        campaignLabel: input.campaignName?.trim() || input.campaignId,
      },
      secret,
    );
  } catch {
    return null;
  }
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

  async listSenderIdentities(organizationId: string) {
    const rows = await marketingSenderIdentityStore.list(organizationId);
    return rows.map((i) => marketingSenderIdentityStore.toPublicDto(i));
  },

  async upsertSenderIdentity(
    organizationId: string,
    input: Parameters<typeof marketingSenderIdentityStore.upsert>[0],
  ) {
    const saved = await marketingSenderIdentityStore.upsert({ ...input, organizationId });
    recordMarketingAuditEvent({
      kind: "email.sender_identity.upsert",
      organizationId,
      detail: { senderIdentityId: saved.id, fromAddress: saved.fromAddress },
    });
    return marketingSenderIdentityStore.toPublicDto(saved);
  },

  async deliver(request: MarketingEmailDeliveryRequest): Promise<MarketingEmailDeliveryResult> {
    assertEmailDeliveryAllowed(
      request.controlledTestSend ? "email.controlled_test_send" : "email.deliver",
    );

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

    const durable = await lookupDurableMarketingSend(request.organizationId, request.idempotencyKey);
    if (marketingDurableSendAlreadyCompleted(durable)) {
      return {
        idempotencyKey: request.idempotencyKey,
        outcome: durable?.status === "delivered" ? "SENT" : "ACCEPTED",
        providerMessageId: durable?.providerMessageId ?? null,
        errorCode: null,
        dryRun: ENTERPRISE_MARKETING_EMAIL_MODE !== "live",
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

    const suppression = evaluateDeliverySuppression(request);
    if (suppression.blocked) {
      const result: MarketingEmailDeliveryResult = {
        idempotencyKey: request.idempotencyKey,
        outcome: "BLOCKED",
        errorCode: suppression.code,
        errorMessage: "Marketing delivery blocked by suppression",
        providerMessageId: null,
        dryRun: ENTERPRISE_MARKETING_EMAIL_MODE !== "live",
      };
      this.persistRecord(request, result);
      await this.emitDeliveryEvent(request, result);
      return result;
    }

    const prepared = applyUnsubscribePlaceholders(request);
    const port = resolvePort(request);
    const result = await port.deliver(prepared);
    this.persistRecord(request, result);
    await this.emitDeliveryEvent(request, result);

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

  async emitDeliveryEvent(request: MarketingEmailDeliveryRequest, result: MarketingEmailDeliveryResult) {
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
    product?: string | null;
    campaignName?: string | null;
    controlledTestSend?: boolean;
  }): Promise<{
    delivery: MarketingEmailDeliveryResult;
    ledgerStatus: ReturnType<typeof mapDeliveryOutcomeToLedgerStatus>;
    countsAsProcessed: boolean;
    countsAsFailed: boolean;
  }> {
    const sender = await resolveSender({
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
    const campaignToken = campaignRecipientToken({
      campaignId: input.campaignId,
      campaignName: input.campaignName,
      productCode: "home-loan",
      row: input.row,
      recipientFingerprint: input.recipientFingerprint,
    });
    const entry = resolveLiveHomeLoanCampaignEntry({
      product: input.product,
      campaignToken,
    });
    const liveSmtp =
      ENTERPRISE_MARKETING_EMAIL_MODE === "live" &&
      (Boolean(input.controlledTestSend && isMarketingControlledTestSendEnabled()) ||
        Boolean(ENTERPRISE_MARKETING_EXECUTION_ENABLED && ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED));
    if (liveSmtp && !entry.ok) {
      const delivery: MarketingEmailDeliveryResult = {
        idempotencyKey: input.idempotencyKey,
        outcome: "FAILED",
        errorCode: entry.code ?? "marketing.campaign.entry_invalid",
        errorMessage: "Live delivery requires a signed Home Loan campaign application URL",
        providerMessageId: null,
        dryRun: true,
      };
      return {
        delivery,
        ledgerStatus: "failed",
        countsAsProcessed: false,
        countsAsFailed: true,
      };
    }
    const content =
      entry.ok && entry.url
        ? withCampaignEntryCtas(input.version.content, entry.url)
        : input.version.content;
    const subject = applyPersonalization(input.version.subject, personalization);
    const htmlBody = renderMarketingEmailHtml({
      content,
      subject,
      previewText: input.version.previewText,
      mode: "desktop",
      personalization,
    });
    const textBody = renderMarketingEmailPlaintext({
      content,
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
      controlledTestSend: input.controlledTestSend === true,
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
