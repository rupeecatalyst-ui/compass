/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-012 — Extraction quality verification.
 *
 * Usage:
 *   node --import tsx scripts/co-chanakya-credit-intelligence-012-verify.mjs
 *   node --env-file=compass/.env.local --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-credit-intelligence-012-verify.mjs --avon
 *
 * Does NOT commit, deploy, migrate, or mutate production.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUN_AVON = process.argv.includes("--avon");

let failed = 0;
function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.error(`FAIL  ${msg}`);
}

const {
  extractStructuredFactsFromText,
} = await import("../src/lib/chanakya-document-intelligence/extract-structured-facts.ts");
const {
  classifyFinancialTokenDisposition,
  detectUnitScale,
  detectYearColumns,
} = await import("../src/lib/chanakya-document-intelligence/extract-financial-tables.ts");
const { countGstinOccurrences } = await import(
  "../src/lib/chanakya-document-intelligence/extract-gst-returns.ts"
);
const {
  assembleCreditIntelligence,
  isReliableForTrends,
  parseFinancialNumeric,
  computeMetricTrend,
} = await import("../src/lib/chanakya-credit-intelligence/credit-intelligence-core.ts");

const baseProv = {
  documentId: "doc_fixture_012",
  opportunityId: "opp_fixture_012",
  displayName: "Fixture",
  typeRef: "financial",
  mimeType: "application/pdf",
  documentVersionHint: null,
};

// --- Note references are not promoted ---
{
  const text = `
AVON APPLIANCES PRIVATE LIMITED
Balance Sheet as at 31 March 2024
(Rs in '000)
Particulars Note 31 March 2024 31 March 2023
13 Trade receivables
Total Assets 114,630 109,451
`;
  const facts = extractStructuredFactsFromText({ text, provenance: baseProv });
  const recv = facts.find((f) => f.key === "trade_receivables");
  const assets = facts.find((f) => f.key === "total_assets");
  if (recv) fail("012 must not promote note reference 13 as trade receivables");
  else ok("Note reference 13 not promoted to trade receivables");
  if (!assets || assets.value !== "114,630") fail("012 total assets inline extraction");
  else ok("Total Assets 114,630 extracted with label context");
  if (assets?.unit !== "thousands") fail("012 must detect Rs in '000 as thousands unit");
  else ok("Unit scale thousands detected from header");
  if (assets?.provenance.confidence !== "high") fail("012 total assets should be high confidence");
  else ok("Total assets HIGH confidence with year + unit");
}

// --- Row numbers rejected ---
{
  const disp = classifyFinancialTokenDisposition({
    key: "inventory",
    value: "13",
    line: "13 Inventories",
    section: "Balance Sheet",
    unitScale: "thousands",
    hasYearAssociation: true,
  });
  if (disp !== "rejected") fail("012 row/note index 13 must be rejected for inventory");
  else ok("Row/note index rejected for inventory");
}

// --- Year association ---
{
  const text = `
Balance Sheet as at 31 March 2024
(Rs in '000)
31 March 2024 31 March 2023
Total Assets 114,630 109,451
`;
  const years = detectYearColumns(text);
  if (!years.some((y) => y.financialYear === "FY2023-24")) {
    fail("012 year columns must map 31 March 2024 to FY2023-24");
  } else ok("Year association FY2023-24 from column header");
  const facts = extractStructuredFactsFromText({ text, provenance: baseProv });
  const fy2425 = facts.find(
    (f) => f.key === "total_assets" && f.periodLabel === "FY2023-24",
  );
  const fy2324 = facts.find(
    (f) => f.key === "total_assets" && f.periodLabel === "FY2022-23",
  );
  if (!fy2425 || fy2425.value !== "114,630") fail("012 primary year value association");
  else ok("Primary year value correctly associated");
  if (!fy2324 || fy2324.value !== "109,451") fail("012 comparative year value association");
  else ok("Comparative year value correctly associated");
}

// --- Unit uncertainty preserved ---
{
  const scale = detectUnitScale("Balance Sheet as at 31 March 2024\nTotal Assets 50,000");
  if (scale !== "unknown") fail("012 must not infer unit without header proof");
  else ok("Unit uncertainty preserved when header silent");
}

// --- Depreciation section classification ---
{
  const text = `
Statement of Profit and loss for the year ended 31 March 2024
(Rs in '000)
Particulars Note 31 March 2024 31 March 2023
Depreciation and Amortization Expenses
3,308
Notes forming part of the Financial Statements
DEPRECIATION 3,308 3,474
`;
  const facts = extractStructuredFactsFromText({ text, provenance: baseProv });
  const pnlDep = facts.find(
    (f) => f.key === "depreciation" && f.provenance.sectionOrTable === "P&L",
  );
  const noteDep = facts.find((f) => f.key === "accumulated_depreciation_note");
  if (!pnlDep || pnlDep.value !== "3,308") {
    fail("012 P&L depreciation must extract from P&L section");
  } else ok("P&L depreciation extracted from P&L section");
  if (noteDep?.provenance.sectionOrTable !== "Balance Sheet Notes") {
    fail("012 BS note depreciation must stay in Balance Sheet Notes");
  } else ok("BS note depreciation classified separately from P&L");
}

