/**
 * Document Requests workspace state + secure upload sessions.
 * Client persistence only — no new Prisma document tables.
 * Uploads always go to Enterprise Document Registry SSOT.
 */

import { getEcmMasterLabel } from "@/constants/enterprise-contact-master";
import {
  CUSTOMER_PORTAL_DEFAULT_APPLICATION_STATUS,
  CUSTOMER_PORTAL_DEFAULT_STAGE,
  DOCUMENT_REQUEST_LINK_EXPIRY_DAYS,
  DOCUMENT_REQUESTS_STORAGE_KEY,
  DOCUMENT_REQUESTS_UPDATED_EVENT,
} from "@/constants/document-requests";
import { listDocumentsForOpportunityRuntime } from "@/lib/document-registry";
import {
  EdieLodCertificationError,
  generateOpportunityLod,
} from "@/lib/document-requests/generate-lod";
import { evaluateDocumentRequestLodReadiness } from "@/lib/document-requests/lod-readiness";
import {
  buildLodDimensionKey,
  buildLodStructureKey,
  getDocumentRequestRef,
  mergeLodItemsWithPrior,
  nextLodVersionNumber,
} from "@/lib/document-requests/lod-versioning";
import { appendUploadSessionAudit } from "@/lib/document-requests/session-audit";
import { appendDocumentRequestTimeline } from "@/lib/document-requests/timeline";
import type { LoanFile } from "@/types/catalyst-one";
import type {
  DocumentRequestCommEvent,
  DocumentRequestCommKind,
  DocumentRequestItemState,
  DocumentRequestItemStatus,
  DocumentRequestLodVersionSnapshot,
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
    lodVersions: [],
    communications: [],
    updatedAt: new Date().toISOString(),
  };
}

export function getDocumentRequestState(opportunityId: string): DocumentRequestWorkspaceState {
  const id = opportunityId.trim();
  if (!id) return emptyState("");
  const existing = readStore()[id];
  if (!existing) return emptyState(id);
  return {
    ...emptyState(id),
    ...existing,
    lodVersions: existing.lodVersions ?? [],
    communications: existing.communications ?? [],
    lodItems: existing.lodItems ?? [],
  };
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
  opportunityReference?: string,
): DocumentRequestWorkspaceState {
  const event: DocumentRequestCommEvent = {
    id: newId("drc"),
    kind,
    at: new Date().toISOString(),
    actor,
    detail,
  };
  appendDocumentRequestTimeline({
    opportunityId: state.opportunityId,
    kind,
    actor,
    detail,
    opportunityReference,
    sourceEventId: event.id,
    occurredAt: event.at,
  });
  return {
    ...state,
    communications: [event, ...(state.communications ?? [])].slice(0, 120),
  };
}

function syncStatusesFromRegistry(
  opportunityId: string,
  runtimeKey: string | null | undefined,
  items: DocumentRequestItemState[],
): { items: DocumentRequestItemState[]; newlyVerified: DocumentRequestItemState[] } {
  const records = listDocumentsForOpportunityRuntime(
    runtimeKey?.trim() || opportunityId,
    opportunityId,
  );

  const newlyVerified: DocumentRequestItemState[] = [];
  const nextItems = items.map((item) => {
    const rec = records
      .filter((record) => {
        if (record.status === "deleted" || record.typeRef !== item.typeRef) return false;
        if (item.ownerScope === "participant") {
          return record.links.participantId === item.participantId;
        }
        if (item.ownerScope === "security") {
          return record.links.documentScope === "shared" && !record.links.participantId;
        }
        return true;
      })
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
    if (!rec) {
      if (item.status === "rejected") {
        return { ...item, status: "re_upload_required" as const };
      }
      return item;
    }
    let status: DocumentRequestItemStatus = "under_verification";
    if (rec.verifiedAt) status = "verified";
    else if (item.status === "rejected" || item.status === "re_upload_required") {
      status = "re_upload_required";
    }
    const synced: DocumentRequestItemState = {
      ...item,
      status,
      uploadedAt: rec.uploadedAt,
      registryRecordId: rec.id,
      receivedSource: rec.uploadSource,
    };
    if (status === "verified" && item.status !== "verified") {
      newlyVerified.push(synced);
    }
    return synced;
  });

  return { items: nextItems, newlyVerified };
}

