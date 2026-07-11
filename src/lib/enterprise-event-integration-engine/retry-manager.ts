/**
 * EEIE retry manager — delivery retry with configurable policy.
 */

import type { EeieDeadLetterEntry, EeieRetryPolicy } from "@/types/enterprise-event-integration-engine";
import { getEeiePorts } from "./composition";
import { validateEeieRetryPolicyConsistency } from "./validation-engine";

export function calculateEeieRetryDelay(policy: EeieRetryPolicy, attemptNumber: number): number {
  if (attemptNumber <= 0) return policy.initialDelayMs;

  switch (policy.strategy) {
    case "fixed":
      return policy.initialDelayMs;
    case "linear":
      return Math.min(policy.initialDelayMs * attemptNumber, policy.maxDelayMs);
    case "exponential":
      return Math.min(
        policy.initialDelayMs * Math.pow(policy.backoffMultiplier, attemptNumber - 1),
        policy.maxDelayMs,
      );
    default:
      return policy.initialDelayMs;
  }
}

export function shouldEeieRetry(policyId: string, attemptCount: number): boolean {
  const policy = validateEeieRetryPolicyConsistency(policyId);
  return attemptCount < policy.maxAttempts;
}

export function recordEeieDeadLetterEntry(input: {
  envelopeId: string;
  subscriptionId: string;
  subscriberId: string;
  failureReason: string;
  attemptCount: number;
}): EeieDeadLetterEntry {
  const entry: EeieDeadLetterEntry = {
    id: crypto.randomUUID(),
    envelopeId: input.envelopeId,
    subscriptionId: input.subscriptionId,
    subscriberId: input.subscriberId,
    failureReason: input.failureReason,
    attemptCount: input.attemptCount,
    lastAttemptOn: new Date().toISOString(),
    createdOn: new Date().toISOString(),
  };

  getEeiePorts().deadLetterQueue.append(entry);
  return entry;
}

export function listEeieDeadLetterEntries(envelopeId?: string): EeieDeadLetterEntry[] {
  return envelopeId
    ? getEeiePorts().deadLetterQueue.listByEnvelope(envelopeId)
    : getEeiePorts().deadLetterQueue.list();
}

export function deliverWithEeieRetry(input: {
  policyId: string;
  envelopeId: string;
  subscriptionId: string;
  subscriberId: string;
  deliver: () => void;
}): { delivered: boolean; attemptCount: number; deadLettered: boolean } {
  const policy = validateEeieRetryPolicyConsistency(input.policyId);
  let attemptCount = 0;
  let lastError: string | undefined;

  while (attemptCount < policy.maxAttempts) {
    attemptCount += 1;
    try {
      input.deliver();
      return { delivered: true, attemptCount, deadLettered: false };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attemptCount >= policy.maxAttempts) break;
      const delay = calculateEeieRetryDelay(policy, attemptCount);
      void delay;
    }
  }

  recordEeieDeadLetterEntry({
    envelopeId: input.envelopeId,
    subscriptionId: input.subscriptionId,
    subscriberId: input.subscriberId,
    failureReason: lastError ?? "Delivery failed",
    attemptCount,
  });

  return { delivered: false, attemptCount, deadLettered: true };
}
