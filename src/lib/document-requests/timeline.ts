/**
 * Document Requests → Opportunity Timeline (EDC) — auditability for BAT.
 * Does not modify ENCE; append-only dialogue timeline only.
 */

import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
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
};

export function appendDocumentRequestTimeline(input: {
  opportunityId: string;
  kind: DocumentRequestCommKind;
  actor: string;
  detail?: string;
  opportunityReference?: string;
}): void {
  if (!input.opportunityId.trim()) return;
  try {
    appendEdcTimelineEntry({
      contextRef: { type: "opportunity", id: input.opportunityId },
      eventType:
        input.kind === "customer_uploaded" || input.kind === "verification_completed"
          ? "document_upload"
          : input.kind === "email_sent" ||
              input.kind === "whatsapp_sent" ||
              input.kind === "reminder_sent"
            ? "email"
            : "progress",
      title: TITLE[input.kind] ?? input.kind,
      description: [
        input.opportunityReference ? `Ref ${input.opportunityReference}` : null,
        input.detail,
        `Actor: ${input.actor}`,
      ]
        .filter(Boolean)
        .join(" · "),
      actorId: input.actor,
      expandablePayload: {
        source: "document_requests",
        kind: input.kind,
        opportunityReference: input.opportunityReference,
      },
    });
  } catch {
    // Timeline must never block Document Requests workflow.
  }
}
