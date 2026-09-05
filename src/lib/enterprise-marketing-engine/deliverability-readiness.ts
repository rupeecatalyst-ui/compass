/**
 * CO-MARKETING-REDESIGN-013 — Honest deliverability readiness.
 * Simulated observations are never labelled Verified. DNS is never permanent truth.
 */

import {
  MARKETING_DELIVERABILITY_CHECK_IDS,
  MARKETING_DELIVERABILITY_CHECK_LABELS,
  MARKETING_DELIVERABILITY_FRESHNESS_MS,
  type MarketingDeliverabilityCheckId,
  type MarketingDeliverabilityState,
} from "@/constants/enterprise-marketing-engine/sender-deliverability";

export type MarketingDeliverabilityCheck = {
  id: MarketingDeliverabilityCheckId;
  label: string;
  state: MarketingDeliverabilityState;
  simulated: boolean;
  lastValidatedAt: string | null;
  freshUntil: string | null;
  permanentTruth: false;
  note: string;
};

export type MarketingDeliverabilityReadiness = {
  organizationId: string;
  simulated: true;
  checks: MarketingDeliverabilityCheck[];
  lastValidationAt: string | null;
  freshUntil: string | null;
  anyVerified: false;
  notice: string;
};

function notVerifiedState(input: {
  providerConnectEnabled: boolean;
  executionEnabled: boolean;
}): MarketingDeliverabilityState {
  if (!input.providerConnectEnabled) return "NOT_CONFIGURED";
  if (!input.executionEnabled) return "UNAVAILABLE";
  return "PENDING";
}

export function composeMarketingDeliverabilityReadiness(input: {
  organizationId: string;
  providerConnectEnabled: boolean;
  executionEnabled: boolean;
  simulated?: boolean;
  now?: Date;
}): MarketingDeliverabilityReadiness {
  const now = input.now ?? new Date();
  const lastValidationAt = now.toISOString();
  const freshUntil = new Date(now.getTime() + MARKETING_DELIVERABILITY_FRESHNESS_MS).toISOString();
  const state = notVerifiedState({
    providerConnectEnabled: input.providerConnectEnabled,
    executionEnabled: input.executionEnabled,
  });
  if (state === "VERIFIED") {
    throw new Error("Simulated deliverability must never resolve to VERIFIED");
  }
  const checks: MarketingDeliverabilityCheck[] = MARKETING_DELIVERABILITY_CHECK_IDS.map((id) => ({
    id,
    label: MARKETING_DELIVERABILITY_CHECK_LABELS[id],
    state,
    simulated: true,
    lastValidatedAt: lastValidationAt,
    freshUntil,
    permanentTruth: false,
    note:
      id === "last_validation"
        ? `Observed at ${lastValidationAt}. Fresh until ${freshUntil}. Not permanent DNS truth.`
        : state === "NOT_CONFIGURED"
          ? "Provider is not connected. This is not a verified DNS or mailbox result."
          : state === "UNAVAILABLE"
            ? "Live validation is unavailable while marketing execution is off."
            : "Observed as pending only. Not stored as permanent DNS truth.",
  }));
  return {
    organizationId: input.organizationId,
    simulated: true,
    checks,
    lastValidationAt,
    freshUntil,
    anyVerified: false,
    notice:
      "Deliverability states are fixture observations. Simulated checks are never shown as verified. DNS lookups are not persisted as truth.",
  };
}

export function marketingDeliverabilityHasVerifiedSimulated(
  readiness: MarketingDeliverabilityReadiness,
): boolean {
  return readiness.checks.some((check) => check.simulated && check.state === "VERIFIED");
}

export function isMarketingDeliverabilityObservationFresh(input: {
  lastValidatedAt: string | null;
  freshUntil: string | null;
  now?: Date;
}): boolean {
  if (!input.lastValidatedAt || !input.freshUntil) return false;
  return (input.now ?? new Date()).toISOString() < input.freshUntil;
}
