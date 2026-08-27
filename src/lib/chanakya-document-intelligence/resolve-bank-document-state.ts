/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-013 — Bank document availability state resolution.
 * Never upgrades metadata-only pre-STORAGE-009 documents to readable.
 */

import { ETD_INLINE_CONTENT_BYTES_MAX } from "@/constants/enterprise-document-object-storage";
import type {
  ChanakyaBankDocumentAvailabilityState,
  ChanakyaDocumentReadingStatus,
} from "@/types/chanakya-document-intelligence";

export function isBankStatementDocument(input: {
  displayName: string;
  typeRef?: string;
  familyHint?: string;
}): boolean {
  const name = input.displayName.toLowerCase();
  const type = (input.typeRef || "").toLowerCase();
  if (type.includes("bank-statement") || type === "doc:bank-statement") return true;
  if (/bank statement|account statement|passbook|statement of account/i.test(name)) {
    return true;
  }
  if (input.familyHint === "banking") return true;
  // Exclude DPR / project reports that happen to contain "bank" in filename.
  if (/bankable|dpr|project report/i.test(name)) return false;
  return /\baxis bank\b|\bhdfc\b|\bicici\b|\bsbi\b|\bkotak\b/i.test(name);
}

export function resolveBankDocumentState(input: {
  isBankDocument: boolean;
  hasBinary: boolean;
  binarySource: "inline" | "object_store" | "none";
  fileSizeBytes: number;
  storageKey: string | null;
  readStatus: ChanakyaDocumentReadingStatus;
  limitation?: string | null;
  /** CO-023 — STORAGE-009 object store miss when storageKey exists but bytes absent. */
  binaryAbsentReason?: "object_store_miss" | "none" | string | null;
}): ChanakyaBankDocumentAvailabilityState {
  if (!input.isBankDocument) return "not_available";

  if (!input.hasBinary) {
    if (input.fileSizeBytes > 0) {
      if (input.storageKey && input.binaryAbsentReason === "object_store_miss") {
        return "binary_unavailable";
      }
      if (
        input.fileSizeBytes > ETD_INLINE_CONTENT_BYTES_MAX &&
        !input.storageKey
      ) {
        return "metadata_only";
      }
      return "metadata_only";
    }
    return "not_available";
  }

  if (
    input.readStatus === "content_read" ||
    input.readStatus === "content_read_partial" ||
    input.readStatus === "content_partial"
  ) {
    return "readable";
  }

  if (input.readStatus === "ocr_required" || input.readStatus === "ocr_failed") return "ocr_required";

  if (
    input.readStatus === "extraction_failed" ||
    input.readStatus === "unreadable_content"
  ) {
    return "unreadable";
  }

  if (input.binarySource === "object_store") return "object_store_binary";
  if (input.binarySource === "inline") return "inline_binary";

  return "unreadable";
}

export function bankStateAllowsFactExtraction(
  state: ChanakyaBankDocumentAvailabilityState,
): boolean {
  return state === "readable";
}
