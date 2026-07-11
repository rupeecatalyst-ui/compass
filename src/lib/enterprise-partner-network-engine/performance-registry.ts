/**
 * EPNE performance registry — ratings, performance summaries, external references.
 */

import type {
  EpnePartnerBankingReference,
  EpnePartnerComplianceReference,
  EpnePartnerKycReference,
  EpnePartnerPerformanceSummary,
  EpnePartnerRating,
} from "@/types/enterprise-partner-network-engine";
import { recordEpnePartnerAudit } from "./audit-integration";
import { getEpnePorts } from "./composition";

export function recordEpnePartnerRating(input: Omit<EpnePartnerRating, "id">): EpnePartnerRating {
  if (!getEpnePorts().partners.findById(input.partnerId)) {
    throw new Error(`EPNE: partner "${input.partnerId}" not found.`);
  }

  const rating: EpnePartnerRating = { ...input, id: crypto.randomUUID() };
  getEpnePorts().ratings.save(rating);
  return rating;
}

export function computeEpnePerformanceSummary(input: {
  partnerId: string;
  periodCode: string;
  metrics: Record<string, number>;
}): EpnePartnerPerformanceSummary {
  if (!getEpnePorts().partners.findById(input.partnerId)) {
    throw new Error(`EPNE: partner "${input.partnerId}" not found.`);
  }

  const summary: EpnePartnerPerformanceSummary = {
    id: crypto.randomUUID(),
    partnerId: input.partnerId,
    periodCode: input.periodCode,
    metrics: input.metrics,
    computedOn: new Date().toISOString(),
  };

  getEpnePorts().performance.save(summary);
  recordEpnePartnerAudit({
    entityId: summary.id,
    entityType: "performance",
    action: "created",
    actorId: "system",
    remarks: `Computed performance summary for period ${input.periodCode}`,
  });

  return summary;
}

export function registerEpneKycReference(
  input: Omit<EpnePartnerKycReference, "id">,
): EpnePartnerKycReference {
  const reference: EpnePartnerKycReference = { ...input, id: crypto.randomUUID() };
  getEpnePorts().kycReferences.save(reference);
  return reference;
}

export function registerEpneBankingReference(
  input: Omit<EpnePartnerBankingReference, "id">,
): EpnePartnerBankingReference {
  const reference: EpnePartnerBankingReference = { ...input, id: crypto.randomUUID() };
  getEpnePorts().bankingReferences.save(reference);
  return reference;
}

export function registerEpneComplianceReference(
  input: Omit<EpnePartnerComplianceReference, "id">,
): EpnePartnerComplianceReference {
  const reference: EpnePartnerComplianceReference = { ...input, id: crypto.randomUUID() };
  getEpnePorts().complianceReferences.save(reference);
  return reference;
}

export function listEpnePerformanceSummaries(partnerId: string): EpnePartnerPerformanceSummary[] {
  return getEpnePorts().performance.listByPartner(partnerId);
}

export function listEpnePartnerRatings(partnerId: string): EpnePartnerRating[] {
  return getEpnePorts().ratings.listByPartner(partnerId);
}
