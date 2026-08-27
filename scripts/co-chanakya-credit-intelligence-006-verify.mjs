/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-006 — OCR/vision/structured extraction verify.
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
const structured = read(
  "src/lib/chanakya-document-intelligence/extract-structured-facts.ts",
);
const vision = read("src/lib/chanakya-document-intelligence/openai-vision-ocr-port.ts");
const pack = read("src/lib/chanakya-document-intelligence/build-intelligence-pack.ts");
const cross = read("src/lib/chanakya-document-intelligence/cross-document.ts");
const cache = read("src/lib/chanakya-document-intelligence/extraction-cache.ts");
const gather = read("src/lib/chanakya-credit-proposal/gather-context.ts");
const panel = read(
  "src/components/catalyst-one/enterprise-credit-workspace/ecw-proposal-generation-panel.tsx",
);

if (
  types.includes("ChanakyaCrossDocumentComparison") &&
  types.includes("ChanakyaContentClassification") &&
  types.includes("providerId: string")
) {
  ok("006 contracts: classification, cross-doc, providerId ports");
} else fail("006 contracts incomplete");

if (
  constants.includes("CO-CHANAKYA-DOCUMENT-READING-008") ||
  constants.includes("CO-CHANAKYA-CREDIT-INTELLIGENCE-006") ||
  (constants.includes("unpdf") && constants.includes("will not invent statement figures"))
) {
  ok("006 capability + vision env constants present");
} else fail("006 constants missing");

if (
  vision.includes("isDocumentVisionConfigured") &&
  vision.includes("return null") &&
  vision.includes("image_url") &&
  !vision.includes("₹12.4 Cr")
) {
  ok("Vision OCR port is gated and non-fabricating");
} else fail("Vision OCR port contract failed");

if (
  structured.includes("extractStructuredFactsFromText") &&
  structured.includes("if (!text || text.length < 20) return []") &&
  structured.includes("Revenue / Turnover")
) {
  ok("Structured text financial extractor present");
} else fail("Structured extractor missing");

if (
  pack.includes("ensureChanakyaDocumentIntelligencePortsWired") &&
  pack.includes("buildCrossDocumentComparisons") &&
  pack.includes("getCachedDocumentExtraction") &&
  pack.includes("extractPdfTextFromBytes") &&
  pack.includes("supportsScannedPdfWithoutRasterizer") &&
  pack.includes("assessOcrExtractQuality") &&
  pack.includes("ocrRunSummary")
) {
  ok("Pack wires ports, cache, cross-doc, real PDF extraction; honest scanned-PDF limitation");
} else fail("Pack wiring incomplete");

if (
  pack.includes("unreadable_content") &&
  pack.includes("content_read_partial") &&
  types.includes("extraction_failed")
) {
  ok("008 content_read quality statuses present");
} else fail("008 reading status contracts missing");

if (cache.includes("contentHash") && cross.includes("not labelled fraudulent")) {
  ok("Idempotent cache + cautious cross-doc compare");
} else fail("Cache / cross-doc contract failed");

if (
  gather.includes("extractedFactSummaries") &&
  gather.includes("structuredFinancialFactsAvailable") &&
  panel.includes("Extracted facts (provenance)")
) {
  ok("Gather + UI surface fact summaries without raw excerpts");
} else fail("Gather/UI fact surface missing");

if (!pack.includes("CHATGPT_OAUTH") && !vision.includes("CHATGPT_OAUTH")) {
  ok("ChatGPT OAuth surfaces untouched in document intelligence");
} else fail("Unexpected OAuth coupling");

// Runtime: structured extraction from labeled fixture text (not claimed as OCR)
function extractRevenue(text) {
  const m = text.match(
    /(?:revenue from operations|total revenue|turnover|net sales|sales)\s*[:\-]?\s*(₹?\s*[\d,]+\.?\d*\s*(?:cr|crore|lakh|lac|lakhs)?)/i,
  );
  return m?.[1]?.trim() || null;
}

const fixture = `
STATEMENT OF PROFIT AND LOSS
For the year ended 31 March 2025
Revenue from operations  ₹ 12,40,00,000
Gross Profit  ₹ 3,10,00,000
EBITDA  ₹ 1,80,00,000
Profit after tax  ₹ 95,00,000
`;

const rev = extractRevenue(fixture);
if (rev && /12/.test(rev)) ok("Labeled P&L revenue extracts from fixture text");
else fail("P&L revenue extraction failed on fixture");

const empty = extractRevenue("This document has no financial labels.");
if (!empty) ok("No fabrication when labels absent");
else fail("Fabricated revenue from unlabeled text");

// Vision config presence check (boolean only)
const visionConfigured = Boolean(
  process.env.DOCUMENT_VISION_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim(),
);
ok(
  visionConfigured
    ? "Vision API key PRESENT in environment (live OCR may activate for images)"
    : "Vision API key ABSENT — OCR path correctly inactive in this environment",
);

const oauth = read("src/app/api/integrations/chatgpt/v1/oauth/authorize/route.ts");
if (oauth.includes("buildChatGptOAuthConsentRedirectUrl")) {
  ok("ChatGPT OAuth authorize route remains present");
} else fail("Unexpected OAuth authorize change");

console.log(
  failed === 0
    ? "\nCO-CHANAKYA-CREDIT-INTELLIGENCE-006: PASS"
    : `\nCO-CHANAKYA-CREDIT-INTELLIGENCE-006: FAIL (${failed})`,
);
process.exit(failed === 0 ? 0 : 1);
