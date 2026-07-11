/**
 * EFOE revenue registry.
 */

import type { EfoeRevenueEvent } from "@/types/enterprise-financial-operations-engine";
import { recordEfoeAudit } from "./audit-integration";
import { getEfoePorts } from "./composition";
import { appendEfoeTimelineEntry } from "./financial-timeline-registry";

export function registerEfoeRevenueEvent(
  input: Omit<EfoeRevenueEvent, "id" | "createdOn">,
): EfoeRevenueEvent {
  const duplicate = getEfoePorts().revenueEvents.findByCode(input.eventCode);
  if (duplicate) throw new Error(`EFOE: revenue event code "${input.eventCode}" already exists.`);

  const event: EfoeRevenueEvent = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getEfoePorts().revenueEvents.save(event);
  recordEfoeAudit({
    entityId: event.id,
    entityType: "revenue_event",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered revenue event ${event.eventCode}`,
  });
  appendEfoeTimelineEntry({
    transactionRef: event.transactionRef,
    eventType: "revenue_event",
    title: "Revenue Event",
    description: `Revenue event ${event.eventCode} registered`,
    actorId: input.createdBy,
  });

  return event;
}

export function listEfoeRevenueEvents(transactionRef?: string): EfoeRevenueEvent[] {
  return transactionRef
    ? getEfoePorts().revenueEvents.listByTransaction(transactionRef)
    : getEfoePorts().revenueEvents.list();
}
