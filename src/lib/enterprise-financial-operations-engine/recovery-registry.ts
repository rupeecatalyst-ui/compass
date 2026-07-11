/**
 * EFOE recovery registry — clawback recovery and write-offs.
 */

import type { EfoeRecovery, EfoeWriteOff } from "@/types/enterprise-financial-operations-engine";
import { recordEfoeAudit } from "./audit-integration";
import { getEfoePorts } from "./composition";
import { appendEfoeTimelineEntry } from "./financial-timeline-registry";
import { validateEfoeRecovery } from "./validation-engine";

export function recordEfoeRecovery(
  input: Omit<EfoeRecovery, "id" | "recoveredOn" | "createdOn">,
): EfoeRecovery {
  const clawback = getEfoePorts().clawbacks.findById(input.clawbackId);
  if (!clawback) throw new Error(`EFOE: clawback "${input.clawbackId}" not found.`);

  const recovery: EfoeRecovery = {
    ...input,
    id: crypto.randomUUID(),
    recoveredOn: new Date().toISOString(),
    createdOn: new Date().toISOString(),
  };

  const validation = validateEfoeRecovery(recovery, clawback);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEfoePorts().recoveries.save(recovery);

  const totalRecovered = getEfoePorts()
    .recoveries.listByClawback(clawback.id)
    .reduce((sum, r) => sum + r.amount, 0);
  if (totalRecovered >= clawback.amount) {
    getEfoePorts().clawbacks.save({ ...clawback, status: "recovered" });
  }

  recordEfoeAudit({
    entityId: recovery.id,
    entityType: "recovery",
    action: "created",
    actorId: input.createdBy,
    remarks: `Recovery ${recovery.recoveryCode}: ${recovery.amount}`,
  });
  appendEfoeTimelineEntry({
    transactionRef: clawback.transactionRef,
    eventType: "recovery_recorded",
    title: "Recovery Recorded",
    description: `Recovery of ${recovery.amount} for clawback ${clawback.clawbackCode}`,
    actorId: input.createdBy,
  });

  return recovery;
}

export function registerEfoeWriteOff(
  input: Omit<EfoeWriteOff, "id" | "writtenOffOn" | "createdOn">,
): EfoeWriteOff {
  const clawback = getEfoePorts().clawbacks.findById(input.clawbackId);
  if (!clawback) throw new Error(`EFOE: clawback "${input.clawbackId}" not found.`);

  const writeOff: EfoeWriteOff = {
    ...input,
    id: crypto.randomUUID(),
    writtenOffOn: new Date().toISOString(),
    createdOn: new Date().toISOString(),
  };

  getEfoePorts().writeOffs.save(writeOff);
  getEfoePorts().clawbacks.save({ ...clawback, status: "written_off" });

  recordEfoeAudit({
    entityId: writeOff.id,
    entityType: "recovery",
    action: "created",
    actorId: input.createdBy,
    remarks: `Write-off ${writeOff.writeOffCode}: ${writeOff.amount}`,
  });

  return writeOff;
}
