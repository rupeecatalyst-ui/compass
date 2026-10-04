/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014B
 * Canonical server upload / download file policy. Do not trust browser metadata.
 */

import {
  DOCUMENT_WORKSPACE_ALLOWED_EXTENSIONS,
  DOCUMENT_WORKSPACE_ALLOWED_MIMES,
  DOCUMENT_WORKSPACE_DANGEROUS_EXTENSIONS,
  DOCUMENT_WORKSPACE_FILENAME_MAX_CHARS,
  DOCUMENT_WORKSPACE_GENERIC_FILE_REJECTED,
  DOCUMENT_WORKSPACE_INLINE_PREVIEW_EXTENSIONS,
  DOCUMENT_WORKSPACE_INLINE_PREVIEW_MIMES,
  DOCUMENT_WORKSPACE_EFFECTIVE_UPLOAD_MAX_BYTES,
} from "@/constants/document-workspace-security";

export type DocumentWorkspaceFileValidationOk = {
  ok: true;
  extension: string;
  mimeType: string;
  safeFilename: string;
  detectedKind: string | null;
};

export type DocumentWorkspaceFileValidationFail = {
  ok: false;
  code:
    | "EMPTY"
    | "TOO_LARGE"
    | "UNSAFE_NAME"
    | "UNSUPPORTED"
    | "EXTENSION_MIME_MISMATCH"
    | "DOUBLE_EXTENSION"
    | "DANGEROUS"
    | "SIGNATURE_MISMATCH"
    | "MALFORMED";
  message: string;
};

export type DocumentWorkspaceFileValidationResult =
  | DocumentWorkspaceFileValidationOk
  | DocumentWorkspaceFileValidationFail;

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  rtf: "application/rtf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  bmp: "image/bmp",
  tiff: "image/tiff",
  webp: "image/webp",
  heic: "image/heic",
  svg: "image/svg+xml",
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
  xml: "application/xml",
  json: "application/json",
  eml: "message/rfc822",
  msg: "application/vnd.ms-outlook",
  webm: "audio/webm",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
};

function fail(
  code: DocumentWorkspaceFileValidationFail["code"],
  message = DOCUMENT_WORKSPACE_GENERIC_FILE_REJECTED,
): DocumentWorkspaceFileValidationFail {
  return { ok: false, code, message };
}

export function splitFilenameExtensions(name: string): string[] {
  const base = name.replace(/\\/g, "/").split("/").pop() || "";
  const parts = base.toLowerCase().split(".").filter(Boolean);
  if (parts.length <= 1) return parts.length === 1 ? [] : [];
  return parts.slice(1);
}

export function lastFilenameExtension(name: string): string {
  const parts = splitFilenameExtensions(name);
  return parts[parts.length - 1] || "";
}

