/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-006 — Vision credential resolution (no value logging).
 */

import {
  CHANAKYA_DOCUMENT_VISION_BASE_URL_ENV,
  CHANAKYA_DOCUMENT_VISION_DEFAULT_MODEL,
  CHANAKYA_DOCUMENT_VISION_ENV_KEYS,
  CHANAKYA_DOCUMENT_VISION_MODEL_ENV,
} from "@/constants/chanakya-document-intelligence";

export function resolveDocumentVisionApiKey(): string | null {
  for (const key of CHANAKYA_DOCUMENT_VISION_ENV_KEYS) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return null;
}

export function isDocumentVisionConfigured(): boolean {
  return Boolean(resolveDocumentVisionApiKey());
}

export function resolveDocumentVisionBaseUrl(): string {
  return (
    process.env[CHANAKYA_DOCUMENT_VISION_BASE_URL_ENV]?.trim() ||
    "https://api.openai.com/v1"
  );
}

export function resolveDocumentVisionModel(): string {
  return (
    process.env[CHANAKYA_DOCUMENT_VISION_MODEL_ENV]?.trim() ||
    CHANAKYA_DOCUMENT_VISION_DEFAULT_MODEL
  );
}
