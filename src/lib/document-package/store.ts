/**
 * CO-DOC-005 — Local Document Package Registry cache (mirrors durable server SSOT).
 */

import {
  DOCUMENT_PACKAGE_STORAGE_KEY,
  DOCUMENT_PACKAGE_STORAGE_KEY_V1,
  DOCUMENT_PACKAGE_TIMELINE_TITLES,
  DOCUMENT_PACKAGE_UPDATED_EVENT,
} from "@/constants/document-package";
import type {
  CreateDocumentPackageInput,
  DocumentPackageRecord,
  DocumentPackageSnapshot,
  DocumentPackageStatus,
  DocumentPackageStorageStatus,
  DocumentPackageTimelineEntry,
  DocumentPackageTimelineEventType,
  DurableDocumentPackageDto,
} from "@/types/document-package";

const SCHEMA_VERSION = 2 as const;

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptySnapshot(): DocumentPackageSnapshot {
  return { packages: [], timeline: [], schemaVersion: SCHEMA_VERSION };
}

function migrateV1IfNeeded(): DocumentPackageSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DOCUMENT_PACKAGE_STORAGE_KEY_V1);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      packages?: Array<Record<string, unknown>>;
      timeline?: DocumentPackageTimelineEntry[];
    };
    const packages: DocumentPackageRecord[] = (parsed.packages || []).map((p) => ({
      id: String(p.id || newId("dpkg")),
      folderName: String(p.folderName || "Untitled Folder"),
      status: (p.status as DocumentPackageStatus) || "complete",
      storageStatus: "local_authoring" as DocumentPackageStorageStatus,
      documentIds: Array.isArray(p.documentIds) ? (p.documentIds as string[]) : [],
      fileCount: Number(p.fileCount || 0),
      totalSizeBytes: Number(p.totalSizeBytes || 0),
      uploadedBy: String(p.uploadedBy || "Unknown"),
      uploadedAt: String(p.uploadedAt || new Date().toISOString()),
      updatedAt: String(p.updatedAt || new Date().toISOString()),
      createdBy: String(p.uploadedBy || "Unknown"),
      version: 1,
      links: (p.links as DocumentPackageRecord["links"]) || {},
      relativePaths: (p.relativePaths as Record<string, string>) || {},
      completionPercent: Number(p.completionPercent ?? 100),
      lastError: (p.lastError as string | null) ?? null,
      clientPackageId: String(p.id || ""),
    }));
    return {
      packages,
      timeline: Array.isArray(parsed.timeline) ? parsed.timeline : [],
      schemaVersion: SCHEMA_VERSION,
    };
  } catch {
    return null;
  }
}

function readSnapshot(): DocumentPackageSnapshot {
  if (typeof window === "undefined") return emptySnapshot();
  try {
    const raw = localStorage.getItem(DOCUMENT_PACKAGE_STORAGE_KEY);
    if (!raw) {
      const migrated = migrateV1IfNeeded();
      if (migrated) {
        writeSnapshot(migrated);
        return migrated;
      }
      return emptySnapshot();
    }
    const parsed = JSON.parse(raw) as DocumentPackageSnapshot;
    if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) {
      const migrated = migrateV1IfNeeded();
      if (migrated) {
        writeSnapshot(migrated);
        return migrated;
      }
      return emptySnapshot();
    }
    return {
      packages: Array.isArray(parsed.packages) ? parsed.packages : [],
      timeline: Array.isArray(parsed.timeline) ? parsed.timeline : [],
      schemaVersion: SCHEMA_VERSION,
    };
  } catch {
    return emptySnapshot();
  }
}

function writeSnapshot(next: DocumentPackageSnapshot) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DOCUMENT_PACKAGE_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(DOCUMENT_PACKAGE_UPDATED_EVENT));
}

