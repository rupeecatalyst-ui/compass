/**
 * CO-ORG-003 — Session EAR cache (Soft Go-Live + hydrate buffer).
 * Durable SSOT is Prisma `EnterpriseActivityEvent` when persistence mode = prisma.
 */

import type { EnterpriseActivityEvent } from "@/types/enterprise-activity-registry";

const events = new Map<string, EnterpriseActivityEvent>();
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

export function rememberEarEvent(row: EnterpriseActivityEvent): EnterpriseActivityEvent {
  events.set(row.id, row);
  notify();
  return row;
}

export function rememberEarEvents(rows: EnterpriseActivityEvent[]): void {
  for (const row of rows) events.set(row.id, row);
  notify();
}

export function listSessionEarEvents(): EnterpriseActivityEvent[] {
  return [...events.values()].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}

export function listSessionEarByOpportunity(opportunityId: string): EnterpriseActivityEvent[] {
  return listSessionEarEvents().filter((e) => e.opportunityId === opportunityId);
}

export function listSessionEarByDeal(dealId: string): EnterpriseActivityEvent[] {
  return listSessionEarEvents().filter((e) => e.dealId === dealId);
}

export function subscribeEarUpdated(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearSessionEarRegistry(): void {
  events.clear();
  notify();
}