export function sanitizeDownloadFilename(name: string): string {
  const leaf = String(name || "")
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.replace(/\0/g, "")
    .replace(/[\r\n"]/g, "")
    .trim() || "document";
  const clipped = leaf.slice(0, DOCUMENT_WORKSPACE_FILENAME_MAX_CHARS);
  return clipped.replace(/[^\w.\- ()[\]]+/g, "_") || "document";
}

export function filenameLooksUnsafe(name: string): boolean {
  const raw = String(name || "");
  if (!raw.trim()) return true;
  if (raw.length > DOCUMENT_WORKSPACE_FILENAME_MAX_CHARS) return true;
  if (raw.includes("\0") || raw.includes("..")) return true;
  if (/[\\/]/.test(raw)) return true;
  return false;
}

export function hasDangerousDoubleExtension(name: string): boolean {
  const parts = splitFilenameExtensions(name);
  if (parts.length < 2) return false;
  return parts.some((part) => DOCUMENT_WORKSPACE_DANGEROUS_EXTENSIONS.has(part));
}

export function detectFileSignatureKind(bytes: Uint8Array | null | undefined): string | null {
  if (!bytes || bytes.byteLength < 4) return null;
  const b = bytes;
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "pdf";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "gif";
  if (
    b.byteLength >= 12 &&
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    return "webp";
  }
  if (b[0] === 0x50 && b[1] === 0x4b) return "zip";
  if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return "ole";
  return null;
}

function mimeAliasAllowed(ext: string, declared: string): boolean {
  if ((ext === "jpg" || ext === "jpeg") && (declared === "image/jpeg" || declared === "image/jpg")) {
    return true;
  }
  if (ext === "csv" && (declared === "text/csv" || declared === "application/csv" || declared === "text/plain")) {
    return true;
  }
  if (ext === "txt" && (declared === "text/plain" || declared === "text/csv")) {
    return true;
  }
  return false;
}

function signatureMatchesExtension(kind: string | null, ext: string): boolean {
  if (!kind) return true;
  if (kind === "pdf") return ext === "pdf";
  if (kind === "jpeg") return ext === "jpg" || ext === "jpeg";
  if (kind === "png") return ext === "png";
  if (kind === "gif") return ext === "gif";
  if (kind === "webp") return ext === "webp";
  if (kind === "zip") {
    return ext === "zip" || ext === "docx" || ext === "xlsx" || ext === "pptx";
  }
  if (kind === "ole") return ext === "doc" || ext === "xls" || ext === "ppt" || ext === "msg";
  return true;
}

export function validateDocumentWorkspaceUpload(input: {
  filename: string;
  declaredMime?: string | null;
  byteLength: number;
  bytes?: Uint8Array | null;
  maxBytes?: number;
}): DocumentWorkspaceFileValidationResult {
  const maxBytes = input.maxBytes ?? DOCUMENT_WORKSPACE_EFFECTIVE_UPLOAD_MAX_BYTES;
  if (input.byteLength <= 0) {
    return fail("EMPTY", "The file is empty.");
  }
  if (input.byteLength > maxBytes) {
    return fail(
      "TOO_LARGE",
      `Each file must be ${Math.round(maxBytes / (1024 * 1024))} MB or smaller.`,
    );
  }
  if (filenameLooksUnsafe(input.filename)) {
    return fail("UNSAFE_NAME", "The file name is not allowed.");
  }
  if (hasDangerousDoubleExtension(input.filename)) {
    return fail("DOUBLE_EXTENSION", DOCUMENT_WORKSPACE_GENERIC_FILE_REJECTED);
  }
  const ext = lastFilenameExtension(input.filename);
  if (!ext || DOCUMENT_WORKSPACE_DANGEROUS_EXTENSIONS.has(ext)) {
    return fail("DANGEROUS", DOCUMENT_WORKSPACE_GENERIC_FILE_REJECTED);
  }
  if (!DOCUMENT_WORKSPACE_ALLOWED_EXTENSIONS.has(ext)) {
    return fail("UNSUPPORTED", DOCUMENT_WORKSPACE_GENERIC_FILE_REJECTED);
  }
  const declaredRaw = String(input.declaredMime || "").trim().toLowerCase();
  const declared =
    !declaredRaw || declaredRaw === "application/octet-stream" ? "" : declaredRaw;
  const expectedMime = MIME_BY_EXT[ext] || "";
  if (declared && !DOCUMENT_WORKSPACE_ALLOWED_MIMES.has(declared) && !mimeAliasAllowed(ext, declared)) {
    return fail("UNSUPPORTED", DOCUMENT_WORKSPACE_GENERIC_FILE_REJECTED);
  }
  if (declared && expectedMime && declared !== expectedMime && !mimeAliasAllowed(ext, declared)) {
    return fail("EXTENSION_MIME_MISMATCH", DOCUMENT_WORKSPACE_GENERIC_FILE_REJECTED);
  }
  const detectedKind = detectFileSignatureKind(input.bytes || null);
  if (input.bytes && input.bytes.byteLength > 0 && !signatureMatchesExtension(detectedKind, ext)) {
    return fail("SIGNATURE_MISMATCH", DOCUMENT_WORKSPACE_GENERIC_FILE_REJECTED);
  }
  return {
    ok: true,
    extension: ext,
    mimeType: declared || expectedMime || "application/octet-stream",
    safeFilename: sanitizeDownloadFilename(input.filename),
    detectedKind,
  };
}

export function isSafeDocumentStorageKey(storageKey: string): boolean {
  const key = String(storageKey || "");
  if (!key || key.includes("..") || key.includes("\\") || key.includes("\0")) return false;
  if (!key.startsWith("etd/")) return false;
  return true;
}

export function shouldInlinePreview(input: {
  mimeType?: string | null;
  filename?: string | null;
}): boolean {
  const ext = lastFilenameExtension(input.filename || "");
  const mime = String(input.mimeType || "").toLowerCase();
  if (ext && DOCUMENT_WORKSPACE_INLINE_PREVIEW_EXTENSIONS.has(ext)) return true;
  if (mime && DOCUMENT_WORKSPACE_INLINE_PREVIEW_MIMES.has(mime)) return true;
  return false;
}

export function buildContentDisposition(filename: string, inline: boolean): string {
  const safe = sanitizeDownloadFilename(filename);
  const type = inline ? "inline" : "attachment";
  return `${type}; filename="${safe.replace(/"/g, "")}"`;
}

export function documentWorkspaceDownloadHeaders(input: {
  mimeType: string;
  filename: string;
  inline: boolean;
}): Record<string, string> {
  return {
    "Content-Type": input.mimeType || "application/octet-stream",
    "Content-Disposition": buildContentDisposition(input.filename, input.inline),
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "X-Frame-Options": "DENY",
  };
}
