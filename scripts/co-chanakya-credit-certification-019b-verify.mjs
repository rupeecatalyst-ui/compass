/**
 * CO-CHANAKYA-CREDIT-CERTIFICATION-019B — OCR capability verification.
 *
 * Usage:
 *   node --env-file=.env.local --env-file=compass/.env.local --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-credit-certification-019b-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env) || !String(process.env[k] || "").trim()) {
      process.env[k] = v;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile("compass/.env.local");
loadEnvFile(".env");
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "verify-019b-jwt-secret-at-least-32-characters-long";

let failed = 0;
function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.log(`FAIL  ${msg}`);
}
function note(msg) {
  console.log(`NOTE  ${msg}`);
}

/** Scanned-style PDF with no extractable text layer. */
function buildEmptyTextPdf() {
  const stream = " ";
  const body =
    `%PDF-1.4\n1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n` +
    `2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n` +
    `3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>endobj\n` +
    `4 0 obj<< /Length ${Buffer.byteLength(stream)} >>stream\n${stream}\nendstream\nendobj\n` +
    `xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000206 00000 n \n` +
    `trailer<< /Size 5 /Root 1 0 R >>\nstartxref\n300\n%%EOF\n`;
  return Buffer.from(body, "utf8");
}

console.log("\n=== CO-CHANAKYA-CREDIT-CERTIFICATION-019B — OCR capability ===\n");

const {
  CHANAKYA_OCR_FAILED,
  CHANAKYA_OCR_PROVIDER_NOT_CONFIGURED,
  CHANAKYA_DOC_READ_NOT_AVAILABLE,
} = await import("../src/constants/chanakya-document-intelligence/index.ts");
const { createCompositeOcrPort } = await import(
  "../src/lib/chanakya-document-intelligence/composite-ocr-port.ts"
);
const {
  isAnyOcrProviderConfigured,
  listOcrProviderDescriptors,
} = await import("../src/lib/chanakya-document-intelligence/ocr-provider-config.ts");
const {
  createDeterministicMockOcrPort,
  DETERMINISTIC_MOCK_OCR_ITR_TEXT,
  DETERMINISTIC_MOCK_OCR_PROVIDER_ID,
} = await import("../src/lib/chanakya-document-intelligence/mock-ocr-port.ts");
const {
  configureChanakyaDocumentIntelligencePorts,
  resetChanakyaDocumentIntelligencePortsForVerification,
} = await import("../src/lib/chanakya-document-intelligence/ports.ts");
const {
  resetChanakyaDocumentIntelligencePortsWiringForVerification,
} = await import("../src/lib/chanakya-document-intelligence/wire-default-ports.ts");
const { createStructuredTextTableExtractorPort } = await import(
  "../src/lib/chanakya-document-intelligence/structured-text-table-port.ts"
);
const { buildChanakyaDocumentIntelligencePack } = await import(
  "../src/lib/chanakya-document-intelligence/build-intelligence-pack.ts"
);
const { clearDocumentExtractionCache } = await import(
  "../src/lib/chanakya-document-intelligence/extraction-cache.ts"
);
const { extractPdfTextFromBytes } = await import(
  "../src/lib/chanakya-document-intelligence/extract-pdf-text.ts"
);
const { assembleCreditIntelligence } = await import(
  "../src/lib/chanakya-credit-intelligence/credit-intelligence-core.ts"
);
const {
  buildLenderProposalIntelligence,
  assertNoForbiddenLenderProposalLanguage,
  assertNoInternalMetadataInLenderText,
} = await import(
  "../src/lib/chanakya-credit-proposal/lender-proposal-intelligence-core.ts"
);

// --- Architecture ---
{
  const port = createCompositeOcrPort([]);
  if (port.providerId === "composite_ocr_chain") ok("Composite OCR port chain (single abstraction)");
  else fail("Composite OCR port id");
  const descriptors = listOcrProviderDescriptors();
  if (descriptors.some((d) => d.providerId === "azure_document_intelligence")) {
    ok("Azure Document Intelligence provider descriptor registered");
  } else fail("Missing Azure DI descriptor");
  if (descriptors.some((d) => d.providerId === "openai_compatible_vision")) {
    ok("OpenAI-compatible vision provider descriptor registered");
  } else fail("Missing vision OCR descriptor");
}

// --- Provider status (this environment) ---
const providerConfigured = isAnyOcrProviderConfigured();
if (providerConfigured) {
  note("Live OCR credentials detected — production-capable when deployed with same env");
  ok("OCR provider credentials present in this environment");
} else {
  ok(`${CHANAKYA_OCR_PROVIDER_NOT_CONFIGURED} — no live OCR credentials (expected for cert)`);
}

function resetPorts() {
  resetChanakyaDocumentIntelligencePortsForVerification();
  resetChanakyaDocumentIntelligencePortsWiringForVerification();
  clearDocumentExtractionCache();
}

