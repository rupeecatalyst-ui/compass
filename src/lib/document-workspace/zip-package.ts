/**
 * Temporary ZIP packaging for Send Documents.
 * Never persist the ZIP as a registry document.
 */

import { DOCUMENT_WORKSPACE_MANIFEST_FILENAME, DOCUMENT_WORKSPACE_ZIP_MAX_BYTES } from "@/constants/document-workspace-refinement-014";

export type ZipPackageFile = {
  documentId: string;
  versionId: string;
  versionNumber: number;
  partyFolder: string;
  categoryFolder: string;
  filename: string;
  bytes: Uint8Array;
};

export type ZipPackageManifestEntry = {
  documentId: string;
  versionId: string;
  version: number;
  path: string;
  bytes: number;
};

function safeSegment(value: string): string {
  const cleaned = value.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ").trim() || "item";
  return cleaned.slice(0, 80);
}

function uniquePath(used: Set<string>, proposed: string): string {
  if (!used.has(proposed.toLowerCase())) {
    used.add(proposed.toLowerCase());
    return proposed;
  }
  const dot = proposed.lastIndexOf(".");
  const stem = dot > 0 ? proposed.slice(0, dot) : proposed;
  const ext = dot > 0 ? proposed.slice(dot) : "";
  let n = 2;
  let next = `${stem} (${n})${ext}`;
  while (used.has(next.toLowerCase())) {
    n += 1;
    next = `${stem} (${n})${ext}`;
  }
  used.add(next.toLowerCase());
  return next;
}

export function planDocumentWorkspaceZip(files: ZipPackageFile[]): {
  ok: true;
  entries: Array<{ path: string; data: Uint8Array }>;
  manifest: { createdAt: string; files: ZipPackageManifestEntry[]; totalBytes: number };
} | {
  ok: false;
  code: "EMPTY" | "PACKAGE_TOO_LARGE";
  totalBytes: number;
} {
  if (!files.length) return { ok: false, code: "EMPTY", totalBytes: 0 };
  const used = new Set<string>();
  const entries: Array<{ path: string; data: Uint8Array }> = [];
  const manifestFiles: ZipPackageManifestEntry[] = [];
  let totalBytes = 0;

  for (const file of files) {
    totalBytes += file.bytes.byteLength;
    const path = uniquePath(
      used,
      `${safeSegment(file.partyFolder)}/${safeSegment(file.categoryFolder)}/${safeSegment(file.filename)}`,
    );
    entries.push({ path, data: file.bytes });
    manifestFiles.push({
      documentId: file.documentId,
      versionId: file.versionId,
      version: file.versionNumber,
      path,
      bytes: file.bytes.byteLength,
    });
  }

  if (totalBytes > DOCUMENT_WORKSPACE_ZIP_MAX_BYTES) {
    return { ok: false, code: "PACKAGE_TOO_LARGE", totalBytes };
  }

  const manifest = {
    createdAt: new Date().toISOString(),
    files: manifestFiles,
    totalBytes,
  };
  const encoder = new TextEncoder();
  entries.push({
    path: DOCUMENT_WORKSPACE_MANIFEST_FILENAME,
    data: encoder.encode(JSON.stringify(manifest, null, 2)),
  });
  return { ok: true, entries, manifest };
}
