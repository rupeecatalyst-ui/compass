/**
 * CO-CHANAKYA-DOCUMENT-READING-008 — Build honest document intelligence pack.
 * Real PDF extraction via unpdf. Quality-gated content_read. Never fabricates.
 */

import "server-only";

import {
  CHANAKYA_DOC_BINARY_ABSENT_OVERSIZE_NOTE,
  CHANAKYA_DOC_DURABLE_BINARY_MAX_BYTES,
  CHANAKYA_DOC_READ_NOT_AVAILABLE,
  CHANAKYA_DOC_TEXT_EXCERPT_BUDGET_CHARS,
  CHANAKYA_DOCUMENT_INTELLIGENCE_CAPABILITY_NOTE,
  CHANAKYA_DOCUMENT_VISION_PROVIDER_NOTE,
  CHANAKYA_OCR_FAILED,
  CHANAKYA_OCR_PROVIDER_NOT_CONFIGURED,
} from "@/constants/chanakya-document-intelligence";
import type {
  ChanakyaContentClassification,
  ChanakyaDocumentContentReadResult,
  ChanakyaDocumentExtractedFact,
  ChanakyaDocumentIntelligencePack,
  ChanakyaDocumentProvenance,
  ChanakyaDocumentReadingStatus,
  ChanakyaOcrExtractorPort,
} from "@/types/chanakya-document-intelligence";
import { classifyDocumentContent } from "./classify-content";
import { classifyCreditOcrDocument } from "./classify-credit-ocr-priority";
import {
  classifyReadingStrategy,
  hintDocumentFamily,
} from "./classify-reading-strategy";
import { assessOcrExtractQuality } from "./assess-ocr-quality";
import { buildCrossDocumentComparisons } from "./cross-document";
import {
  getCachedDocumentExtraction,
  hashDocumentBytes,
  setCachedDocumentExtraction,
} from "./extraction-cache";
import { extractNativeTextFromBytes } from "./extract-native-text";
import { extractPdfTextFromBytes } from "./extract-pdf-text";
import { getChanakyaOcrExtractorPort, getChanakyaTableExtractorPort } from "./ports";
import {
  retrieveAuthorizedOpportunityDocuments,
  type AuthorizedDocumentBinary,
} from "./retrieve-authorized";
import { isDocumentVisionConfigured } from "./vision-config";
import { ensureChanakyaDocumentIntelligencePortsWired } from "./wire-default-ports";
import { isDeterministicMockOcrPort } from "./mock-ocr-port";
import { stampOcrProvenanceOnFacts } from "./ocr-integration-core";

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

function shouldAttemptOcrProviderChain(
  ocrConfigured: boolean,
  ocrPort: ChanakyaOcrExtractorPort | null,
): boolean {
  if (!ocrPort) return false;
  if (ocrConfigured) return true;
  return isDeterministicMockOcrPort(ocrPort);
}

function ocrCapabilityActive(
  ocrConfigured: boolean,
  ocrPort: ChanakyaOcrExtractorPort | null,
): boolean {
  return shouldAttemptOcrProviderChain(ocrConfigured, ocrPort);
}

