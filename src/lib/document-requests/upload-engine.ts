/**
 * Customer Portal upload engine — single ingestion channel into Enterprise Document Registry.
 * Updates Document Requests, Opportunity timeline, and RM notification simulation.
 * CO-DOC-ARCH-001 — DIRECT channel → uploadSource customer_portal (same Document SSOT).
 */

import { toDocumentUploadSource } from "@/constants/document-intake";
import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import { simulateEnceCommunication } from "@/lib/enterprise-notification-communication-engine";
import {
  uploadDocumentToRegistry,
  validateDocumentFile,
} from "@/lib/document-registry";
import { appendUploadSessionAudit } from "@/lib/document-requests/session-audit";
import { runCustomerPortalVirusScan } from "@/lib/document-requests/virus-scan-hook";
import { recordCustomerPortalUpload } from "@/lib/document-requests/store";
import type { DocumentRequestItemState, DocumentRequestUploadSession } from "@/types/document-requests";
import type { DocumentRegistryRecord } from "@/types/document-registry";

const DIRECT_UPLOAD_SOURCE = toDocumentUploadSource("DIRECT");

export type CustomerPortalUploadResult =
  | { ok: true; record: DocumentRegistryRecord; replaced: boolean }
  | { ok: false; reason: string };

function notifyStakeholders(input: {
  session: DocumentRequestUploadSession;
  documentLabel: string;
  replaced: boolean;
}) {
  const title = input.replaced
    ? `Customer replaced: ${input.documentLabel}`
    : `Customer uploaded: ${input.documentLabel}`;
  const description = `${input.session.customerName} submitted ${input.documentLabel} via secure Customer Portal for ${input.session.opportunityReference}.`;

  appendEdcTimelineEntry({
    contextRef: { type: "opportunity", id: input.session.opportunityId },
    eventType: "document_upload",
    title,
    description,
    actorId: "customer-portal",
    expandablePayload: {
      source: "customer_portal",
      opportunityReference: input.session.opportunityReference,
      documentLabel: input.documentLabel,
    },
  });

  const recipients = [
    input.session.rmName || "Relationship Manager",
    input.session.operationsUserName,
  ].filter(Boolean) as string[];

  for (const recipient of recipients) {
    try {
      simulateEnceCommunication({
        channel: "in_app",
        recipientRef: `rm:${recipient}`,
        contextRef: `opportunity:${input.session.opportunityReference}`,
        templateRef: "customer-portal-document-uploaded",
        payload: {
          title,
          description,
          opportunityReference: input.session.opportunityReference,
          documentLabel: input.documentLabel,
          notify: ["relationship_manager", "operations", "timeline"],
          futureReady: ["chanakya", "saarthi", "email", "whatsapp", "push"],
        },
        simulatedBy: "customer-portal-upload-engine",
      });
    } catch {
      // ENCE simulation must never block customer upload.
    }
  }
}

export async function ingestCustomerPortalDocument(input: {
  session: DocumentRequestUploadSession;
  item: DocumentRequestItemState;
  file: File;
  mode: "upload" | "replace";
}): Promise<CustomerPortalUploadResult> {
  const { session, item, file, mode } = input;

  appendUploadSessionAudit({
    token: session.token,
    opportunityId: session.opportunityId,
    action: mode === "replace" ? "replace_started" : "upload_started",
    detail: item.label,
  });

  const validation = validateDocumentFile(file);
  if (!validation.ok) {
    appendUploadSessionAudit({
      token: session.token,
      opportunityId: session.opportunityId,
      action: "upload_failed",
      detail: validation.reason,
    });
    return { ok: false, reason: validation.reason };
  }

  const scan = await runCustomerPortalVirusScan(file);
  if (!scan.ok) {
    appendUploadSessionAudit({
      token: session.token,
      opportunityId: session.opportunityId,
      action: "upload_failed",
      detail: scan.reason,
    });
    return { ok: false, reason: scan.reason };
  }

  try {
    const uploaded = await uploadDocumentToRegistry({
      file,
      typeRef: item.typeRef,
      categoryLabel: item.label,
      uploadedBy: session.customerName || "Customer",
      uploadSource: DIRECT_UPLOAD_SOURCE,
      links: {
        opportunityId: session.opportunityId,
        documentScope: "shared",
      },
      replaceRecordId: mode === "replace" ? item.registryRecordId : item.registryRecordId,
    });

    recordCustomerPortalUpload(
      session.opportunityId,
      item.typeRef,
      uploaded.record.id,
      session.customerName || "Customer",
      session.opportunityReference,
    );

    notifyStakeholders({
      session,
      documentLabel: item.label,
      replaced: mode === "replace" || uploaded.isNewVersion,
    });

    appendUploadSessionAudit({
      token: session.token,
      opportunityId: session.opportunityId,
      action: "upload_completed",
      detail: `${item.label} → ${uploaded.record.id}`,
    });

    return {
      ok: true,
      record: uploaded.record,
      replaced: mode === "replace" || uploaded.isNewVersion,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Upload failed.";
    appendUploadSessionAudit({
      token: session.token,
      opportunityId: session.opportunityId,
      action: "upload_failed",
      detail: reason,
    });
    return { ok: false, reason };
  }
}
