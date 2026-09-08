/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014B
 * Server-side Document Workspace security policy.
 * Per-file upload limit stays DOCUMENT_REGISTRY_MAX_BYTES — never the 50 MB ZIP share cap.
 * Malware scanning is not implemented; do not invent scan-pass results.
 */

import {
  DOCUMENT_REGISTRY_ALLOWED_EXTENSIONS,
  DOCUMENT_REGISTRY_ALLOWED_MIMES,
  DOCUMENT_REGISTRY_MAX_BYTES,
} from "@/constants/document-registry";
import { ETD_OBJECT_STORAGE_MAX_BYTES } from "@/constants/enterprise-document-object-storage";
import { DOCUMENT_WORKSPACE_ZIP_MAX_BYTES } from "@/constants/document-workspace-refinement-014";

export const DOCUMENT_WORKSPACE_SECURITY_ID =
  "CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014B" as const;

export const DOCUMENT_WORKSPACE_UPLOAD_MAX_BYTES = DOCUMENT_REGISTRY_MAX_BYTES;
/** Effective per-file ceiling: never above the active object-store max. ZIP cap stays separate. */
export const DOCUMENT_WORKSPACE_EFFECTIVE_UPLOAD_MAX_BYTES = Math.min(
  DOCUMENT_WORKSPACE_UPLOAD_MAX_BYTES,
  ETD_OBJECT_STORAGE_MAX_BYTES,
);
export const DOCUMENT_WORKSPACE_SHARE_ZIP_MAX_BYTES = DOCUMENT_WORKSPACE_ZIP_MAX_BYTES;
export const DOCUMENT_WORKSPACE_FILENAME_MAX_CHARS = 180;

/** No scanner is wired. Quarantine is a status hook only. */
export const DOCUMENT_WORKSPACE_MALWARE_SCANNING_ENABLED = false;
export const DOCUMENT_WORKSPACE_QUARANTINE_STATUS = "quarantined" as const;

export const DOCUMENT_WORKSPACE_ALLOWED_EXTENSIONS = DOCUMENT_REGISTRY_ALLOWED_EXTENSIONS;
export const DOCUMENT_WORKSPACE_ALLOWED_MIMES = DOCUMENT_REGISTRY_ALLOWED_MIMES;

export const DOCUMENT_WORKSPACE_DANGEROUS_EXTENSIONS = new Set([
  "exe",
  "bat",
  "cmd",
  "com",
  "msi",
  "dll",
  "scr",
  "ps1",
  "sh",
  "bash",
  "js",
  "mjs",
  "cjs",
  "vbs",
  "jar",
  "app",
  "dmg",
  "html",
  "htm",
  "php",
  "asp",
  "aspx",
  "cgi",
]);

/** Inline preview only — SVG/HTML/XML stay attachment to avoid script execution. */
export const DOCUMENT_WORKSPACE_INLINE_PREVIEW_EXTENSIONS = new Set([
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "tiff",
]);

export const DOCUMENT_WORKSPACE_INLINE_PREVIEW_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
]);

export const DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE = "Resource is not available.";
export const DOCUMENT_WORKSPACE_GENERIC_FORBIDDEN = "You are not allowed to perform this action.";
export const DOCUMENT_WORKSPACE_GENERIC_UPLOAD_LINK = "Upload link is not available.";
export const DOCUMENT_WORKSPACE_GENERIC_FILE_REJECTED = "This file could not be accepted.";
export const DOCUMENT_WORKSPACE_GENERIC_UNAUTHENTICATED = "Authentication required.";
