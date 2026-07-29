/**
 * CO-DOC-003 — Document Package constants (folder upload).
 */

export const DOCUMENT_PACKAGE_STORAGE_KEY = "catalyst.document-packages.v1";
export const DOCUMENT_PACKAGE_UPDATED_EVENT = "compass:document-packages-updated";

export const DOCUMENT_PACKAGE_TIMELINE_TITLES: Record<
  import("@/types/document-package").DocumentPackageTimelineEventType,
  string
> = {
  folder_uploaded: "Folder Uploaded",
  folder_opened: "Folder Opened",
  file_added: "File Added",
  file_replaced: "File Replaced",
  file_deleted: "File Deleted",
  folder_deleted: "Folder Deleted",
};

/** Derive root folder name from webkitRelativePath (e.g. "KYC Pack/pan.pdf" → "KYC Pack"). */
export function deriveFolderNameFromFiles(files: File[]): string {
  for (const file of files) {
    const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath?.trim();
    if (rel) {
      const root = rel.split(/[/\\]/).filter(Boolean)[0];
      if (root) return root;
    }
  }
  return `Document Package ${new Date().toLocaleString("en-IN")}`;
}

export function packageRelativePath(file: File): string {
  const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath?.trim();
  if (rel) {
    const parts = rel.split(/[/\\]/).filter(Boolean);
    return parts.slice(1).join("/") || file.name;
  }
  return file.name;
}
