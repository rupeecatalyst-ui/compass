/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-014 — OCR provider credential resolution.
 * Never logs secret values.
 */

import {
  CHANAKYA_AZURE_DI_ENDPOINT_ENV,
  CHANAKYA_AZURE_DI_KEY_ENV_KEYS,
  CHANAKYA_DOCUMENT_VISION_ENV_KEYS,
} from "@/constants/chanakya-document-intelligence";
import { isDocumentVisionConfigured } from "./vision-config";

export type ChanakyaOcrProviderDescriptor = {
  providerId: string;
  configured: boolean;
  supportsPdf: boolean;
  supportsImages: boolean;
};

export function resolveAzureDocumentIntelligenceEndpoint(): string | null {
  const endpoint = process.env[CHANAKYA_AZURE_DI_ENDPOINT_ENV]?.trim();
  return endpoint || null;
}

export function resolveAzureDocumentIntelligenceKey(): string | null {
  for (const key of CHANAKYA_AZURE_DI_KEY_ENV_KEYS) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return null;
}

export function isAzureDocumentIntelligenceConfigured(): boolean {
  return Boolean(
    resolveAzureDocumentIntelligenceEndpoint() &&
      resolveAzureDocumentIntelligenceKey(),
  );
}

export function isAnyOcrProviderConfigured(): boolean {
  return isAzureDocumentIntelligenceConfigured() || isDocumentVisionConfigured();
}

export function listOcrProviderDescriptors(): ChanakyaOcrProviderDescriptor[] {
  return [
    {
      providerId: "azure_document_intelligence",
      configured: isAzureDocumentIntelligenceConfigured(),
      supportsPdf: true,
      supportsImages: true,
    },
    {
      providerId: "openai_compatible_vision",
      configured: isDocumentVisionConfigured(),
      supportsPdf: false,
      supportsImages: true,
    },
  ];
}
