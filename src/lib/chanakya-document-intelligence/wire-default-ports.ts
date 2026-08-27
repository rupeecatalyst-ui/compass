/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-006 — Wire default extractor ports once.
 */

import "server-only";

import { createCompositeOcrPort } from "./composite-ocr-port";
import {
  configureChanakyaDocumentIntelligencePorts,
  getChanakyaOcrExtractorPort,
  getChanakyaTableExtractorPort,
} from "./ports";
import { createStructuredTextTableExtractorPort } from "./structured-text-table-port";
import {
  isAnyOcrProviderConfigured,
  isAzureDocumentIntelligenceConfigured,
  listOcrProviderDescriptors,
} from "./ocr-provider-config";
import { isDocumentVisionConfigured } from "./vision-config";

let wired = false;

export function resetChanakyaDocumentIntelligencePortsWiringForVerification(): void {
  wired = false;
}

export function ensureChanakyaDocumentIntelligencePortsWired(): {
  visionConfigured: boolean;
  ocrConfigured: boolean;
  azureDiConfigured: boolean;
  ocrProviders: ReturnType<typeof listOcrProviderDescriptors>;
} {
  if (!wired) {
    if (!getChanakyaOcrExtractorPort() && !getChanakyaTableExtractorPort()) {
      configureChanakyaDocumentIntelligencePorts({
        ocr: createCompositeOcrPort(),
        table: createStructuredTextTableExtractorPort(),
      });
    }
    wired = true;
  }
  return {
    visionConfigured: isDocumentVisionConfigured(),
    ocrConfigured: isAnyOcrProviderConfigured(),
    azureDiConfigured: isAzureDocumentIntelligenceConfigured(),
    ocrProviders: listOcrProviderDescriptors(),
  };
}
