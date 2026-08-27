/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-005 — Future extractor ports (no fake defaults).
 */

import type {
  ChanakyaOcrExtractorPort,
  ChanakyaTableExtractorPort,
} from "@/types/chanakya-document-intelligence";

let ocrPort: ChanakyaOcrExtractorPort | null = null;
let tablePort: ChanakyaTableExtractorPort | null = null;

export function configureChanakyaDocumentIntelligencePorts(input: {
  ocr?: ChanakyaOcrExtractorPort | null;
  table?: ChanakyaTableExtractorPort | null;
}): void {
  if ("ocr" in input) ocrPort = input.ocr ?? null;
  if ("table" in input) tablePort = input.table ?? null;
}

export function getChanakyaOcrExtractorPort(): ChanakyaOcrExtractorPort | null {
  return ocrPort;
}

export function getChanakyaTableExtractorPort(): ChanakyaTableExtractorPort | null {
  return tablePort;
}

/** Verification-only — reset wired ports between deterministic OCR certify runs. */
export function resetChanakyaDocumentIntelligencePortsForVerification(): void {
  ocrPort = null;
  tablePort = null;
}
