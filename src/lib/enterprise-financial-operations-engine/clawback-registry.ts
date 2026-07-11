/**
 * EFOE clawback registry — configuration-driven clawback strategies.
 */

import type { EfoeClawback } from "@/types/enterprise-financial-operations-engine";
import { recordEfoeAudit } from "./audit-integration";
import { getEfoePorts } from "./composition";
import { appendEfoeTimelineEntry } from "./financial-timeline-registry";
import { validateEfoeClawback } from "./validation-engine";

export function registerEfoeClawback(
  input: Omit<EfoeClawback, "id" | "createdOn" | "status">,
): EfoeClawback {
  const clawback: EfoeClawback = {
    ...input,
    id: crypto.randomUUID(),
    status: "pending",
    createdOn: new Date().toISOString(),
  };

  const validation = validateEfoeClawback(clawback);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEfoePorts().clawbacks.save(clawback);
  recordEfoeAudit({
    entityId: clawback.id,
    entityType: "clawback",
    action: "created",
    actorId: input.createdBy,
    remarks: `Clawback ${clawback.clawbackCode} — strategy: ${clawback.strategy}`,
  });
  appendEfoeTimelineEntry({
    transactionRef: clawback.transactionRef,
    eventType: "clawback_applied",
    title: "Clawback Applied",
    description: `Clawback ${clawback.clawbackCode}: ${clawback.amount} (${clawback.strategy})`,
    actorId: input.createdBy,
  });

  return clawback;
}

export function applyEfoeClawback(clawbackId: string): EfoeClawback | undefined {
  const clawback = getEfoePorts().clawbacks.findById(clawbackId);
  if (!clawback) return undefined;

  const updated: EfoeClawback = { ...clawback, status: "applied" };
  getEfoePorts().clawbacks.save(updated);
  return updated;
}
