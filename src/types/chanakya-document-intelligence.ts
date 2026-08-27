/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-005 — Document reading / evidence contracts.
 *
 * CHANAKYA consumes structured evidence. This is NOT a parallel financial SSOT.
 * OCR / table / vision ports may be wired later; until then status remains honest.
 */

/** How content was (or would be) read. */
export type ChanakyaDocumentExtractionMethod =
  | "native_text"
  | "pdf_text_layer"
  | "ocr"
  | "vision"
  | "table_extraction"
  | "unavailable";

export type ChanakyaDocumentReadingStatus =
  | "content_read"
  /** Sparse but genuine readable text (not CID noise). */
  | "content_read_partial"
  /** @deprecated Prefer content_read_partial — retained for compatibility. */
  | "content_partial"
  | "content_unavailable"
  | "extraction_failed"
  | "unreadable_content"
  | "ocr_required"
  /** Provider configured/attempted but OCR did not yield quality-gated readable text. */
  | "ocr_failed"
  | "vision_required"
  | "table_extraction_required"
  | "no_binary"
  | "unsupported_type"
  | "authorization_denied";

export type ChanakyaDocumentFamilyHint =
  | "identity"
  | "income"
  | "business_financial"
  | "banking"
  | "property"
  | "auditor_director"
  | "other";

export interface ChanakyaDocumentProvenance {
  documentId: string;
  opportunityId: string;
  displayName: string;
  typeRef: string;
  mimeType: string;
  /** Version stamp when available — durable registry may only have updatedAt. */
  documentVersionHint: string | null;
  page: number | null;
  sectionOrTable: string | null;
  extractionMethod: ChanakyaDocumentExtractionMethod;
  confidence: "high" | "medium" | "low" | "ambiguous" | "none";
}

/**
 * Structured fact — only emit when genuinely extracted.
 * Never invent revenue / EBITDA / balances.
 */
export interface ChanakyaDocumentExtractedFact {
  id: string;
  key: string;
  label: string;
  value: string;
  unit?: string | null;
  periodLabel?: string | null;
  provenance: ChanakyaDocumentProvenance;
  /** Facts are never lender-facing by default until composed into proposal. */
  lenderFacingEligible: boolean;
}

export interface ChanakyaDocumentContentReadResult {
  documentId: string;
  opportunityId: string;
  displayName: string;
  typeRef: string;
  mimeType: string;
  familyHint: ChanakyaDocumentFamilyHint;
  status: ChanakyaDocumentReadingStatus;
  extractionMethod: ChanakyaDocumentExtractionMethod;
  hasBinary: boolean;
  byteLength: number;
  /**
   * Truncated UTF-8 excerpt when native/PDF text layer succeeded.
   * Never log this value. Never invent financial numbers from empty content.
   */
  textExcerpt: string | null;
  textCharCount: number;
  /** Why reading failed or is deferred. */
  limitation: string | null;
  provenance: ChanakyaDocumentProvenance;
}

export interface ChanakyaDocumentIntelligenceCapability {
  nativeTextExtraction: true;
  /** Real PDF.js / unpdf extraction (008) — not the legacy CID literal probe. */
  pdfTextExtraction: true;
  /** @deprecated Legacy probe flag — always false once 008 is active. */
  pdfTextLayerProbe: false;
  /** True only when an OCR port is configured. */
  ocr: boolean;
  vision: boolean;
  tableExtraction: boolean;
  structuredFinancialFacts: boolean;
  crossDocumentReconciliation: boolean;
  note: string;
}

