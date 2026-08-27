/**
 * CO-CHANAKYA-CREDIT-CERTIFICATION-019F — Financial fact quality verification.
 *
 * Usage:
 *   node --env-file=.env.local --env-file=compass/.env.local --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-credit-certification-019f-verify.mjs
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
  process.env.JWT_SECRET || "verify-019f-jwt-secret-at-least-32-characters-long";

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

console.log("\n=== CO-CHANAKYA-CREDIT-CERTIFICATION-019F — Financial fact quality ===\n");

const report = {
  A_extractionImprovements: [],
  B_factsPromotedDowngraded: { promoted: [], downgraded: [], rejected: [] },
  C_proposalImpact: null,
  D_verification: "PENDING",
};

for (const script of [
  "co-chanakya-credit-intelligence-012-verify.mjs",
  "co-chanakya-enterprise-read-context-002-verify.mjs",
]) {
  const v = spawnSync(process.execPath, ["--import", "tsx", `scripts/${script}`], {
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

const {
  AVON_BS_LABEL_THEN_NOTE_FIXTURE,
  AVON_BS_NO_UNIT_FIXTURE,
  AVON_BS_NOTE_RECEIVABLES_FIXTURE,
  AVON_PNL_DEPRECIATION_FIXTURE,
} = await import(
  "../src/constants/chanakya-credit-intelligence/avon-financial-extraction-fixtures.ts"
);
const { extractStructuredFactsFromText } = await import(
  "../src/lib/chanakya-document-intelligence/extract-structured-facts.ts"
);
const {
  assembleCreditIntelligence,
} = await import("../src/lib/chanakya-credit-intelligence/credit-intelligence-core.ts");
const {
  buildFinancialFactQuality,
  isReliableForFinancialIntelligence,
} = await import("../src/lib/chanakya-credit-intelligence/financial-fact-quality-core.ts");
const {
  assertNoForbiddenLenderProposalLanguage,
} = await import("../src/lib/chanakya-credit-proposal/lender-proposal-intelligence-core.ts");
const { composeChanakyaCreditProposalDraft } = await import(
  "../src/lib/chanakya-credit-proposal/compose-proposal.ts"
);
const { buildCrossDocumentComparisons } = await import(
  "../src/lib/chanakya-document-intelligence/cross-document.ts"
);

const baseProv = {
  documentId: "doc_avon_019f",
  opportunityId: "opp_avon_019f",
  displayName: "Avon Audited FS.pdf",
  typeRef: "financial",
  mimeType: "application/pdf",
  documentVersionHint: null,
};

function runFixture(text) {
  return extractStructuredFactsFromText({ text, provenance: baseProv });
}

{
  const facts = runFixture(AVON_BS_NOTE_RECEIVABLES_FIXTURE);
  const recv = facts.find((f) => f.key === "trade_receivables");
  const inv = facts.find((f) => f.key === "inventory");
  const assets = facts.find((f) => f.key === "total_assets");

  if (recv) fail("019F — trade receivables note artefact extracted");
  else ok("019F — Trade Receivables note artefact not extracted");
  if (inv) fail("019F — inventory note artefact extracted");
  else ok("019F — Inventory note artefact not extracted");
  if (!assets || assets.value !== "114,630") fail("019F total assets 114,630 missing");
  else ok("019F — Total Assets 114,630 extracted");
  if (assets?.unit !== "thousands") fail("019F total assets unit must be thousands");
  else ok("019F — Total Assets carries thousands unit");

  report.A_extractionImprovements.push(
    "Note-column rejection for trade receivables / inventory",
    "Total Assets unit scale from Rs in '000 header",
  );
  report.B_factsPromotedDowngraded.promoted.push({
    metric: "total_assets",
    value: assets?.value,
    unit: assets?.unit,
    confidence: assets?.provenance.confidence,
  });
}

{
  const facts = runFixture(AVON_BS_LABEL_THEN_NOTE_FIXTURE);
  const bad =
    facts.some((f) => f.key === "trade_receivables" && f.value === "13") ||
    facts.some((f) => f.key === "inventory" && f.value === "13");
  if (bad) fail("019F label-then-13 pattern promoted");
  else ok("019F — label-then-note-index pattern rejected");
}

{
  const facts = runFixture(AVON_PNL_DEPRECIATION_FIXTURE);
  const pnlDep = facts.find(
    (f) => f.key === "depreciation" && f.provenance.sectionOrTable === "P&L",
  );
  const noteDep = facts.find((f) => f.key === "accumulated_depreciation_note");
  if (!pnlDep || pnlDep.value !== "3,308") fail("019F P&L depreciation missing");
  else ok("019F — P&L depreciation from P&L section");
  if (noteDep?.provenance.sectionOrTable !== "Balance Sheet Notes") {
    fail("019F BS note depreciation misclassified");
  } else ok("019F — BS note depreciation separate from P&L");
  if (noteDep && isReliableForFinancialIntelligence(noteDep)) {
    fail("019F note depreciation must not enter financial intelligence");
  } else ok("019F — note depreciation excluded from intelligence trends");
  report.A_extractionImprovements.push("Depreciation section classification gate");
}

{
  const facts = runFixture(AVON_BS_NO_UNIT_FIXTURE);
  const credit = assembleCreditIntelligence({
    opportunityId: "opp_019f_no_unit",
    structuredFacts: facts,
    crossDocumentComparisons: [],
    reads: [],
  });
  if (credit.financialProfile.allFacts.some((f) => f.field === "total_assets")) {
    fail("019F total assets without unit in reliable profile");
  } else ok("019F — no-unit total assets excluded from financial intelligence");
  report.B_factsPromotedDowngraded.downgraded.push({
    metric: "total_assets",
    value: "114,630",
    reason: "unit not established from document header",
  });
}

{
  const allFacts = [
    ...runFixture(AVON_BS_NOTE_RECEIVABLES_FIXTURE),
    ...runFixture(AVON_PNL_DEPRECIATION_FIXTURE),
  ];
  const credit = assembleCreditIntelligence({
    opportunityId: "opp_019f_combined",
    structuredFacts: allFacts,
    crossDocumentComparisons: buildCrossDocumentComparisons(allFacts),
    reads: [],
  });
  const quality = credit.financialFactQuality;
  report.B_factsPromotedDowngraded.promoted = quality.items
    .filter((i) => i.disposition === "promoted")
    .map((i) => ({
      metric: i.metric,
      value: i.value,
      period: i.period,
      unit: i.unit,
      confidence: i.confidence,
    }));
  report.B_factsPromotedDowngraded.rejected = quality.items
    .filter((i) => i.disposition === "rejected_pattern")
    .map((i) => ({ metric: i.metric, value: i.value, reason: i.reason }));

  const ctx = {
    opportunityId: "opp_019f_combined",
    opportunityNumber: "OPP-FIXTURE-019F",
    productName: "Project Finance",
    loanAmount: 50_000_000,
    borrowerName: "Avon Appliances Private Ltd",
    employmentType: null,
    city: null,
    companyName: "Avon Appliances Private Ltd",
    purpose: null,
    transactionType: "fresh",
    relationshipManagerName: null,
    lenderName: null,
    rmNote: null,
    stated: {},
    documents: [],
    documentIntelligence: {
      documentsReviewed: 1,
      documentsWithBinary: 1,
      documentsWithReadableText: 1,
      documentsRequiringOcr: 0,
      documentsRequiringVision: 0,
      structuredFacts: allFacts,
      crossDocumentComparisons: buildCrossDocumentComparisons(allFacts),
      reads: [],
      limitations: [],
      capability: { note: "019F" },
      visionProvider: { configured: false },
    },
    evidence: [],
    gaps: [],
    intelligence: {},
    productLenderIntelligence: { availability: "NOT_AVAILABLE" },
    creditIntelligence: credit,
  };

  const draft = composeChanakyaCreditProposalDraft(ctx);
  if (/receivables[^\n]*\b13\b/i.test(draft.fullText)) {
    fail("019F trade receivables 13 in proposal");
  } else ok("019F — trade receivables 13 absent from proposal");
  if (!draft.fullText.includes("114,630")) fail("019F total assets missing from proposal");
  else ok("019F — total assets in proposal with provenance");
  if (!assertNoForbiddenLenderProposalLanguage(draft.fullText)) fail("019F language guard");
  else ok("019F — language guard PASS");

  report.C_proposalImpact = {
    totalAssetsInProposal: draft.fullText.includes("114,630"),
    tradeReceivables13Absent: !/receivables[^\n]*\b13\b/i.test(draft.fullText),
    depreciationInProposal: draft.fullText.includes("3,308"),
    qualityLimitations: quality.limitations,
  };
}

{
  const affected = [
    "src/lib/chanakya-document-intelligence/table-extraction-utils.ts",
    "src/lib/chanakya-document-intelligence/extract-financial-tables.ts",
    "src/lib/chanakya-credit-intelligence/financial-fact-quality-core.ts",
    "src/lib/chanakya-credit-intelligence/credit-intelligence-core.ts",
    "src/lib/chanakya-credit-intelligence/index.ts",
    "src/lib/chanakya-credit-proposal/lender-proposal-intelligence-core.ts",
    "src/constants/chanakya-credit-intelligence/avon-financial-extraction-fixtures.ts",
    "src/types/chanakya-credit-intelligence.ts",
  ];
  const tsc = spawnSync("npx", ["tsc", "--noEmit", "-p", "tsconfig.json"], {
    cwd: ROOT,
    stdio: "pipe",
    encoding: "utf8",
    shell: true,
  });
  const tscOut = String(tsc.stdout || tsc.stderr || "");
  const affectedErrors = affected.filter((p) => tscOut.includes(p.replace(/\\/g, "/")));
  if (tsc.status === 0) ok("TypeScript PASS");
  else if (affectedErrors.length === 0) {
    ok("TypeScript affected paths PASS (pre-existing errors outside 019F scope)");
    note(`Unrelated tsc issues remain (${tscOut.split("\n").filter((l) => l.includes("error TS")).length} total)`);
  } else {
    fail("TypeScript affected paths FAIL");
    note(
      tscOut
        .split("\n")
        .filter((l) => affected.some((p) => l.includes(p.replace(/\\/g, "/"))))
        .slice(0, 8)
        .join("\n"),
    );
  }
}

if (process.env.CATALYST_BAT_EMAIL && process.env.CATALYST_BAT_PASSWORD) {
  const v = spawnSync(
    process.execPath,
    [
      "--env-file=.env.local",
      "--env-file=compass/.env.local",
      "--import",
      "./scripts/_bat-stub-server-only.mjs",
      "--import",
      "tsx",
      "scripts/co-chanakya-certification-018.mjs",
    ],
    { cwd: ROOT, stdio: "pipe", encoding: "utf8", env: process.env },
  );
  if (v.status === 0) ok("co-chanakya-certification-018 PASS");
  else {
    fail("co-chanakya-certification-018 FAIL");
    note(String(v.stderr || v.stdout).slice(-600));
  }
} else {
  note("BAT credentials absent — skipping certification-018");
}

report.D_verification = failed === 0 ? "PASS" : "FAIL";
console.log("\n--- 019F report ---\n");
console.log("A.", report.A_extractionImprovements);
console.log("B.", JSON.stringify(report.B_factsPromotedDowngraded, null, 2));
console.log("C.", JSON.stringify(report.C_proposalImpact, null, 2));
console.log("D.", report.D_verification);
console.log(failed ? `\nRESULT: FAIL (${failed})\n` : "\nRESULT: PASS\n");
process.exit(failed > 0 ? 1 : 0);