// --- GSTIN repetition is not financial evidence ---
{
  const gstText = `
Form GSTR-3B
Year 2025-26
Period February
GSTIN of the supplier 24AACCA5373P1ZD
GSTIN 24AACCA5373P1ZD
(a) Outward taxable supplies (other than zero rated, nil rated and exempted)
7702714.19 543737.54
`;
  const count = countGstinOccurrences(gstText);
  const facts = extractStructuredFactsFromText({ text: gstText, provenance: baseProv });
  const gstinFacts = facts.filter((f) => f.key === "gstin");
  const turnover = facts.find((f) => f.key === "gst_taxable_turnover");
  if (count < 2) fail("012 fixture GSTIN repetition count");
  else ok("GSTIN repetition counted in fixture");
  if (gstinFacts.length !== 1) fail("012 must emit one GSTIN identity fact per document");
  else ok("Single GSTIN identity fact despite repetition");
  if (!turnover || turnover.value !== "7702714.19") {
    fail("012 GST turnover requires labelled outward taxable value");
  } else ok("GST turnover extracted from labelled outward taxable supplies");
}

// --- Trends ignore ambiguous facts ---
{
  const ambiguousFact = {
    id: "x:revenue:FY2023-24",
    key: "revenue",
    label: "Revenue",
    value: "13",
    unit: null,
    periodLabel: "FY2023-24",
    provenance: {
      ...baseProv,
      page: null,
      sectionOrTable: "P&L",
      extractionMethod: "table_extraction",
      confidence: "ambiguous",
    },
    lenderFacingEligible: false,
  };
  const reliableFact = {
    ...ambiguousFact,
    id: "x:revenue:FY2024-25",
    value: "500,000",
    periodLabel: "FY2024-25",
    provenance: { ...ambiguousFact.provenance, confidence: "high" },
  };
  if (isReliableForTrends(ambiguousFact)) fail("012 ambiguous facts must not be trend-reliable");
  else ok("Ambiguous facts excluded from trend reliability");
  const trend = computeMetricTrend({
    metric: "revenue",
    label: "Revenue",
    facts: [ambiguousFact, reliableFact],
  });
  if (trend.values.length !== 1) fail("012 trends must ignore ambiguous fact rows");
  else ok("Trend calculation ignores ambiguous facts");
}

// --- Provenance survives extraction ---
{
  const facts = extractStructuredFactsFromText({
    text: `Balance Sheet as at 31 March 2024\n(Rs in '000)\nTotal Assets 114,630 109,451`,
    provenance: baseProv,
  });
  const f = facts[0];
  if (!f?.provenance.documentId || f.provenance.extractionMethod !== "table_extraction") {
    fail("012 provenance must survive table extraction");
  } else ok("Provenance preserved through extraction");
}

// --- No fabricated values ---
{
  const facts = extractStructuredFactsFromText({
    text: "Balance Sheet as at 31 March 2024\n(Rs in '000)\nTrade Receivables",
    provenance: baseProv,
  });
  if (facts.some((f) => f.key === "trade_receivables")) {
    fail("012 must not fabricate trade receivables without proven value");
  } else ok("No fabricated values when amount missing");
}

// --- Thousands unit numeric parse ---
{
  const n = parseFinancialNumeric("114,630", "thousands");
  if (n !== 114630000) fail(`012 thousands parse expected 114630000 got ${n}`);
  else ok("Thousands unit applied in numeric normalization");
}

// --- Preserve 002 verify ---
{
  const verify = spawnSync(
    process.execPath,
    ["--import", "tsx", path.join(ROOT, "scripts/co-chanakya-enterprise-read-context-002-verify.mjs")],
    { cwd: ROOT, stdio: "inherit", env: process.env },
  );
  if (verify.status !== 0) fail("002 + 010 verify regression");
  else ok("002 + 003A–003E + 010 verify still PASS");
}

// --- Optional Avon live re-test ---
if (RUN_AVON) {
  console.log("\n--- Avon OPP-2026-000060 live re-test (read-only BAT) ---\n");
  const avon = spawnSync(
    process.execPath,
    [
      "--env-file=compass/.env.local",
      "--import",
      "./scripts/_bat-stub-server-only.mjs",
      "--import",
      "tsx",
      path.join(ROOT, "scripts/co-chanakya-credit-intelligence-011-e2e.mjs"),
    ],
    { cwd: ROOT, stdio: "inherit", env: process.env },
  );
  if (avon.status !== 0) fail("011 Avon E2E with 012 pipeline");
  else ok("011 Avon E2E PASS with 012 extraction pipeline");
}

console.log(failed ? `\nRESULT: FAIL (${failed})\n` : "\nRESULT: PASS\n");
process.exit(failed ? 1 : 0);
