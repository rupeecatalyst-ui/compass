/**
 * EFOE registry snapshot.
 */

import { EFOE_FRAMEWORK_VERSION } from "@/constants/enterprise-financial-operations-engine";
import type { EfoeRegistrySnapshot } from "@/types/enterprise-financial-operations-engine";
import { getEfoePorts } from "./composition";

export function getEfoeFrameworkVersion(): string {
  return EFOE_FRAMEWORK_VERSION;
}

export function getEfoeRegistrySnapshot(): EfoeRegistrySnapshot {
  const ports = getEfoePorts();
  return {
    revenueEvents: ports.revenueEvents.list(),
    invoices: ports.invoices.list(),
    invoiceLines: ports.invoiceLines.list(),
    invoiceSchedules: ports.invoiceSchedules.list(),
    invoicePayees: ports.invoicePayees.list(),
    revenueReceipts: ports.revenueReceipts.list(),
    revenueRecognitions: ports.revenueRecognitions.list(),
    distributionRules: ports.distributionRules.list(),
    beneficiaries: ports.beneficiaries.list(),
    distributions: ports.distributions.list(),
    settlementProfiles: ports.settlementProfiles.list(),
    settlementRequirements: ports.settlementRequirements.list(),
    settlementEligibilities: ports.settlementEligibilities.list(),
    settlements: ports.settlements.list(),
    settlementBatches: ports.settlementBatches.list(),
    settlementOverrides: ports.settlementOverrides.list(),
    adjustments: ports.adjustments.list(),
    clawbacks: ports.clawbacks.list(),
    recoveries: ports.recoveries.list(),
    writeOffs: ports.writeOffs.list(),
    financialEvents: ports.financialEvents.list(),
    paymentReferences: ports.paymentReferences.list(),
    gstReferences: ports.gstReferences.list(),
    tdsReferences: ports.tdsReferences.list(),
    incentives: ports.incentives.list(),
    contests: ports.contests.list(),
    bonuses: ports.bonuses.list(),
    timelineEntries: ports.timeline.list(),
    auditReferences: ports.auditReferences.list(),
  };
}