export function subscribeDocumentPackagesUpdated(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(DOCUMENT_PACKAGE_UPDATED_EVENT, listener);
  return () => window.removeEventListener(DOCUMENT_PACKAGE_UPDATED_EVENT, listener);
}

export function appendDocumentPackageTimeline(input: {
  packageId: string;
  eventType: DocumentPackageTimelineEventType;
  description: string;
  actorId: string;
  metadata?: Record<string, unknown>;
}): DocumentPackageTimelineEntry {
  const snap = readSnapshot();
  const entry: DocumentPackageTimelineEntry = {
    id: newId("dptl"),
    packageId: input.packageId,
    eventType: input.eventType,
    title: DOCUMENT_PACKAGE_TIMELINE_TITLES[input.eventType],
    description: input.description,
    actorId: input.actorId,
    occurredOn: new Date().toISOString(),
    metadata: input.metadata,
  };
  snap.timeline.unshift(entry);
  writeSnapshot(snap);
  return entry;
}

export function createDocumentPackage(
  input: CreateDocumentPackageInput,
): DocumentPackageRecord {
  const now = new Date().toISOString();
  const id = input.id?.trim() || newId("dpkg");
  const pkg: DocumentPackageRecord = {
    id,
    folderName: input.folderName.trim() || "Untitled Folder",
    status: "uploading",
    storageStatus: "local_authoring",
    documentIds: [],
    fileCount: 0,
    totalSizeBytes: 0,
    uploadedBy: input.uploadedBy,
    uploadedAt: now,
    updatedAt: now,
    createdBy: input.uploadedBy,
    version: 1,
    links: {
      ...input.links,
      parentEntityType: input.links.parentEntityType || "opportunity",
      parentEntityId:
        input.links.parentEntityId ||
        input.links.opportunityId ||
        input.links.loanFileId ||
        undefined,
    },
    relativePaths: {},
    completionPercent: 0,
    lastError: null,
    clientPackageId: id,
  };
  const snap = readSnapshot();
  snap.packages.unshift(pkg);
  writeSnapshot(snap);
  appendDocumentPackageTimeline({
    packageId: pkg.id,
    eventType: "package_created",
    description: `Package “${pkg.folderName}” created.`,
    actorId: input.uploadedBy,
  });
  return pkg;
}

export function getDocumentPackage(id: string): DocumentPackageRecord | undefined {
  return readSnapshot().packages.find((p) => p.id === id || p.clientPackageId === id);
}

export function listDocumentPackagesForRuntime(
  runtimeKey: string,
  opportunityId?: string | null,
): DocumentPackageRecord[] {
  const key = runtimeKey.trim();
  const oppId = opportunityId?.trim() || "";
  const keys = new Set([key, oppId].filter(Boolean));
  if (keys.size === 0) return [];
  return readSnapshot().packages.filter((p) => {
    if (p.status === "deleted") return false;
    if (p.links.loanFileId && keys.has(p.links.loanFileId)) return true;
    if (p.links.opportunityId && keys.has(p.links.opportunityId)) return true;
    if (p.links.parentEntityId && keys.has(p.links.parentEntityId)) return true;
    return false;
  });
}

export function listDocumentPackageTimeline(
  packageId: string,
): DocumentPackageTimelineEntry[] {
  return readSnapshot().timeline.filter((t) => t.packageId === packageId);
}

export function updateDocumentPackage(
  packageId: string,
  patch: Partial<DocumentPackageRecord>,
): DocumentPackageRecord | null {
  const snap = readSnapshot();
  const idx = snap.packages.findIndex(
    (p) => p.id === packageId || p.clientPackageId === packageId,
  );
  if (idx < 0) return null;
  const current = snap.packages[idx]!;
  const next: DocumentPackageRecord = {
    ...current,
    ...patch,
    id: current.id,
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
    version: typeof patch.version === "number" ? patch.version : current.version,
  };
  snap.packages[idx] = next;
  writeSnapshot(snap);
  return next;
}

