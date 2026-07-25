/**
 * CO-SPRINT-114 — Enterprise Document Registry store.
 * Metadata in localStorage; binary content in IndexedDB.
 */

import { DOCUMENT_REGISTRY_STORAGE_KEY, DOCUMENT_REGISTRY_UPDATED_EVENT } from "@/constants/document-registry";
import { updateDeal } from "@/lib/enterprise-deal/deal-data-access";
import { isOpportunityRuntimeCase } from "@/lib/lead-opportunity-journey/opportunity-runtime-adapter";
import type {
  DocumentEntityLinks,
  DocumentRegistryFilters,
  DocumentRegistryRecord,
  DocumentRegistrySnapshot,
  DocumentRegistryVersion,
  DocumentUploadInput,
  DocumentUploadProgress,
} from "@/types/document-registry";
import type { LoanFileDocument } from "@/types/catalyst-one";
import { createBlobObjectUrl, deleteDocumentBlob, saveDocumentBlob } from "./blob-store";
import { validateDocumentFile } from "./file-utils";

const SCHEMA_VERSION = 1 as const;

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptySnapshot(): DocumentRegistrySnapshot {
  return { records: [], schemaVersion: SCHEMA_VERSION };
}

function readSnapshot(): DocumentRegistrySnapshot {
  if (typeof window === "undefined") return emptySnapshot();
  try {
    const raw = localStorage.getItem(DOCUMENT_REGISTRY_STORAGE_KEY);
    if (!raw) return emptySnapshot();
    const parsed = JSON.parse(raw) as DocumentRegistrySnapshot;
    if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) return emptySnapshot();
    return {
      records: Array.isArray(parsed.records) ? parsed.records : [],
      schemaVersion: SCHEMA_VERSION,
    };
  } catch {
    return emptySnapshot();
  }
}

function writeSnapshot(next: DocumentRegistrySnapshot) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DOCUMENT_REGISTRY_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(DOCUMENT_REGISTRY_UPDATED_EVENT));
}

export function subscribeDocumentRegistryUpdated(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(DOCUMENT_REGISTRY_UPDATED_EVENT, listener);
  return () => window.removeEventListener(DOCUMENT_REGISTRY_UPDATED_EVENT, listener);
}

export function getAllDocumentRegistryRecords(): DocumentRegistryRecord[] {
  return readSnapshot().records;
}

export function getDocumentRegistryRecord(id: string): DocumentRegistryRecord | undefined {
  return readSnapshot().records.find((r) => r.id === id);
}

export function listDocumentsForLoanFile(loanFileId: string): DocumentRegistryRecord[] {
  return listDocumentsForOpportunityRuntime(loanFileId);
}

/**
 * FS-01 — list documents by Opportunity runtime key and/or Deal attachment id.
 * Matches opportunityId OR loanFileId so Opportunity-only cases work without LoanFile.
 */
