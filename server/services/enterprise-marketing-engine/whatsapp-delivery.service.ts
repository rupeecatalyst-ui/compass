/**
 * CO-MARKETING-MKT-09 — WhatsApp delivery application service.
 * Template-only · dry-run default · idempotent · ledger-integrated.
 */

import {
  ENTERPRISE_MARKETING_EXECUTION_ENABLED,
  ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
  ENTERPRISE_MARKETING_WHATSAPP_MODE,
} from "@/constants/enterprise-marketing-engine";
import { normalizeMarketingPhone } from "@/lib/enterprise-marketing-engine/data-quality";
import type { MarketingWhatsAppDeliveryPort } from "@/lib/enterprise-marketing-engine/ports/whatsapp-delivery.port";
import {
  assertWhatsAppDeliveryAllowed,
  EnterpriseMarketingSafetyError,
} from "@/lib/enterprise-marketing-engine/safety";
import { mapWhatsAppOutcomeToLedgerStatus } from "@/lib/enterprise-marketing-engine/whatsapp-delivery/map-outcome";
import {
  assertNoFreeFormWhatsAppBulk,
  redactMarketingPhone,
  renderWhatsAppTemplateBody,
  validateWhatsAppDeliveryRequest,
  validateWhatsAppTemplateVariables,
} from "@/lib/enterprise-marketing-engine/whatsapp-delivery/template-render";
import type {
  MarketingWhatsAppDeliveryRecord,
  MarketingWhatsAppDeliveryRequest,
  MarketingWhatsAppDeliveryResult,
} from "@/types/enterprise-marketing-whatsapp-delivery";
import { recordMarketingAuditEvent } from "./audit";
import { createDryRunWhatsAppDeliveryPort } from "./adapters/dry-run-whatsapp-delivery.adapter";
import { marketingChannelPolicyStore } from "./channel-policy-store";
import { marketingExecutionLedgerStore } from "./execution-ledger-store";
import {
  emitMarketingEngagementEvent,
  engagementTypeFromDeliveryOutcome,
} from "./engagement.service";
import { marketingWhatsAppDeliveryRecordStore } from "./whatsapp-delivery-record-store";
import { marketingWhatsAppTemplateStore } from "./whatsapp-template-store";

function nowIso() {
  return new Date().toISOString();
}

function resolvePort(): MarketingWhatsAppDeliveryPort {
  if (ENTERPRISE_MARKETING_WHATSAPP_MODE === "off") {
    throw new EnterpriseMarketingSafetyError("whatsapp.delivery.mode_off");
  }
  if (ENTERPRISE_MARKETING_WHATSAPP_MODE === "live") {
    if (!ENTERPRISE_MARKETING_EXECUTION_ENABLED || !ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED) {
      throw new EnterpriseMarketingSafetyError("whatsapp.delivery.live_not_authorized");
    }
    throw new EnterpriseMarketingSafetyError("whatsapp.delivery.live_adapter_not_implemented");
  }
  return createDryRunWhatsAppDeliveryPort();
}

function variablesFromRow(
  row: Record<string, unknown>,
  templateVars: Array<{ key: string }>,
  extras?: Record<string, string>,
): Record<string, string> {
  const str = (key: string) => {
    const v = row[key];
    return typeof v === "string" ? v : v != null ? String(v) : "";
  };
  const fullName = str("Full Name") || str("Name") || str("full name");
  const parts = fullName.trim().split(/\s+/);
  const base: Record<string, string> = {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ") || (parts[0] ?? ""),
    fullName: fullName || "Customer",
    company: str("Company") || str("company"),
    companyName: str("Company") || str("company") || str("Company Name"),
    product: str("Product") || str("product"),
    city: str("City") || str("city"),
    senderName: extras?.senderName ?? "Rupee Catalyst",
    ...extras,
  };
  const out: Record<string, string> = {};
  for (const v of templateVars) {
    out[v.key] = base[v.key] ?? str(v.key) ?? "";
  }
  return out;
}