export function renameDocumentPackage(
  packageId: string,
  folderName: string,
  actorId: string,
): DocumentPackageRecord | null {
  const name = folderName.trim();
  if (!name) return null;
  const updated = updateDocumentPackage(packageId, {
    folderName: name,
    version: (getDocumentPackage(packageId)?.version || 1) + 1,
  });
  if (updated) {
    appendDocumentPackageTimeline({
      packageId: updated.id,
      eventType: "package_renamed",
      description: `Package renamed to “${name}”.`,
      actorId,
    });
  }
  return updated;
}

export function attachDocumentToPackage(input: {
  packageId: string;
  documentId: string;
  relativePath: string;
  fileSizeBytes: number;
  expectedTotal?: number;
  uploadedSoFar?: number;
}): DocumentPackageRecord | null {
  const pkg = getDocumentPackage(input.packageId);
  if (!pkg || pkg.status === "deleted") return null;
  const documentIds = pkg.documentIds.includes(input.documentId)
    ? pkg.documentIds
    : [...pkg.documentIds, input.documentId];
  const relativePaths = {
    ...pkg.relativePaths,
    [input.documentId]: input.relativePath,
  };
  const fileCount = documentIds.length;
  const totalSizeBytes = pkg.documentIds.includes(input.documentId)
    ? pkg.totalSizeBytes
    : pkg.totalSizeBytes + input.fileSizeBytes;
  const expected = input.expectedTotal ?? fileCount;
  const done = input.uploadedSoFar ?? fileCount;
  const completionPercent =
    expected > 0 ? Math.min(100, Math.round((done / expected) * 100)) : 100;
  return updateDocumentPackage(input.packageId, {
    documentIds,
    relativePaths,
    fileCount,
    totalSizeBytes,
    completionPercent,
    status: completionPercent >= 100 ? "complete" : "uploading",
  });
}

export function finalizeDocumentPackage(
  packageId: string,
  status: DocumentPackageStatus = "complete",
  lastError?: string | null,
  storageStatus?: DocumentPackageStorageStatus,
): DocumentPackageRecord | null {
  return updateDocumentPackage(packageId, {
    status,
    completionPercent: status === "complete" ? 100 : undefined,
    lastError: lastError ?? null,
    storageStatus: storageStatus ?? "durable_metadata",
  });
}

export function softDeleteDocumentPackage(packageId: string): DocumentPackageRecord | null {
  return updateDocumentPackage(packageId, {
    status: "deleted",
    completionPercent: 0,
  });
}

export function removeDocumentIdFromPackage(
  packageId: string,
  documentId: string,
  fileSizeBytes: number,
): DocumentPackageRecord | null {
  const pkg = getDocumentPackage(packageId);
  if (!pkg) return null;
  const documentIds = pkg.documentIds.filter((id) => id !== documentId);
  const relativePaths = { ...pkg.relativePaths };
  delete relativePaths[documentId];
  return updateDocumentPackage(packageId, {
    documentIds,
    relativePaths,
    fileCount: documentIds.length,
    totalSizeBytes: Math.max(0, pkg.totalSizeBytes - fileSizeBytes),
  });
}

