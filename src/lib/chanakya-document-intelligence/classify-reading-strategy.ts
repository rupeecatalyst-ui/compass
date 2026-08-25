/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-005 — Reading strategy + family hints.
 * Classification from mime/filename/typeRef — not content OCR.
 */

import type {
  ChanakyaDocumentExtractionMethod,
  ChanakyaDocumentFamilyHint,
  ChanakyaDocumentReadingStatus,
} from "@/types/chanakya-document-intelligence";

export function hintDocumentFamily(input: {
  typeRef: string;
  displayName: string;
  mimeType: string;
}): ChanakyaDocumentFamilyHint {
  const h = `${input.typeRef} ${input.displayName}`.toLowerCase();
  if (/auditor|director.?s?\s*report|audit\s*report/i.test(h)) return "auditor_director";
  if (
    /p\s*&\s*l|profit|balance\s*sheet|financial|gst|audited|turnover|ebitda|business\s*reg/i.test(
      h,
    )
  ) {
    return "business_financial";
  }
  if (/bank[\s_-]*statement|passbook|banking|loan[\s_-]*statement/i.test(h)) return "banking";
  if (/salary|payslip|form\s*16|\bitr\b|income\s*tax/i.test(h)) return "income";
  if (/property|sale\s*deed|title|valuation|agreement|noc|collateral/i.test(h)) {
    return "property";
  }
  if (/pan|aadhaar|aadhar|passport|identity|address\s*proof|voter|driving/i.test(h)) {
    return "identity";
  }
  return "other";
}

export function classifyReadingStrategy(input: {
  mimeType: string;
  displayName: string;
  hasBinary: boolean;
}): {
  preferredMethod: ChanakyaDocumentExtractionMethod;
  ifUnavailableStatus: ChanakyaDocumentReadingStatus;
} {
  if (!input.hasBinary) {
    return {
      preferredMethod: "unavailable",
      ifUnavailableStatus: "no_binary",
    };
  }

  const mime = (input.mimeType || "").toLowerCase();
  const name = (input.displayName || "").toLowerCase();

  if (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/csv" ||
    /\.(txt|csv|json|md|log)$/i.test(name)
  ) {
    return { preferredMethod: "native_text", ifUnavailableStatus: "content_unavailable" };
  }

  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    return { preferredMethod: "pdf_text_layer", ifUnavailableStatus: "ocr_required" };
  }

  if (mime.startsWith("image/") || /\.(png|jpe?g|webp|gif|tif{1,2}|bmp)$/i.test(name)) {
    return { preferredMethod: "vision", ifUnavailableStatus: "vision_required" };
  }

  if (
    mime.includes("word") ||
    mime.includes("sheet") ||
    mime.includes("excel") ||
    mime.includes("officedocument") ||
    /\.(docx?|xlsx?|pptx?)$/i.test(name)
  ) {
    return {
      preferredMethod: "unavailable",
      ifUnavailableStatus: "unsupported_type",
    };
  }

  return {
    preferredMethod: "unavailable",
    ifUnavailableStatus: "unsupported_type",
  };
}
