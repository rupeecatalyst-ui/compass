/**
 * Owner-grouped document request tracking — local operational ledger.
 * Does not send communications. Fulfilment is derived from Document Requests + Registry.
 */

export type DocumentWorkspaceRequestChannel = "email" | "whatsapp" | "secure_link";

export type DocumentWorkspaceRequestBatch = {
  id: string;
  opportunityId: string;
  recipientName: string;
  recipientId?: string;
  channel: DocumentWorkspaceRequestChannel;
  requestRefs: string[];
  requester: string;
  requestedAt: string;
  dueAt?: string;
  reminderAt?: string;
  responseAt?: string;
  fulfilmentStatus: "open" | "partial" | "fulfilled";
  groupedBody: string;
  uploadToken?: string;
};

const STORAGE_KEY = "catalyst-one:document-workspace:request-batches";

function readAll(): DocumentWorkspaceRequestBatch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DocumentWorkspaceRequestBatch[]) : [];
  } catch {
    return [];
  }
}

function writeAll(rows: DocumentWorkspaceRequestBatch[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(0, 200)));
}

export function recordDocumentWorkspaceRequestBatch(
  input: Omit<DocumentWorkspaceRequestBatch, "id" | "requestedAt" | "fulfilmentStatus"> & {
    fulfilmentStatus?: DocumentWorkspaceRequestBatch["fulfilmentStatus"];
  },
): DocumentWorkspaceRequestBatch {
  const row: DocumentWorkspaceRequestBatch = {
    ...input,
    id: `dwb_${Date.now().toString(36)}`,
    requestedAt: new Date().toISOString(),
    fulfilmentStatus: input.fulfilmentStatus ?? "open",
  };
  writeAll([row, ...readAll()]);
  return row;
}

export function listDocumentWorkspaceRequestBatches(
  opportunityId?: string,
): DocumentWorkspaceRequestBatch[] {
  const all = readAll();
  if (!opportunityId) return all;
  return all.filter((row) => row.opportunityId === opportunityId);
}

export function markDocumentWorkspaceRequestResponse(
  batchId: string,
  fulfilmentStatus: DocumentWorkspaceRequestBatch["fulfilmentStatus"],
): void {
  writeAll(
    readAll().map((row) =>
      row.id === batchId
        ? { ...row, responseAt: new Date().toISOString(), fulfilmentStatus }
        : row,
    ),
  );
}