/** Merge durable server packages into local cache (no document duplication). */
export function mergeDurablePackagesIntoLocalCache(
  items: DurableDocumentPackageDto[],
): number {
  if (!items.length) return 0;
  const snap = readSnapshot();
  let n = 0;
  for (const item of items) {
    const clientId = item.clientPackageId?.trim() || item.id;
    const idx = snap.packages.findIndex(
      (p) => p.id === clientId || p.clientPackageId === clientId || p.id === item.id,
    );
    const mapped: DocumentPackageRecord = {
      id: clientId,
      folderName: item.folderName,
      status: (item.status as DocumentPackageStatus) || "complete",
      storageStatus: (item.storageStatus as DocumentPackageStorageStatus) || "durable_metadata",
      documentIds: item.documentIds || [],
      fileCount: item.fileCount,
      totalSizeBytes: item.totalSizeBytes,
      uploadedBy: item.uploadedBy,
      uploadedAt: item.createdAt,
      updatedAt: item.updatedAt,
      createdBy: item.createdBy || item.uploadedBy,
      version: item.version || 1,
      links: {
        opportunityId: item.opportunityId,
        loanFileId: item.loanFileId || undefined,
        contactId: item.contactId || undefined,
        customerId: item.customerId || undefined,
        participantId: item.participantId || undefined,
        documentScope: (item.documentScope as "applicant" | "shared" | "lender") || "applicant",
        parentEntityType:
          (item.parentEntityType as DocumentPackageRecord["links"]["parentEntityType"]) ||
          "opportunity",
        parentEntityId: item.parentEntityId || item.opportunityId,
      },
      relativePaths: item.relativePaths || {},
      completionPercent: 100,
      durableId: item.id,
      clientPackageId: clientId,
    };
    if (idx >= 0) {
      snap.packages[idx] = { ...snap.packages[idx]!, ...mapped, id: snap.packages[idx]!.id };
    } else {
      snap.packages.unshift(mapped);
    }
    n += 1;
  }
  writeSnapshot(snap);
  return n;
}

/**
 * Reconstruct packages from Document Registry records that carry packageId
 * when durable package rows are missing (legacy / pre-migration).
 */
export function reconstructPackagesFromRegistryRecords(
  records: Array<{
    id: string;
    status: string;
    fileSizeBytes: number;
    uploadedBy: string;
    uploadedAt: string;
    links: {
      packageId?: string;
      packageRelativePath?: string;
      opportunityId?: string;
      loanFileId?: string;
      contactId?: string;
      customerId?: string;
      participantId?: string;
      documentScope?: "applicant" | "shared" | "lender";
    };
    displayName: string;
  }>,
): number {
  const byPackage = new Map<string, typeof records>();
  for (const r of records) {
    if (r.status === "deleted") continue;
    const pid = r.links.packageId?.trim();
    if (!pid) continue;
    const list = byPackage.get(pid) || [];
    list.push(r);
    byPackage.set(pid, list);
  }
  if (!byPackage.size) return 0;
  let created = 0;
  for (const [packageId, docs] of byPackage) {
    const existing = getDocumentPackage(packageId);
    if (existing && existing.status !== "deleted") {
      // Ensure all doc ids are attached
      for (const d of docs) {
        if (!existing.documentIds.includes(d.id)) {
          attachDocumentToPackage({
            packageId,
            documentId: d.id,
            relativePath: d.links.packageRelativePath || d.displayName,
            fileSizeBytes: d.fileSizeBytes,
          });
        }
      }
      continue;
    }
    const first = docs[0]!;
    createDocumentPackage({
      id: packageId,
      folderName: `Recovered Package (${docs.length} files)`,
      uploadedBy: first.uploadedBy,
      links: {
        opportunityId: first.links.opportunityId,
        loanFileId: first.links.loanFileId,
        contactId: first.links.contactId,
        customerId: first.links.customerId,
        participantId: first.links.participantId,
        documentScope: first.links.documentScope,
        parentEntityType: "opportunity",
        parentEntityId: first.links.opportunityId || first.links.loanFileId,
      },
    });
    for (const d of docs) {
      attachDocumentToPackage({
        packageId,
        documentId: d.id,
        relativePath: d.links.packageRelativePath || d.displayName,
        fileSizeBytes: d.fileSizeBytes,
      });
    }
    finalizeDocumentPackage(packageId, "complete", null, "local_authoring");
    appendDocumentPackageTimeline({
      packageId,
      eventType: "package_hydrated",
      description: `Package reconstructed from ${docs.length} linked document(s).`,
      actorId: first.uploadedBy,
    });
    created += 1;
  }
  return created;
}
