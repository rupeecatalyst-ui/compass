/**
 * CO-DOC-003 — Document Package operations over Document Registry SSOT.
 */

import {
  deriveFolderNameFromFiles,
  packageRelativePath,
} from "@/constants/document-package";
import {
  deleteDocumentFromRegistry,
  downloadDocumentFromRegistry,
  getDocumentBlob,
  getDocumentRegistryRecord,
  uploadDocumentToRegistry,
} from "@/lib/document-registry";
import type { DocumentEntityLinks, DocumentUploadProgress } from "@/types/document-registry";
import type {
  DocumentPackageLinks,
  DocumentPackageRecord,
} from "@/types/document-package";
import {
  appendDocumentPackageTimeline,
  attachDocumentToPackage,
  createDocumentPackage,
  finalizeDocumentPackage,
  getDocumentPackage,
  softDeleteDocumentPackage,
  removeDocumentIdFromPackage,
  updateDocumentPackage,
} from "./store";
import { buildStoreZipBlob, triggerBlobDownload } from "./zip";

export {
  appendDocumentPackageTimeline,
  createDocumentPackage,
  getDocumentPackage,
  listDocumentPackagesForRuntime,
  listDocumentPackageTimeline,
  softDeleteDocumentPackage,
  subscribeDocumentPackagesUpdated,
  updateDocumentPackage,
  removeDocumentIdFromPackage,
} from "./store";

export type FolderUploadItem = {
  file: File;
  typeRef: string;
  categoryLabel: string;
};

export async function uploadFolderAsDocumentPackage(input: {
  files: FolderUploadItem[];
  uploadedBy: string;
  links: DocumentPackageLinks & DocumentEntityLinks;
  folderName?: string;
  onProgress?: (progress: DocumentUploadProgress & { fileIndex: number; fileTotal: number }) => void;
}): Promise<DocumentPackageRecord> {
  const folderName =
    input.folderName?.trim() ||
    deriveFolderNameFromFiles(input.files.map((f) => f.file));
  const pkg = createDocumentPackage({
    folderName,
    uploadedBy: input.uploadedBy,
    links: {
      loanFileId: input.links.loanFileId,
      opportunityId: input.links.opportunityId,
      contactId: input.links.contactId,
      customerId: input.links.customerId,
      participantId: input.links.participantId,
      documentScope: input.links.documentScope,
    },
  });

  const total = input.files.length;
  let success = 0;
  let failed = 0;
  let lastError: string | null = null;

  for (let i = 0; i < input.files.length; i++) {
    const item = input.files[i]!;
    const rel = packageRelativePath(item.file);
    input.onProgress?.({
      phase: "reading",
      percent: Math.round((i / Math.max(total, 1)) * 100),
      message: `Uploading ${item.file.name} (${i + 1}/${total})…`,
      fileIndex: i + 1,
      fileTotal: total,
    });
    try {
      const { record } = await uploadDocumentToRegistry(
        {
          file: item.file,
          typeRef: item.typeRef,
          categoryLabel: item.categoryLabel,
          uploadedBy: input.uploadedBy,
          links: {
            ...input.links,
            packageId: pkg.id,
            packageRelativePath: rel,
          },
          uploadSource: "folder_package",
        },
        (p) =>
          input.onProgress?.({
            ...p,
            fileIndex: i + 1,
            fileTotal: total,
            percent: Math.round(((i + p.percent / 100) / Math.max(total, 1)) * 100),
          }),
      );
      attachDocumentToPackage({
        packageId: pkg.id,
        documentId: record.id,
        relativePath: rel,
        fileSizeBytes: record.fileSizeBytes,
        expectedTotal: total,
        uploadedSoFar: success + 1,
      });
      success += 1;
      appendDocumentPackageTimeline({
        packageId: pkg.id,
        eventType: "file_added",
        description: `${record.displayName} added to package “${folderName}”.`,
        actorId: input.uploadedBy,
        metadata: { documentId: record.id, relativePath: rel },
      });
    } catch (err) {
      failed += 1;
      lastError = err instanceof Error ? err.message : "Upload failed";
      updateDocumentPackage(pkg.id, {
        completionPercent: Math.round(((success + failed) / Math.max(total, 1)) * 100),
        lastError,
        status: "uploading",
      });
    }
  }

  const status =
    failed === 0 ? "complete" : success === 0 ? "partial" : "partial";
  const finalized = finalizeDocumentPackage(pkg.id, status, lastError) ?? getDocumentPackage(pkg.id)!;
  appendDocumentPackageTimeline({
    packageId: pkg.id,
    eventType: "folder_uploaded",
    description: `Folder “${folderName}” uploaded — ${success} file(s)${failed ? `, ${failed} failed` : ""}.`,
    actorId: input.uploadedBy,
    metadata: { success, failed, fileCount: total },
  });
  input.onProgress?.({
    phase: failed && !success ? "error" : "complete",
    percent: 100,
    message:
      failed && !success
        ? `Folder upload failed — ${lastError}`
        : `Folder “${folderName}” ready (${success} file${success === 1 ? "" : "s"}).`,
    fileIndex: total,
    fileTotal: total,
  });
  return finalized;
}

