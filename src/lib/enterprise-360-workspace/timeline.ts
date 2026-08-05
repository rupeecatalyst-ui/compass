/**
 * CO-360-001 — Timeline / audit helpers (append-only event shapes).
 */

import { ENTERPRISE_360_TIMELINE_EVENT_TYPES } from "@/constants/enterprise-360-workspace";
import type {
  Enterprise360AuditEntry,
  Enterprise360TimelineEvent,
} from "@/types/enterprise-360-workspace";

export type Enterprise360TimelineEventType =
  (typeof ENTERPRISE_360_TIMELINE_EVENT_TYPES)[number];

export function createEnterprise360TimelineEvent(input: {
  event: Enterprise360TimelineEventType | string;
  actorUserId?: string | null;
  detail?: string | null;
  at?: string;
}): Enterprise360TimelineEvent {
  return {
    id: `tl360_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    event: input.event,
    at: input.at ?? new Date().toISOString(),
    actorUserId: input.actorUserId ?? null,
    detail: input.detail ?? null,
  };
}

export function createEnterprise360AuditEntry(input: {
  action: string;
  userId?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  at?: string;
}): Enterprise360AuditEntry {
  return {
    id: `aud360_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    userId: input.userId ?? null,
    at: input.at ?? new Date().toISOString(),
    action: input.action,
    oldValue: input.oldValue ?? null,
    newValue: input.newValue ?? null,
  };
}
