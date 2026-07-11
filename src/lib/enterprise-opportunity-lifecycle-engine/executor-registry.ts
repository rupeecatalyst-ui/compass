/**
 * EOLE executor registry — executor assignment with history preservation.
 */

import type { EoleOpportunityExecutor } from "@/types/enterprise-opportunity-lifecycle-engine";
import { recordEoleAudit } from "./audit-integration";
import { getEolePorts } from "./composition";
import { appendEoleTimelineEntry } from "./timeline-registry";
import { validateEoleExecutor } from "./validation-engine";

export function assignEoleExecutor(
  input: Omit<EoleOpportunityExecutor, "id" | "active" | "assignedOn" | "unassignedOn">,
): EoleOpportunityExecutor {
  const executor: EoleOpportunityExecutor = {
    ...input,
    id: crypto.randomUUID(),
    active: true,
    assignedOn: new Date().toISOString(),
  };

  const validation = validateEoleExecutor(executor, getEolePorts().executors.list());
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEolePorts().executors.save(executor);
  recordEoleAudit({
    entityId: executor.id,
    entityType: "executor",
    action: "assigned",
    actorId: input.assignedBy,
    remarks: `Executor ${executor.executorRef} assigned as ${executor.executorRole}`,
  });
  appendEoleTimelineEntry({
    opportunityId: input.opportunityId,
    eventType: "executor_changed",
    title: "Executor Assigned",
    description: `${executor.executorRef} assigned as ${executor.executorRole}`,
    actorId: input.assignedBy,
  });

  return executor;
}

export function unassignEoleExecutor(input: {
  executorId: string;
  unassignedBy: string;
}): EoleOpportunityExecutor {
  const executor = getEolePorts().executors.list().find((e) => e.id === input.executorId);
  if (!executor) throw new Error(`EOLE: executor "${input.executorId}" not found.`);

  const updated: EoleOpportunityExecutor = {
    ...executor,
    active: false,
    unassignedOn: new Date().toISOString(),
  };

  getEolePorts().executors.save(updated);
  recordEoleAudit({
    entityId: updated.id,
    entityType: "executor",
    action: "modified",
    actorId: input.unassignedBy,
    remarks: `Executor ${updated.executorRef} unassigned`,
  });
  appendEoleTimelineEntry({
    opportunityId: updated.opportunityId,
    eventType: "executor_changed",
    title: "Executor Unassigned",
    description: `${updated.executorRef} removed from active executors`,
    actorId: input.unassignedBy,
  });

  return updated;
}

export function listEoleActiveExecutors(opportunityId: string): EoleOpportunityExecutor[] {
  return getEolePorts().executors.listActiveByOpportunity(opportunityId);
}

export function listEoleExecutorHistory(opportunityId: string): EoleOpportunityExecutor[] {
  return getEolePorts().executors.listByOpportunity(opportunityId);
}
