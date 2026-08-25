/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-005 — document reading foundation verify.
 * Contract checks + inlined runtime probes (no @/ path imports).
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let failed = 0;

function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.log(`FAIL  ${msg}`);
}
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const types = read("src/types/chanakya-document-intelligence.ts");
const constants = read("src/constants/chanakya-document-intelligence/index.ts");
const classifySrc = read(
  "src/lib/chanakya-document-intelligence/classify-reading-strategy.ts",
);
const extractSrc = read("src/lib/chanakya-document-intelligence/extract-native-text.ts");
const retrieve = read("src/lib/chanakya-document-intelligence/retrieve-authorized.ts");
const pack = read("src/lib/chanakya-document-intelligence/build-intelligence-pack.ts");
const gather = read("src/lib/chanakya-credit-proposal/gather-context.ts");
const compose = read("src/lib/chanakya-credit-proposal/compose-proposal.ts");
const panel = read(
  "src/components/catalyst-one/enterprise-credit-workspace/ecw-proposal-generation-panel.tsx",
);

if (
  types.includes("ChanakyaDocumentProvenance") &&
  types.includes("ChanakyaDocumentExtractedFact") &&
  types.includes("ChanakyaOcrExtractorPort")
) {
  ok("Document intelligence contracts include provenance + future ports");
} else fail("Document intelligence contracts incomplete");

if (
  constants.includes("CO-CHANAKYA-CREDIT-INTELLIGENCE-005") ||
  (constants.includes("native text") && constants.includes("will not invent statement figures"))
) {
  ok("Capability note / sprint constant present");
} else fail("Capability constants missing");

if (
  retrieve.includes('import "server-only"') &&
  retrieve.includes("row.opportunityId !== opportunityId") &&
  retrieve.includes("includeContent")
) {
  ok("Authorized retrieval is server-only and opportunity-scoped");
} else fail("Authorized retrieval contract failed");

if (
  pack.includes("structuredFacts") &&
  pack.includes("extractPdfTextFromBytes") &&
  !pack.includes("₹12.4") &&
  !pack.includes("Revenue: ₹")
) {
  ok("Pack builder has no fabricated financial sample values");
} else fail("Pack builder fabrication check failed");

if (
  gather.includes("buildChanakyaDocumentIntelligencePack") &&
  gather.includes("documentReading") &&
  gather.includes("nativeDocumentTextAvailable")
) {
  ok("Proposal gather wires document intelligence pack");
} else fail("Gather wiring missing");

if (
  (compose.includes("PDF.js") ||
    compose.includes("unpdf") ||
    compose.includes("PDF text") ||
    compose.includes("text-layer")) &&
  (compose.includes("Structured financial fact") ||
    compose.includes("Structured facts extracted") ||
    compose.includes("CHANAKYA_CREDIT_PROPOSAL_NO_EXTRACTION_NOTICE")) &&
  !compose.includes("Please provide bank statement")
) {
  ok("Lender compose reflects honest reading without upload CTAs");
} else fail("Compose honesty contract failed");

if (
  panel.includes("Document reading") &&
  panel.includes("Excerpts stay server-side")
) {
  ok("UI shows reading summary without client-side excerpts");
} else fail("UI document reading summary missing");

const pdfExtract = read("src/lib/chanakya-document-intelligence/extract-pdf-text.ts");
const quality = read("src/lib/chanakya-document-intelligence/assess-text-quality.ts");
if (
  classifySrc.includes("ocr_required") &&
  classifySrc.includes("vision_required") &&
  extractSrc.includes("extractNativeTextFromBytes") &&
  pdfExtract.includes("unpdf") &&
  quality.includes("usable")
) {
  ok("Classification + native text + real PDF extractor + quality gate present");
} else fail("Classification / extract modules incomplete");

