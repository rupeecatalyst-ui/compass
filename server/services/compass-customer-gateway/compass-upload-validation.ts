import {
  COMPASS_CUSTOMER_ALLOWED_EXTENSIONS,
  COMPASS_CUSTOMER_ALLOWED_MIMES,
  COMPASS_CUSTOMER_BLOCKED_EXTENSIONS,
  COMPASS_CUSTOMER_BLOCKED_MIME_PREFIXES,
  COMPASS_CUSTOMER_UPLOAD_MAX_BYTES,
  COMPASS_CUSTOMER_UPLOAD_TYPES,
} from "@/constants/compass-customer-gateway/upload-policy";
import { getFileExtension } from "@/lib/document-registry/file-utils";

export type CompassUploadValidationResult =
  | { ok: true; extension: string; mimeType: string }
  | { ok: false; code: string; message: string; httpStatus: number };

export class CompassUploadRejectedError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(input: { code: string; message: string; httpStatus?: number }) {
    super(input.message);
    this.name = "CompassUploadRejectedError";
    this.code = input.code;
    this.httpStatus = input.httpStatus ?? 415;
  }
}

function extensionForMime(mime: string): string | null {
  const normalized = mime.toLowerCase();
  const match = COMPASS_CUSTOMER_UPLOAD_TYPES.find((t) => t.mimeType === normalized);
  return match?.extension ?? null;
}

function mimeMatchesExtension(ext: string, mime: string): boolean {
  const normalizedExt = ext.toLowerCase();
  const normalizedMime = mime.toLowerCase();
  if (normalizedExt === "jpg" || normalizedExt === "jpeg") {
    return normalizedMime === "image/jpeg";
  }
  const expected = COMPASS_CUSTOMER_UPLOAD_TYPES.find((t) => t.extension === normalizedExt);
  return expected ? expected.mimeType === normalizedMime : false;
}

export function validateCompassCustomerUpload(input: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}): CompassUploadValidationResult {
  const ext = getFileExtension(input.fileName);
  const mime = (input.mimeType || "").trim().toLowerCase();
  const size = input.sizeBytes;

  if (!Number.isFinite(size) || size <= 0) {
    return {
      ok: false,
      code: "EMPTY_FILE",
      message: "File is empty.",
      httpStatus: 400,
    };
  }

  if (size > COMPASS_CUSTOMER_UPLOAD_MAX_BYTES) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      message: `File exceeds ${Math.round(COMPASS_CUSTOMER_UPLOAD_MAX_BYTES / (1024 * 1024))} MB limit.`,
      httpStatus: 413,
    };
  }

  if (ext && COMPASS_CUSTOMER_BLOCKED_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      code: "BLOCKED_FILE_TYPE",
      message: "This file type is not permitted for COMPASS uploads.",
      httpStatus: 415,
    };
  }

  if (mime && COMPASS_CUSTOMER_BLOCKED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix))) {
    return {
      ok: false,
      code: "BLOCKED_MIME_TYPE",
      message: "This file type is not permitted for COMPASS uploads.",
      httpStatus: 415,
    };
  }

  const extAllowed = ext ? COMPASS_CUSTOMER_ALLOWED_EXTENSIONS.has(ext as typeof COMPASS_CUSTOMER_UPLOAD_TYPES[number]["extension"]) : false;
  const mimeAllowed = mime ? COMPASS_CUSTOMER_ALLOWED_MIMES.has(mime as typeof COMPASS_CUSTOMER_UPLOAD_TYPES[number]["mimeType"]) : false;

  if (!ext && !mime) {
    return {
      ok: false,
      code: "UNKNOWN_FILE_TYPE",
      message: "Unsupported file type. Use PDF or image files (JPEG, PNG, WebP).",
      httpStatus: 415,
    };
  }

  if (ext && !extAllowed) {
    return {
      ok: false,
      code: "UNSUPPORTED_EXTENSION",
      message: "Unsupported file type. Use PDF or image files (JPEG, PNG, WebP).",
      httpStatus: 415,
    };
  }

  if (mime && !mimeAllowed) {
    return {
      ok: false,
      code: "UNSUPPORTED_MIME",
      message: "Unsupported file type. Use PDF or image files (JPEG, PNG, WebP).",
      httpStatus: 415,
    };
  }

  if (ext && mime && !mimeMatchesExtension(ext, mime)) {
    return {
      ok: false,
      code: "MIME_EXTENSION_MISMATCH",
      message: "File extension does not match the declared content type.",
      httpStatus: 415,
    };
  }

  const resolvedExt = ext || extensionForMime(mime) || "";
  const resolvedMime = mime || COMPASS_CUSTOMER_UPLOAD_TYPES.find((t) => t.extension === resolvedExt)?.mimeType || "";

  if (!resolvedExt || !resolvedMime) {
    return {
      ok: false,
      code: "UNKNOWN_FILE_TYPE",
      message: "Unsupported file type. Use PDF or image files (JPEG, PNG, WebP).",
      httpStatus: 415,
    };
  }

  return { ok: true, extension: resolvedExt, mimeType: resolvedMime };
}

export function assertCompassCustomerUpload(input: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}): { extension: string; mimeType: string } {
  const result = validateCompassCustomerUpload(input);
  if (!result.ok) {
    throw new CompassUploadRejectedError({
      code: result.code,
      message: result.message,
      httpStatus: result.httpStatus,
    });
  }
  return { extension: result.extension, mimeType: result.mimeType };
}

/**
 * Malware scanning integration point.
 * Existing type and size checks stay in force.
 * Enforcement fails closed only when COMPASS_MALWARE_SCAN_MODE=enforce
 * and no scanner is configured. Default mode preserves current uploads.
 */
export function assertMalwareScanPolicy(): { scanStatus: "not_enforced" | "scanner_configured" } {
  const mode = process.env.COMPASS_MALWARE_SCAN_MODE?.trim() || "observe";
  const scanner = process.env.COMPASS_MALWARE_SCANNER?.trim() || "";
  if (mode === "enforce" && !scanner) {
    throw new CompassUploadRejectedError({
      code: "MALWARE_SCAN_UNAVAILABLE",
      message: "We cannot accept this file right now. Please try again later.",
      httpStatus: 503,
    });
  }
  return { scanStatus: scanner ? "scanner_configured" : "not_enforced" };
}
