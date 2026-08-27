/**
 * CO-CHANAKYA-024 — OCR integration readiness verification.
 *
 * Usage:
 *   node --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-024-ocr-integration-readiness-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let failed = 0;
function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.log(`FAIL  ${msg}`);
}

console.log("\n=== CO-CHANAKYA-024 — OCR integration readiness ===\n");

{
  const v = spawnSync(
    process.execPath,
    [
      "--import",
      "./scripts/_bat-stub-server-only.mjs",
      "--import",
      "tsx",
      "scripts/co-chanakya-credit-intelligence-014-verify.mjs",
    ],
    { cwd: ROOT, stdio: "pipe", encoding: "utf8", env: process.env },
  );
  if (v.status === 0) ok("014 OCR baseline verify PASS");
  else fail("014 OCR baseline verify FAIL");
}

const {
  AVON_OCR_EMPTY_TEXT_LAYER_PDF_BASE64,
  AVON_OCR_FINANCIAL_SCAN_FIXTURE,
  decodeFixturePdfBase64,
} = await import(
  "../src/constants/chanakya-credit-intelligence/avon-ocr-extraction-fixtures.ts"
);
const {
  assertNoDocumentBinaryInAiContext,
  buildOcrIntegrationContracts,
  gateOcrFinancialFactsForIntelligence,
  projectOcrIntegrationSummaryForAiContext,
  resolveOcrIntegrationOutcome,
  stampOcrProvenanceOnFacts,
  summarizeOcrProviderReadiness,
} = await import("../src/lib/chanakya-document-intelligence/ocr-integration-core.ts");
const { assessOcrExtractQuality } = await import(
  "../src/lib/chanakya-document-intelligence/assess-ocr-quality.ts"
);
const { extractStructuredFactsFromText } = await import(
  "../src/lib/chanakya-document-intelligence/extract-structured-facts.ts"
);
const { isReliableForFinancialIntelligence } = await import(
  "../src/lib/chanakya-credit-intelligence/financial-fact-quality-core.ts"
);
const { createDeterministicMockOcrPort } = await import(
  "../src/lib/chanakya-document-intelligence/mock-ocr-port.ts"
);
const {
  configureChanakyaDocumentIntelligencePorts,
  resetChanakyaDocumentIntelligencePortsForVerification,
} = await import("../src/lib/chanakya-document-intelligence/ports.ts");
const { createCompositeOcrPort } = await import(
  "../src/lib/chanakya-document-intelligence/composite-ocr-port.ts"
);
const { createStructuredTextTableExtractorPort } = await import(
  "../src/lib/chanakya-document-intelligence/structured-text-table-port.ts"
);
const { buildChanakyaDocumentIntelligencePack } = await import(
  "../src/lib/chanakya-document-intelligence/build-intelligence-pack.ts"
);
const { resetChanakyaDocumentIntelligencePortsWiringForVerification } =
  await import("../src/lib/chanakya-document-intelligence/wire-default-ports.ts");
const { CHANAKYA_OCR_PROVIDER_NOT_CONFIGURED } = await import(
  "../src/constants/chanakya-document-intelligence/index.ts"
);
const { resolveAzureDocumentIntelligenceKey } = await import(
  "../src/lib/chanakya-document-intelligence/ocr-provider-config.ts"
);

const baseProv = {
  documentId: "doc_ocr_024",
  opportunityId: "opp_ocr_024",
  displayName: "Audited Balance Sheet scan.pdf",
  typeRef: "doc:financial",
  mimeType: "application/pdf",
  documentVersionHint: null,
};

// --- Provider config never hard-coded ---
{
  const src = fs.readFileSync(
    path.join(
      ROOT,
      "src/lib/chanakya-document-intelligence/azure-document-intelligence-ocr-port.ts",
    ),
    "utf8",
  );
  if (/Ocp-Apim-Subscription-Key:\s*["'][a-z0-9+/=]{20,}/i.test(src)) {
    fail("024 Azure OCR port must not hard-code credentials");
  } else ok("024 — Azure OCR port has no hard-coded credentials");
  if (!src.includes("resolveAzureDocumentIntelligenceKey")) {
    fail("024 Azure port must resolve key from environment");
  } else ok("024 — Azure credentials resolved from environment only");
}

// --- Unconfigured provider → honest OCR_PROVIDER_NOT_CONFIGURED ---
{
  const outcome = resolveOcrIntegrationOutcome({
    read: {
      status: "ocr_required",
      extractionMethod: "ocr",
      limitation: `${CHANAKYA_OCR_PROVIDER_NOT_CONFIGURED} — credentials absent`,
      hasBinary: true,
    },
    providerConfigured: false,
  });
  if (outcome !== "OCR_PROVIDER_NOT_CONFIGURED") {
    fail("024 unconfigured provider outcome");
  } else ok("024 — OCR_PROVIDER_NOT_CONFIGURED when provider absent");
}

// --- Configured mock provider → OCR → quality gate → facts → provenance ---
{
  resetChanakyaDocumentIntelligencePortsForVerification();
  resetChanakyaDocumentIntelligencePortsWiringForVerification();
  configureChanakyaDocumentIntelligencePorts({
    ocr: createDeterministicMockOcrPort({ text: AVON_OCR_FINANCIAL_SCAN_FIXTURE }),
    table: createStructuredTextTableExtractorPort(),
  });

  const pdfBytes = decodeFixturePdfBase64(AVON_OCR_EMPTY_TEXT_LAYER_PDF_BASE64);
  const pack = await buildChanakyaDocumentIntelligencePack({
    opportunityId: "opp_ocr_024_configured",
    verificationDocuments: [
      {
        documentId: "doc_scan_fin",
        opportunityId: "opp_ocr_024_configured",
        displayName: "Audited Balance Sheet scan.pdf",
        typeRef: "doc:financial",
        mimeType: "application/pdf",
        status: "active",
        verified: false,
        hasContent: true,
        byteLength: pdfBytes.length,
        fileSizeBytes: pdfBytes.length,
        storageKey: null,
        storageProvider: null,
        contentHash: null,
        contentVersion: 1,
        binarySource: "inline",
        binaryAbsentReason: "none",
        bytes: pdfBytes,
        updatedAt: new Date().toISOString(),
      },
    ],
  });

  const read = pack.reads.find((r) => r.documentId === "doc_scan_fin");
  if (!read || read.status !== "content_read") {
    fail(`024 configured OCR must reach content_read (got ${read?.status})`);
  } else ok("024 — configured provider: ocr_required → content_read");
  if (read.extractionMethod !== "ocr") fail("024 OCR extraction method");
  else ok("024 — extractionMethod=ocr after provider success");

  if (pack.ocrRunSummary.succeeded < 1) fail("024 OCR run succeeded counter");
  else ok("024 — OCR run summary records success");

  const assets = pack.structuredFacts.find((f) => f.key === "total_assets");
  if (!assets) fail("024 OCR financial facts missing");
  else ok("024 — structured facts extracted after OCR quality gate");
  if (assets.provenance.extractionMethod !== "ocr") {
    fail("024 OCR facts must carry extractionMethod=ocr provenance");
  } else ok("024 — OCR provenance stamped on structured facts");

  const gated = gateOcrFinancialFactsForIntelligence(pack.structuredFacts);
  if (!gated.accepted.some((f) => f.key === "total_assets")) {
    fail("024 OCR total_assets must pass financial quality gate");
  } else ok("024 — OCR financial facts pass same quality gate as native PDF");
  if (gated.accepted.some((f) => f.key === "trade_receivables" && f.value === "13")) {
    fail("024 OCR note artefact must not pass financial gate");
  } else ok("024 — OCR note-column artefacts rejected by financial gate");
}

// --- Garbage OCR → OCR_FAILED, no facts ---
{
  resetChanakyaDocumentIntelligencePortsForVerification();
  resetChanakyaDocumentIntelligencePortsWiringForVerification();
  configureChanakyaDocumentIntelligencePorts({
    ocr: createDeterministicMockOcrPort({ rejectQuality: true }),
    table: createStructuredTextTableExtractorPort(),
  });

  const pdfBytes = decodeFixturePdfBase64(AVON_OCR_EMPTY_TEXT_LAYER_PDF_BASE64);
  const pack = await buildChanakyaDocumentIntelligencePack({
    opportunityId: "opp_ocr_024_garbage",
    verificationDocuments: [
      {
        documentId: "doc_garbage",
        opportunityId: "opp_ocr_024_garbage",
        displayName: "Corrupted scan.pdf",
        typeRef: "doc:financial",
        mimeType: "application/pdf",
        status: "active",
        verified: false,
        hasContent: true,
        byteLength: pdfBytes.length,
        fileSizeBytes: pdfBytes.length,
        storageKey: null,
        storageProvider: null,
        contentHash: null,
        contentVersion: 1,
        binarySource: "inline",
        binaryAbsentReason: "none",
        bytes: pdfBytes,
        updatedAt: new Date().toISOString(),
      },
    ],
  });

  const read = pack.reads.find((r) => r.documentId === "doc_garbage");
  if (read?.status !== "ocr_failed") fail("024 garbage OCR must be ocr_failed");
  else ok("024 — garbage OCR rejected → ocr_failed");
  if (pack.structuredFacts.length > 0) fail("024 garbage OCR must not emit facts");
  else ok("024 — no structured facts when OCR quality gate fails");
}

// --- Unconfigured pack run → ocr_required remains, no pretend OCR ---
{
  resetChanakyaDocumentIntelligencePortsForVerification();
  resetChanakyaDocumentIntelligencePortsWiringForVerification();
  configureChanakyaDocumentIntelligencePorts({
    ocr: createCompositeOcrPort([]),
    table: createStructuredTextTableExtractorPort(),
  });

  const savedEndpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const savedKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
  const savedVision = process.env.DOCUMENT_VISION_API_KEY;
  delete process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  delete process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
  delete process.env.AZURE_DOCUMENT_INTELLIGENCE_API_KEY;
  delete process.env.DOCUMENT_VISION_API_KEY;

  const pdfBytes = decodeFixturePdfBase64(AVON_OCR_EMPTY_TEXT_LAYER_PDF_BASE64);
  const pack = await buildChanakyaDocumentIntelligencePack({
    opportunityId: "opp_ocr_024_unconfigured",
    verificationDocuments: [
      {
        documentId: "doc_unconfigured",
        opportunityId: "opp_ocr_024_unconfigured",
        displayName: "Scanned FS.pdf",
        typeRef: "doc:financial",
        mimeType: "application/pdf",
        status: "active",
        verified: false,
        hasContent: true,
        byteLength: pdfBytes.length,
        fileSizeBytes: pdfBytes.length,
        storageKey: null,
        storageProvider: null,
        contentHash: null,
        contentVersion: 1,
        binarySource: "inline",
        binaryAbsentReason: "none",
        bytes: pdfBytes,
        updatedAt: new Date().toISOString(),
      },
    ],
  });

  if (savedEndpoint) process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT = savedEndpoint;
  if (savedKey) process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY = savedKey;
  if (savedVision) process.env.DOCUMENT_VISION_API_KEY = savedVision;

  const read = pack.reads.find((r) => r.documentId === "doc_unconfigured");
  if (read?.status !== "ocr_required") {
    fail(`024 unconfigured must stay ocr_required (got ${read?.status})`);
  } else ok("024 — unconfigured provider: status remains ocr_required");
  if (!read?.limitation?.includes(CHANAKYA_OCR_PROVIDER_NOT_CONFIGURED)) {
    fail("024 limitation must cite PROVIDER_NOT_CONFIGURED");
  } else ok("024 — limitation cites OCR_PROVIDER_NOT_CONFIGURED");
  if (pack.ocrRunSummary.attempted > 0) fail("024 must not pretend OCR was attempted");
  else ok("024 — no OCR attempt when provider not configured");
  if (pack.structuredFacts.length > 0) fail("024 unconfigured must not emit facts");
  else ok("024 — NOT_AVAILABLE facts path when OCR not run");

  const contracts = buildOcrIntegrationContracts(pack);
  const c = contracts.find((x) => x.documentId === "doc_unconfigured");
  if (c?.outcome !== "OCR_PROVIDER_NOT_CONFIGURED") fail("024 contract outcome");
  else ok("024 — OCR integration contract = OCR_PROVIDER_NOT_CONFIGURED");
}

// --- OCR financial path uses 012 extractors (section/year/unit) ---
{
  const quality = assessOcrExtractQuality({
    text: AVON_OCR_FINANCIAL_SCAN_FIXTURE,
    providerConfidence: "high",
  });
  if (!quality.accepted) fail("024 financial OCR fixture quality");
  const facts = extractStructuredFactsFromText({
    text: AVON_OCR_FINANCIAL_SCAN_FIXTURE,
    provenance: {
      ...baseProv,
      extractionMethod: "ocr",
      confidence: quality.ocrConfidence,
    },
  });
  const assets = facts.find((f) => f.key === "total_assets" && f.periodLabel === "FY2023-24");
  if (!assets || assets.unit !== "thousands") {
    fail("024 OCR financial must retain unit + year association");
  } else ok("024 — OCR output passes section/unit/year via 012 extractors");
  const stamped = stampOcrProvenanceOnFacts({
    facts,
    extractionMethod: "ocr",
    confidence: "high",
  });
  if (stamped[0]?.provenance.extractionMethod !== "ocr") fail("024 stamp provenance");
  else ok("024 — stampOcrProvenanceOnFacts preserves OCR method");
}

// --- Security: no binary / raw OCR in AI context projection ---
{
  const summary = projectOcrIntegrationSummaryForAiContext({
    ocrProviders: {
      anyConfigured: false,
      providers: [
        {
          providerId: "azure_document_intelligence",
          configured: false,
          supportsPdf: true,
          supportsImages: true,
        },
      ],
    },
    ocrRunSummary: {
      attempted: 0,
      succeeded: 0,
      rejectedQuality: 0,
      failed: 0,
      providerNotConfigured: 1,
      remainingOcrRequired: 1,
      remainingOcrFailed: 0,
    },
    documentsRequiringOcr: 1,
    documentsOcrFailed: 0,
  });

  const payload = {
    ocrIntegration: summary,
    reads: [{ status: "ocr_required", limitation: "test" }],
    contact: { mobile: "[REDACTED]", email: "[REDACTED]" },
  };

  try {
    assertNoDocumentBinaryInAiContext(payload);
    ok("024 — AI context projection has no document binary keys");
  } catch (e) {
    fail(`024 AI context binary guard: ${e.message}`);
  }

  try {
    assertNoDocumentBinaryInAiContext({
      bad: { contentBase64: "AAAA".repeat(20_000) },
    });
    fail("024 must block base64 blobs in AI context");
  } catch {
    ok("024 — assertNoDocumentBinaryInAiContext blocks base64 payloads");
  }

  const azureConfig = summarizeOcrProviderReadiness();
  const serialized = JSON.stringify(azureConfig);
  const key = resolveAzureDocumentIntelligenceKey();
  if (key && serialized.includes(key)) {
    fail("024 credentials leaked in readiness summary");
  } else ok("024 — provider readiness summary never exposes credentials");
}

// --- Low-confidence OCR financial facts blocked ---
{
  const rawFacts = extractStructuredFactsFromText({
    text: AVON_OCR_FINANCIAL_SCAN_FIXTURE,
    provenance: {
      ...baseProv,
      extractionMethod: "ocr",
      confidence: "low",
    },
  });
  const lowConfFacts = stampOcrProvenanceOnFacts({
    facts: rawFacts,
    extractionMethod: "ocr",
    confidence: "low",
  });
  if (lowConfFacts.some((f) => isReliableForFinancialIntelligence(f))) {
    fail("024 low-confidence OCR facts must not enter financial intelligence");
  } else ok("024 — low-confidence OCR facts blocked from financial intelligence");
}

// --- Environment state reporting ---
{
  const readiness = summarizeOcrProviderReadiness();
  if (
    process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT &&
    process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY
  ) {
    if (!readiness.azureConfigured) fail("024 azure configured detection");
    else ok("024 — Azure Document Intelligence detected as configured in environment");
  } else {
    ok("024 — Azure Document Intelligence not configured in this environment (expected for local cert)");
  }
}

console.log(failed ? `\nRESULT: FAIL (${failed})\n` : "\nRESULT: PASS\n");
process.exit(failed ? 1 : 0);
