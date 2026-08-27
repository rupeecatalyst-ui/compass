/**
 * CO-CHANAKYA-024 — OCR integration contract (readiness).
 * Provider-port based · no parallel OCR engine · no credential exposure.
 */

import {
  CHANAKYA_DOC_READ_NOT_AVAILABLE,
  CHANAKYA_OCR_FAILED,
  CHANAKYA_OCR_PROVIDER_NOT_CONFIGURED,
} from "@/constants/chanakya-document-intelligence";
import type {
  ChanakyaDocumentContentReadResult,
  ChanakyaDocumentExtractedFact,
  ChanakyaDocumentIntelligencePack,
  ChanakyaDocumentProvenance,
} from "@/types/chanakya-document-intelligence";
import { isReliableForFinancialIntelligence } from "@/lib/chanakya-credit-intelligence/financial-fact-quality-core";
import { isAnyOcrProviderConfigured } from "./ocr-provider-config";

/** Per-document OCR integration outcome (contract vocabulary). */
export type ChanakyaOcrIntegrationOutcome =
  | "CONTENT_READ"
  | "OCR_REQUIRED"
  | "OCR_PROVIDER_NOT_CONFIGURED"
  | "OCR_FAILED"
  | "NOT_AVAILABLE";

export type ChanakyaOcrIntegrationDocumentContract = {
  documentId: string;
  displayName: string;
  outcome: ChanakyaOcrIntegrationOutcome;
  extractionMethod: ChanakyaDocumentContentReadResult["extractionMethod"];
  confidence: ChanakyaDocumentProvenance["confidence"];
  limitation: string | null;
  providerId: string | null;
};

const BINARY_AI_CONTEXT_KEYS = new Set([
  "bytes",
  "contentBase64",
  "contentBytes",
  "binary",
  "rawOcrPayload",
  "ocrRawText",
  "base64Source",
]);

export function resolveOcrIntegrationOutcome(input: {
  read: Pick<
    ChanakyaDocumentContentReadResult,
    "status" | "extractionMethod" | "limitation" | "hasBinary"
  >;
  providerConfigured: boolean;
}): ChanakyaOcrIntegrationOutcome {
  const { read, providerConfigured } = input;

  if (read.status === "content_read" || read.status === "content_read_partial") {
    if (read.extractionMethod === "ocr" || read.extractionMethod === "vision") {
      return "CONTENT_READ";
    }
    return "CONTENT_READ";
  }

  if (read.status === "ocr_required" || read.status === "vision_required") {
    if (!providerConfigured) return "OCR_PROVIDER_NOT_CONFIGURED";
    return "OCR_REQUIRED";
  }

  if (read.status === "ocr_failed") return "OCR_FAILED";

  if (!read.hasBinary) return "NOT_AVAILABLE";

  return "NOT_AVAILABLE";
}

export function buildOcrIntegrationContracts(
  pack: Pick<ChanakyaDocumentIntelligencePack, "reads" | "ocrProviders">,
): ChanakyaOcrIntegrationDocumentContract[] {
  const providerConfigured = pack.ocrProviders.anyConfigured;
  return pack.reads.map((read) => ({
    documentId: read.documentId,
    displayName: read.displayName,
    outcome: resolveOcrIntegrationOutcome({ read, providerConfigured }),
    extractionMethod: read.extractionMethod,
    confidence: read.provenance.confidence,
    limitation: read.limitation,
    providerId:
      read.extractionMethod === "ocr" || read.extractionMethod === "vision"
        ? read.provenance.extractionMethod
        : null,
  }));
}

/** Stamp OCR/vision provenance on structured facts — same pipeline as native PDF extraction. */
export function stampOcrProvenanceOnFacts(input: {
  facts: ChanakyaDocumentExtractedFact[];
  extractionMethod: ChanakyaDocumentProvenance["extractionMethod"];
  confidence: ChanakyaDocumentProvenance["confidence"];
  pageHint?: number | null;
}): ChanakyaDocumentExtractedFact[] {
  if (input.extractionMethod !== "ocr" && input.extractionMethod !== "vision") {
    return input.facts;
  }
  return input.facts.map((f) => ({
    ...f,
    provenance: {
      ...f.provenance,
      extractionMethod: input.extractionMethod,
      confidence: capConfidenceToOcrGate(f.provenance.confidence, input.confidence),
      page: f.provenance.page ?? input.pageHint ?? null,
    },
    lenderFacingEligible:
      f.lenderFacingEligible !== false &&
      isReliableForFinancialIntelligence({
        ...f,
        provenance: {
          ...f.provenance,
          extractionMethod: input.extractionMethod,
          confidence: capConfidenceToOcrGate(f.provenance.confidence, input.confidence),
        },
      }),
  }));
}

function confidenceRank(c: ChanakyaDocumentProvenance["confidence"]): number {
  switch (c) {
    case "high":
      return 4;
    case "medium":
      return 3;
    case "low":
      return 2;
    case "ambiguous":
      return 1;
    default:
      return 0;
  }
}

