/**
 * Browser-only temporary ZIP download.
 * The ZIP is never written to the Enterprise Document Registry.
 */

import { getDocumentBlob } from "@/lib/document-registry/blob-store";
import { buildStoreZipBlob, triggerBlobDownload } from "@/lib/document-package/zip";
import { planDocumentWorkspaceZip, type ZipPackageFile } from "@/lib/document-workspace/zip-package";
import type { DocumentRegistryRecord } from "@/types/document-registry";

export async function downloadTemporaryDocumentWorkspaceZip(input: {
  records: DocumentRegistryRecord[];
  partyFolder: string;
  filename: string;
}): Promise<{ ok: true; manifest: { files: Array<{ documentId: string; versionId: string; version: number; path: string }> } } | { ok: false; code: string }> {
  const files: ZipPackageFile[] = [];
  for (const record of input.records) {
    const version = record.versions.find((item) => item.isCurrent) ?? record.versions[0];
    if (!version) continue;
    const blob = await getDocumentBlob(version.blobId);
    if (!blob) continue;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    files.push({
      documentId: record.id,
      versionId: version.id,
      versionNumber: version.version,
      partyFolder: input.partyFolder,
      categoryFolder: record.categoryLabel || "Documents",
      filename: version.originalFilename || record.displayName || "document",
      bytes,
    });
  }
  const planned = planDocumentWorkspaceZip(files);
  if (!planned.ok) return planned;
  const blob = buildStoreZipBlob(planned.entries);
  triggerBlobDownload(blob, input.filename);
  return { ok: true, manifest: planned.manifest };
}
