/**
 * CO-DOC-005 — Document Package Registry constants.
 */

export const DOCUMENT_PACKAGE_STORAGE_KEY = "catalyst.document-packages.v2";
/** Legacy CO-DOC-003 key — migrated once into v2 on read. */
export const DOCUMENT_PACKAGE_STORAGE_KEY_V1 = "catalyst.document-packages.v1";
export const DOCUMENT_PACKAGE_UPDATED_EVENT = "compass:document-packages-updated";

export const DOCUMENT_PACKAGE_TIMELINE_TITLES: Record<
  import("@/types/document-package").DocumentPackageTimelineEventType,
  string
> = {
  package_created: "Package Created",
  folder_uploaded: "Folder Uploaded",
  folder_opened: "Folder Opened",
  file_added: "File Added",
  file_replaced: "File Replaced",
  file_deleted: "File Deleted",
  package_downloaded: "Package Downloaded",
  package_deleted: "Package Deleted",
  package_renamed: "Package Renamed",
  preview_opened: "Preview Opened",
  package_hydrated: "Package Hydrated",
};

/** Soft threshold — above this, content is not inlined to Postgres (durable object path). */
export const DOCUMENT_PACKAGE_INLINE_MAX_BYTES = 4 * 1024 * 1024;

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
