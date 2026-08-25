/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-006 / 008 — Structured table/financial extractor port.
 * Uses quality-gated readable text only. Never invents line items.
 */

import type { ChanakyaTableExtractorPort } from "@/types/chanakya-document-intelligence";
import { extractStructuredFactsFromText } from "./extract-structured-facts";
import { extractNativeTextFromBytes } from "./extract-native-text";
import { extractPdfTextFromBytes } from "./extract-pdf-text";

export function createStructuredTextTableExtractorPort(): ChanakyaTableExtractorPort {
  return {
    providerId: "structured_text_financial_v1",
    async extract(input) {
      let text = input.textHint?.trim() || "";
      if (!text && input.bytes?.byteLength) {
        const native = extractNativeTextFromBytes({
          bytes: input.bytes,
          mimeType: input.mimeType,
          displayName: input.displayName || "",
        });
        if (native?.text) {
          text = native.text;
        } else {
          const pdf = await extractPdfTextFromBytes({ bytes: input.bytes });
          if (pdf?.quality.usable && pdf.text) text = pdf.text;
        }
      }
      if (!text) return [];

      return extractStructuredFactsFromText({
        text,
        provenance: {
          documentId: input.documentId,
          opportunityId: input.opportunityId,
          displayName: input.displayName || input.documentId,
          typeRef: input.typeRef || "unknown",
          mimeType: input.mimeType,
          documentVersionHint: input.documentVersionHint ?? null,
          extractionMethod: "table_extraction",
          confidence: "medium",
        },
      });
    },
  };
}
