/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-005 / 008 / 009 — Document intelligence constants.
 */

export const CHANAKYA_DOCUMENT_INTELLIGENCE_SPRINT =
  "CO-CHANAKYA-DOCUMENT-STORAGE-009" as const;

/** Per-document text excerpt cap (chars) for pack/UI. */
export const CHANAKYA_DOC_TEXT_EXCERPT_MAX_CHARS = 8_000 as const;

/** Total excerpts across opportunity (chars). */
export const CHANAKYA_DOC_TEXT_EXCERPT_BUDGET_CHARS = 40_000 as const;

/**
 * Max binary size CHANAKYA will load in-process after authorized retrieval.
 * Raised to cover bank-statement PDFs via object storage (still below Hostinger-safe ceiling).
 */
export const CHANAKYA_DOC_READ_MAX_BYTES = 16 * 1024 * 1024;

/**
 * Legacy inline `contentBytes` soft-cap (CO-DOC-002). Unchanged.
 * Files larger than this use durable object storage (`storageKey`) as of STORAGE-009.
 */
export const CHANAKYA_DOC_DURABLE_BINARY_MAX_BYTES = 4 * 1024 * 1024;

/**
 * Vision / OCR credentials (presence only — never log values).
 * Prefer DOCUMENT_VISION_API_KEY; fall back to OPENAI_API_KEY.
 */
export const CHANAKYA_DOCUMENT_VISION_ENV_KEYS = [
  "DOCUMENT_VISION_API_KEY",
  "OPENAI_API_KEY",
] as const;

export const CHANAKYA_DOCUMENT_VISION_BASE_URL_ENV =
  "DOCUMENT_VISION_BASE_URL" as const;

export const CHANAKYA_DOCUMENT_VISION_MODEL_ENV =
  "DOCUMENT_VISION_MODEL" as const;

export const CHANAKYA_DOCUMENT_VISION_DEFAULT_MODEL = "gpt-4o" as const;

/** Azure Document Intelligence (scanned PDF + layout OCR). */
export const CHANAKYA_AZURE_DI_ENDPOINT_ENV =
  "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT" as const;

export const CHANAKYA_AZURE_DI_KEY_ENV_KEYS = [
  "AZURE_DOCUMENT_INTELLIGENCE_KEY",
  "AZURE_DOCUMENT_INTELLIGENCE_API_KEY",
] as const;

export const CHANAKYA_AZURE_DI_API_VERSION = "2024-11-30" as const;

export const CHANAKYA_OCR_PROVIDER_NOT_CONFIGURED =
  "PROVIDER_NOT_CONFIGURED" as const;

/** OCR provider was configured/attempted but returned no usable text. */
export const CHANAKYA_OCR_FAILED = "OCR_FAILED" as const;

/** Document content is not available for intelligence (binary/OCR/read path). */
export const CHANAKYA_DOC_READ_NOT_AVAILABLE = "NOT_AVAILABLE" as const;

export const CHANAKYA_DOCUMENT_INTELLIGENCE_CAPABILITY_NOTE =
  "Phase 014: OCR provider-port chain (Azure Document Intelligence for scanned PDFs + OpenAI-compatible vision for images). Credentials required — never fabricated OCR. Phase 009 durable object storage + Phase 008 unpdf extraction remain active." as const;

export const CHANAKYA_DOCUMENT_VISION_PROVIDER_NOTE =
  "OCR providers (port-based, first match wins): (1) Azure Document Intelligence when AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT + key are set — supports scanned PDF without rasterization; (2) OpenAI-compatible vision for images when DOCUMENT_VISION_API_KEY or OPENAI_API_KEY is set. Garbage OCR is quality-gated before content_read." as const;

export const CHANAKYA_DOC_BINARY_ABSENT_OVERSIZE_NOTE =
  "Document metadata exists but durable binary is absent. Files ≤4MB use inline contentBytes; larger files require object-store upload (storageKey). Pre-009 oversized uploads that never left client IndexedDB cannot be recovered server-side — re-upload is required." as const;
