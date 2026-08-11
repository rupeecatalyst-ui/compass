/**
 * CO-ORG-003 — Enterprise Activity Registry constants.
 */

import type {
  EnterpriseActivityEventKind,
  EnterpriseActivitySourceSystem,
} from "@/types/enterprise-activity-registry";

export const EAR_EVENT_KINDS = {
  OPPORTUNITY: "opportunity",
  DIALOGUE: "dialogue",
  TASKS: "tasks",
  DOCUMENTS: "documents",
  STAGE_CHANGE: "stage_change",
  NOTES: "notes",
  COMMUNICATIONS: "communications",
  WORKFLOW: "workflow",
  CHANAKYA: "chanakya",
  MISSION_CONTROL: "mission_control",
} as const satisfies Record<string, EnterpriseActivityEventKind>;

export const EAR_SOURCE_SYSTEMS = {
  EDC: "edc",
  ECIE: "ecie",
  ETE: "ete",
  DEAL_TIMELINE: "deal_timeline",
  DEAL_ACTIVITY: "deal_activity",
  DOCUMENT: "document",
  DOCUMENT_REQUEST: "document_request",
  OPPORTUNITY: "opportunity",
  OUTBOX: "outbox",
  CHANAKYA: "chanakya",
  MISSION_CONTROL: "mission_control",
  ORG: "org",
  PARTNER: "partner",
  WORKFLOW: "workflow",
  MANUAL: "manual",
  BUSINESS_NOTES: "business_notes",
} as const satisfies Record<string, EnterpriseActivitySourceSystem>;

/** Map EDC event types → EAR event kinds. */
export function mapEdcEventTypeToEarKind(
  eventType: string,
): EnterpriseActivityEventKind {
  switch (eventType) {
    case "stage_change":
    case "sub_stage_change":
      return EAR_EVENT_KINDS.STAGE_CHANGE;
    case "task":
      return EAR_EVENT_KINDS.TASKS;
    case "document_upload":
    case "document_verification":
      return EAR_EVENT_KINDS.DOCUMENTS;
    case "email":
    case "notification":
      return EAR_EVENT_KINDS.COMMUNICATIONS;
    case "conversation_activity":
      return EAR_EVENT_KINDS.NOTES;
    case "internal_message":
      return EAR_EVENT_KINDS.DIALOGUE;
    case "workflow":
    case "progress":
      return EAR_EVENT_KINDS.WORKFLOW;
    default:
      return EAR_EVENT_KINDS.DIALOGUE;
  }
}

export const EAR_API_PATH = "/api/enterprise-activity";
