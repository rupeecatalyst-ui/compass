/**
 * CO-DOC-002 — Sync Document Registry ↔ durable Postgres Opportunity documents.
 */
import { authenticatedJsonFetch, getAccessToken } from "@/lib/api-client";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import type { DocumentRegistryRecord } from "@/types/document-registry";
import { saveDocumentBlob } from "@/lib/document-registry/blob-store";
import {
  getAllDocumentRegistryRecords,
  mergeDurableDocumentsIntoLocalRegistry,
} from "@/lib/document-registry/store";

type Envelope<T> = {
  success: boolean;
  data?: T;
  error?: { message?: string };
};

async function fileToBase64(file: Blob): Promise<string | null> {
  try {
    const buf = await file.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > 4 * 1024 * 1024) return null;
    let binary = "";
    const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  } catch {
    return null;
  }
}

/** Best-effort push of a local registry record to Postgres. */
export async function syncDocumentRecordToServer(
  record: DocumentRegistryRecord,
  opts?: { opportunityNumber?: string | null; contentBlob?: Blob | null },
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!isEnterprisePersistencePrisma()) return;
  if (!getAccessToken()) return;
  const opportunityId = record.links.opportunityId?.trim();
  if (!opportunityId) return;

  let contentBase64: string | null = null;
  if (opts?.contentBlob) {
    contentBase64 = await fileToBase64(opts.contentBlob);
  }

  try {
    await authenticatedJsonFetch("/api/enterprise-transaction-documents", {
      method: "POST",
      body: JSON.stringify({
        opportunityId,
        opportunityNumber: opts?.opportunityNumber ?? null,
        clientRecordId: record.id,
        loanFileId: record.links.loanFileId ?? null,
        contactId: record.links.contactId ?? null,
        customerId: record.links.customerId ?? null,
        participantId: record.links.participantId ?? null,
        lenderId: record.links.lenderId ?? null,
        documentScope: record.links.documentScope ?? "applicant",
        typeRef: record.typeRef,
        categoryLabel: record.categoryLabel,
        originalFilename: record.originalFilename,
        displayName: record.displayName,
        mimeType: record.mimeType,
        fileSizeBytes: record.fileSizeBytes,
        status: record.status,
        uploadSource: record.uploadSource ?? null,
        uploadedBy: record.uploadedBy,
        verifiedAt: record.verifiedAt ?? null,
        verifiedBy: record.verifiedBy ?? null,
        contentBase64,
      }),
    });
  } catch {
    /* non-blocking — local registry remains authoring cache */
  }
}

/** Pull durable docs for an Opportunity into local Document Registry (+ restore blobs). */
export async function hydrateDocumentRegistryFromServer(input: {
  opportunityId: string;
  opportunityNumber?: string | null;
}): Promise<number> {
  if (typeof window === "undefined") return 0;
  if (!isEnterprisePersistencePrisma()) return 0;
  if (!getAccessToken()) return 0;
  const opportunityId = input.opportunityId.trim();
  if (!opportunityId) return 0;

  try {
    const res = await authenticatedJsonFetch(
      `/api/enterprise-transaction-documents?opportunityId=${encodeURIComponent(opportunityId)}&includeContent=1`,
    );
    const body = (await res.json()) as Envelope<{ items: Array<Record<string, unknown>> }>;
    if (!res.ok || !body.success || !body.data?.items) return 0;

    const restored = await mergeDurableDocumentsIntoLocalRegistry(
      body.data.items as never,
      {
        opportunityId,
        opportunityNumber: input.opportunityNumber,
      },
    );

    // Restore blobs from content when local blob missing
    for (const item of body.data.items) {
      const contentBase64 =
        typeof item.contentBase64 === "string" ? item.contentBase64 : null;
      const clientRecordId =
        typeof item.clientRecordId === "string" ? item.clientRecordId : null;
      if (!contentBase64 || !clientRecordId) continue;
      const local = getAllDocumentRegistryRecords().find((r) => r.id === clientRecordId);
      const blobId = local?.versions.find((v) => v.isCurrent)?.blobId;
      if (!blobId) continue;
      try {
        const raw = atob(contentBase64);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
        const mime =
          typeof item.mimeType === "string" ? item.mimeType : "application/octet-stream";
        await saveDocumentBlob(blobId, new Blob([bytes], { type: mime }));
      } catch {
        /* ignore blob restore failures */
      }
    }

    return restored;
  } catch {
    return 0;
  }
}
