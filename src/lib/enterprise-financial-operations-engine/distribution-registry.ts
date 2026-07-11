/**
 * EFOE distribution registry — policy-driven revenue distribution after recognition.
 */

import type {
  EfoeDistributionRuleReference,
  EfoeRevenueDistribution,
} from "@/types/enterprise-financial-operations-engine";
import { recordEfoeAudit } from "./audit-integration";
import { getEfoePorts } from "./composition";
import { appendEfoeTimelineEntry } from "./financial-timeline-registry";
import { validateEfoeDistribution } from "./validation-engine";

export function registerEfoeDistributionRule(
  input: Omit<EfoeDistributionRuleReference, "id">,
): EfoeDistributionRuleReference {
  const duplicate = getEfoePorts().distributionRules.findByCode(input.ruleCode);
  if (duplicate) throw new Error(`EFOE: distribution rule "${input.ruleCode}" already exists.`);

  const rule: EfoeDistributionRuleReference = { ...input, id: crypto.randomUUID() };
  getEfoePorts().distributionRules.save(rule);
  return rule;
}

export function allocateEfoeRevenueDistribution(
  input: Omit<EfoeRevenueDistribution, "id" | "createdOn" | "status">,
): EfoeRevenueDistribution {
  const distribution: EfoeRevenueDistribution = {
    ...input,
    id: crypto.randomUUID(),
    status: "allocated",
    createdOn: new Date().toISOString(),
  };

  const existing = getEfoePorts().distributions.listByRecognition(input.recognitionId);
  const validation = validateEfoeDistribution(distribution, [...existing, distribution]);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEfoePorts().distributions.save(distribution);
  recordEfoeAudit({
    entityId: distribution.id,
    entityType: "distribution",
    action: "created",
    actorId: input.createdBy,
    remarks: `Allocated ${distribution.allocatedAmount} to ${distribution.beneficiaryCode}`,
  });

  const recognition = getEfoePorts().revenueRecognitions.findById(input.recognitionId);
  if (recognition) {
    const invoice = getEfoePorts().invoices.findById(recognition.invoiceId);
    if (invoice) {
      appendEfoeTimelineEntry({
        transactionRef: invoice.transactionRef,
        eventType: "distribution_allocated",
        title: "Distribution Allocated",
        description: `${distribution.allocatedAmount} allocated to ${distribution.beneficiaryCode}`,
        actorId: input.createdBy,
      });
    }
  }

  return distribution;
}

export function listEfoeDistributions(recognitionId?: string): EfoeRevenueDistribution[] {
  return recognitionId
    ? getEfoePorts().distributions.listByRecognition(recognitionId)
    : getEfoePorts().distributions.list();
}
