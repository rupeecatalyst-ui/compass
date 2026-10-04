/**
 * CO-MARKETING-REDESIGN-002 — Pure claim decision (adapters execute atomically).
 */

import type { MarketingDurableLedgerRecord } from "@/types/enterprise-marketing-durability";
import type { MarketingClaimRejectReason } from "@/types/enterprise-marketing-durability-ports";
import {
  canRetryFailedMarketingDelivery,
  isMarketingRetryBackedOff,
  isTerminalNoRetryStatus,
  MARKETING_APPROVED_RETRY_POLICY,
  type MarketingRetryPolicy,
} from "./retry-policy";

export type MarketingClaimDecision =
  | { action: "insert" }
  | { action: "claim_existing" }
  | { action: "retry_failed" }
  | { action: "reject"; reason: MarketingClaimRejectReason };

const RESERVABLE = new Set(["eligible", "queued", "scheduled"]);

export function decideMarketingRecipientClaim(
  existing: MarketingDurableLedgerRecord | null,
  nowMs: number,
  policy: MarketingRetryPolicy = MARKETING_APPROVED_RETRY_POLICY,
): MarketingClaimDecision {
  if (!existing) return { action: "insert" };

  if (isTerminalNoRetryStatus(existing.status)) {
    return { action: "reject", reason: "already_terminal" };
  }

  if (existing.status === "processing") {
    const claimedAt = existing.claimedAt ? Date.parse(existing.claimedAt) : NaN;
    if (Number.isFinite(claimedAt) && nowMs - claimedAt < policy.inFlightTtlMs) {
      return { action: "reject", reason: "concurrency" };
    }
    return { action: "claim_existing" };
  }

  if (RESERVABLE.has(existing.status)) {
    return { action: "claim_existing" };
  }

  if (canRetryFailedMarketingDelivery(existing.status, existing.attemptCount, policy)) {
    return { action: "retry_failed" };
  }

  if (existing.status === "failed" || existing.status === "deferred" || existing.status === "bounced") {
    return { action: "reject", reason: "retry_not_allowed" };
  }

  return { action: "reject", reason: "already_claimed" };
}

export function decideMarketingBatchClaim(
  existing: { status: string } | null,
): MarketingClaimDecision {
  if (!existing) return { action: "insert" };
  if (existing.status === "completed" || existing.status === "processed") {
    return { action: "reject", reason: "already_terminal" };
  }
  if (existing.status === "processing") {
    return { action: "reject", reason: "concurrency" };
  }
  if (existing.status === "scheduled" || existing.status === "queued") {
    return { action: "claim_existing" };
  }
  return { action: "reject", reason: "already_claimed" };
}

export type MarketingRecipientClaimClass = "open" | "delayed" | "closed";

export function classifyMarketingRecipientClaim(
  existing: MarketingDurableLedgerRecord | null,
  nowMs: number,
  policy: MarketingRetryPolicy = MARKETING_APPROVED_RETRY_POLICY,
): MarketingRecipientClaimClass {
  const decision = decideMarketingRecipientClaim(existing, nowMs, policy);
  if (
    decision.action === "retry_failed" &&
    existing &&
    isMarketingRetryBackedOff(existing.processedAt, existing.attemptCount, nowMs, policy)
  ) {
    return "delayed";
  }
  if (decision.action === "reject") return "closed";
  return "open";
}
