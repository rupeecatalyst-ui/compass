/**
 * CO-DOC-003 — Document Package store (metadata SSOT for folder packages).
 * Contained files remain Document Registry records (single binary sink).
 */

import {
  DOCUMENT_PACKAGE_STORAGE_KEY,
  DOCUMENT_PACKAGE_TIMELINE_TITLES,
  DOCUMENT_PACKAGE_UPDATED_EVENT,
} from "@/constants/document-package";
import type {
  CreateDocumentPackageInput,
  DocumentPackageRecord,
  DocumentPackageSnapshot,
  DocumentPackageStatus,
  DocumentPackageTimelineEntry,
  DocumentPackageTimelineEventType,
} from "@/types/document-package";

const SCHEMA_VERSION = 1 as const;

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptySnapshot(): DocumentPackageSnapshot {
  return { packages: [], timeline: [], schemaVersion: SCHEMA_VERSION };
}

function readSnapshot(): DocumentPackageSnapshot {
  if (typeof window === "undefined") return emptySnapshot();
  try {
    const raw = localStorage.getItem(DOCUMENT_PACKAGE_STORAGE_KEY);
    if (!raw) return emptySnapshot();
    const parsed = JSON.parse(raw) as DocumentPackageSnapshot;
    if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) return emptySnapshot();
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
  const pkg: DocumentPackageRecord = {
    id: newId("dpkg"),
    folderName: input.folderName.trim() || "Untitled Folder",
    status: "uploading",
    documentIds: [],
    fileCount: 0,
    totalSizeBytes: 0,
    uploadedBy: input.uploadedBy,
    uploadedAt: now,
    updatedAt: now,
    links: { ...input.links },
    relativePaths: {},
    completionPercent: 0,
    lastError: null,
  };
  const snap = readSnapshot();
  snap.packages.unshift(pkg);
  writeSnapshot(snap);
  return pkg;
}

export function getDocumentPackage(id: string): DocumentPackageRecord | undefined {
  return readSnapshot().packages.find((p) => p.id === id);
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
  patch: Partial<
    Pick<
      DocumentPackageRecord,
      | "status"
      | "documentIds"
      | "fileCount"
      | "totalSizeBytes"
      | "relativePaths"
      | "completionPercent"
      | "lastError"
      | "updatedAt"
    >
  >,
): DocumentPackageRecord | null {
  const snap = readSnapshot();
  const idx = snap.packages.findIndex((p) => p.id === packageId);
  if (idx < 0) return null;
  const current = snap.packages[idx]!;
  const next: DocumentPackageRecord = {
    ...current,
    ...patch,
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
  };
  snap.packages[idx] = next;
  writeSnapshot(snap);
  return next;
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
  const totalSizeBytes = pkg.totalSizeBytes + (pkg.documentIds.includes(input.documentId) ? 0 : input.fileSizeBytes);
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
): DocumentPackageRecord | null {
  return updateDocumentPackage(packageId, {
    status,
    completionPercent: status === "complete" ? 100 : undefined,
    lastError: lastError ?? null,
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