export async function buildChanakyaDocumentIntelligencePack(input: {
  opportunityId: string;
  /** Verification-only — inject authorized docs without Postgres retrieval. */
  verificationDocuments?: AuthorizedDocumentBinary[];
}): Promise<ChanakyaDocumentIntelligencePack> {
  const wire = ensureChanakyaDocumentIntelligencePortsWired();
  const opportunityId = String(input.opportunityId || "").trim();
  const docs =
    input.verificationDocuments ??
    (await retrieveAuthorizedOpportunityDocuments({
      opportunityId,
      includeBinary: true,
    }));

  const reads: ChanakyaDocumentContentReadResult[] = [];
  const structuredFacts: ChanakyaDocumentExtractedFact[] = [];
  const contentClassifications: ChanakyaContentClassification[] = [];
  let excerptBudget = CHANAKYA_DOC_TEXT_EXCERPT_BUDGET_CHARS;
  const ocrPort = getChanakyaOcrExtractorPort();
  const tablePort = getChanakyaTableExtractorPort();
  let ocrAttempted = 0;
  let ocrSucceeded = 0;
  let ocrRejectedQuality = 0;
  let ocrFailed = 0;
  let ocrProviderNotConfigured = 0;
  const ocrChainActive = shouldAttemptOcrProviderChain(wire.ocrConfigured, ocrPort);

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
          limitation = wire.ocrConfigured
            ? "PDF produced no text layer — OCR provider chain will be attempted."
            : `${CHANAKYA_OCR_PROVIDER_NOT_CONFIGURED} — OCR credentials absent (AZURE_DOCUMENT_INTELLIGENCE_* or DOCUMENT_VISION_API_KEY / OPENAI_API_KEY). PDF has no usable text layer.`;
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
        limitation = wire.ocrConfigured
          ? "Image document — OCR/vision provider chain will be attempted."
          : `${CHANAKYA_OCR_PROVIDER_NOT_CONFIGURED} — OCR/vision credentials not configured.`;
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
        if (ocrChainActive) {
          ocrAttempted += 1;
          const ocrPriority = classifyCreditOcrDocument({
            displayName: doc.displayName,
            typeRef: doc.typeRef,
            mimeType: doc.mimeType,
          });

          const ocr = await ocrPort.extract({
            documentId: doc.documentId,
            opportunityId,
            mimeType: doc.mimeType,
            bytes: doc.bytes,
            displayName: doc.displayName,
          });

          if (ocr?.text?.trim()) {
            const quality = assessOcrExtractQuality({
              text: ocr.text.trim(),
              providerConfidence: ocr.confidence,
            });

            if (!quality.accepted) {
              ocrRejectedQuality += 1;
              ocrFailed += 1;
              status = "ocr_failed";
              method = ocr.method;
              parseText = null;
              textExcerpt = null;
              confidence = "none";
              limitation = `${CHANAKYA_OCR_FAILED} — OCR output rejected by quality gate (${quality.reason}). Provider: ${ocr.providerId ?? ocrPort.providerId}.`;
            } else {
              ocrSucceeded += 1;
              parseText = ocr.text.trim();
              textExcerpt =
                excerptBudget > 0 ? ocr.text.trim().slice(0, excerptBudget) : null;
              if (textExcerpt) excerptBudget -= textExcerpt.length;
              method = ocr.method;
              status = quality.partial ? "content_read_partial" : "content_read";
              confidence = quality.ocrConfidence;
              pageHint = ocr.pageCount && ocr.pageCount > 0 ? 1 : null;
              limitation = `OCR provider (${ocr.providerId ?? ocrPort.providerId}) returned quality-gated text · category=${ocrPriority.category} · priority=${ocrPriority.priority}.`;
            }
          } else {
            ocrFailed += 1;
            const wasVision = status === "vision_required";
            status = "ocr_failed";
            method = wasVision ? "vision" : "ocr";
            parseText = null;
            textExcerpt = null;
            confidence = "none";
            limitation = wasVision
              ? `${CHANAKYA_OCR_FAILED} — vision provider returned no readable text for this image.`
              : `${CHANAKYA_OCR_FAILED} — OCR provider chain returned no readable text.`;
          }
        } else if (status === "ocr_required" || status === "vision_required") {
          ocrProviderNotConfigured += 1;
          limitation =
            limitation ||
            `${CHANAKYA_OCR_PROVIDER_NOT_CONFIGURED} — OCR provider credentials not configured.`;
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
        docFacts = stampOcrProvenanceOnFacts({
          facts: docFacts,
          extractionMethod: method,
          confidence,
          pageHint,
        });
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
  const documentsOcrFailed = reads.filter((r) => r.status === "ocr_failed").length;
  const documentsRequiringVision = reads.filter(
    (r) => r.status === "vision_required",
  ).length;

  const limitations = [
    CHANAKYA_DOCUMENT_INTELLIGENCE_CAPABILITY_NOTE,
    CHANAKYA_DOCUMENT_VISION_PROVIDER_NOTE,
    "Document content is never written to application logs by this pack builder.",
  ];
  if (!wire.ocrConfigured && !isDeterministicMockOcrPort(ocrPort)) {
    limitations.push(
      `${CHANAKYA_OCR_PROVIDER_NOT_CONFIGURED} — AZURE_DOCUMENT_INTELLIGENCE_* or DOCUMENT_VISION_API_KEY / OPENAI_API_KEY absent.`,
    );
  }
  if (ocrRejectedQuality > 0) {
    limitations.push(
      `${ocrRejectedQuality} document(s) returned OCR text that failed the quality gate — not promoted to content_read.`,
    );
  }
  if (ocrFailed > 0) {
    limitations.push(
      `${ocrFailed} document(s) ended in ${CHANAKYA_OCR_FAILED} — provider attempted but no quality-gated readable text.`,
    );
  }
  if (documentsWithReadableText === 0 && docs.length > 0) {
    limitations.push(
      `${CHANAKYA_DOC_READ_NOT_AVAILABLE} — no document yielded quality-gated readable text in this run (binaries missing, OCR failure, or unsupported types).`,
    );
  }

  return {
    opportunityId,
    retrievedAt: new Date().toISOString(),
    capability: {
      nativeTextExtraction: true,
      pdfTextExtraction: true,
      pdfTextLayerProbe: false,
      ocr: ocrCapabilityActive(wire.ocrConfigured, ocrPort),
      vision: Boolean(ocrPort) && (wire.visionConfigured || isDeterministicMockOcrPort(ocrPort)),
      tableExtraction: Boolean(tablePort),
      structuredFinancialFacts: structuredFacts.length > 0,
      crossDocumentReconciliation: crossDocumentComparisons.length > 0,
      note: CHANAKYA_DOCUMENT_INTELLIGENCE_CAPABILITY_NOTE,
    },
    documentsReviewed: reads.length,
    documentsWithBinary: reads.filter((r) => r.hasBinary).length,
    documentsWithReadableText,
    documentsRequiringOcr,
    documentsOcrFailed,
    documentsRequiringVision,
    reads,
    structuredFacts,
    crossDocumentComparisons,
    contentClassifications,
    visionProvider: {
      configured: isDocumentVisionConfigured(),
      providerId: ocrPort?.providerId ?? null,
      supportsImages: true,
      supportsScannedPdfWithoutRasterizer: wire.azureDiConfigured,
      note: CHANAKYA_DOCUMENT_VISION_PROVIDER_NOTE,
    },
    ocrProviders: {
      anyConfigured: wire.ocrConfigured,
      providers: wire.ocrProviders,
    },
    ocrRunSummary: {
      attempted: ocrAttempted,
      succeeded: ocrSucceeded,
      rejectedQuality: ocrRejectedQuality,
      failed: ocrFailed,
      providerNotConfigured: ocrProviderNotConfigured,
      remainingOcrRequired: reads.filter((r) => r.status === "ocr_required").length,
      remainingOcrFailed: documentsOcrFailed,
    },
    limitations,
  };
}
