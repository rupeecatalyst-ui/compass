/**
 * COMPASS customer portal upload policy — narrower than full Document Registry.
 * Mobile capture: PDF + common image formats only.
 */
import { DOCUMENT_REGISTRY_MAX_BYTES } from "@/constants/document-registry";

export const COMPASS_CUSTOMER_UPLOAD_MAX_BYTES = DOCUMENT_REGISTRY_MAX_BYTES;

/** Approved COMPASS customer upload types (matches compass mobile-file-input SSOT). */
export const COMPASS_CUSTOMER_UPLOAD_TYPES = [
  { extension: "pdf", mimeType: "application/pdf" },
  { extension: "jpg", mimeType: "image/jpeg" },
  { extension: "jpeg", mimeType: "image/jpeg" },
  { extension: "png", mimeType: "image/png" },
  { extension: "webp", mimeType: "image/webp" },
] as const;

export const COMPASS_CUSTOMER_ALLOWED_EXTENSIONS = new Set(
  COMPASS_CUSTOMER_UPLOAD_TYPES.map((t) => t.extension),
);

export const COMPASS_CUSTOMER_ALLOWED_MIMES = new Set(
  COMPASS_CUSTOMER_UPLOAD_TYPES.map((t) => t.mimeType),
);

/** Executable, script, archive and other disallowed formats for COMPASS intake. */
export const COMPASS_CUSTOMER_BLOCKED_EXTENSIONS = new Set([
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
  "deb",
  "rpm",
  "zip",
  "rar",
  "7z",
  "tar",
  "gz",
  "bz2",
  "xz",
  "iso",
  "html",
  "htm",
  "svg",
  "php",
  "asp",
  "aspx",
  "cgi",
]);

export const COMPASS_CUSTOMER_BLOCKED_MIME_PREFIXES = [
  "application/x-ms",
  "application/x-executable",
  "application/x-dosexec",
  "application/vnd.microsoft.portable-executable",
  "application/java-archive",
  "application/zip",
  "application/x-zip",
  "application/x-rar",
  "application/x-7z",
  "application/x-tar",
  "application/gzip",
  "text/html",
  "text/javascript",
  "application/javascript",
] as const;

export const COMPASS_CUSTOMER_UPLOAD_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp";
