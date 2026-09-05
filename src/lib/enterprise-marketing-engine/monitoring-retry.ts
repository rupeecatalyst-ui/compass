/**
 * CO-MARKETING-REDESIGN-015 — Recipient retry restrictions for campaign monitoring.
 * Stricter than the generic 002 bounced-is-retryable policy. Never live-sends.
 */

import {
  canRetryFailedMarketingDelivery,
  isTerminalSuccessfulDelivery,
  MARKETING_APPROVED_RETRY_POLICY,
  type MarketingRetryPolicy,
} from "@/lib/enterprise-marketing-engine/durability/retry-policy";
import type { MarketingDurableLedgerStatus } from "@/types/enterprise-marketing-durability";
import type {
  MarketingBounceCategory,
  MarketingMonitoringNextAction,
  MarketingMonitoringRetryBlockReason,
  MarketingMonitoringRetryDecision,
} from "@/types/enterprise-marketing-campaign-monitoring";
import type { MarketingDurabilityPorts } from "@/types/enterprise-marketing-durability-ports";

export type MarketingMonitoringRetryInput = {
  status: MarketingDurableLedgerStatus | "snapshotted" | string;
  attemptCount: number;
  bounceCategory?: MarketingBounceCategory | null;
  unsubscribed?: boolean;
  complaint?: boolean;
  permanentlySuppressed?: boolean;
  policy?: MarketingRetryPolicy;
};

export function evaluateMarketingMonitoringRetry(
  input: MarketingMonitoringRetryInput,
): MarketingMonitoringRetryDecision {
  const policy = input.policy ?? MARKETING_APPROVED_RETRY_POLICY;
  const status = input.status;

  if (status === "delivered" || status === "sent") {
    return { allowed: false, reason: "delivered" };
  }
  if (input.unsubscribed) {
    return { allowed: false, reason: "unsubscribed" };
  }
  if (input.complaint) {
    return { allowed: false, reason: "complaint" };
  }
  if (input.permanentlySuppressed) {
    return { allowed: false, reason: "permanently_suppressed" };
  }
  if (input.bounceCategory === "hard") {
    return { allowed: false, reason: "hard_bounce" };
  }
  if (status === "bounced" && input.bounceCategory !== "soft") {
    return { allowed: false, reason: "hard_bounce" };
  }
  if (
    status === "skipped" ||
    status === "suppressed" ||
    status === "cancelled" ||
    status === "snapshotted" ||
    status === "eligible" ||
    status === "queued" ||
    status === "scheduled" ||
    status === "processing"
  ) {
    return { allowed: false, reason: "not_retryable_status" };
  }
  if (isTerminalSuccessfulDelivery(status as MarketingDurableLedgerStatus)) {
    return { allowed: false, reason: "delivered" };
  }
  if (input.attemptCount >= policy.maxAttempts) {
    return { allowed: false, reason: "max_attempts" };
  }

  const retryStatus: MarketingDurableLedgerStatus =
    status === "bounced" && input.bounceCategory === "soft" ? "deferred" : (status as MarketingDurableLedgerStatus);

  if (!canRetryFailedMarketingDelivery(retryStatus, input.attemptCount, policy)) {
    return { allowed: false, reason: "not_retryable_status" };
  }
  return { allowed: true, reason: null };
}

export function resolveMarketingMonitoringNextAction(input: {
  retryAllowed: boolean;
  suppressed: boolean;
  hasSuppressionHistory: boolean;
  qualificationId: string | null;
}): { next: MarketingMonitoringNextAction; allowed: MarketingMonitoringNextAction[] } {
  const allowed: MarketingMonitoringNextAction[] = [];
  if (input.retryAllowed) allowed.push("retry");
  if (!input.suppressed) allowed.push("suppress");
  if (input.hasSuppressionHistory) allowed.push("view_suppression");
  if (input.qualificationId) allowed.push("open_qualification");
  return {
    next: allowed[0] ?? "none",
    allowed,
  };
}

export function assertMarketingMonitoringRetryPermitted(
  input: MarketingMonitoringRetryInput,
): void {
  const decision = evaluateMarketingMonitoringRetry(input);
  if (decision.allowed) return;
  const message =
    decision.reason === "delivered"
      ? "Delivered recipients cannot be retried"
      : decision.reason === "hard_bounce"
        ? "Hard bounces cannot be retried"
        : decision.reason === "unsubscribed"
          ? "Unsubscribed recipients cannot be retried"
          : decision.reason === "complaint"
            ? "Complaint recipients cannot be retried"
            : decision.reason === "permanently_suppressed"
              ? "Permanently suppressed recipients cannot be retried"
              : "Retry is not permitted for this recipient";
  throw Object.assign(new Error(message), {
    statusCode: 409,
    code: "RETRY_NOT_PERMITTED",
    reason: decision.reason,
  });
}

export async function retryMarketingMonitoringRecipient(input: {
  ports: MarketingDurabilityPorts;
  organizationId: string;
  campaignId: string;
  ledgerId: string;
  workerId: string;
  bounceCategory?: MarketingBounceCategory | null;
  unsubscribed?: boolean;
  complaint?: boolean;
  permanentlySuppressed?: boolean;
}): Promise<{ retried: boolean; skipped: boolean; actuallySent: false; reason: MarketingMonitoringRetryBlockReason }> {
  const entries = await input.ports.ledger.listByCampaign(input.organizationId, input.campaignId);
  const entry = entries.find((row) => row.id === input.ledgerId && row.organizationId === input.organizationId);
  if (!entry) {
    throw Object.assign(new Error("Recipient ledger record is unavailable"), {
      statusCode: 404,
      code: "LEDGER_NOT_FOUND",
    });
  }
  const decision = evaluateMarketingMonitoringRetry({
    status: entry.status,
    attemptCount: entry.attemptCount,
    bounceCategory: input.bounceCategory ?? null,
    unsubscribed: input.unsubscribed,
    complaint: input.complaint,
    permanentlySuppressed: input.permanentlySuppressed,
  });
  if (!decision.allowed) {
    return { retried: false, skipped: true, actuallySent: false, reason: decision.reason };
  }
  const claimed = await input.ports.ledger.tryClaim({
    organizationId: input.organizationId,
    campaignId: input.campaignId,
    campaignVersionId: entry.campaignVersionId,
    snapshotId: entry.snapshotId,
    snapshotRecipientId: entry.snapshotRecipientId,
    channel: entry.channel,
    normalizedEmail: entry.normalizedEmail,
    sourceStableKey: entry.sourceStableKey,
    idempotencyKey: entry.idempotencyKey,
    batchId: entry.batchId ?? `retry-${entry.id}`,
    batchNumber: entry.batchNumber ?? 0,
    workerId: input.workerId,
  });
  return {
    retried: claimed.ok,
    skipped: !claimed.ok,
    actuallySent: false,
    reason: claimed.ok ? null : "not_retryable_status",
  };
}