export function refreshDocumentRequestFromRegistry(
  opportunityId: string,
  runtimeKey?: string | null,
): DocumentRequestWorkspaceState {
  const current = getDocumentRequestState(opportunityId);
  if (current.lodItems.length === 0) return current;
  const { items: lodItems, newlyVerified } = syncStatusesFromRegistry(
    opportunityId,
    runtimeKey,
    current.lodItems,
  );

  const unchanged =
    newlyVerified.length === 0 &&
    lodItems.length === current.lodItems.length &&
    lodItems.every((item, idx) => {
      const prev = current.lodItems[idx];
      return (
        prev &&
        getDocumentRequestRef(prev) === getDocumentRequestRef(item) &&
        prev.status === item.status &&
        prev.registryRecordId === item.registryRecordId &&
        prev.uploadedAt === item.uploadedAt &&
        prev.receivedSource === item.receivedSource
      );
    });
  if (unchanged) return current;

  let next = { ...current, lodItems };
  const uploaded = lodItems.filter(
    (i) => i.status === "uploaded" || i.status === "verified" || i.status === "under_verification",
  );
  if (uploaded.length > 0) {
    const latest = uploaded
      .map((i) => i.uploadedAt)
      .filter(Boolean)
      .sort()
      .at(-1);
    if (latest) next.lastCustomerActivityAt = latest;
  }
  if (newlyVerified.length > 0) {
    next.lastVerificationAt = new Date().toISOString();
    for (const item of newlyVerified) {
      next = appendComm(next, "verification_completed", "System", item.label);
    }
  }
  return saveState(next);
}

function formatBorrowerLabel(
  employmentType?: string | null,
  borrowerCategory?: string | null,
): string {
  if (borrowerCategory === "salaried") return "Salaried";
  if (borrowerCategory === "self_employed") return "Self-employed";
  if (borrowerCategory === "company") return "Company";
  const e = (employmentType || "").toLowerCase();
  if (e.includes("self") || e.includes("business") || e.includes("professional")) {
    return "Self-employed";
  }
  if (e.includes("company") || e.includes("corporate")) return "Company";
  if (e) return "Salaried";
  return "—";
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
  opportunityReference?: string;
}): DocumentRequestWorkspaceState {
  const entityHint = input.runtimeFile?.participants?.find((p) => p.entityType === "company")
    ? "company"
    : undefined;
  const gate = evaluateDocumentRequestLodReadiness({
    customerName: "validated",
    mobile: "validated",
    email: "validated",
    productLabel: input.productLabel,
    employmentType: input.employmentType,
    borrowerCategory: input.borrowerCategory,
    constitution:
      input.constitution?.trim() ||
      (input.runtimeFile
        ? input.runtimeFile.businessDetails?.constitution ||
          input.runtimeFile.participants?.find((p) => p.entityType === "company")?.constitution
        : undefined),
    entityHint,
  });
  if (!gate.canGenerate) {
    throw new EdieLodCertificationError(
      gate.chanakyaMessage ||
        "EDIE certified checklist validation failed. LOD was not generated.",
      gate.gaps,
    );
  }

  const lod = generateOpportunityLod(input);
  const now = new Date().toISOString();
  const current = getDocumentRequestState(input.opportunityId);
  const priorVersions = current.lodVersions ?? [];
  const isRegen = priorVersions.length > 0 || current.lodItems.length > 0;

  const merged = mergeLodItemsWithPrior(lod, current.lodItems, now);
  const { items: synced } = syncStatusesFromRegistry(
    input.opportunityId,
    input.runtimeFile?.id,
    merged,
  );

  const deduped: DocumentRequestItemState[] = [];
  const seen = new Set<string>();
  for (const item of synced) {
    const ref = getDocumentRequestRef(item);
    if (seen.has(ref)) continue;
    seen.add(ref);
    deduped.push(item);
  }

  const borrowerTypeLabel = formatBorrowerLabel(input.employmentType, input.borrowerCategory);
  const constitutionLabel =
    getEcmMasterLabel("constitution", (input.constitution || "").trim()) ||
    (input.constitution || "").trim() ||
    "—";
  const productLabel = input.productLabel || "—";
  const versionNumber = nextLodVersionNumber(priorVersions);
  const snapshot: DocumentRequestLodVersionSnapshot = {
    id: newId("lodv"),
    versionNumber,
    generatedAt: now,
    generatedBy: input.actor,
    borrowerTypeLabel,
    productLabel,
    constitutionLabel,
    dimensionKey: buildLodDimensionKey({
      borrowerTypeLabel,
      productLabel,
      constitutionLabel,
    }),
    structureKey: buildLodStructureKey(
      input.runtimeFile?.participants ?? [],
      input.runtimeFile?.lendingType === "secured",
    ),
    documentCount: deduped.length,
    typeRefs: deduped.map(getDocumentRequestRef),
    active: true,
  };

  const lodVersions = [snapshot, ...priorVersions.map((v) => ({ ...v, active: false }))];

  let next: DocumentRequestWorkspaceState = {
    ...current,
    opportunityId: input.opportunityId,
    lodGeneratedAt: now,
    lodItems: deduped,
    lodVersions,
    activeLodVersionId: snapshot.id,
  };
  next = appendComm(
    next,
    isRegen ? "lod_regenerated" : "lod_generated",
    input.actor,
    `v${versionNumber} · ${deduped.length} documents · ${borrowerTypeLabel} · ${productLabel}`,
    input.opportunityReference,
  );
  return saveState(next);
}

