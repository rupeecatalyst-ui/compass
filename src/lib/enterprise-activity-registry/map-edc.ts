/**
 * CO-ORG-003 — Map EAR ↔ EDC timeline projection (EDC is no longer activity SSOT).
 */

import { mapEdcEventTypeToEarKind } from "@/constants/enterprise-activity-registry";
import type { EnterpriseActivityEvent } from "@/types/enterprise-activity-registry";
import type {
  EdcContextType,
  EdcEventType,
  EdcTimelineEntry,
} from "@/types/enterprise-dialogue-center";

export function mapEdcEntryToEarEmit(entry: EdcTimelineEntry) {
  const contextType = entry.contextRef.type;
  const contextId = entry.contextRef.id;
  return {
    eventKind: mapEdcEventTypeToEarKind(entry.eventType),
    sourceSystem: "edc" as const,
    sourceEventId: entry.id,
    title: entry.title,
    summary: entry.description,
    payload: {
      edcEventType: entry.eventType,
      contextType,
      contextId,
      expandablePayload: entry.expandablePayload ?? null,
      historicalReference: entry.historicalReference ?? false,
    },
    opportunityId: contextType === "opportunity" ? contextId : null,
    dealId: contextType === "deal" ? contextId : null,
    contactId:
      contextType === "contact" || contextType === "customer" ? contextId : null,
    taskId: contextType === "task" ? contextId : null,
    documentId:
      typeof entry.expandablePayload?.documentId === "string"
        ? entry.expandablePayload.documentId
        : null,
    actorUserId: entry.actorId || null,
    occurredAt: entry.occurredOn,
  };
}

function asEdcEventType(kind: string, payload: Record<string, unknown> | null): EdcEventType {
  const fromPayload = payload?.edcEventType;
  if (typeof fromPayload === "string") return fromPayload as EdcEventType;
  switch (kind) {
    case "stage_change":
      return "stage_change";
    case "tasks":
      return "task";
    case "documents":
      return "document_upload";
    case "communications":
      return "email";
    case "notes":
      return "conversation_activity";
    case "workflow":
      return "workflow";
    case "dialogue":
      return "internal_message";
    default:
      return "progress";
  }
}

function asContextType(event: EnterpriseActivityEvent): EdcContextType {
  const payloadType = event.payload?.contextType;
  if (typeof payloadType === "string") return payloadType as EdcContextType;
  if (event.opportunityId) return "opportunity";
  if (event.dealId) return "deal";
  if (event.contactId) return "contact";
  if (event.taskId) return "task";
  return "opportunity";
}

function asContextId(event: EnterpriseActivityEvent): string {
  const payloadId = event.payload?.contextId;
  if (typeof payloadId === "string") return payloadId;
  return (
    event.opportunityId ??
    event.dealId ??
    event.contactId ??
    event.taskId ??
    event.id
  );
}

export function mapEarEventToEdcEntry(event: EnterpriseActivityEvent): EdcTimelineEntry {
  return {
    id: event.sourceEventId ?? event.id,
    contextRef: {
      type: asContextType(event),
      id: asContextId(event),
    },
    eventType: asEdcEventType(event.eventKind, event.payload),
    title: event.title,
    description: event.summary ?? "",
    actorId: event.actorUserId ?? "system",
    occurredOn: event.occurredAt,
    expandablePayload: {
      ...(event.payload ?? {}),
      earEventId: event.id,
      sourceSystem: event.sourceSystem,
      eventKind: event.eventKind,
    },
  };
}