export interface ChanakyaDocumentIntelligencePack {
  opportunityId: string;
  retrievedAt: string;
  capability: ChanakyaDocumentIntelligenceCapability;
  documentsReviewed: number;
  documentsWithBinary: number;
  documentsWithReadableText: number;
  documentsRequiringOcr: number;
  /** Documents where OCR was attempted but failed quality gate or provider returned nothing. */
  documentsOcrFailed: number;
  documentsRequiringVision: number;
  reads: ChanakyaDocumentContentReadResult[];
  /** Empty until structured extractors produce real facts — never fabricated. */
  structuredFacts: ChanakyaDocumentExtractedFact[];
  /** Cross-document comparisons over extracted facts only. */
  crossDocumentComparisons: ChanakyaCrossDocumentComparison[];
  contentClassifications: ChanakyaContentClassification[];
  /** Vision/OCR provider readiness (credentials present ≠ successful OCR). */
  visionProvider: {
    configured: boolean;
    providerId: string | null;
    supportsImages: boolean;
    supportsScannedPdfWithoutRasterizer: boolean;
    note: string;
  };
  /** CO-CHANAKYA-CREDIT-INTELLIGENCE-014 — OCR provider chain summary. */
  ocrProviders: {
    anyConfigured: boolean;
    providers: Array<{
      providerId: string;
      configured: boolean;
      supportsPdf: boolean;
      supportsImages: boolean;
    }>;
  };
  /** OCR attempt counters for this pack run (never includes raw binaries). */
  ocrRunSummary: {
    attempted: number;
    succeeded: number;
    rejectedQuality: number;
    failed: number;
    providerNotConfigured: number;
    remainingOcrRequired: number;
    remainingOcrFailed: number;
  };
  limitations: string[];
}

export type ChanakyaContentDocumentKind =
  | "pan"
  | "aadhaar_identity"
  | "salary_slip"
  | "form_16"
  | "itr"
  | "gst"
  | "pnl"
  | "balance_sheet"
  | "audited_financials"
  | "auditor_report"
  | "director_report"
  | "bank_statement"
  | "loan_statement"
  | "property"
  | "valuation"
  | "other";

export interface ChanakyaContentClassification {
  documentId: string;
  kind: ChanakyaContentDocumentKind;
  confidence: "high" | "medium" | "low";
  signals: string[];
}

export type ChanakyaCrossDocumentComparisonStatus =
  | "corroborated"
  | "mismatch"
  | "inconsistent"
  | "unavailable";

/** CO-CHANAKYA-CREDIT-INTELLIGENCE-013 / 023 — bank document availability states. */
export type ChanakyaBankDocumentAvailabilityState =
  | "metadata_only"
  /** STORAGE-009 storageKey present but durable binary could not be retrieved. */
  | "binary_unavailable"
  | "inline_binary"
  | "object_store_binary"
  | "readable"
  | "unreadable"
  | "ocr_required"
  | "not_available";

/** CO-023 — evidence tier for bank statements (presence ≠ intelligence). */
export type ChanakyaBankEvidenceTier = "PRESENT" | "READABLE" | "FINANCIALLY_USEFUL";

export interface ChanakyaCrossDocumentComparison {
  id: string;
  leftFactId: string;
  rightFactId: string;
  factKey: string;
  status: ChanakyaCrossDocumentComparisonStatus;
  note: string;
}

/** Future OCR adapter — must not be stubbed with fake text. */
export interface ChanakyaOcrExtractorPort {
  providerId: string;
  extract(input: {
    documentId: string;
    opportunityId: string;
    mimeType: string;
    bytes: Uint8Array;
    displayName?: string;
  }): Promise<{
    text: string;
    confidence: "high" | "medium" | "low";
    pageCount?: number;
    method: "ocr" | "vision";
    /** Which provider produced this result (composite chain). */
    providerId?: string;
  } | null>;
}

/** Future table / financial statement extractor. */
export interface ChanakyaTableExtractorPort {
  providerId: string;
  extract(input: {
    documentId: string;
    opportunityId: string;
    mimeType: string;
    bytes: Uint8Array;
    textHint?: string | null;
    displayName?: string;
    typeRef?: string;
    documentVersionHint?: string | null;
  }): Promise<ChanakyaDocumentExtractedFact[]>;
}