export function getActiveLodVersion(
  state: DocumentRequestWorkspaceState,
): DocumentRequestLodVersionSnapshot | undefined {
  const versions = state.lodVersions ?? [];
  if (state.activeLodVersionId) {
    return versions.find((v) => v.id === state.activeLodVersionId) ?? versions[0];
  }
  return versions.find((v) => v.active) ?? versions[0];
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
    token: newSecureUploadToken(),
    opportunityId: input.opportunityId,
    opportunityReference: input.opportunityReference,
    customerName: input.customerName,
    loanProduct: input.loanProduct,
    borrowerTypeLabel: input.borrowerTypeLabel,
    constitutionLabel: input.constitutionLabel,
    rmName: input.rmName,
    applicationStatus: CUSTOMER_PORTAL_DEFAULT_APPLICATION_STATUS,
    currentStage: CUSTOMER_PORTAL_DEFAULT_STAGE,
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
    lodItems: current.lodItems,
  };
  next = appendComm(
    next,
    input.regenerate ? "link_regenerated" : "upload_link_generated",
    input.actor,
    input.regenerate ? "Upload link regenerated" : "Secure upload session created",
    input.opportunityReference,
  );
  next = { ...next, updatedAt: new Date().toISOString() };
  store[input.opportunityId] = next;
  store[`token:${session.token}`] = next;
  writeStore(store);
  return next;
}

export function resolveUploadSessionByToken(
  token: string,
  options?: { audit?: boolean },
): DocumentRequestWorkspaceState | null {
  const audit = options?.audit !== false;
  const t = token.trim();
  if (!t) {
    if (audit) {
      appendUploadSessionAudit({
        token: t || "empty",
        opportunityId: "",
        action: "token_rejected",
        detail: "Empty token",
      });
    }
    return null;
  }
  const store = readStore();
  const byToken = store[`token:${t}`];
  if (!byToken?.uploadSession) {
    if (audit) {
      appendUploadSessionAudit({
        token: t,
        opportunityId: "",
        action: "token_rejected",
        detail: "Unknown token",
      });
    }
    return null;
  }
  const session = byToken.uploadSession;
  if (!session.active) {
    if (audit) {
      appendUploadSessionAudit({
        token: t,
        opportunityId: session.opportunityId,
        action: "token_rejected",
        detail: "Inactive session",
      });
    }
    return null;
  }
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    if (audit) {
      appendUploadSessionAudit({
        token: t,
        opportunityId: session.opportunityId,
        action: "token_rejected",
        detail: "Expired session",
      });
    }
    return null;
  }
  if (session.token !== t) {
    if (audit) {
      appendUploadSessionAudit({
        token: t,
        opportunityId: session.opportunityId,
        action: "token_rejected",
        detail: "Token mismatch",
      });
    }
    return null;
  }
  const live = store[session.opportunityId] ?? byToken;
  if (audit) {
    appendUploadSessionAudit({
      token: t,
      opportunityId: session.opportunityId,
      action: "token_validated",
      detail: session.opportunityReference,
    });
  }
  return {
    ...live,
    uploadSession: live.uploadSession?.token === t ? live.uploadSession : session,
    // The external portal receives only requirements explicitly requested.
    // Master-derived but unrequested rows remain visible internally in Catalyst One.
    lodItems: live.lodItems.filter((item) => item.status !== "pending"),
  };
}

export function recordPortalOpened(token: string, opportunityId: string): void {
  appendUploadSessionAudit({
    token,
    opportunityId,
    action: "portal_opened",
  });
}

export function recordDocumentRequestCommunication(
  opportunityId: string,
  kind: Extract<DocumentRequestCommKind, "email_sent" | "whatsapp_sent" | "reminder_sent">,
  actor: string,
  detail?: string,
  opportunityReference?: string,
): DocumentRequestWorkspaceState {
  let next = getDocumentRequestState(opportunityId);
  next = appendComm(next, kind, actor, detail, opportunityReference);
  if (kind === "reminder_sent") {
    const now = new Date().toISOString();
    next = {
      ...next,
      lodItems: next.lodItems.map((i) =>
        i.status === "requested"
          ? { ...i, reminderStatus: "sent", lastReminderAt: now }
          : i,
      ),
    };
  }
  return saveState(next);
}

