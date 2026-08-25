/**
 * CO-CHANAKYA-DOCUMENT-READING-008 — Build honest document intelligence pack.
 * Real PDF extraction via unpdf. Quality-gated content_read. Never fabricates.
 */

import "server-only";

import {
  CHANAKYA_DOC_BINARY_ABSENT_OVERSIZE_NOTE,
  CHANAKYA_DOC_DURABLE_BINARY_MAX_BYTES,
  CHANAKYA_DOC_TEXT_EXCERPT_BUDGET_CHARS,
  CHANAKYA_DOCUMENT_INTELLIGENCE_CAPABILITY_NOTE,
  CHANAKYA_DOCUMENT_VISION_PROVIDER_NOTE,
} from "@/constants/chanakya-document-intelligence";
import type {
  ChanakyaContentClassification,
  ChanakyaDocumentContentReadResult,
  ChanakyaDocumentExtractedFact,
  ChanakyaDocumentIntelligencePack,
  ChanakyaDocumentProvenance,
  ChanakyaDocumentReadingStatus,
} from "@/types/chanakya-document-intelligence";
import { classifyDocumentContent } from "./classify-content";
import {
  classifyReadingStrategy,
  hintDocumentFamily,
} from "./classify-reading-strategy";
import { buildCrossDocumentComparisons } from "./cross-document";
import {
  getCachedDocumentExtraction,
  hashDocumentBytes,
  setCachedDocumentExtraction,
} from "./extraction-cache";
import { extractNativeTextFromBytes } from "./extract-native-text";
import { extractPdfTextFromBytes } from "./extract-pdf-text";
import { getChanakyaOcrExtractorPort, getChanakyaTableExtractorPort } from "./ports";
import { retrieveAuthorizedOpportunityDocuments } from "./retrieve-authorized";
import { isDocumentVisionConfigured } from "./vision-config";
import { ensureChanakyaDocumentIntelligencePortsWired } from "./wire-default-ports";

function provenanceBase(input: {
  documentId: string;
  opportunityId: string;
  displayName: string;
  typeRef: string;
  mimeType: string;
  updatedAt: string;
  method: ChanakyaDocumentProvenance["extractionMethod"];
  confidence: ChanakyaDocumentProvenance["confidence"];
  page?: number | null;
}): ChanakyaDocumentProvenance {
  return {
    documentId: input.documentId,
    opportunityId: input.opportunityId,
    displayName: input.displayName,
    typeRef: input.typeRef,
    mimeType: input.mimeType,
    documentVersionHint: input.updatedAt,
    page: input.page ?? null,
    sectionOrTable: null,
    extractionMethod: input.method,
    confidence: input.confidence,
  };
}

function isReadableStatus(status: ChanakyaDocumentReadingStatus): boolean {
  return status === "content_read" || status === "content_read_partial";
}

