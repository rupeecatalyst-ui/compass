import { EDIE_DEFAULT_FILE_TYPES } from "@/constants/enterprise-document-intelligence-engine/file-types";

export const DOCUMENT_REGISTRY_STORAGE_KEY = "catalyst.document-registry.v1";
export const DOCUMENT_REGISTRY_UPDATED_EVENT = "compass:document-registry-updated";

/** Max single file — 25 MB for certification (IndexedDB-backed). */
export const DOCUMENT_REGISTRY_MAX_BYTES = 25 * 1024 * 1024;

export const DOCUMENT_REGISTRY_ACCEPT = EDIE_DEFAULT_FILE_TYPES.map((t) => {
  if (t.extension === "jpg" || t.extension === "jpeg") return ".jpg,.jpeg,image/jpeg";
  return `.${t.extension},${t.mimeType}`;
})
  .join(",")
  .replace(/,\./g, ",.");

export const DOCUMENT_REGISTRY_ALLOWED_EXTENSIONS = new Set(
  EDIE_DEFAULT_FILE_TYPES.map((t) => t.extension.toLowerCase()),
);

export const DOCUMENT_REGISTRY_ALLOWED_MIMES = new Set(
  EDIE_DEFAULT_FILE_TYPES.map((t) => t.mimeType.toLowerCase()),
);

export function formatDocumentFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
