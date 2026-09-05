/**
 * CO-MARKETING-REDESIGN-009 — Pause / resume / stop / next batch / retry contracts.
 * Stop and manual batch execution require confirmation. TEST MODE never sends.
 */

import {
  MARKETING_BATCH_CONFIRMATION_PHRASE,
  MARKETING_RETRY_CONFIRMATION_PHRASE,
  MARKETING_STOP_CONFIRMATION_PHRASE,
} from "@/constants/enterprise-marketing-engine/delivery-operations";
import { canRetryFailedMarketingDelivery } from "@/lib/enterprise-marketing-engine/durability/retry-policy";
import type { MarketingCampaignStatus } from "@/constants/enterprise-marketing-engine/lifecycle";
import type { MarketingDurableLedgerRecord } from "@/types/enterprise-marketing-durability";
import type { MarketingDurabilityPorts } from "@/types/enterprise-marketing-durability-ports";
import { assertMarketingActionAllowed } from "@/lib/enterprise-marketing-engine/durability/lifecycle";

export type MarketingConfirmedDeliveryAction = "STOP" | "RUN_NEXT_BATCH" | "RETRY";

export function assertMarketingDeliveryConfirmation(input: {
  action: MarketingConfirmedDeliveryAction;
  confirmed?: boolean;
  confirmationPhrase?: string;
}): void {
  if (!input.confirmed) {
    throw Object.assign(new Error("Confirmation is required for this delivery operation"), {
      statusCode: 400,
      code: "DELIVERY_CONFIRMATION_REQUIRED",
    });
  }
  const expected =
    input.action === "STOP"
      ? MARKETING_STOP_CONFIRMATION_PHRASE
      : input.action === "RETRY"
        ? MARKETING_RETRY_CONFIRMATION_PHRASE
        : MARKETING_BATCH_CONFIRMATION_PHRASE;
  const phrase = (input.confirmationPhrase ?? "").trim().toUpperCase();
  if (phrase !== expected) {
    throw Object.assign(new Error(`Type ${expected} to confirm`), {
      statusCode: 400,
      code: "DELIVERY_CONFIRMATION_REQUIRED",
    });
  }
}

export function assertMarketingDeliveryActionAllowed(
  status: MarketingCampaignStatus,
  action: "PAUSE" | "RESUME" | "STOP",
): MarketingCampaignStatus {
  if (action === "RESUME" && status === "STOPPED") {
    throw Object.assign(new Error("STOP is final — resume is not allowed"), {
      statusCode: 400,
      code: "STOP_IS_FINAL",
    });
  }
  return assertMarketingActionAllowed(status, action);
}

export function selectRetryableMarketingFailures(
  entries: Array<Pick<MarketingDurableLedgerRecord, "status" | "attemptCount">>,
): Array<Pick<MarketingDurableLedgerRecord, "status" | "attemptCount">> {
  return entries.filter((entry) => canRetryFailedMarketingDelivery(entry.status, entry.attemptCount));
}

export async function retryEligibleMarketingFailures(input: {
  ports: MarketingDurabilityPorts;
  organizationId: string;
  campaignId: string;
  workerId: string;
}): Promise<{ retried: number; skipped: number; actuallySent: false }> {
  const entries = await input.ports.ledger.listByCampaign(input.organizationId, input.campaignId);
  let retried = 0;
  let skipped = 0;
  for (const entry of entries) {
    if (!canRetryFailedMarketingDelivery(entry.status, entry.attemptCount)) {
      skipped += 1;
      continue;
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
    if (claimed.ok) retried += 1;
    else skipped += 1;
  }
  return { retried, skipped, actuallySent: false };
}
