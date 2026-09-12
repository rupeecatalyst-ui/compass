/**
 * CO-MARKETING-HOSTINGER-SMTP-001 — Hostinger SMTP delivery adapter.
 * One recipient per call. No network unless an injected transport is used with test gates.
 * Production flags remain OFF and never open a socket.
 */

import {
  ENTERPRISE_MARKETING_EXECUTION_ENABLED,
  ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
} from "@/constants/enterprise-marketing-engine";
import {
  MARKETING_PHASE1_SMTP_MAX_CONCURRENT,
  MARKETING_SMTP_BLOCK,
  MARKETING_SMTP_INBOX_DELIVERY_UNAVAILABLE,
} from "@/constants/enterprise-marketing-engine/hostinger-smtp";
import { MARKETING_PUBLIC_UNSUBSCRIBE_PATH } from "@/constants/enterprise-marketing-engine/unsubscribe";
import { assertMarketingPhase1Sender } from "@/lib/enterprise-marketing-engine/phase1-sender";
import type { MarketingEmailDeliveryPort } from "@/lib/enterprise-marketing-engine/ports/email-delivery.port";
import type { MarketingSmtpTransport } from "@/lib/enterprise-marketing-engine/ports/smtp-transport.port";
import { assessMarketingSmtpConfig, marketingSmtpConfigIsComplete } from "@/lib/enterprise-marketing-engine/smtp-config";
import { failClosedMarketingDeliverySuppression, marketingDeliveryFingerprints } from "@/lib/enterprise-marketing-engine/delivery-suppression";
import { marketingSuppressionStore } from "../suppression-store";
import type {
  MarketingEmailDeliveryRequest,
  MarketingEmailDeliveryResult,
} from "@/types/enterprise-marketing-email-delivery";

export type HostingerSmtpAdapterGates = {
  executionEnabled: boolean;
  providerConnectEnabled: boolean;
};

export type HostingerSmtpAdapterOptions = {
  transport?: MarketingSmtpTransport;
  gates?: HostingerSmtpAdapterGates;
  smtpEnv?: Record<string, string | undefined>;
};

function sanitizeSmtpError(message: string): string {
  return message.replace(/(pass(word)?|pwd|secret|auth)\s*[:=]\s*\S+/gi, "$1=[redacted]");
}

function isBulkRecipient(email: string): boolean {
  return /[;,]/u.test(email) || email.includes(" ");
}

function htmlHasUnsubscribeLink(html: string): boolean {
  return html.includes(MARKETING_PUBLIC_UNSUBSCRIBE_PATH);
}

let activeSends = 0;

async function withConcurrencySlot<T>(fn: () => Promise<T>): Promise<T> {
  while (activeSends >= MARKETING_PHASE1_SMTP_MAX_CONCURRENT) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  activeSends += 1;
  try {
    return await fn();
  } finally {
    activeSends -= 1;
  }
}

function blocked(
  request: MarketingEmailDeliveryRequest,
  code: string,
  message: string,
): MarketingEmailDeliveryResult {
  return {
    idempotencyKey: request.idempotencyKey,
    outcome: "BLOCKED",
    errorCode: code,
    errorMessage: message,
    providerMessageId: null,
    dryRun: true,
  };
}

function failed(
  request: MarketingEmailDeliveryRequest,
  code: string,
  message: string,
  retryable = false,
): MarketingEmailDeliveryResult {
  return {
    idempotencyKey: request.idempotencyKey,
    outcome: retryable ? "RETRYABLE_FAILURE" : "FAILED",
    errorCode: code,
    errorMessage: message,
    providerMessageId: null,
    dryRun: true,
  };
}

