/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-006 — Wire default extractor ports once.
 */

import "server-only";

import { createOpenAiCompatibleVisionOcrPort } from "./openai-vision-ocr-port";
import { configureChanakyaDocumentIntelligencePorts } from "./ports";
import { createStructuredTextTableExtractorPort } from "./structured-text-table-port";
import { isDocumentVisionConfigured } from "./vision-config";

let wired = false;

export function ensureChanakyaDocumentIntelligencePortsWired(): {
  visionConfigured: boolean;
} {
  if (!wired) {
    configureChanakyaDocumentIntelligencePorts({
      ocr: createOpenAiCompatibleVisionOcrPort(),
      table: createStructuredTextTableExtractorPort(),
    });
    wired = true;
  }
  return { visionConfigured: isDocumentVisionConfigured() };
}
