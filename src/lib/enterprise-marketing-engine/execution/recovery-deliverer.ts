/**
 * CO-MARKETING-REDESIGN-020 — Deterministic dry-run delivery outcomes for recovery fixtures.
 * Never invokes a live provider.
 */

import type { MarketingRecoveryFailureKind } from "@/types/enterprise-marketing-recovery";
import type { MarketingDurableSnapshotRecipientRecord } from "@/types/enterprise-marketing-durability";

export type MarketingRecoveryDelivererOutcome = {
  status: "sent" | "failed" | "skipped";
  retryable: boolean;
  dryRun: true;
  providerMessageId: string | null;
  liveProviderInvoked: false;
  failureKind: MarketingRecoveryFailureKind | null;
};

const KIND_BY_TOKEN: Array<{ token: string; kind: MarketingRecoveryFailureKind; retryable: boolean; status: "sent" | "failed" | "skipped" }> = [
  { token: "timeout@", kind: "provider_timeout", retryable: true, status: "failed" },
  { token: "temp-reject@", kind: "temporary_provider_rejection", retryable: true, status: "failed" },
  { token: "perm-reject@", kind: "permanent_provider_rejection", retryable: false, status: "skipped" },
  { token: "ratelimit@", kind: "rate_limited", retryable: true, status: "failed" },
  { token: "invalid@", kind: "invalid_recipient", retryable: false, status: "skipped" },
  { token: "render-fail@", kind: "rendering_failure", retryable: true, status: "failed" },
  { token: "unsub@", kind: "unsubscribe", retryable: false, status: "skipped" },
  { token: "complaint@", kind: "complaint", retryable: false, status: "skipped" },
  { token: "hardbounce@", kind: "hard_bounce", retryable: false, status: "skipped" },
  { token: "suppress@", kind: "permanent_suppression", retryable: false, status: "skipped" },
  { token: "crash-throw@", kind: "worker_crash", retryable: true, status: "failed" },
];

export function createMarketingRecoveryDryRunDeliverer(input?: {
  throwOn?: string;
}): (recipient: MarketingDurableSnapshotRecipientRecord) => Promise<MarketingRecoveryDelivererOutcome> {
  return async (recipient) => {
    const email = recipient.normalizedEmail.toLowerCase();
    if (input?.throwOn && email.includes(input.throwOn)) {
      throw Object.assign(new Error("Simulated recipient failure"), {
        code: "SIMULATED_RECIPIENT_FAILURE",
        failureKind: "worker_crash" satisfies MarketingRecoveryFailureKind,
      });
    }
    for (const rule of KIND_BY_TOKEN) {
      if (email.includes(rule.token) || email.startsWith(rule.token.replace("@", ""))) {
        return {
          status: rule.status,
          retryable: rule.retryable,
          dryRun: true,
          providerMessageId: null,
          liveProviderInvoked: false,
          failureKind: rule.kind,
        };
      }
    }
    return {
      status: "sent",
      retryable: false,
      dryRun: true,
      providerMessageId: `dry-run-${recipient.id}`,
      liveProviderInvoked: false,
      failureKind: null,
    };
  };
}
