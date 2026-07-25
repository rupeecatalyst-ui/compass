/**
 * Document Requests workspace state + secure upload sessions.
 * Client persistence only — no new Prisma document tables.
 * Uploads always go to Enterprise Document Registry SSOT.
 */

import {
  DOCUMENT_REQUEST_LINK_EXPIRY_DAYS,
  DOCUMENT_REQUESTS_STORAGE_KEY,
  DOCUMENT_REQUESTS_UPDATED_EVENT,
} from "@/constants/document-requests";
import { listDocumentsForOpportunityRuntime } from "@/lib/document-registry";
import { generateOpportunityLod } from "@/lib/document-requests/generate-lod";
import type { LoanFile } from "@/types/catalyst-one";
import type {
  DocumentRequestCommEvent,
  DocumentRequestCommKind,
  DocumentRequestItemState,
  DocumentRequestItemStatus,
  DocumentRequestUploadSession,
  DocumentRequestWorkspaceState,
} from "@/types/document-requests";

type StoreShape = Record<string, DocumentRequestWorkspaceState>;

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function readStore(): StoreShape {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(DOCUMENT_REQUESTS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoreShape;
  } catch {
    return {};
  }
}

function writeStore(next: StoreShape) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DOCUMENT_REQUESTS_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(DOCUMENT_REQUESTS_UPDATED_EVENT));
}

export function subscribeDocumentRequestsUpdated(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(DOCUMENT_REQUESTS_UPDATED_EVENT, listener);
  return () => window.removeEventListener(DOCUMENT_REQUESTS_UPDATED_EVENT, listener);
}

function emptyState(opportunityId: string): DocumentRequestWorkspaceState {
  return {
    opportunityId,
    lodItems: [],
    communications: [],
    updatedAt: new Date().toISOString(),
  };
}

export function getDocumentRequestState(opportunityId: string): DocumentRequestWorkspaceState {
  const id = opportunityId.trim();
  if (!id) return emptyState("");
  return readStore()[id] ?? emptyState(id);
}

function saveState(state: DocumentRequestWorkspaceState): DocumentRequestWorkspaceState {
  const next = { ...state, updatedAt: new Date().toISOString() };
  const store = readStore();
  store[next.opportunityId] = next;
  if (next.uploadSession?.token) {
    store[`token:${next.uploadSession.token}`] = next;
  }
  writeStore(store);
  return next;
}

function appendComm(
  state: DocumentRequestWorkspaceState,
  kind: DocumentRequestCommKind,
  actor: string,
  detail?: string,
): DocumentRequestWorkspaceState {
  const event: DocumentRequestCommEvent = {
    id: newId("drc"),
    kind,
    at: new Date().toISOString(),
    actor,
    detail,
  };
  return {
    ...state,
    communications: [event, ...state.communications].slice(0, 100),
  };
}

function syncStatusesFromRegistry(
  opportunityId: string,
  runtimeKey: string | null | undefined,
  items: DocumentRequestItemState[],
): DocumentRequestItemState[] {
  const records = listDocumentsForOpportunityRuntime(
    runtimeKey?.trim() || opportunityId,
    opportunityId,
  );
  const byType = new Map<string, (typeof records)[0]>();
  for (const r of records) {
    if (r.status === "deleted") continue;
    const prev = byType.get(r.typeRef);
    if (!prev || new Date(r.uploadedAt) > new Date(prev.uploadedAt)) {
      byType.set(r.typeRef, r);
    }
  }

  return items.map((item) => {
    const rec = byType.get(item.typeRef);
    if (!rec) return item;
    let status: DocumentRequestItemStatus = "uploaded";
    if (rec.verifiedAt) status = "verified";
    else if (item.status === "under_verification") status = "under_verification";
    return {
      ...item,
      status,
      uploadedAt: rec.uploadedAt,
      registryRecordId: rec.id,
    };
  });
}

export function refreshDocumentRequestFromRegistry(
  opportunityId: string,
  runtimeKey?: string | null,
): DocumentRequestWorkspaceState {
  const current = getDocumentRequestState(opportunityId);
  if (current.lodItems.length === 0) return current;
  const lodItems = syncStatusesFromRegistry(opportunityId, runtimeKey, current.lodItems);
  const uploaded = lodItems.filter(
    (i) => i.status === "uploaded" || i.status === "verified" || i.status === "under_verification",
  );
  let next = { ...current, lodItems };
  if (uploaded.length > 0) {
    const latest = uploaded
      .map((i) => i.uploadedAt)
      .filter(Boolean)
      .sort()
      .at(-1);
    if (latest) next.lastCustomerActivityAt = latest;
  }
  return saveState(next);
}