export function createHostingerSmtpEmailDeliveryPort(
  options: HostingerSmtpAdapterOptions = {},
): MarketingEmailDeliveryPort {
  const sent = new Map<string, MarketingEmailDeliveryResult>();
  const gates: HostingerSmtpAdapterGates = options.gates ?? {
    executionEnabled: ENTERPRISE_MARKETING_EXECUTION_ENABLED,
    providerConnectEnabled: ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
  };

  return {
    providerType: "smtp",

    async deliver(request: MarketingEmailDeliveryRequest): Promise<MarketingEmailDeliveryResult> {
      const existing = sent.get(request.idempotencyKey);
      if (existing) return { ...existing, duplicate: true };

      if (!gates.executionEnabled) {
        return failed(request, MARKETING_SMTP_BLOCK.executionDisabled, "Live Marketing execution is disabled");
      }
      if (!gates.providerConnectEnabled) {
        return failed(
          request,
          MARKETING_SMTP_BLOCK.providerConnectDisabled,
          "Marketing provider connect is disabled",
        );
      }
      if (!options.transport) {
        return failed(
          request,
          MARKETING_SMTP_BLOCK.providerConnectDisabled,
          "SMTP transport is not connected",
        );
      }

      const smtp = assessMarketingSmtpConfig(options.smtpEnv);
      if (!marketingSmtpConfigIsComplete(smtp)) {
        return failed(request, smtp.blockers[0] ?? MARKETING_SMTP_BLOCK.configMissing, "SMTP configuration is incomplete");
      }

      if (isBulkRecipient(request.recipientEmail)) {
        return blocked(
          request,
          MARKETING_SMTP_BLOCK.bulkRecipientForbidden,
          "Marketing SMTP sends one message per recipient",
        );
      }

      try {
        assertMarketingPhase1Sender({
          fromAddress: request.sender.fromAddress,
          displayName: request.sender.displayName,
          replyTo: request.sender.replyTo,
        });
      } catch (err) {
        const code = err && typeof err === "object" && "code" in err ? String(err.code) : MARKETING_SMTP_BLOCK.senderNotPhase1;
        return blocked(request, code, "Phase 1 sender identity is required");
      }

      if (!htmlHasUnsubscribeLink(request.htmlBody)) {
        return blocked(
          request,
          MARKETING_SMTP_BLOCK.unsubscribeMissing,
          "Marketing HTML must include a public unsubscribe URL",
        );
      }

      const fingerprints = marketingDeliveryFingerprints(request);
      const suppression = failClosedMarketingDeliverySuppression({
        fingerprints: request.recipientFingerprint?.trim() ? fingerprints : [],
        decision: request.recipientFingerprint?.trim()
          ? marketingSuppressionStore.evaluateDelivery({
              organizationId: request.organizationId,
              fingerprints,
              channel: "EMAIL",
              phase: "delivery",
              campaignId: request.campaignId,
            })
          : null,
      });
      if (suppression.blocked) {
        return blocked(request, suppression.code, "Marketing delivery blocked by suppression");
      }

      try {
        const transportResult = await withConcurrencySlot(() =>
          options.transport!.send({
            to: request.recipientEmail.trim(),
            fromName: request.sender.displayName,
            fromEmail: request.sender.fromAddress,
            replyTo: request.sender.replyTo ?? request.sender.fromAddress,
            subject: request.subject,
            html: request.htmlBody,
            text: request.textBody,
            idempotencyKey: request.idempotencyKey,
          }),
        );
        if (!transportResult.accepted) {
          const result = failed(
            request,
            transportResult.errorCode ?? MARKETING_SMTP_BLOCK.transportFailure,
            sanitizeSmtpError("SMTP transport did not accept the message"),
            transportResult.retryable,
          );
          sent.set(request.idempotencyKey, result);
          return result;
        }
        const result: MarketingEmailDeliveryResult = {
          idempotencyKey: request.idempotencyKey,
          outcome: "ACCEPTED",
          providerMessageId: transportResult.providerMessageId,
          errorCode: null,
          errorMessage: MARKETING_SMTP_INBOX_DELIVERY_UNAVAILABLE,
          dryRun: false,
        };
        sent.set(request.idempotencyKey, result);
        return result;
      } catch (err) {
        const result = failed(
          request,
          MARKETING_SMTP_BLOCK.transportFailure,
          sanitizeSmtpError(err instanceof Error ? err.message : "SMTP transport failure"),
          true,
        );
        sent.set(request.idempotencyKey, result);
        return result;
      }
    },
  };
}