export function listDocumentsForOpportunityRuntime(
  runtimeKey: string,
  opportunityId?: string | null,
): DocumentRegistryRecord[] {
  const key = runtimeKey.trim();
  const oppId = opportunityId?.trim() || key;
  return readSnapshot()
    .records.filter((r) => {
      if (r.status === "deleted") return false;
      if (r.links.loanFileId === key) return true;
      if (r.links.opportunityId === key || r.links.opportunityId === oppId) return true;
      return false;
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listDocumentsByTypeRef(
  loanFileId: string,
  typeRef: string,
): DocumentRegistryRecord[] {
  return listDocumentsForLoanFile(loanFileId).filter((r) => r.typeRef === typeRef);
}

export function hasDocumentForTypeRef(loanFileId: string, typeRef: string): boolean {
  return listDocumentsByTypeRef(loanFileId, typeRef).some((r) => r.status === "active");
}

export function filterDocumentRegistryRecords(
  records: DocumentRegistryRecord[],
  filters: DocumentRegistryFilters,
): DocumentRegistryRecord[] {
  const q = filters.query.trim().toLowerCase();
  return records.filter((r) => {
    if (filters.status !== "all" && r.status !== filters.status) return false;
    if (filters.typeRef !== "all" && r.typeRef !== filters.typeRef) return false;
    if (filters.uploadedBy !== "all" && r.uploadedBy !== filters.uploadedBy) return false;
    if (!q) return true;
    const hay = [
      r.displayName,
      r.originalFilename,
      r.categoryLabel,
      r.typeRef,
      r.uploadedBy,
      r.links.customerId,
      r.links.loanFileId,
      r.links.opportunityId,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

function findDuplicateRecord(
  records: DocumentRegistryRecord[],
  typeRef: string,
  fileName: string,
  links?: Pick<
    DocumentEntityLinks,
    | "loanFileId"
    | "opportunityId"
    | "participantId"
    | "documentScope"
    | "contactId"
    | "lenderId"
  >,
): DocumentRegistryRecord | undefined {
  const wantScope = links?.documentScope ?? "applicant";
  const wantParticipant = links?.participantId?.trim() || "";
  const wantContact = links?.contactId?.trim() || "";
  const wantLender = links?.lenderId?.trim() || "";

  return records.find((r) => {
    if (r.typeRef !== typeRef || r.originalFilename !== fileName || r.status !== "active") {
      return false;
    }

    // BAT #22 / #23 — ownership must match (participant or lender).
    const haveScope = r.links.documentScope ?? "applicant";
    if (haveScope !== wantScope) return false;
    if (wantScope === "applicant") {
      const haveParticipant = r.links.participantId?.trim() || "";
      if (wantParticipant && haveParticipant && wantParticipant !== haveParticipant) {
        return false;
      }
      if (wantContact && r.links.contactId?.trim() && wantContact !== r.links.contactId.trim()) {
        return false;
      }
    }
    if (wantScope === "lender") {
      const haveLender = r.links.lenderId?.trim() || "";
      if (wantLender && haveLender && wantLender !== haveLender) return false;
    }

    if (links?.loanFileId && r.links.loanFileId === links.loanFileId) return true;
    if (links?.opportunityId && r.links.opportunityId === links.opportunityId) return true;
    if (!links?.loanFileId && !links?.opportunityId) {
      return r.links.loanFileId === undefined;
    }
    return false;
  });
}

function syncLoanFileDocument(
  links: DocumentEntityLinks,
  label: string,
  categoryLabel: string,
  uploadedBy: string,
): void {
  // FS-01 — never dual-write Deal when Opportunity is the only runtime authority.
  if (!links.loanFileId || links.loanFileId === links.opportunityId) return;
  const file = updateDeal(links.loanFileId, {}, undefined, "documents");
  if (!file) return;

  const now = new Date().toISOString();
  const existing = file.documents ?? [];
  const labelWord = label.toLowerCase().split(" ")[0] ?? label.toLowerCase();
  const idx = existing.findIndex((d) => d.name.toLowerCase().includes(labelWord));

  const docEntry: LoanFileDocument = {
    id: idx >= 0 ? existing[idx]!.id : newId("lfdoc"),
    name: label,
    status: "received",
    category: categoryLabel,
    receivedDate: now,
    updatedBy: uploadedBy,
    updatedAt: now,
    createdBy: idx >= 0 ? existing[idx]?.createdBy : uploadedBy,
    createdAt: idx >= 0 ? existing[idx]?.createdAt : now,
  };

  const documents =
    idx >= 0
      ? existing.map((d, i) => (i === idx ? { ...d, ...docEntry } : d))
      : [docEntry, ...existing];

  updateDeal(
    links.loanFileId,
    { documents },
    `Document received: ${label}`,
    "documents",
  );
}

function removeLoanFileDocumentLink(loanFileId: string, label: string): void {
  const labelWord = label.toLowerCase().split(" ")[0] ?? label.toLowerCase();
  const current = updateDeal(loanFileId, {}, undefined, "documents");
  if (!current) return;
  updateDeal(
    loanFileId,
    {
      documents: (current.documents ?? []).map((d) =>
        d.name.toLowerCase().includes(labelWord)
          ? { ...d, status: "pending" as const, receivedDate: undefined }
          : d,
      ),
    },
    `Document removed: ${label}`,
    "documents",
  );
}

async function persistBlob(
  file: File,
  onProgress?: (progress: DocumentUploadProgress) => void,
): Promise<string> {
  onProgress?.({ phase: "reading", percent: 0, message: "Reading file…" });
  const blobId = newId("blob");
  const blob = new Blob([await file.arrayBuffer()], {
    type: file.type || "application/octet-stream",
  });
  onProgress?.({ phase: "storing", percent: 85, message: "Saving to storage…" });
  await saveDocumentBlob(blobId, blob);
  onProgress?.({ phase: "complete", percent: 100, message: "Upload complete" });
  return blobId;
}

export async function uploadDocumentToRegistry(
  input: DocumentUploadInput,
  onProgress?: (progress: DocumentUploadProgress) => void,
): Promise<{ record: DocumentRegistryRecord; isNewVersion: boolean }> {
  const validation = validateDocumentFile(input.file);
  if (!validation.ok) {
    onProgress?.({ phase: "error", percent: 0, message: validation.reason });
    throw new Error(validation.reason);
  }

  const snap = readSnapshot();
  const now = new Date().toISOString();
  const mimeType = input.file.type || "application/octet-stream";

  const target = input.replaceRecordId
    ? snap.records.find((r) => r.id === input.replaceRecordId)
    : findDuplicateRecord(
        snap.records,
        input.typeRef,
        input.file.name,
        {
          loanFileId: input.links.loanFileId,
          opportunityId: input.links.opportunityId,
          participantId: input.links.participantId,
          documentScope: input.links.documentScope,
          contactId: input.links.contactId,
          lenderId: input.links.lenderId,
        },
      );

  const blobId = await persistBlob(input.file, onProgress);

  if (target && target.status === "active") {
    const nextVersion = target.version + 1;
    const version: DocumentRegistryVersion = {
      id: newId("drv"),
      version: nextVersion,
      originalFilename: input.file.name,
      displayName: input.file.name,
      fileSizeBytes: input.file.size,
      mimeType,
      blobId,
      uploadedBy: input.uploadedBy,
      uploadedAt: now,
      isCurrent: true,
    };
    const updated: DocumentRegistryRecord = {
      ...target,
      originalFilename: input.file.name,
      displayName: input.file.name,
      fileSizeBytes: input.file.size,
      mimeType,
      version: nextVersion,
      uploadedBy: input.uploadedBy,
      updatedAt: now,
      versions: [
        version,
        ...target.versions.map((v) => ({ ...v, isCurrent: false })),
      ],
    };
    const idx = snap.records.findIndex((r) => r.id === target!.id);
    snap.records[idx] = updated;
    writeSnapshot(snap);
    syncLoanFileDocument(input.links, input.categoryLabel, input.categoryLabel, input.uploadedBy);
    return { record: updated, isNewVersion: true };
  }

  const version: DocumentRegistryVersion = {
    id: newId("drv"),
    version: 1,
    originalFilename: input.file.name,
    displayName: input.file.name,
    fileSizeBytes: input.file.size,
    mimeType,
    blobId,
    uploadedBy: input.uploadedBy,
    uploadedAt: now,
    isCurrent: true,
  };

  const record: DocumentRegistryRecord = {
    id: newId("dreg"),
    typeRef: input.typeRef,
    categoryLabel: input.categoryLabel,
    originalFilename: input.file.name,
    displayName: input.file.name,
    status: "active",
    links: { ...input.links },
    versions: [version],
    uploadedBy: input.uploadedBy,
    uploadedAt: now,
    updatedAt: now,
    version: 1,
    fileSizeBytes: input.file.size,
    mimeType,
  };

  snap.records.unshift(record);
  writeSnapshot(snap);
  syncLoanFileDocument(input.links, input.categoryLabel, input.categoryLabel, input.uploadedBy);
  return { record, isNewVersion: false };
}

export async function replaceDocumentInRegistry(
  recordId: string,
  file: File,
  uploadedBy: string,
  onProgress?: (progress: DocumentUploadProgress) => void,
): Promise<DocumentRegistryRecord | null> {
  const existing = getDocumentRegistryRecord(recordId);
  if (!existing) return null;
  const { record } = await uploadDocumentToRegistry(
    {
      file,
      typeRef: existing.typeRef,
      categoryLabel: existing.categoryLabel,
      uploadedBy,
      links: existing.links,
      replaceRecordId: recordId,
    },
    onProgress,
  );
  return record;
}

export function renameDocumentInRegistry(
  recordId: string,
  displayName: string,
): DocumentRegistryRecord | null {
  const snap = readSnapshot();
  const idx = snap.records.findIndex((r) => r.id === recordId);
  if (idx < 0) return null;
  const trimmed = displayName.trim();
  if (!trimmed) return null;

  const current = snap.records[idx]!;
  const now = new Date().toISOString();
  const versions = current.versions.map((v) =>
    v.isCurrent ? { ...v, displayName: trimmed } : v,
  );
  snap.records[idx] = {
    ...current,
    displayName: trimmed,
    updatedAt: now,
    versions,
  };
  writeSnapshot(snap);
  return snap.records[idx]!;
}

/** BAT #23 — RM verifies a customer (or lender) document without changing binary content. */
export function markDocumentVerified(
  recordId: string,
  verifiedBy: string,
): DocumentRegistryRecord | null {
  const snap = readSnapshot();
  const idx = snap.records.findIndex((r) => r.id === recordId);
  if (idx < 0) return null;
  const current = snap.records[idx]!;
  if (current.status !== "active") return null;
  const now = new Date().toISOString();
  snap.records[idx] = {
    ...current,
    verifiedAt: now,
    verifiedBy: verifiedBy.trim() || "RM",
    updatedAt: now,
  };
  writeSnapshot(snap);
  return snap.records[idx]!;
}

export async function deleteDocumentFromRegistry(recordId: string): Promise<boolean> {
  const snap = readSnapshot();
  const idx = snap.records.findIndex((r) => r.id === recordId);
  if (idx < 0) return false;

  const record = snap.records[idx]!;
  const now = new Date().toISOString();

  for (const v of record.versions) {
    try {
      await deleteDocumentBlob(v.blobId);
    } catch {
      /* best-effort blob cleanup */
    }
  }

  snap.records[idx] = { ...record, status: "deleted", updatedAt: now };
  writeSnapshot(snap);

  if (record.links.loanFileId) {
    removeLoanFileDocumentLink(record.links.loanFileId, record.categoryLabel);
  }
  return true;
}

export async function downloadDocumentFromRegistry(
  record: DocumentRegistryRecord,
  versionId?: string,
): Promise<void> {
  const version =
    record.versions.find((v) => v.id === versionId) ??
    record.versions.find((v) => v.isCurrent) ??
    record.versions[0];
  if (!version) throw new Error("No version available");

  const url = await createBlobObjectUrl(version.blobId);
  if (!url) throw new Error("File content not found in storage");

  const a = document.createElement("a");
  a.href = url;
  a.download = version.originalFilename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function getDocumentPreviewUrl(
  record: DocumentRegistryRecord,
  versionId?: string,
): Promise<string | null> {
  const version =
    record.versions.find((v) => v.id === versionId) ??
    record.versions.find((v) => v.isCurrent) ??
    record.versions[0];
  if (!version) return null;
  return createBlobObjectUrl(version.blobId);
}

export function buildEntityLinksFromLoanFile(
  file: {
    id: string;
    customerId?: string;
    opportunityId?: string;
    customerName?: string;
    enterpriseOpportunityId?: string;
    enterpriseDealId?: string;
  },
  scope?: {
    participantId?: string | null;
    documentScope?: "applicant" | "shared" | "lender";
    /**
     * BAT #22 — owning Contact / Company registry id for the selected Document Owner.
     * Shared Opportunity docs remain Opportunity-owned (no owner entity stamp).
     */
    ownerEntityId?: string | null;
    /** BAT #23 — selected lender registry id for Lender Documents. */
    lenderId?: string | null;
  },
): DocumentEntityLinks {
  const documentScope = scope?.documentScope ?? "applicant";
  const opportunityId =
    file.enterpriseOpportunityId || file.opportunityId || undefined;
  const opportunityRuntime = isOpportunityRuntimeCase(file as never);
  const ownerEntityId = scope?.ownerEntityId?.trim() || undefined;
  const lenderId = scope?.lenderId?.trim() || undefined;

  return {
    // Compatibility: only stamp real Deal/LoanFile ids — never Opportunity UUID as LoanFile.
    loanFileId: opportunityRuntime ? undefined : file.id,
    customerId: file.customerId,
    opportunityId: opportunityId || (opportunityRuntime ? file.id : undefined),
    // Owner profile SSOT: selected participant entity (Contact/Company), else primary customer.
    contactId:
      documentScope === "shared" || documentScope === "lender"
        ? undefined
        : ownerEntityId || file.customerId,
    documentScope,
    ...(documentScope === "applicant" && scope?.participantId
      ? { participantId: scope.participantId }
      : {}),
    ...(documentScope === "lender" && lenderId ? { lenderId } : {}),
  };
}