export const marketingWhatsAppDeliveryService = {
  getMode() {
    return {
      whatsappMode: ENTERPRISE_MARKETING_WHATSAPP_MODE,
      executionEnabled: ENTERPRISE_MARKETING_EXECUTION_ENABLED,
      providerConnectEnabled: ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
      liveSendAuthorized:
        ENTERPRISE_MARKETING_WHATSAPP_MODE === "live" &&
        ENTERPRISE_MARKETING_EXECUTION_ENABLED &&
        ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
      forbidFreeFormBulk: true,
    };
  },

  getChannelPolicy(organizationId: string) {
    return marketingChannelPolicyStore.get(organizationId);
  },

  listTemplates(organizationId: string, activeOnly = false) {
    return marketingWhatsAppTemplateStore
      .list(organizationId, { activeOnly })
      .map((t) => marketingWhatsAppTemplateStore.toPublicDto(t));
  },

  upsertTemplate(
    organizationId: string,
    input: Parameters<typeof marketingWhatsAppTemplateStore.upsert>[0],
  ) {
    const freeForm = assertNoFreeFormWhatsAppBulk({ freeFormBody: null });
    if (freeForm) {
      throw Object.assign(new Error(freeForm.message), {
        statusCode: 400,
        code: freeForm.code,
      });
    }
    const saved = marketingWhatsAppTemplateStore.upsert({ ...input, organizationId });
    recordMarketingAuditEvent({
      kind: "whatsapp.template.upsert",
      organizationId,
      detail: {
        templateId: saved.id,
        name: saved.name,
        approvalState: saved.approvalState,
        active: saved.active,
      },
    });
    return marketingWhatsAppTemplateStore.toPublicDto(saved);
  },

  /**
   * Dry-run render: validate template + variables + recipient without send.
   */
  previewRender(input: {
    organizationId: string;
    templateId: string;
    recipientPhone: string;
    variables?: Record<string, string>;
    freeFormBody?: string | null;
  }) {
    const forbidden = assertNoFreeFormWhatsAppBulk({ freeFormBody: input.freeFormBody });
    if (forbidden) {
      throw Object.assign(new Error(forbidden.message), {
        statusCode: 400,
        code: forbidden.code,
      });
    }
    if (!marketingChannelPolicyStore.isChannelEnabled(input.organizationId, "WHATSAPP")) {
      throw Object.assign(new Error("WhatsApp channel is not enabled for this organization"), {
        statusCode: 400,
        code: "CHANNEL_DISABLED",
      });
    }
    const template = marketingWhatsAppTemplateStore.getApprovedActive(
      input.templateId,
      input.organizationId,
    );
    if (!template) {
      throw Object.assign(
        new Error("WhatsApp template must be active and APPROVED"),
        { statusCode: 400, code: "TEMPLATE_NOT_APPROVED" },
      );
    }
    const variables = input.variables ?? {};
    const missing = validateWhatsAppTemplateVariables(template, variables);
    const renderedBody = renderWhatsAppTemplateBody(template.body, variables);
    return {
      templateId: template.id,
      templateName: template.name,
      language: template.language,
      variables,
      renderedBody,
      recipientPhoneRedacted: redactMarketingPhone(input.recipientPhone),
      validationError: missing,
      dryRun: true,
      notice: "Preview only — no WhatsApp infrastructure contact in MKT-09",
    };
  },

  async deliver(
    request: MarketingWhatsAppDeliveryRequest,
  ): Promise<MarketingWhatsAppDeliveryResult> {
    assertWhatsAppDeliveryAllowed("whatsapp.deliver");

    const existing = marketingWhatsAppDeliveryRecordStore.getByIdempotencyKey(
      request.idempotencyKey,
    );
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

    const validationError = validateWhatsAppDeliveryRequest(request);
    if (validationError) {
      const result: MarketingWhatsAppDeliveryResult = {
        idempotencyKey: request.idempotencyKey,
        outcome: validationError.code === "INVALID_RECIPIENT" ? "BLOCKED" : "FAILED",
        errorCode: validationError.code,
        errorMessage: validationError.message,
        providerMessageId: null,
        dryRun: ENTERPRISE_MARKETING_WHATSAPP_MODE !== "live",
        renderedBody: request.renderedBody,
        variables: request.variables,
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
      kind: "whatsapp.delivery.dry_run",
      organizationId: request.organizationId,
      detail: {
        campaignId: request.campaignId,
        batchId: request.batchId,
        executionId: request.executionId,
        templateId: request.templateId,
        outcome: result.outcome,
        idempotencyKey: request.idempotencyKey,
        recipient: redactMarketingPhone(request.recipientPhone),
        dryRun: result.dryRun,
        duplicate: result.duplicate ?? false,
        delivery: "none",
      },
    });

    return result;
  },

  persistRecord(
    request: MarketingWhatsAppDeliveryRequest,
    result: MarketingWhatsAppDeliveryResult,
  ) {
    const record: MarketingWhatsAppDeliveryRecord = {
      id: `mkt-wa-del-${Date.now()}-${marketingWhatsAppDeliveryRecordStore.listByCampaign(request.campaignId).length + 1}`,
      idempotencyKey: request.idempotencyKey,
      organizationId: request.organizationId,
      campaignId: request.campaignId,
      batchId: request.batchId,
      executionId: request.executionId,
      templateId: request.templateId,
      recipientFingerprint: request.recipientFingerprint,
      recipientPhoneRedacted: redactMarketingPhone(request.recipientPhone),
      outcome: result.outcome,
      providerMessageId: result.providerMessageId ?? null,
      errorCode: result.errorCode ?? null,
      dryRun: result.dryRun,
      createdAt: nowIso(),
    };
    marketingWhatsAppDeliveryRecordStore.record(record);
    return record;
  },

  emitDeliveryEvent(
    request: MarketingWhatsAppDeliveryRequest,
    result: MarketingWhatsAppDeliveryResult,
  ) {
    const type = engagementTypeFromDeliveryOutcome(result.outcome);
    if (!type) return;
    emitMarketingEngagementEvent({
      organizationId: request.organizationId,
      campaignId: request.campaignId,
      campaignVersionId: request.campaignVersionId,
      channel: "WHATSAPP",
      type,
      recipientFingerprint: request.recipientFingerprint,
      idempotencyKey: request.idempotencyKey,
      batchId: request.batchId,
      errorCode: result.errorCode ?? null,
    });
  },

  async deliverForExecutionClaim(input: {
    organizationId: string;
    campaignId: string;
    campaignVersionId: string;
    batchId: string;
    idempotencyKey: string;
    recipientFingerprint: string;
    recipientPhone: string;
    whatsappTemplateId: string;
    row: Record<string, unknown>;
    senderName?: string | null;
  }): Promise<{
    delivery: MarketingWhatsAppDeliveryResult;
    ledgerStatus: ReturnType<typeof mapWhatsAppOutcomeToLedgerStatus>;
    countsAsProcessed: boolean;
    countsAsFailed: boolean;
  }> {
    if (!marketingChannelPolicyStore.isChannelEnabled(input.organizationId, "WHATSAPP")) {
      const delivery: MarketingWhatsAppDeliveryResult = {
        idempotencyKey: input.idempotencyKey,
        outcome: "BLOCKED",
        errorCode: "CHANNEL_DISABLED",
        errorMessage: "WhatsApp channel disabled by policy",
        providerMessageId: null,
        dryRun: true,
      };
      marketingExecutionLedgerStore.finalize(input.idempotencyKey, {
        status: "failed",
        processedAt: nowIso(),
        lastError: "CHANNEL_DISABLED",
      });
      return {
        delivery,
        ledgerStatus: "failed",
        countsAsProcessed: false,
        countsAsFailed: true,
      };
    }

    if (marketingChannelPolicyStore.forbidsFreeFormBulk(input.organizationId, "WHATSAPP")) {
      const forbidden = assertNoFreeFormWhatsAppBulk({ freeFormBody: null });
      if (forbidden) {
        // policy enforced — continue with template path only
      }
    }

    const template = marketingWhatsAppTemplateStore.getApprovedActive(
      input.whatsappTemplateId,
      input.organizationId,
    );
    if (!template) {
      const delivery: MarketingWhatsAppDeliveryResult = {
        idempotencyKey: input.idempotencyKey,
        outcome: "FAILED",
        errorCode: "TEMPLATE_NOT_APPROVED",
        errorMessage: "Active APPROVED WhatsApp template is required",
        providerMessageId: null,
        dryRun: true,
      };
      marketingExecutionLedgerStore.finalize(input.idempotencyKey, {
        status: "failed",
        processedAt: nowIso(),
        lastError: "TEMPLATE_NOT_APPROVED",
      });
      return {
        delivery,
        ledgerStatus: "failed",
        countsAsProcessed: false,
        countsAsFailed: true,
      };
    }

    const variables = variablesFromRow(input.row, template.variables, {
      senderName: input.senderName ?? "Rupee Catalyst",
    });
    const missing = validateWhatsAppTemplateVariables(template, variables);
    if (missing) {
      const delivery: MarketingWhatsAppDeliveryResult = {
        idempotencyKey: input.idempotencyKey,
        outcome: "FAILED",
        errorCode: missing.code,
        errorMessage: missing.message,
        providerMessageId: null,
        dryRun: true,
        variables,
      };
      marketingExecutionLedgerStore.finalize(input.idempotencyKey, {
        status: "failed",
        processedAt: nowIso(),
        lastError: missing.code,
      });
      return {
        delivery,
        ledgerStatus: "failed",
        countsAsProcessed: false,
        countsAsFailed: true,
      };
    }

    const phone = normalizeMarketingPhone(input.recipientPhone) ?? input.recipientPhone;
    const renderedBody = renderWhatsAppTemplateBody(template.body, variables);
    const request: MarketingWhatsAppDeliveryRequest = {
      idempotencyKey: input.idempotencyKey,
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      campaignVersionId: input.campaignVersionId,
      batchId: input.batchId,
      executionId: input.idempotencyKey,
      recipientFingerprint: input.recipientFingerprint,
      recipientPhone: phone,
      templateId: template.id,
      templateName: template.name,
      language: template.language,
      variables,
      renderedBody,
    };

    const delivery = await this.deliver(request);
    const ledgerStatus = mapWhatsAppOutcomeToLedgerStatus(delivery.outcome);
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
    return marketingWhatsAppDeliveryRecordStore.listByCampaign(campaignId, limit);
  },
};
