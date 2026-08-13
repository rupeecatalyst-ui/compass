/**
 * CO-NOTIFICATION-001 — Enterprise Notification Engine constants.
 */

import type { EnterpriseNotificationEventType } from "@/types/enterprise-notification-engine";

export const ENE_API_PATH = "/api/enterprise-notifications";
export const ENE_PREFS_API_PATH = "/api/enterprise-notifications/preferences";

/** Approved Product Owner chime (public asset). */
export const ENE_CHIME_PUBLIC_PATH = "/sounds/catalyst_one_notification_chime.wav";

export const ENE_TOAST_AUTO_DISMISS_MS = 10_000;
export const ENE_POLL_INTERVAL_MS = 25_000;
export const ENE_SOUND_THROTTLE_MS = 2_500;
export const ENE_MAX_STACK = 5;

export const ENE_EVENT_TYPES = {
  CONTACT_CREATED: "CONTACT_CREATED",
  OPPORTUNITY_CREATED: "OPPORTUNITY_CREATED",
  DEAL_CREATED: "DEAL_CREATED",
  DEAL_STAGE_CHANGED: "DEAL_STAGE_CHANGED",
  DOCUMENT_REQUESTED: "DOCUMENT_REQUESTED",
  DOCUMENT_UPLOADED: "DOCUMENT_UPLOADED",
  APPROVAL_RECEIVED: "APPROVAL_RECEIVED",
  DISBURSEMENT: "DISBURSEMENT",
  TASK_ASSIGNED: "TASK_ASSIGNED",
  TASK_DUE: "TASK_DUE",
  IMPORTANT_WORKFLOW_ACTION: "IMPORTANT_WORKFLOW_ACTION",
  MARKETING_QUALIFIED_HANDOFF: "MARKETING_QUALIFIED_HANDOFF",
} as const satisfies Record<string, EnterpriseNotificationEventType>;

export const ENE_SOURCE_SYSTEMS = {
  OPPORTUNITY: "opportunity",
  DEAL: "deal",
  DEAL_TIMELINE: "deal_timeline",
  DOCUMENT: "document",
  DOCUMENT_REQUEST: "document_request",
  ETE: "ete",
  WORKFLOW: "workflow",
  CONTACT: "contact",
  MARKETING: "marketing",
  MANUAL: "manual",
} as const;

export const ENE_SOUND_PREF_STORAGE_KEY = "ene.notification.soundEnabled";
export const ENE_TAB_CHANNEL = "ene-notification-bus-v1";
export const ENE_SOUND_LOCK_KEY = "ene.notification.sound.lock";

export function eneEventTitle(eventType: string): string {
  switch (eventType) {
    case ENE_EVENT_TYPES.CONTACT_CREATED:
      return "New Contact";
    case ENE_EVENT_TYPES.OPPORTUNITY_CREATED:
      return "New Opportunity";
    case ENE_EVENT_TYPES.DEAL_CREATED:
      return "New Deal";
    case ENE_EVENT_TYPES.DEAL_STAGE_CHANGED:
      return "Deal Stage Changed";
    case ENE_EVENT_TYPES.DOCUMENT_REQUESTED:
      return "Document Requested";
    case ENE_EVENT_TYPES.DOCUMENT_UPLOADED:
      return "Document Uploaded";
    case ENE_EVENT_TYPES.APPROVAL_RECEIVED:
      return "Approval Received";
    case ENE_EVENT_TYPES.DISBURSEMENT:
      return "Disbursement";
    case ENE_EVENT_TYPES.TASK_ASSIGNED:
      return "Task Assigned";
    case ENE_EVENT_TYPES.TASK_DUE:
      return "Task Due";
    case ENE_EVENT_TYPES.MARKETING_QUALIFIED_HANDOFF:
      return "Marketing qualified response";
    default:
      return "Workflow Update";
  }
}

export function buildEneDedupeKey(input: {
  eventType: string;
  sourceEventId: string;
  recipientKind: string;
  recipientId: string;
}): string {
  return `${input.eventType}:${input.sourceEventId}:${input.recipientKind}:${input.recipientId}`;
}