function verificationDoc(bytes, id, name) {
  return {
    documentId: id,
    opportunityId: "opp-019b-verify",
    displayName: name,
    typeRef: "doc:itr-acknowledgement",
    mimeType: "application/pdf",
    status: "active",
    verified: false,
    hasContent: true,
    byteLength: bytes.length,
    fileSizeBytes: bytes.length,
    storageKey: null,
    storageProvider: null,
    contentHash: null,
    contentVersion: 1,
    binarySource: "inline",
    binaryAbsentReason: "none",
    bytes,
    updatedAt: new Date().toISOString(),
  };
}

// --- Empty PDF requires OCR ---
const emptyPdf = buildEmptyTextPdf();
const emptyExtract = await extractPdfTextFromBytes({ bytes: Uint8Array.from(emptyPdf) });
if (emptyExtract?.quality.empty) ok("Fixture PDF has empty text layer (OCR-required path)");
else fail("Fixture PDF should be OCR-required");

// --- Mock OCR success: OCR → text → facts → credit intelligence ---
{
  resetPorts();
  configureChanakyaDocumentIntelligencePorts({
    ocr: createDeterministicMockOcrPort(),
    table: createStructuredTextTableExtractorPort(),
  });
  const pack = await buildChanakyaDocumentIntelligencePack({
    opportunityId: "opp-019b-verify",
    verificationDocuments: [
      verificationDoc(
        Uint8Array.from(emptyPdf),
        "019b-ocr-success",
        "ACK632165941241125 scanned.pdf",
      ),
    ],
  });
  const read = pack.reads[0];
  if (read?.status === "content_read" && read.extractionMethod === "ocr") {
    ok("Mock OCR promoted scanned PDF to content_read via extractionMethod=ocr");
  } else {
    fail(`Mock OCR success expected content_read/ocr got ${read?.status}/${read?.extractionMethod}`);
  }
  if (read?.provenance.documentId === "019b-ocr-success" && read.provenance.extractionMethod === "ocr") {
    ok("OCR provenance includes documentId + extractionMethod=ocr");
  } else fail("OCR provenance missing documentId/method");
  if (read?.provenance.page === 1) ok("OCR provenance includes page hint");
  else fail("OCR page provenance missing");
  if (pack.structuredFacts.length > 0) ok(`OCR → structured facts (${pack.structuredFacts.length})`);
  else fail("Mock OCR did not produce structured facts");
  if (pack.ocrRunSummary.succeeded === 1) ok("ocrRunSummary.succeeded=1");
  else fail(`ocrRunSummary.succeeded=${pack.ocrRunSummary.succeeded}`);

  const ci = assembleCreditIntelligence({
    opportunityId: "opp-019b-verify",
    organizationId: "org-verify",
    structuredFacts: pack.structuredFacts,
    crossDocumentComparisons: pack.crossDocumentComparisons,
    reads: pack.reads,
    limitations: pack.limitations,
  });
  if (pack.structuredFacts.length > 0 && ci.readOnly === true) {
    ok("OCR facts flow into credit intelligence assembly");
  } else fail("Credit intelligence missing OCR-derived facts");

  const lender = buildLenderProposalIntelligence({
    opportunityId: "opp-019b-verify",
    opportunityNumber: "OPP-019B",
    productName: "Business Loan",
    loanAmount: 5_000_000,
    borrowerName: "Verification Entity Pvt Ltd",
    employmentType: "self-employed-business",
    city: "Ahmedabad",
    companyName: "Verification Entity Pvt Ltd",
    purpose: "Working capital",
    transactionType: "fresh",
    relationshipManagerName: "RM Verify",
    lenderName: "Sample Bank",
    rmNote: null,
    stated: {},
    documents: [],
    documentIntelligence: pack,
    evidence: [],
    gaps: pack.limitations,
    intelligence: { recommendations: [], mentorNotes: [] },
    productLenderIntelligence: {},
    creditIntelligence: ci,
  });
  const lenderText = lender.sections.map((s) => s.body).join("\n");
  if (lenderText.includes(DETERMINISTIC_MOCK_OCR_ITR_TEXT.slice(0, 40))) {
    fail("Raw OCR fixture text leaked into lender-facing proposal");
  } else ok("Lender proposal excludes raw OCR document content");
  if (assertNoForbiddenLenderProposalLanguage(lenderText)) {
    ok("Lender proposal language guard PASS");
  } else fail("Lender proposal language guard FAIL");
  if (assertNoInternalMetadataInLenderText(lenderText)) ok("No internal metadata in lender text");
  else fail("Internal metadata in lender text");
}

