/**
 * CO-NOTIFICATION-001 / CO-PRODUCTION-UX-STABILIZATION-013
 * Browser-session toast presentation memory + presentation-only queue ordering.
 * Does NOT mutate notification registry read state or unread counts.
 */

import { ENE_EVENT_TYPES } from "@/constants/enterprise-notification-engine";
import type { EnterpriseNotificationItem } from "@/types/enterprise-notification-engine";

export const ENE_TOAST_PRESENTED_IDS_KEY = "ene.toast.presentedIds";
const MAX_PRESENTED_IDS = 500;

/** Higher = sooner in the live toast queue (presentation only). */
export function toastPresentationPriority(
  eventType: string | null | undefined,
): number {
  switch (eventType) {
    case ENE_EVENT_TYPES.TRANSACTION_EMAIL_FAILED:
    case ENE_EVENT_TYPES.TASK_DUE:
    case ENE_EVENT_TYPES.IMPORTANT_WORKFLOW_ACTION:
      return 100;
    case ENE_EVENT_TYPES.APPROVAL_RECEIVED:
    case ENE_EVENT_TYPES.DISBURSEMENT:
    case ENE_EVENT_TYPES.DOCUMENT_REQUESTED:
      return 80;
    case ENE_EVENT_TYPES.TASK_ASSIGNED:
    case ENE_EVENT_TYPES.DEAL_STAGE_CHANGED:
    case ENE_EVENT_TYPES.DOCUMENT_UPLOADED:
    case ENE_EVENT_TYPES.CUSTOMER_EMAIL_RECEIVED:
    case ENE_EVENT_TYPES.CUSTOMER_EMAIL_ATTACHMENT_RECEIVED:
    case ENE_EVENT_TYPES.MARKETING_QUALIFIED_HANDOFF:
      return 60;
    case ENE_EVENT_TYPES.DEAL_CREATED:
    case ENE_EVENT_TYPES.OPPORTUNITY_CREATED:
    case ENE_EVENT_TYPES.CONTACT_CREATED:
      return 40;
    case ENE_EVENT_TYPES.TRANSACTION_EMAIL_SENT:
      return 20;
    default:
      return 30;
  }
}

export function loadPresentedToastIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(ENE_TOAST_PRESENTED_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

export function rememberPresentedToastId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const set = loadPresentedToastIds();
    set.add(id);
    const trimmed = [...set].slice(-MAX_PRESENTED_IDS);
    sessionStorage.setItem(ENE_TOAST_PRESENTED_IDS_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}

/** Priority (desc) then newest-first — presentation queue order only. */
export function sortNotificationsForToastQueue<
  T extends Pick<EnterpriseNotificationItem, "eventType" | "occurredAt" | "id">,
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const pri =
      toastPresentationPriority(b.eventType) -
      toastPresentationPriority(a.eventType);
    if (pri !== 0) return pri;
    const byTime =
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
    if (byTime !== 0) return byTime;
    return a.id.localeCompare(b.id);
  });
}

/** @deprecated Prefer sortNotificationsForToastQueue (includes severity order). */
export function sortNotificationsNewestFirst(
  items: EnterpriseNotificationItem[],
): EnterpriseNotificationItem[] {
  return sortNotificationsForToastQueue(items);
}
