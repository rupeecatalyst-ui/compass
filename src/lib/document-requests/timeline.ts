/**
 * Document Requests → Opportunity Timeline (EDC) + first-class EAR write.
 * Document Registry remains SSOT for requirements/status.
 * EAR remains SSOT for chronological business activity.
 * EDC remains the dialogue/timeline projection (not an activity store).
 */

import {
  EAR_EVENT_KINDS,
  EAR_SOURCE_SYSTEMS,
} from "@/constants/enterprise-activity-registry";
import { emitEnterpriseActivity } from "@/lib/enterprise-activity-registry/api-client";
import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import type { EnterpriseActivityEventKind } from "@/types/enterprise-activity-registry";
import type { DocumentRequestCommKind } from "@/types/document-requests";

const TITLE: Record<DocumentRequestCommKind, string> = {
  lod_generated: "LOD Generated",
  lod_regenerated: "Regenerated LOD",
  email_sent: "Email Sent",
  whatsapp_sent: "WhatsApp Sent",
  reminder_sent: "Reminder Sent",
  customer_uploaded: "Customer Uploaded Document",
  verification_completed: "Verification Completed",
  link_regenerated: "Upload Link Regenerated",
  upload_link_generated: "Upload Link Generated",
  custom_requirement_added: "Custom Document Requirement Added",
};

function earKindFor(kind: DocumentRequestCommKind): EnterpriseActivityEventKind {
  switch (kind) {
    case "email_sent":
    case "whatsapp_sent":
    case "reminder_sent":
      return EAR_EVENT_KINDS.COMMUNICATIONS;
    case "customer_uploaded":
    case "verification_completed":
    case "lod_generated":
    case "lod_regenerated":
    case "link_regenerated":
    case "upload_link_generated":
    case "custom_requirement_added":
      return EAR_EVENT_KINDS.DOCUMENTS;
    default:
      return EAR_EVENT_KINDS.WORKFLOW;
  }
}

function edcEventTypeFor(kind: DocumentRequestCommKind) {
  if (kind === "customer_uploaded" || kind === "verification_completed") {
    return "document_upload" as const;
  }
  if (kind === "email_sent" || kind === "whatsapp_sent" || kind === "reminder_sent") {
    return "email" as const;
  }
  return "progress" as const;
}

export function appendDocumentRequestTimeline(input: {
  opportunityId: string;
  kind: DocumentRequestCommKind;
  actor: string;
  detail?: string;
  opportunityReference?: string;
  sourceEventId?: string;
  occurredAt?: string;
  dealId?: string | null;
}): void {
  const opportunityId = input.opportunityId.trim();
  if (!opportunityId) return;

  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const title = TITLE[input.kind] ?? input.kind;
  const summary = [
    input.opportunityReference ? `Ref ${input.opportunityReference}` : null,
    input.detail,
    `Actor: ${input.actor}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const sourceEventId =
    input.sourceEventId?.trim() ||
    `document_request:${opportunityId}:${input.kind}:${occurredAt}`;

  try {
    appendEdcTimelineEntry({
      contextRef: { type: "opportunity", id: opportunityId },
      eventType: edcEventTypeFor(input.kind),
      title,
      description: summary,
      actorId: input.actor,
      occurredOn: occurredAt,
      expandablePayload: {
        source: "document_requests",
        kind: input.kind,
        opportunityReference: input.opportunityReference,
        earSourceEventId: sourceEventId,
      },
    });
  } catch {
    // Timeline must never block Document Requests workflow.
  }

  void emitEnterpriseActivity({
    eventKind: earKindFor(input.kind),
    sourceSystem: EAR_SOURCE_SYSTEMS.DOCUMENT_REQUEST,
    sourceEventId,
    title,
    summary,
    payload: {
      contextType: "opportunity",
      contextId: opportunityId,
      kind: input.kind,
      opportunityReference: input.opportunityReference ?? null,
      source: "document_requests",
    },
    opportunityId,
    dealId: input.dealId?.trim() || null,
    actorName: input.actor,
    occurredAt,
  });
}