export async function buildChanakyaDocumentIntelligencePack(input: {
  opportunityId: string;
}): Promise<ChanakyaDocumentIntelligencePack> {
  const wire = ensureChanakyaDocumentIntelligencePortsWired();
  const opportunityId = String(input.opportunityId || "").trim();
  const docs = await retrieveAuthorizedOpportunityDocuments({
    opportunityId,
    includeBinary: true,
  });

  const reads: ChanakyaDocumentContentReadResult[] = [];
  const structuredFacts: ChanakyaDocumentExtractedFact[] = [];
  const contentClassifications: ChanakyaContentClassification[] = [];
  let excerptBudget = CHANAKYA_DOC_TEXT_EXCERPT_BUDGET_CHARS;
  const ocrPort = getChanakyaOcrExtractorPort();
  const tablePort = getChanakyaTableExtractorPort();

  for (const doc of docs) {
    const familyHint = hintDocumentFamily({
      typeRef: doc.typeRef,
      displayName: doc.displayName,
      mimeType: doc.mimeType,
    });
    const strategy = classifyReadingStrategy({
      mimeType: doc.mimeType,
      displayName: doc.displayName,
      hasBinary: Boolean(doc.bytes && doc.bytes.byteLength > 0),
    });

    if (!doc.bytes || doc.bytes.byteLength === 0) {
      const oversize =
        doc.fileSizeBytes > CHANAKYA_DOC_DURABLE_BINARY_MAX_BYTES ||
        doc.binaryAbsentReason === "over_durable_cap";
      reads.push({
        documentId: doc.documentId,
        opportunityId,
        displayName: doc.displayName,
        typeRef: doc.typeRef,
        mimeType: doc.mimeType,
        familyHint,
        status: "no_binary",
        extractionMethod: "unavailable",
        hasBinary: false,
        byteLength: 0,
        textExcerpt: null,
        textCharCount: 0,
        limitation: oversize
          ? `${CHANAKYA_DOC_BINARY_ABSENT_OVERSIZE_NOTE} Reported fileSizeBytes=${doc.fileSizeBytes}.`
          : doc.binaryAbsentReason === "object_store_miss"
            ? "storageKey is present but the durable object binary could not be retrieved for this Opportunity."
            : doc.binaryAbsentReason === "never_persisted"
              ? "No durable binary was ever persisted for this document (metadata-only sync)."
              : "No durable binary content is stored for this document (metadata/presence only).",
        provenance: provenanceBase({
          ...doc,
          method: "unavailable",
          confidence: "none",
        }),
      });
      contentClassifications.push(
        classifyDocumentContent({
          documentId: doc.documentId,
          displayName: doc.displayName,
          typeRef: doc.typeRef,
          textExcerpt: null,
        }),
      );
      continue;
    }

    const contentHash = hashDocumentBytes(doc.bytes);
    const cached = getCachedDocumentExtraction({
      opportunityId,
      documentId: doc.documentId,
      contentHash,
    });

    let textExcerpt: string | null = cached?.textExcerpt ?? null;
    let parseText: string | null = textExcerpt;
    let method: ChanakyaDocumentContentReadResult["extractionMethod"] =
      strategy.preferredMethod;
    let status: ChanakyaDocumentContentReadResult["status"] =
      strategy.ifUnavailableStatus;
    let limitation: string | null = null;
    let confidence: ChanakyaDocumentProvenance["confidence"] = "none";
    let docFacts: ChanakyaDocumentExtractedFact[] = cached?.facts ?? [];
    let pageHint: number | null = null;

    if (!cached) {
      if (strategy.preferredMethod === "native_text") {
        const native = extractNativeTextFromBytes({
          bytes: doc.bytes,
          mimeType: doc.mimeType,
          displayName: doc.displayName,
        });
        if (native) {
          parseText = native.text;
          textExcerpt =
            excerptBudget > 0 ? native.text.slice(0, excerptBudget) : null;
          if (textExcerpt) excerptBudget -= textExcerpt.length;
          method = "native_text";
          status = "content_read";
          confidence = "high";
          limitation = null;
        } else {
          status = "extraction_failed";
          method = "unavailable";
          limitation = "Native text decode failed or content was not printable UTF-8.";
        }
      } else if (strategy.preferredMethod === "pdf_text_layer") {
        const extracted = await extractPdfTextFromBytes({ bytes: doc.bytes });
        if (!extracted) {
          status = "extraction_failed";
          method = "unavailable";
          limitation = "Bytes are not a recognizable PDF.";
        } else if (extracted.quality.empty) {
          status = "ocr_required";
          method = "ocr";
          limitation = wire.visionConfigured
            ? "PDF produced no text layer. OCR/vision required; scanned-PDF rasterizer / Azure DI not wired for PDF binaries."
            : "OCR/vision unavailable — provider credentials not configured. PDF has no usable text layer.";
        } else if (!extracted.quality.usable) {
          status = "unreadable_content";
          method = "pdf_text_layer";
          limitation = extracted.quality.reason;
          textExcerpt = null;
          parseText = null;
        } else {
          parseText = extracted.text;
          textExcerpt =
            excerptBudget > 0 ? extracted.excerpt.slice(0, excerptBudget) : null;
          if (textExcerpt) excerptBudget -= textExcerpt.length;
          method = "pdf_text_layer";
          status = extracted.quality.partial
            ? "content_read_partial"
            : "content_read";
          confidence = extracted.quality.partial ? "medium" : "high";
          pageHint = extracted.pageCount > 0 ? 1 : null;
          limitation = extracted.quality.partial
            ? "Partial PDF text extraction (sparse but usable)."
            : `PDF text extracted via unpdf/PDF.js (${extracted.pageCount} page(s)).`;
        }
      } else if (strategy.preferredMethod === "vision") {
        status = "vision_required";
        method = "vision";
        limitation = wire.visionConfigured
          ? "Attempting configured vision OCR for image…"
          : "OCR/vision unavailable — provider credentials not configured.";
      } else {
        status = strategy.ifUnavailableStatus;
        method = "unavailable";
        limitation =
          "This MIME/type is not supported for in-process reading in the current foundation.";
      }

      if (
        (status === "ocr_required" || status === "vision_required") &&
        ocrPort
      ) {
        const ocr = await ocrPort.extract({
          documentId: doc.documentId,
          opportunityId,
          mimeType: doc.mimeType,
          bytes: doc.bytes,
          displayName: doc.displayName,
        });
        if (ocr?.text?.trim()) {
          parseText = ocr.text.trim();
          textExcerpt =
            excerptBudget > 0 ? ocr.text.trim().slice(0, excerptBudget) : null;
          if (textExcerpt) excerptBudget -= textExcerpt.length;
          method = ocr.method;
          status = "content_read";
          confidence = ocr.confidence;
          limitation = `Vision/OCR provider (${ocrPort.providerId}) returned text.`;
        } else if (status === "vision_required" && wire.visionConfigured) {
          limitation =
            "Vision provider is configured but returned no readable text for this image.";
        } else if (status === "ocr_required" && !wire.visionConfigured) {
          limitation =
            "OCR/vision unavailable — provider credentials not configured.";
        } else if (status === "ocr_required") {
          limitation =
            "OCR required for this PDF; image-vision port cannot process PDF binaries without rasterization / Azure DI.";
        }
      }

      if (tablePort && parseText && isReadableStatus(status)) {
        docFacts = await tablePort.extract({
          documentId: doc.documentId,
          opportunityId,
          mimeType: doc.mimeType,
          bytes: doc.bytes,
          textHint: parseText,
          displayName: doc.displayName,
          typeRef: doc.typeRef,
          documentVersionHint: doc.updatedAt,
        });
        if (pageHint != null) {
          docFacts = docFacts.map((f) => ({
            ...f,
            provenance: {
              ...f.provenance,
              page: f.provenance.page ?? pageHint,
              extractionMethod:
                f.provenance.extractionMethod === "table_extraction"
                  ? "table_extraction"
                  : method,
            },
          }));
        }
      }

      setCachedDocumentExtraction({
        opportunityId,
        documentId: doc.documentId,
        contentHash,
        textExcerpt,
        facts: docFacts,
      });
    } else {
      if (textExcerpt) {
        status = "content_read";
        method = "pdf_text_layer";
        confidence = "medium";
        limitation = "Reused cached extraction for unchanged document binary.";
        parseText = textExcerpt;
        if (excerptBudget > 0) {
          textExcerpt = textExcerpt.slice(0, excerptBudget);
          excerptBudget -= textExcerpt.length;
        }
      }
    }

    // Only attach facts when we have a genuine readable status.
    if (isReadableStatus(status)) {
      structuredFacts.push(...docFacts);
    }

    reads.push({
      documentId: doc.documentId,
      opportunityId,
      displayName: doc.displayName,
      typeRef: doc.typeRef,
      mimeType: doc.mimeType,
      familyHint,
      status,
      extractionMethod: method,
      hasBinary: true,
      byteLength: doc.byteLength,
      textExcerpt: isReadableStatus(status) ? textExcerpt : null,
      textCharCount: isReadableStatus(status) ? (textExcerpt?.length ?? 0) : 0,
      limitation,
      provenance: provenanceBase({
        ...doc,
        method,
        confidence,
        page: pageHint,
      }),
    });

    contentClassifications.push(
      classifyDocumentContent({
        documentId: doc.documentId,
        displayName: doc.displayName,
        typeRef: doc.typeRef,
        textExcerpt: isReadableStatus(status) ? textExcerpt : null,
      }),
    );
  }

  const crossDocumentComparisons = buildCrossDocumentComparisons(structuredFacts);

  const documentsWithReadableText = reads.filter((r) =>
    isReadableStatus(r.status),
  ).length;
  const documentsRequiringOcr = reads.filter((r) => r.status === "ocr_required").length;
  const documentsRequiringVision = reads.filter(
    (r) => r.status === "vision_required",
  ).length;

  const limitations = [
    CHANAKYA_DOCUMENT_INTELLIGENCE_CAPABILITY_NOTE,
    CHANAKYA_DOCUMENT_VISION_PROVIDER_NOTE,
    "Document content is never written to application logs by this pack builder.",
  ];
  if (!wire.visionConfigured) {
    limitations.push(
      "DOCUMENT_VISION_API_KEY / OPENAI_API_KEY absent — image vision OCR inactive.",
    );
  }
  if (documentsWithReadableText === 0 && docs.length > 0) {
    limitations.push(
      "No document yielded quality-gated readable text in this run (binaries missing, scanned PDFs, unreadable_content, or unsupported types).",
    );
  }

  return {
    opportunityId,
    retrievedAt: new Date().toISOString(),
    capability: {
      nativeTextExtraction: true,
      pdfTextExtraction: true,
      pdfTextLayerProbe: false,
      ocr: Boolean(ocrPort) && wire.visionConfigured,
      vision: Boolean(ocrPort) && wire.visionConfigured,
      tableExtraction: Boolean(tablePort),
      structuredFinancialFacts: structuredFacts.length > 0,
      crossDocumentReconciliation: crossDocumentComparisons.length > 0,
      note: CHANAKYA_DOCUMENT_INTELLIGENCE_CAPABILITY_NOTE,
    },
    documentsReviewed: reads.length,
    documentsWithBinary: reads.filter((r) => r.hasBinary).length,
    documentsWithReadableText,
    documentsRequiringOcr,
    documentsRequiringVision,
    reads,
    structuredFacts,
    crossDocumentComparisons,
    contentClassifications,
    visionProvider: {
      configured: isDocumentVisionConfigured(),
      providerId: ocrPort?.providerId ?? null,
      supportsImages: true,
      supportsScannedPdfWithoutRasterizer: false,
      note: CHANAKYA_DOCUMENT_VISION_PROVIDER_NOTE,
    },
    limitations,
  };
}
