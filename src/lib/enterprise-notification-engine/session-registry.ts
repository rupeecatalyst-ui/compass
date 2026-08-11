/**
 * CO-NOTIFICATION-001 — Soft Go-Live / client session notification registry.
 */

import type { EnterpriseNotificationItem } from "@/types/enterprise-notification-engine";

const byId = new Map<string, EnterpriseNotificationItem>();
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

export function rememberEneNotification(
  row: EnterpriseNotificationItem,
): EnterpriseNotificationItem {
  const existing = byId.get(row.id);
  if (existing && existing.dedupeKey === row.dedupeKey) {
    byId.set(row.id, { ...existing, ...row });
  } else {
    // Dedupe by key across soft registry
    for (const [id, item] of byId) {
      if (item.dedupeKey === row.dedupeKey) {
        byId.delete(id);
        break;
      }
    }
    byId.set(row.id, row);
  }
  notify();
  return byId.get(row.id)!;
}

export function rememberEneNotifications(rows: EnterpriseNotificationItem[]): void {
  for (const row of rows) rememberEneNotification(row);
}

export function listSessionEneForUser(
  userId: string,
  opts?: { unreadOnly?: boolean; limit?: number; since?: string },
): EnterpriseNotificationItem[] {
  const sinceMs = opts?.since ? new Date(opts.since).getTime() : 0;
  let rows = [...byId.values()].filter(
    (n) => n.recipientKind === "user" && n.recipientUserId === userId,
  );
  if (opts?.unreadOnly) rows = rows.filter((n) => n.readState === "UNREAD");
  if (sinceMs) rows = rows.filter((n) => new Date(n.occurredAt).getTime() > sinceMs);
  rows.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
  return rows.slice(0, opts?.limit ?? 40);
}

export function listSessionEneForPartner(
  partnerId: string,
  opts?: { unreadOnly?: boolean; limit?: number },
): EnterpriseNotificationItem[] {
  let rows = [...byId.values()].filter(
    (n) => n.recipientKind === "partner" && n.recipientPartnerId === partnerId,
  );
  if (opts?.unreadOnly) rows = rows.filter((n) => n.readState === "UNREAD");
  rows.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
  return rows.slice(0, opts?.limit ?? 40);
}

export function markSessionEneRead(id: string, userId?: string): EnterpriseNotificationItem | null {
  const row = byId.get(id);
  if (!row) return null;
  if (userId && row.recipientUserId && row.recipientUserId !== userId) return null;
  const next: EnterpriseNotificationItem = {
    ...row,
    readState: "READ",
    readAt: new Date().toISOString(),
  };
  byId.set(id, next);
  notify();
  return next;
}

export function subscribeEneUpdated(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearSessionEneRegistry(): void {
  byId.clear();
  notify();
}
