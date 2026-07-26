/**
 * CO-OPS-002 — In-process ring buffers for ops diagnostics.
 * Process-local (Vercel instance). Not a durable store — sufficient for live ops windows.
 */

import type {
  OpsBusinessAuditEvent,
  OpsErrorSample,
  OpsPerfSample,
} from "@/types/ops-observability";

const MAX = 400;

const audits: OpsBusinessAuditEvent[] = [];
const errors: OpsErrorSample[] = [];
const perf: OpsPerfSample[] = [];
const recentUserIds = new Map<string, number>();

function pushFront<T>(buf: T[], item: T, max = MAX): void {
  buf.unshift(item);
  if (buf.length > max) buf.length = max;
}

export function pushAudit(event: OpsBusinessAuditEvent): void {
  pushFront(audits, event);
  if (event.actorUserId) {
    recentUserIds.set(event.actorUserId, Date.now());
  }
}

export function pushError(event: OpsErrorSample): void {
  pushFront(errors, event);
  if (event.userId) recentUserIds.set(event.userId, Date.now());
}

export function pushPerf(event: OpsPerfSample): void {
  pushFront(perf, event);
}

export function listAudits(limit = 50): OpsBusinessAuditEvent[] {
  return audits.slice(0, Math.max(1, Math.min(limit, MAX)));
}

export function listErrors(limit = 50): OpsErrorSample[] {
  return errors.slice(0, Math.max(1, Math.min(limit, MAX)));
}

export function listPerf(limit = 200): OpsPerfSample[] {
  return perf.slice(0, Math.max(1, Math.min(limit, MAX)));
}

/** Distinct actors seen in the last windowMs (default 15m). */
export function estimateActiveUsers(windowMs = 15 * 60_000): number {
  const cutoff = Date.now() - windowMs;
  let n = 0;
  for (const [, at] of recentUserIds) {
    if (at >= cutoff) n += 1;
  }
  return n;
}

export function touchUser(userId: string | null | undefined): void {
  if (!userId) return;
  recentUserIds.set(userId, Date.now());
}
