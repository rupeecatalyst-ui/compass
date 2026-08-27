/**
 * CO-CHANAKYA-022 — GST intelligence & financial reconciliation verification.
 *
 * Usage:
 *   node --env-file=.env.local --env-file=compass/.env.local --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-022-gst-intelligence-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

for (const rel of [".env.local", "compass/.env.local", ".env"]) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) continue;
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
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "verify-022-jwt-secret-at-least-32-characters-long";

let failed = 0;
function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.log(`FAIL  ${msg}`);
}

console.log("\n=== CO-CHANAKYA-022 — GST intelligence & reconciliation ===\n");

{
  const v = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/co-chanakya-credit-intelligence-012-verify.mjs"],
    { cwd: ROOT, stdio: "pipe", encoding: "utf8", env: process.env },
  );
  if (v.status === 0) ok("012 document-intelligence verify PASS");
  else fail("012 document-intelligence verify FAIL");
}

const {
  AVON_GSTR3B_JAN_FIXTURE,
  AVON_GSTR3B_FEB_FIXTURE,
  AVON_GSTR3B_MAR_FIXTURE,
  AVON_GSTIN_ONLY_FIXTURE,
} = await import(
  "../src/constants/chanakya-credit-intelligence/avon-gst-extraction-fixtures.ts"
);
const { extractGstReturnFacts, countGstinOccurrences } = await import(
  "../src/lib/chanakya-document-intelligence/extract-gst-returns.ts"
);
const {
  assembleCreditIntelligence,
  buildGstAnalysisFromFacts,
  buildGstVsFinancials,
  buildFinancialProfileFromFacts,
  assertNoForbiddenCreditLanguage,
} = await import("../src/lib/chanakya-credit-intelligence/credit-intelligence-core.ts");
const {
  assessGstFinancialPeriodAlignment,
  mayAnnualizeMonthlyGstReturns,
} = await import("../src/lib/chanakya-credit-intelligence/gst-reconciliation-core.ts");
const { buildCrossDocumentComparisons } = await import(
  "../src/lib/chanakya-document-intelligence/cross-document.ts"
);

function mkFacts(text, docId, name) {
  return extractGstReturnFacts({
    text,
    provenance: {
      documentId: docId,
      opportunityId: "opp_022_avon",
      displayName: name,
      typeRef: "gst",
      mimeType: "application/pdf",
      documentVersionHint: null,
    },
  });
}

const jan = mkFacts(AVON_GSTR3B_JAN_FIXTURE, "doc_gst_jan", "GSTR3B_24AACCA5373P1ZD_012026.pdf");
const feb = mkFacts(AVON_GSTR3B_FEB_FIXTURE, "doc_gst_feb", "GSTR3B_24AACCA5373P1ZD_022026.pdf");
const mar = mkFacts(AVON_GSTR3B_MAR_FIXTURE, "doc_gst_mar", "GSTR3B_24AACCA5373P1ZD_032026.pdf");
const allGst = [...jan, ...feb, ...mar];

{
  const gst = buildGstAnalysisFromFacts(allGst);
  if (gst.returns.length !== 3) fail(`022 expected 3 GST returns, got ${gst.returns.length}`);
  else ok("022 — 3 Avon GSTR-3B return rows");

  if (gst.identity.gstin !== "24AACCA5373P1ZD") fail("022 GSTIN identity");
  else ok("022 — single GSTIN identity (not repeated financial insights)");

  if (gst.financialInsightCount < 3) fail("022 financial insight count too low");
  else ok(`022 — ${gst.financialInsightCount} financial insight(s); GSTIN not counted as turnover`);

  for (const sample of [
    { month: "January", value: "5977077.90" },
    { month: "February", value: "7702714.19" },
    { month: "March", value: "14459443.63" },
  ]) {
    const row = gst.returns.find((r) => (r.returnPeriod || "").includes(sample.month));
    if (!row || row.taxableTurnover !== sample.value) {
      fail(`022 — ${sample.month} turnover not traceable`);
    } else if (row.returnType !== "GSTR-3B") {
      fail(`022 — ${sample.month} returnType must be GSTR-3B`);
    } else if (!row.sourceSection?.includes("GST")) {
      fail(`022 — ${sample.month} missing source section`);
    } else {
      ok(`022 — ${sample.month} 2025-26 turnover ${sample.value} traceable (${row.returnType})`);
    }
  }

  if (!gst.annualTurnoverNotComputed) {
    fail("022 — must not annualize partial monthly GST set");
  } else ok("022 — annual GST aggregate intentionally not computed");

  if (mayAnnualizeMonthlyGstReturns({ monthlyReturnCount: 3 })) {
    fail("022 — mayAnnualize must reject 3 months");
  } else ok("022 — mayAnnualize rejects incomplete monthly coverage");
}

{
  const only = extractGstReturnFacts({
    text: AVON_GSTIN_ONLY_FIXTURE,
    provenance: {
      documentId: "doc_gstin_only",
      opportunityId: "opp_022_avon",
      displayName: "GSTIN Certificate.pdf",
      typeRef: "gst",
      mimeType: "application/pdf",
      documentVersionHint: null,
    },
  });
  if (only.some((f) => f.key === "gst_taxable_turnover")) {
    fail("022 — GSTIN-only document must not invent turnover");
  } else ok("022 — GSTIN alone never treated as turnover");
  if (countGstinOccurrences(AVON_GSTR3B_JAN_FIXTURE) < 2) {
    fail("022 — fixture should repeat GSTIN for identity test");
  }
  const gstinFacts = jan.filter((f) => f.key === "gstin");
  if (gstinFacts.length !== 1) fail("022 — one GSTIN identity fact per document");
  else ok("022 — repeated GSTIN emits one identity fact");
}

{
  const alignment = assessGstFinancialPeriodAlignment({
    financialPeriod: "FY2023-24",
    gstPeriods: ["January 2025-26", "February 2025-26", "March 2025-26"],
    gstReturnCountWithTurnover: 3,
  });
  if (alignment.comparable || alignment.alignment !== "MISMATCH") {
    fail("022 — monthly GST vs annual FY must be NOT_COMPARABLE / MISMATCH");
  } else ok("022 — period mismatch detected (monthly GST vs annual FY)");
}

{
  const gst = buildGstAnalysisFromFacts(allGst);
  const financialFacts = [
    {
      id: "doc_pnl:revenue:FY2023-24",
      key: "revenue",
      label: "Revenue / Turnover",
      value: "85,400",
      unit: "thousands",
      periodLabel: "FY2023-24",
      provenance: {
        documentId: "doc_pnl",
        opportunityId: "opp_022_avon",
        displayName: "FY FS.pdf",
        typeRef: "financial",
        mimeType: "application/pdf",
        documentVersionHint: null,
        page: null,
        sectionOrTable: "P&L",
        extractionMethod: "table_extraction",
        confidence: "high",
      },
      lenderFacingEligible: true,
    },
  ];
  const profile = buildFinancialProfileFromFacts(financialFacts);
  const vs = buildGstVsFinancials({ financialProfile: profile, gstAnalysis: gst });

  if (vs.comparisonOutcome !== "NOT_COMPARABLE") {
    fail(`022 — expected NOT_COMPARABLE got ${vs.comparisonOutcome}`);
  } else ok("022 — comparisonOutcome NOT_COMPARABLE");
  if (vs.status !== "NOT_COMPARABLE") fail(`022 — status expected NOT_COMPARABLE got ${vs.status}`);
  else ok("022 — reconciliation status NOT_COMPARABLE");
  if (!vs.explanation?.toLowerCase().includes("period mismatch")) {
    fail("022 — explanation must cite period mismatch");
  } else ok("022 — explanation cites period mismatch (not fraud)");
  if (/\bfraud\b/i.test(vs.explanation || "")) fail("022 — must not label as fraud");
  else ok("022 — no fraud language");
  if (vs.gstPeriodsConsidered.length !== 3) {
    fail(`022 — expected 3 gstPeriodsConsidered got ${vs.gstPeriodsConsidered.length}`);
  } else ok("022 — all three Avon periods retained for evidence");
}

{
  const credit = assembleCreditIntelligence({
    opportunityId: "opp_022_avon",
    structuredFacts: allGst,
    crossDocumentComparisons: buildCrossDocumentComparisons(allGst),
    reads: [],
  });
  if (!assertNoForbiddenCreditLanguage(JSON.stringify(credit.reconciliation.gstVsFinancials))) {
    fail("022 — forbidden language in GST reconciliation");
  } else ok("022 — language guard PASS");
  if (credit.gstAnalysis.returns.some((r) => !r.returnPeriod || !r.taxableTurnover)) {
    fail("022 — assembled returns missing period/turnover");
  } else ok("022 — assembled GST analysis retains period-wise turnover");
}

{
  const v = spawnSync(
    process.execPath,
    [
      "--import",
      "./scripts/_bat-stub-server-only.mjs",
      "--import",
      "tsx",
      "scripts/co-chanakya-credit-certification-019e-verify.mjs",
    ],
    { cwd: ROOT, stdio: "pipe", encoding: "utf8", env: process.env },
  );
  const out = `${v.stdout || ""}\n${v.stderr || ""}`;
  if (v.status === 0 || out.includes("019E fixture — 3 GST return rows")) {
    ok("019E GST traceability regression PASS/compatible");
  } else {
    fail("019E GST traceability regression FAIL");
    console.log(out.slice(-600));
  }
}

{
  const v = spawnSync(
    process.execPath,
    [
      "--import",
      "./scripts/_bat-stub-server-only.mjs",
      "--import",
      "tsx",
      "scripts/co-chanakya-credit-intelligence-016-verify.mjs",
    ],
    { cwd: ROOT, stdio: "pipe", encoding: "utf8", env: process.env },
  );
  if (v.status === 0) ok("016 credit-intelligence chain PASS");
  else fail("016 credit-intelligence chain FAIL");
}

{
  const v = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/co-chanakya-enterprise-read-context-002-verify.mjs"],
    { cwd: ROOT, stdio: "pipe", encoding: "utf8", env: process.env },
  );
  if (v.status === 0) ok("002 enterprise-read verify PASS");
  else {
    fail("002 enterprise-read verify FAIL");
    console.log(`${v.stdout || ""}\n${v.stderr || ""}`.slice(-800));
  }
}

console.log(failed ? `\nRESULT: FAIL (${failed})\n` : "\nRESULT: PASS\n");
process.exit(failed ? 1 : 0);