export function generateAndPersistLod(input: {
  opportunityId: string;
  productLabel: string;
  employmentType?: string | null;
  borrowerCategory?: string | null;
  constitution?: string | null;
  transactionType?: "fresh" | "balance_transfer" | null;
  runtimeFile?: LoanFile | null;
  actor: string;
}): DocumentRequestWorkspaceState {
  const lod = generateOpportunityLod(input);
  const now = new Date().toISOString();
  const current = getDocumentRequestState(input.opportunityId);
  const lodItems: DocumentRequestItemState[] = lod.map((item) => ({
    ...item,
    status: "pending",
    requestedOn: now,
    reminderStatus: "none",
  }));
  let next: DocumentRequestWorkspaceState = {
    ...current,
    opportunityId: input.opportunityId,
    lodGeneratedAt: now,
    lodItems,
  };
  next = appendComm(next, "lod_generated", input.actor, `${lodItems.length} documents`);
  const synced = syncStatusesFromRegistry(
    input.opportunityId,
    input.runtimeFile?.id,
    next.lodItems,
  );
  next = { ...next, lodItems: synced };
  return saveState(next);
}

export function createOrRegenerateUploadSession(input: {
  opportunityId: string;
  opportunityReference: string;
  customerName: string;
  loanProduct: string;
  borrowerTypeLabel: string;
  constitutionLabel: string;
  rmName?: string;
  actor: string;
  regenerate?: boolean;
}): DocumentRequestWorkspaceState {
  const current = getDocumentRequestState(input.opportunityId);
  const now = Date.now();
  const expires = new Date(now + DOCUMENT_REQUEST_LINK_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const session: DocumentRequestUploadSession = {
    token: newId("uptok"),
    opportunityId: input.opportunityId,
    opportunityReference: input.opportunityReference,
    customerName: input.customerName,
    loanProduct: input.loanProduct,
    borrowerTypeLabel: input.borrowerTypeLabel,
    constitutionLabel: input.constitutionLabel,
    rmName: input.rmName,
    createdAt: new Date(now).toISOString(),
    expiresAt: expires.toISOString(),
    regeneratedAt: input.regenerate ? new Date(now).toISOString() : undefined,
    active: true,
  };

  const store = readStore();
  for (const [key, value] of Object.entries(store)) {
    if (key.startsWith("token:") && value.uploadSession?.opportunityId === input.opportunityId) {
      delete store[key];
    }
  }

  let next: DocumentRequestWorkspaceState = {
    ...current,
    opportunityId: input.opportunityId,
    uploadSession: session,
    lodItems: current.lodItems.map((i) =>
      i.status === "pending"
        ? {
            ...i,
            status: "requested" as const,
            requestedOn: i.requestedOn ?? session.createdAt,
          }
        : i,
    ),
  };
  if (input.regenerate) {
    next = appendComm(next, "link_regenerated", input.actor, "Upload link regenerated");
  }
  next = { ...next, updatedAt: new Date().toISOString() };
  store[input.opportunityId] = next;
  store[`token:${session.token}`] = next;
  writeStore(store);
  return next;
}

export function resolveUploadSessionByToken(
  token: string,
): DocumentRequestWorkspaceState | null {
  const t = token.trim();
  if (!t) return null;
  const store = readStore();
  const byToken = store[`token:${t}`];
  if (!byToken?.uploadSession) return null;
  const session = byToken.uploadSession;
  if (!session.active) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;
  if (session.token !== t) return null;
  // Prefer live opportunity state
  const live = store[session.opportunityId] ?? byToken;
  return {
    ...live,
    uploadSession: live.uploadSession?.token === t ? live.uploadSession : session,
  };
}

export function recordDocumentRequestCommunication(
  opportunityId: string,
  kind: Extract<DocumentRequestCommKind, "email_sent" | "whatsapp_sent" | "reminder_sent">,
  actor: string,
  detail?: string,
): DocumentRequestWorkspaceState {
  let next = getDocumentRequestState(opportunityId);
  next = appendComm(next, kind, actor, detail);
  if (kind === "reminder_sent") {
    const now = new Date().toISOString();
    next = {
      ...next,
      lodItems: next.lodItems.map((i) =>
        i.status === "pending" || i.status === "requested"
          ? { ...i, reminderStatus: "sent", lastReminderAt: now }
          : i,
      ),
    };
  }
  return saveState(next);
}

export function buildCustomerUploadPortalPath(token: string): string {
  return `/document-upload/${encodeURIComponent(token)}`;
}

export function markItemRemarks(
  opportunityId: string,
  typeRef: string,
  remarks: string,
): DocumentRequestWorkspaceState {
  const current = getDocumentRequestState(opportunityId);
  return saveState({
    ...current,
    lodItems: current.lodItems.map((i) => (i.typeRef === typeRef ? { ...i, remarks } : i)),
  });
}

/** After a customer portal upload lands in Document Registry. */
export function recordCustomerPortalUpload(
  opportunityId: string,
  typeRef: string,
  registryRecordId: string,
  actor = "Customer",
): DocumentRequestWorkspaceState {
  const now = new Date().toISOString();
  let next = getDocumentRequestState(opportunityId);
  next = {
    ...next,
    lastCustomerActivityAt: now,
    lodItems: next.lodItems.map((i) =>
      i.typeRef === typeRef
        ? {
            ...i,
            status: "uploaded" as const,
            uploadedAt: now,
            registryRecordId,
          }
        : i,
    ),
  };
  next = appendComm(next, "customer_uploaded", actor, typeRef);
  return saveState(next);
}
