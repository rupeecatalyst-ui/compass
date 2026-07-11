/**
 * EFOE settlement registry — settlements, batches, overrides.
 */

import { EFOE_SETTLEMENT_STATUS } from "@/constants/enterprise-financial-operations-engine";
import type {
  EfoeSettlement,
  EfoeSettlementBatch,
  EfoeSettlementOverride,
} from "@/types/enterprise-financial-operations-engine";
import { recordEfoeAudit } from "./audit-integration";
import { getEfoePorts } from "./composition";
import { appendEfoeTimelineEntry } from "./financial-timeline-registry";
import { validateEfoeSettlement } from "./validation-engine";

export function registerEfoeSettlement(
  input: Omit<EfoeSettlement, "id" | "createdOn" | "status">,
): EfoeSettlement {
  const settlement: EfoeSettlement = {
    ...input,
    id: crypto.randomUUID(),
    status: EFOE_SETTLEMENT_STATUS.PENDING,
    createdOn: new Date().toISOString(),
  };

  const validation = validateEfoeSettlement(settlement);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEfoePorts().settlements.save(settlement);
  recordEfoeAudit({
    entityId: settlement.id,
    entityType: "settlement",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered settlement ${settlement.settlementCode}`,
  });

  return settlement;
}

export function releaseEfoeSettlement(settlementId: string, actorId: string): EfoeSettlement | undefined {
  const settlement = getEfoePorts().settlements.findById(settlementId);
  if (!settlement) return undefined;

  const eligibility = getEfoePorts().settlementEligibilities.findByBeneficiary(settlement.beneficiaryId);
  if (!eligibility?.satisfied) {
    const hasOverride = getEfoePorts().settlementOverrides.listBySettlement(settlementId).length > 0;
    if (!hasOverride) {
      const blocked: EfoeSettlement = { ...settlement, status: EFOE_SETTLEMENT_STATUS.BLOCKED };
      getEfoePorts().settlements.save(blocked);
      recordEfoeAudit({
        entityId: settlement.id,
        entityType: "settlement",
        action: "blocked",
        actorId,
        remarks: "Settlement blocked — eligibility not satisfied",
      });
      throw new Error("EFOE: settlement blocked until eligibility is satisfied.");
    }
  }

  const updated: EfoeSettlement = {
    ...settlement,
    status: EFOE_SETTLEMENT_STATUS.RELEASED,
    releasedOn: new Date().toISOString(),
  };

  getEfoePorts().settlements.save(updated);
  recordEfoeAudit({
    entityId: settlement.id,
    entityType: "settlement",
    action: "released",
    actorId,
    remarks: `Settlement ${settlement.settlementCode} released`,
  });

  const distribution = settlement.distributionId
    ? getEfoePorts().distributions.findById(settlement.distributionId)
    : undefined;
  if (distribution) {
    const recognition = getEfoePorts().revenueRecognitions.findById(distribution.recognitionId);
    const invoice = recognition ? getEfoePorts().invoices.findById(recognition.invoiceId) : undefined;
    if (invoice) {
      appendEfoeTimelineEntry({
        transactionRef: invoice.transactionRef,
        eventType: "settlement_released",
        title: "Settlement Released",
        description: `Settlement ${settlement.settlementCode} released: ${settlement.amount}`,
        actorId,
      });
    }
  }

  return updated;
}

export function reverseEfoeSettlement(settlementId: string, actorId: string): EfoeSettlement | undefined {
  const settlement = getEfoePorts().settlements.findById(settlementId);
  if (!settlement) return undefined;

  const updated: EfoeSettlement = { ...settlement, status: EFOE_SETTLEMENT_STATUS.REVERSED };
  getEfoePorts().settlements.save(updated);
  recordEfoeAudit({
    entityId: settlement.id,
    entityType: "settlement",
    action: "reversed",
    actorId,
    remarks: `Settlement ${settlement.settlementCode} reversed`,
  });

  return updated;
}

export function registerEfoeSettlementBatch(
  input: Omit<EfoeSettlementBatch, "id" | "createdOn" | "status">,
): EfoeSettlementBatch {
  const duplicate = getEfoePorts().settlementBatches.findByCode(input.batchCode);
  if (duplicate) throw new Error(`EFOE: settlement batch "${input.batchCode}" already exists.`);

  const batch: EfoeSettlementBatch = {
    ...input,
    id: crypto.randomUUID(),
    status: EFOE_SETTLEMENT_STATUS.PENDING,
    createdOn: new Date().toISOString(),
  };

  getEfoePorts().settlementBatches.save(batch);
  recordEfoeAudit({
    entityId: batch.id,
    entityType: "settlement_batch",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered batch ${batch.batchCode}`,
  });

  return batch;
}

export function registerEfoeSettlementOverride(
  input: Omit<EfoeSettlementOverride, "id" | "overriddenOn">,
): EfoeSettlementOverride {
  const override: EfoeSettlementOverride = {
    ...input,
    id: crypto.randomUUID(),
    overriddenOn: new Date().toISOString(),
  };

  getEfoePorts().settlementOverrides.save(override);
  return override;
}

export function listEfoeSettlements(beneficiaryId?: string): EfoeSettlement[] {
  return beneficiaryId
    ? getEfoePorts().settlements.listByBeneficiary(beneficiaryId)
    : getEfoePorts().settlements.list();
}
