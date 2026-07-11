/**
 * EFOE adjustment registry.
 */

import type { EfoeAdjustment } from "@/types/enterprise-financial-operations-engine";
import { recordEfoeAudit } from "./audit-integration";
import { getEfoePorts } from "./composition";
import { appendEfoeTimelineEntry } from "./financial-timeline-registry";

export function registerEfoeAdjustment(
  input: Omit<EfoeAdjustment, "id" | "createdOn">,
): EfoeAdjustment {
  const duplicate = getEfoePorts().adjustments.findByCode(input.adjustmentCode);
  if (duplicate) throw new Error(`EFOE: adjustment code "${input.adjustmentCode}" already exists.`);

  const adjustment: EfoeAdjustment = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getEfoePorts().adjustments.save(adjustment);
  recordEfoeAudit({
    entityId: adjustment.id,
    entityType: "adjustment",
    action: "created",
    actorId: input.createdBy,
    remarks: `Adjustment ${adjustment.adjustmentCode}`,
  });
  appendEfoeTimelineEntry({
    transactionRef: adjustment.transactionRef,
    eventType: "adjustment_applied",
    title: "Adjustment Applied",
    description: `${adjustment.adjustmentType}: ${adjustment.amount}`,
    actorId: input.createdBy,
  });

  return adjustment;
}