function capConfidenceToOcrGate(
  factConfidence: ChanakyaDocumentProvenance["confidence"],
  ocrConfidence: ChanakyaDocumentProvenance["confidence"],
): ChanakyaDocumentProvenance["confidence"] {
  return confidenceRank(factConfidence) <= confidenceRank(ocrConfidence)
    ? factConfidence
    : ocrConfidence;
}

/** OCR-sourced financial facts must pass the same quality gates as native PDF extraction. */
export function gateOcrFinancialFactsForIntelligence(
  facts: ChanakyaDocumentExtractedFact[],
): {
  accepted: ChanakyaDocumentExtractedFact[];
  rejected: ChanakyaDocumentExtractedFact[];
} {
  const accepted: ChanakyaDocumentExtractedFact[] = [];
  const rejected: ChanakyaDocumentExtractedFact[] = [];
  for (const f of facts) {
    if (isReliableForFinancialIntelligence(f)) accepted.push(f);
    else rejected.push(f);
  }
  return { accepted, rejected };
}

/** Safe OCR integration summary for AI / ChatGPT context — no binaries, no raw OCR payload. */
export function projectOcrIntegrationSummaryForAiContext(
  pack: Pick<
    ChanakyaDocumentIntelligencePack,
    "ocrProviders" | "ocrRunSummary" | "documentsRequiringOcr" | "documentsOcrFailed"
  >,
): Record<string, unknown> {
  return {
    providerConfigured: pack.ocrProviders.anyConfigured,
    providers: pack.ocrProviders.providers.map((p) => ({
      providerId: p.providerId,
      configured: p.configured,
      supportsPdf: p.supportsPdf,
      supportsImages: p.supportsImages,
    })),
    documentsRequiringOcr: pack.documentsRequiringOcr,
    documentsOcrFailed: pack.documentsOcrFailed,
    runSummary: {
      attempted: pack.ocrRunSummary.attempted,
      succeeded: pack.ocrRunSummary.succeeded,
      rejectedQuality: pack.ocrRunSummary.rejectedQuality,
      failed: pack.ocrRunSummary.failed,
      providerNotConfigured: pack.ocrRunSummary.providerNotConfigured,
      remainingOcrRequired: pack.ocrRunSummary.remainingOcrRequired,
    },
    contractNote:
      "OCR integration uses configured provider ports only. Raw document binaries and OCR payloads are never included in AI context.",
    provenance: "chanakya_document_intelligence/ocr_integration_core",
  };
}

export function summarizeOcrProviderReadiness(): {
  anyConfigured: boolean;
  azureConfigured: boolean;
  statusLabel: typeof CHANAKYA_OCR_PROVIDER_NOT_CONFIGURED | "CONFIGURED";
} {
  const anyConfigured = isAnyOcrProviderConfigured();
  return {
    anyConfigured,
    azureConfigured: Boolean(
      process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT?.trim() &&
        (process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY?.trim() ||
          process.env.AZURE_DOCUMENT_INTELLIGENCE_API_KEY?.trim()),
    ),
    statusLabel: anyConfigured ? "CONFIGURED" : CHANAKYA_OCR_PROVIDER_NOT_CONFIGURED,
  };
}

/** Block document binaries / raw OCR payloads from AI-facing JSON. */
export function assertNoDocumentBinaryInAiContext(payload: unknown): void {
  const violations: string[] = [];
  scanForBinaryLeaks(payload, "", violations, 0);
  if (violations.length > 0) {
    throw new Error(
      `CHANAKYA context blocked: document binary or raw OCR payload must not enter AI context (${violations.slice(0, 5).join(", ")}).`,
    );
  }
}

function scanForBinaryLeaks(
  value: unknown,
  path: string,
  violations: string[],
  depth: number,
): void {
  if (depth > 12 || value == null) return;
  if (typeof value === "string") {
    if (value.length > 50_000 && /^[A-Za-z0-9+/=\s]{100,}$/.test(value.slice(0, 200))) {
      violations.push(path || "root");
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) =>
      scanForBinaryLeaks(item, `${path}[${i}]`, violations, depth + 1),
    );
    return;
  }
  if (typeof value === "object") {
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (BINARY_AI_CONTEXT_KEYS.has(key)) {
        violations.push(path ? `${path}.${key}` : key);
        continue;
      }
      scanForBinaryLeaks(raw, path ? `${path}.${key}` : key, violations, depth + 1);
    }
  }
}

export function ocrOutcomeToAvailabilityLabel(
  outcome: ChanakyaOcrIntegrationOutcome,
): string {
  switch (outcome) {
    case "CONTENT_READ":
      return "AVAILABLE";
    case "OCR_REQUIRED":
      return "OCR_REQUIRED";
    case "OCR_PROVIDER_NOT_CONFIGURED":
      return CHANAKYA_OCR_PROVIDER_NOT_CONFIGURED;
    case "OCR_FAILED":
      return CHANAKYA_OCR_FAILED;
    default:
      return CHANAKYA_DOC_READ_NOT_AVAILABLE;
  }
}
