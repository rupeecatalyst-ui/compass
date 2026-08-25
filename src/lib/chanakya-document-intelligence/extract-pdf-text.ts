/**
 * CO-CHANAKYA-DOCUMENT-READING-008 — Real PDF text extraction (unpdf / PDF.js).
 * Replaces the CID/literal-string probe. Never fabricates content.
 * Server-only — do not import from client components.
 */

import "server-only";

import { CHANAKYA_DOC_TEXT_EXCERPT_MAX_CHARS } from "@/constants/chanakya-document-intelligence";
import type { ChanakyaDocumentExtractionMethod } from "@/types/chanakya-document-intelligence";
import { assessExtractedTextQuality } from "./assess-text-quality";

function truncate(text: string, max = CHANAKYA_DOC_TEXT_EXCERPT_MAX_CHARS): string {
  const t = text.replace(/\u0000/g, "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n…[truncated]`;
}

export interface PdfTextExtractionResult {
  /** Full extracted text (may be large — for parsers; never log). */
  text: string;
  /** Truncated excerpt for pack/UI budgets. */
  excerpt: string;
  pageCount: number;
  method: Extract<"pdf_text_layer", ChanakyaDocumentExtractionMethod>;
  /** Quality assessment of the extracted text. */
  quality: ReturnType<typeof assessExtractedTextQuality>;
}

/**
 * Extract readable text from a PDF using unpdf (Mozilla PDF.js serverless build).
 * Returns null only when the buffer is not a PDF.
 * Empty / unusable text is returned with quality.usable=false — caller must not
 * mark content_read.
 */
export async function extractPdfTextFromBytes(input: {
  bytes: Uint8Array;
}): Promise<PdfTextExtractionResult | null> {
  if (!input.bytes?.byteLength) return null;
  const head = Buffer.from(input.bytes.subarray(0, 5)).toString("latin1");
  if (!head.startsWith("%PDF")) return null;

  try {
    const { extractText } = await import("unpdf");
    const data = new Uint8Array(input.bytes);
    const result = await extractText(data, { mergePages: true });
    const textValue = result.text as string | string[] | undefined;
    const raw =
      typeof textValue === "string"
        ? textValue
        : Array.isArray(textValue)
          ? textValue.join("\n")
          : "";
    const text = raw.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").trim();
    const pageCount =
      typeof result.totalPages === "number" && result.totalPages > 0
        ? result.totalPages
        : text
          ? 1
          : 0;
    const quality = assessExtractedTextQuality(text);
    return {
      text,
      excerpt: truncate(text),
      pageCount,
      method: "pdf_text_layer",
      quality,
    };
  } catch {
    return {
      text: "",
      excerpt: "",
      pageCount: 0,
      method: "pdf_text_layer",
      quality: {
        usable: false,
        partial: false,
        empty: true,
        reason: "PDF text extraction threw — treat as extraction_failed.",
        alphaWordCount: 0,
        digitCount: 0,
        hasMeaningfulLabels: false,
      },
    };
  }
}