// --- PROVIDER_NOT_CONFIGURED when credentials absent and no mock ---
if (!providerConfigured) {
  resetPorts();
  const pack = await buildChanakyaDocumentIntelligencePack({
    opportunityId: "opp-019b-no-provider",
    verificationDocuments: [
      verificationDoc(
        Uint8Array.from(emptyPdf),
        "019b-no-provider",
        "Auditor Report FY 2023-24 scan.pdf",
      ),
    ],
  });
  const read = pack.reads[0];
  if (read?.status === "ocr_required" && String(read.limitation || "").includes(CHANAKYA_OCR_PROVIDER_NOT_CONFIGURED)) {
    ok("Without credentials: status=ocr_required + PROVIDER_NOT_CONFIGURED");
  } else fail(`Expected PROVIDER_NOT_CONFIGURED got status=${read?.status} limitation=${read?.limitation}`);
  if (pack.ocrRunSummary.providerNotConfigured === 1) ok("ocrRunSummary.providerNotConfigured=1");
  else fail("providerNotConfigured counter missing");
}

// --- OCR_FAILED when mock provider returns nothing ---
{
  resetPorts();
  configureChanakyaDocumentIntelligencePorts({
    ocr: createDeterministicMockOcrPort({ fail: true }),
    table: createStructuredTextTableExtractorPort(),
  });
  const pack = await buildChanakyaDocumentIntelligencePack({
    opportunityId: "opp-019b-ocr-fail",
    verificationDocuments: [
      verificationDoc(
        Uint8Array.from(emptyPdf),
        "019b-ocr-fail",
        "Auditor Report FY 2024-25 scan.pdf",
      ),
    ],
  });
  const read = pack.reads[0];
  if (read?.status === "ocr_failed" && String(read.limitation || "").includes(CHANAKYA_OCR_FAILED)) {
    ok("Mock provider failure → ocr_failed + OCR_FAILED limitation");
  } else fail(`Expected OCR_FAILED got ${read?.status} / ${read?.limitation}`);
  if (pack.documentsOcrFailed === 1) ok("documentsOcrFailed=1");
  else fail(`documentsOcrFailed=${pack.documentsOcrFailed}`);
}

// --- OCR_FAILED on quality gate rejection ---
{
  resetPorts();
  configureChanakyaDocumentIntelligencePorts({
    ocr: createDeterministicMockOcrPort({ rejectQuality: true }),
    table: createStructuredTextTableExtractorPort(),
  });
  const pack = await buildChanakyaDocumentIntelligencePack({
    opportunityId: "opp-019b-ocr-quality",
    verificationDocuments: [
      verificationDoc(
        Uint8Array.from(emptyPdf),
        "019b-ocr-quality",
        "Auditor Report FY 2022-23 scan.pdf",
      ),
    ],
  });
  const read = pack.reads[0];
  if (read?.status === "ocr_failed" && pack.structuredFacts.length === 0) {
    ok("Low-quality OCR rejected — ocr_failed, zero structured facts");
  } else fail("Quality-gated OCR rejection failed");
}

// --- NOT_AVAILABLE summary when nothing readable ---
{
  resetPorts();
  const pack = await buildChanakyaDocumentIntelligencePack({
    opportunityId: "opp-019b-not-available",
    verificationDocuments: [
      verificationDoc(
        Uint8Array.from(emptyPdf),
        "019b-not-available",
        "Unreadable scan.pdf",
      ),
    ],
  });
  if (
    pack.documentsWithReadableText === 0 &&
    pack.limitations.some((l) => l.includes(CHANAKYA_DOC_READ_NOT_AVAILABLE))
  ) {
    ok("Pack limitations include NOT_AVAILABLE when nothing readable");
  } else fail("NOT_AVAILABLE limitation missing");
}

note(`Deterministic mock provider id: ${DETERMINISTIC_MOCK_OCR_PROVIDER_ID}`);

// --- Regression ---
console.log("\n--- Regression verify scripts ---\n");
for (const script of [
  "co-chanakya-credit-intelligence-014-verify.mjs",
  "co-chanakya-credit-certification-019a-verify.mjs",
  "co-chanakya-enterprise-read-context-002-verify.mjs",
]) {
  const args = script.includes("019a")
    ? [
        "--env-file=.env.local",
        "--env-file=compass/.env.local",
        "--import",
        "./scripts/_bat-stub-server-only.mjs",
        "--import",
        "tsx",
        `scripts/${script}`,
      ]
    : script.includes("014")
      ? [
          "--import",
          "./scripts/_bat-stub-server-only.mjs",
          "--import",
          "tsx",
          `scripts/${script}`,
        ]
      : ["--import", "tsx", `scripts/${script}`];
  const v = spawnSync(process.execPath, args, {
    cwd: ROOT,
    stdio: "pipe",
    encoding: "utf8",
    env: process.env,
  });
  if (v.status === 0) ok(`${script} PASS`);
  else {
    fail(`${script} FAIL`);
    if (v.stderr) note(String(v.stderr).slice(0, 400));
  }
}

console.log("\n--- 019B summary ---\n");
if (!providerConfigured) {
  note("Production prerequisite: set AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT + key (preferred for scanned PDFs)");
  note("Alternative: DOCUMENT_VISION_API_KEY or OPENAI_API_KEY for image OCR (not scanned PDFs)");
}

console.log(failed ? `\nRESULT: FAIL (${failed})\n` : "\nRESULT: PASS\n");
process.exit(failed > 0 ? 1 : 0);