export async function addFilesToDocumentPackage(input: {
  packageId: string;
  files: FolderUploadItem[];
  uploadedBy: string;
  links: DocumentEntityLinks;
  onProgress?: (progress: DocumentUploadProgress & { fileIndex: number; fileTotal: number }) => void;
}): Promise<DocumentPackageRecord | null> {
  const pkg = getDocumentPackage(input.packageId);
  if (!pkg || pkg.status === "deleted") return null;
  updateDocumentPackage(pkg.id, { status: "uploading" });
  const total = input.files.length;
  let done = 0;
  for (let i = 0; i < input.files.length; i++) {
    const item = input.files[i]!;
    const rel = packageRelativePath(item.file);
    try {
      const { record } = await uploadDocumentToRegistry(
        {
          file: item.file,
          typeRef: item.typeRef,
          categoryLabel: item.categoryLabel,
          uploadedBy: input.uploadedBy,
          links: {
            ...input.links,
            packageId: pkg.id,
            packageRelativePath: rel,
          },
          uploadSource: "folder_package",
        },
        (p) =>
          input.onProgress?.({
            ...p,
            fileIndex: i + 1,
            fileTotal: total,
          }),
      );
      attachDocumentToPackage({
        packageId: pkg.id,
        documentId: record.id,
        relativePath: rel,
        fileSizeBytes: record.fileSizeBytes,
      });
      appendDocumentPackageTimeline({
        packageId: pkg.id,
        eventType: "file_added",
        description: `${record.displayName} added to package “${pkg.folderName}”.`,
        actorId: input.uploadedBy,
        metadata: { documentId: record.id },
      });
      done += 1;
    } catch {
      /* continue remaining */
    }
  }
  return finalizeDocumentPackage(pkg.id, done > 0 ? "complete" : "partial");
}

export async function downloadDocumentPackageAsZip(
  packageId: string,
): Promise<{ ok: true; filename: string } | { ok: false; reason: string }> {
  const pkg = getDocumentPackage(packageId);
  if (!pkg || pkg.status === "deleted") {
    return { ok: false, reason: "Document package not found." };
  }
  const entries: { path: string; data: Uint8Array }[] = [];
  for (const docId of pkg.documentIds) {
    const record = getDocumentRegistryRecord(docId);
    if (!record || record.status === "deleted") continue;
    const current = record.versions.find((v) => v.isCurrent) ?? record.versions[0];
    if (!current) continue;
    const blob = await getDocumentBlob(current.blobId);
    if (!blob) continue;
    const buf = new Uint8Array(await blob.arrayBuffer());
    const path =
      pkg.relativePaths[docId] ||
      record.links.packageRelativePath ||
      record.originalFilename;
    entries.push({ path: `${pkg.folderName}/${path}`, data: buf });
  }
  if (!entries.length) {
    return { ok: false, reason: "No downloadable files in this package." };
  }
  const zip = buildStoreZipBlob(entries);
  const filename = `${pkg.folderName.replace(/[^\w.-]+/g, "_") || "document-package"}.zip`;
  triggerBlobDownload(zip, filename);
  return { ok: true, filename };
}

/** Fallback: download each file individually when ZIP is undesirable. */
export async function downloadDocumentPackageFilesIndividually(
  packageId: string,
): Promise<number> {
  const pkg = getDocumentPackage(packageId);
  if (!pkg) return 0;
  let n = 0;
  for (const docId of pkg.documentIds) {
    const record = getDocumentRegistryRecord(docId);
    if (!record || record.status === "deleted") continue;
    try {
      await downloadDocumentFromRegistry(record);
      n += 1;
    } catch {
      /* skip missing blobs */
    }
  }
  return n;
}

export async function deleteDocumentPackageWithContents(input: {
  packageId: string;
  actorId: string;
  deleteContainedFiles: boolean;
}): Promise<boolean> {
  const pkg = getDocumentPackage(input.packageId);
  if (!pkg) return false;
  if (input.deleteContainedFiles) {
    for (const docId of [...pkg.documentIds]) {
      const record = getDocumentRegistryRecord(docId);
      await deleteDocumentFromRegistry(docId);
      if (record) {
        removeDocumentIdFromPackage(pkg.id, docId, record.fileSizeBytes);
        appendDocumentPackageTimeline({
          packageId: pkg.id,
          eventType: "file_deleted",
          description: `${record.displayName} deleted from package “${pkg.folderName}”.`,
          actorId: input.actorId,
          metadata: { documentId: docId },
        });
      }
    }
  }
  softDeleteDocumentPackage(input.packageId);
  appendDocumentPackageTimeline({
    packageId: input.packageId,
    eventType: "folder_deleted",
    description: `Folder “${pkg.folderName}” deleted.`,
    actorId: input.actorId,
  });
  return true;
}

export function markDocumentPackageOpened(packageId: string, actorId: string) {
  appendDocumentPackageTimeline({
    packageId,
    eventType: "folder_opened",
    description: "Folder opened in Document Workspace.",
    actorId,
  });
}