export function requestDocumentItems(
  opportunityId: string,
  requestRefs: string[],
): DocumentRequestWorkspaceState {
  const selected = new Set(requestRefs.map((ref) => ref.trim()).filter(Boolean));
  if (!selected.size) return getDocumentRequestState(opportunityId);
  const current = getDocumentRequestState(opportunityId);
  const requestedOn = new Date().toISOString();
  return saveState({
    ...current,
    lodItems: current.lodItems.map((item) =>
      selected.has(getDocumentRequestRef(item)) && item.status === "pending"
        ? {
            ...item,
            status: "requested" as const,
            requestedOn,
            reminderStatus: "none" as const,
          }
        : item,
    ),
  });
}

export function addCustomDocumentRequirement(input: {
  opportunityId: string;
  label: string;
  category: "critical" | "journey";
  actor: string;
  ownerScope: "participant" | "security";
  participantId?: string;
  ownerName: string;
  ownerRoleLabel: string;
  ownerTypeLabel: string;
  remarks?: string;
}): DocumentRequestWorkspaceState {
  const label = input.label.trim();
  if (!label) return getDocumentRequestState(input.opportunityId);
  const current = getDocumentRequestState(input.opportunityId);
  const duplicate = current.lodItems.some(
    (item) =>
      item.label.trim().toLocaleLowerCase() === label.toLocaleLowerCase() &&
      item.ownerScope === input.ownerScope &&
      item.participantId === input.participantId,
  );
  if (duplicate) return current;
  const slug =
    label
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "requirement";
  const addedAt = new Date().toISOString();
  const typeRef = `custom:${slug}:${Date.now().toString(36)}`;
  let next: DocumentRequestWorkspaceState = {
    ...current,
    lodItems: [
      ...current.lodItems,
      {
        requestRef:
          input.ownerScope === "participant"
            ? `participant:${input.participantId}:${typeRef}`
            : `security:${typeRef}`,
        typeRef,
        label,
        category: input.category,
        moduleId: "custom_requirement",
        moduleLabel: "Manual Requirement",
        mandatory: true,
        critical: input.category === "critical",
        ownerScope: input.ownerScope,
        participantId: input.participantId,
        ownerName: input.ownerName,
        ownerRoleLabel: input.ownerRoleLabel,
        ownerTypeLabel: input.ownerTypeLabel,
        status: "pending",
        reminderStatus: "none",
        remarks: input.remarks?.trim() || undefined,
        custom: true,
        addedAt,
        addedBy: input.actor,
      },
    ],
  };
  next = appendComm(
    next,
    "custom_requirement_added",
    input.actor,
    `${label} · ${input.ownerName}`,
  );
  return saveState(next);
}

export function buildCustomerUploadPortalPath(token: string): string {
  return `/document-upload/${encodeURIComponent(token)}`;
}

/** CO-BIZ-004 — Full customer engagement shell (dashboard · tasks · docs · timeline). */
export function buildCustomerEngagementPortalPath(token: string): string {
  return `/customer-engagement/${encodeURIComponent(token)}`;
}

export function markItemRemarks(
  opportunityId: string,
  requestRef: string,
  remarks: string,
): DocumentRequestWorkspaceState {
  const current = getDocumentRequestState(opportunityId);
  return saveState({
    ...current,
    lodItems: current.lodItems.map((item) =>
      getDocumentRequestRef(item) === requestRef ? { ...item, remarks } : item,
    ),
  });
}

export function recordCustomerPortalUpload(
  opportunityId: string,
  requestRef: string,
  registryRecordId: string,
  actor = "Customer",
  opportunityReference?: string,
): DocumentRequestWorkspaceState {
  const now = new Date().toISOString();
  let next = getDocumentRequestState(opportunityId);
  const label =
    next.lodItems.find((item) => getDocumentRequestRef(item) === requestRef)?.label || requestRef;
  next = {
    ...next,
    lastCustomerActivityAt: now,
    lodItems: next.lodItems.map((item) =>
      getDocumentRequestRef(item) === requestRef
        ? {
            ...item,
            status: "under_verification" as const,
            uploadedAt: now,
            registryRecordId,
          }
        : item,
    ),
  };
  next = appendComm(next, "customer_uploaded", actor, label, opportunityReference);
  return saveState(next);
}

export function newSecureUploadToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return `uptok_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
  }
  return newId("uptok");
}