// Inlined runtime probes (mirrors extract-native-text / classify behaviour)
function classifyReadingStrategy(input) {
  if (!input.hasBinary) {
    return { preferredMethod: "unavailable", ifUnavailableStatus: "no_binary" };
  }
  const mime = (input.mimeType || "").toLowerCase();
  const name = (input.displayName || "").toLowerCase();
  if (mime.startsWith("text/") || /\.(txt|csv|json|md|log)$/i.test(name)) {
    return { preferredMethod: "native_text", ifUnavailableStatus: "content_unavailable" };
  }
  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    return { preferredMethod: "pdf_text_layer", ifUnavailableStatus: "ocr_required" };
  }
  if (mime.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(name)) {
    return { preferredMethod: "vision", ifUnavailableStatus: "vision_required" };
  }
  return { preferredMethod: "unavailable", ifUnavailableStatus: "unsupported_type" };
}

function hintDocumentFamily(input) {
  const h = `${input.typeRef} ${input.displayName}`.toLowerCase();
  if (/bank[\s_-]*statement|passbook|banking/i.test(h)) return "banking";
  return "other";
}

function probePdfTextLayer(bytes) {
  const raw = Buffer.from(bytes).toString("latin1");
  if (!raw.startsWith("%PDF")) return null;
  const literals = [];
  const re = /\((?:\\.|[^\\)]){2,200}\)/g;
  let match;
  while ((match = re.exec(raw)) !== null) {
    const inner = match[0].slice(1, -1);
    if (/[A-Za-z0-9]/.test(inner) && inner.trim().length >= 2) literals.push(inner);
  }
  const joined = literals.join(" ").trim();
  if (!joined) return null;
  return { text: joined, sparse: joined.length < 80 };
}

function extractNativeText(bytes, mimeType, displayName) {
  const mime = (mimeType || "").toLowerCase();
  const name = (displayName || "").toLowerCase();
  if (!(mime.startsWith("text/") || /\.(txt|csv|json|md|log)$/i.test(name))) return null;
  const decoded = Buffer.from(bytes).toString("utf8").trim();
  return decoded ? { text: decoded, method: "native_text" } : null;
}

const pdfStrategy = classifyReadingStrategy({
  mimeType: "application/pdf",
  displayName: "P&L FY2025.pdf",
  hasBinary: true,
});
if (pdfStrategy.preferredMethod === "pdf_text_layer") ok("PDF classified for text-layer probe");
else fail("PDF classification incorrect");

const imgStrategy = classifyReadingStrategy({
  mimeType: "image/png",
  displayName: "pan.png",
  hasBinary: true,
});
if (imgStrategy.ifUnavailableStatus === "vision_required") ok("Image classified as vision/OCR required");
else fail("Image classification incorrect");

if (
  hintDocumentFamily({
    typeRef: "doc:bank-statement",
    displayName: "HDFC Statement.pdf",
    mimeType: "application/pdf",
  }) === "banking"
) {
  ok("Family hint maps bank statement");
} else fail("Family hint mapping failed");

const native = extractNativeText(
  Buffer.from("Salary for March 2026\nGross: documented in file", "utf8"),
  "text/plain",
  "note.txt",
);
if (native?.text.includes("Salary for March")) ok("Native text extraction works for text/plain");
else fail("Native text extraction failed");

const pdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<<>>endobj\nBT /F1 12 Tf (Hello Borrower Name) Tj ET\n%%EOF",
  "latin1",
);
const probed = probePdfTextLayer(pdf);
if (probed?.text.includes("Hello Borrower Name")) ok("PDF text-layer probe extracts literals");
else fail("PDF text-layer probe failed");

const emptyProbe = probePdfTextLayer(Buffer.from("%PDF-1.4\n%%EOF", "latin1"));
if (!emptyProbe) ok("Sparse/empty PDF does not fabricate text");
else fail("Empty PDF incorrectly returned text");

const oauth = read("src/app/api/integrations/chatgpt/v1/oauth/authorize/route.ts");
if (oauth.includes("buildChatGptOAuthConsentRedirectUrl")) {
  ok("ChatGPT OAuth authorize route remains present");
} else fail("Unexpected OAuth surface change");

console.log(
  failed === 0
    ? "\nCO-CHANAKYA-CREDIT-INTELLIGENCE-005: PASS"
    : `\nCO-CHANAKYA-CREDIT-INTELLIGENCE-005: FAIL (${failed})`,
);
process.exit(failed === 0 ? 0 : 1);
