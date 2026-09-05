/**
 * CO-MARKETING-REDESIGN-020 — Retryable vs terminal failure classification.
 * Never retries terminal success, unsubscribe, complaint, hard bounce, or permanent suppression.
 */

import {
  MARKETING_NON_RETRYABLE_FAILURE_KINDS,
  MARKETING_RETRYABLE_FAILURE_KINDS,
} from "@/constants/enterprise-marketing-engine/recovery";
import type { MarketingRecoveryFailureKind } from "@/types/enterprise-marketing-recovery";
import {
  canRetryFailedMarketingDelivery,
  isTerminalSuccessfulDelivery,
  MARKETING_APPROVED_RETRY_POLICY,
  type MarketingRetryPolicy,
} from "./retry-policy";
import type { MarketingDurableLedgerStatus } from "@/types/enterprise-marketing-durability";

const NON_RETRYABLE = new Set<string>(MARKETING_NON_RETRYABLE_FAILURE_KINDS);
const RETRYABLE = new Set<string>(MARKETING_RETRYABLE_FAILURE_KINDS);

export function marketingFailureKindIsRetryable(kind: MarketingRecoveryFailureKind): boolean {
  if (NON_RETRYABLE.has(kind)) return false;
  return RETRYABLE.has(kind);
}

export function classifyMarketingDeliveryFailure(input: {
  kind: MarketingRecoveryFailureKind;
  status?: MarketingDurableLedgerStatus | null;
  attemptCount: number;
  unsubscribed?: boolean;
  complaint?: boolean;
  hardBounce?: boolean;
  permanentlySuppressed?: boolean;
  policy?: MarketingRetryPolicy;
}): { retryable: boolean; quarantine: boolean; reason: string } {
  const policy = input.policy ?? MARKETING_APPROVED_RETRY_POLICY;
  if (input.status && isTerminalSuccessfulDelivery(input.status)) {
    return { retryable: false, quarantine: false, reason: "terminal_success" };
  }
  if (input.unsubscribed || input.kind === "unsubscribe") {
    return { retryable: false, quarantine: false, reason: "unsubscribe" };
  }
  if (input.complaint || input.kind === "complaint") {
    return { retryable: false, quarantine: false, reason: "complaint" };
  }
  if (input.hardBounce || input.kind === "hard_bounce") {
    return { retryable: false, quarantine: false, reason: "hard_bounce" };
  }
  if (input.permanentlySuppressed || input.kind === "permanent_suppression") {
    return { retryable: false, quarantine: false, reason: "permanent_suppression" };
  }
  if (input.kind === "webhook_replay") {
    return { retryable: false, quarantine: false, reason: "webhook_replay" };
  }
  if (input.kind === "daily_cap_exhausted") {
    return { retryable: false, quarantine: false, reason: "daily_cap_exhausted" };
  }
  if (!marketingFailureKindIsRetryable(input.kind)) {
    return {
      retryable: false,
      quarantine: input.kind === "permanent_provider_rejection" || input.kind === "invalid_recipient",
      reason: input.kind,
    };
  }
  if (!canRetryFailedMarketingDelivery("failed", input.attemptCount, policy)) {
    return { retryable: false, quarantine: true, reason: "exhausted_retries" };
  }
  return { retryable: true, quarantine: false, reason: input.kind };
}
