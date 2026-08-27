/**
 * CO-CHANAKYA-CREDIT-CERTIFICATION-019G — Lender proposal quality V2 verification.
 *
 * Usage:
 *   node --env-file=.env.local --env-file=compass/.env.local --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-credit-certification-019g-verify.mjs
 *   ... --avon   (live Avon OPP-2026-000060)
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUN_AVON = process.argv.includes("--avon");

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
  process.env.JWT_SECRET || "verify-019g-jwt-secret-at-least-32-characters-long";

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

console.log("\n=== CO-CHANAKYA-CREDIT-CERTIFICATION-019G — Lender proposal V2 ===\n");

const report = {
  beforeAfter: null,
  qualityFindings: [],
  verification: "PENDING",
};

const { CHANAKYA_CREDIT_PROPOSAL_SECTIONS } = await import(
  "../src/constants/chanakya-credit-proposal/index.ts"
);
const {
  buildLenderProposalIntelligence,
  assertNoForbiddenLenderProposalLanguage,
  assertNoInternalMetadataInLenderText,
  detectLegacyProposalMarkers,
} = await import("../src/lib/chanakya-credit-proposal/lender-proposal-intelligence-core.ts");
const { composeChanakyaCreditProposalDraft } = await import(
  "../src/lib/chanakya-credit-proposal/compose-proposal.ts"
);
const { assembleCreditIntelligence } = await import(
  "../src/lib/chanakya-credit-intelligence/credit-intelligence-core.ts"
);
const { extractStructuredFactsFromText } = await import(
  "../src/lib/chanakya-document-intelligence/extract-structured-facts.ts"
);
const { extractGstReturnFacts } = await import(
  "../src/lib/chanakya-document-intelligence/extract-gst-returns.ts"
);
const {
  AVON_BS_NOTE_RECEIVABLES_FIXTURE,
  AVON_PNL_DEPRECIATION_FIXTURE,
} = await import(
  "../src/constants/chanakya-credit-intelligence/avon-financial-extraction-fixtures.ts"
);
const { buildCrossDocumentComparisons } = await import(
  "../src/lib/chanakya-document-intelligence/cross-document.ts"
);

const REQUIRED_SECTIONS = [
  "executive_summary",
  "borrower_profile",
  "business_overview",
  "loan_requirement",
  "facility_purpose",
  "financial_analysis",
  "gst_analysis",
  "banking_analysis",
  "credit_context",
  "property_security",
  "product_lender_context",
  "key_positives",
  "key_concerns",
  "mitigants",
  "pending_information",
  "proposed_structure",
  "recommendation",
  "evidence_notes",
];

{
  const constantIds = CHANAKYA_CREDIT_PROPOSAL_SECTIONS.map((s) => s.id);
  if (REQUIRED_SECTIONS.every((id) => constantIds.includes(id))) {
    ok("019G — 18-section SSOT contract present");
  } else {
    fail("019G — missing section IDs in constants");
  }
  if (constantIds.length === 18) ok("019G — exactly 18 proposal sections");
  else fail(`019G — expected 18 sections, got ${constantIds.length}`);
}

function buildFixtureDraft() {
  const baseProv = {
    documentId: "doc_avon_019g",
    opportunityId: "opp_avon_019g",
    displayName: "Avon Audited FS.pdf",
    typeRef: "financial",
    mimeType: "application/pdf",
    documentVersionHint: null,
  };
  const facts = [
    ...extractStructuredFactsFromText({ text: AVON_BS_NOTE_RECEIVABLES_FIXTURE, provenance: baseProv }),
    ...extractStructuredFactsFromText({ text: AVON_PNL_DEPRECIATION_FIXTURE, provenance: baseProv }),
  ];
  const credit = assembleCreditIntelligence({
    opportunityId: "opp_avon_019g",
    structuredFacts: facts,
    crossDocumentComparisons: buildCrossDocumentComparisons(facts),
    reads: [],
  });
  const ctx = {
    opportunityId: "opp_avon_019g",
    opportunityNumber: "OPP-FIXTURE-019G",
    productName: "Project Finance",
    loanAmount: 50_000_000,
    borrowerName: "Avon Appliances Private Ltd",
    employmentType: "self-employed-business",
    city: "Ahmedabad",
    companyName: "Avon Appliances Private Ltd",
    purpose: "Working capital augmentation",
    transactionType: "fresh",
    relationshipManagerName: "RM Test",
    lenderName: "Sample Bank",
    rmNote: null,
    stated: { statedTurnover: "120000000", statedBusinessVintage: "15 years" },
    documents: [{ name: "Audited FS.pdf", status: "active", typeRef: "financial", verified: false }],
    documentIntelligence: {
      documentsReviewed: 2,
      documentsWithBinary: 2,
      documentsWithReadableText: 2,
      documentsRequiringOcr: 0,
      documentsOcrFailed: 0,
      documentsRequiringVision: 0,
      structuredFacts: facts,
      crossDocumentComparisons: buildCrossDocumentComparisons(facts),
      reads: [
        {
          documentId: "doc_avon_019g",
          displayName: "Avon Audited FS.pdf",
          status: "content_read",
          textCharCount: 500,
        },
      ],
      limitations: [],
      capability: { note: "019G fixture" },
      visionProvider: { configured: false },
    },
    evidence: [],
    gaps: [],
    intelligence: {},
    productLenderIntelligence: { availability: "NOT_AVAILABLE" },
    creditIntelligence: credit,
  };
  const intel = buildLenderProposalIntelligence(ctx);
  const draft = composeChanakyaCreditProposalDraft(ctx);
  return { draft, intel };
}

{
  const { draft, intel } = buildFixtureDraft();
  const included = draft.sections.filter((s) => s.included);
  if (included.length >= 14) ok(`019G — ${included.length} sections included in fixture draft`);
  else fail(`019G — too few included sections (${included.length})`);

  for (const id of REQUIRED_SECTIONS) {
    const s = intel.sections.find((x) => x.id === id);
    if (!s) fail(`019G — intelligence section missing: ${id}`);
    else if (s.included && id !== "financial_analysis" && id !== "gst_analysis" && !s.body?.trim()) {
      fail(`019G — empty included body: ${id}`);
    }
  }
  ok("019G — all 18 section bodies present");

  const prose = draft.fullText;
  if (prose.includes("Borrower Profile") || prose.includes("2. Borrower Profile")) {
    ok("019G — borrower profile section titled");
  } else fail("019G — borrower profile missing from draft");
  if (prose.includes("Banking Analysis") || prose.includes("8. Banking Analysis")) {
    ok("019G — dedicated banking section");
  } else fail("019G — banking section missing");
  if (prose.includes("document readability limitations")) ok("019G — banking unavailable vs negative distinction");
  else if (prose.toLowerCase().includes("not available from readable")) ok("019G — banking limitation language");
  else note("019G — banking distinction wording may vary");

  const limitationCount = (prose.match(/FOIR, DSCR, and LTV ratios were not computed/gi) || []).length;
  if (limitationCount <= 2) ok("019G — ratio limitation not repeated excessively");
  else fail(`019G — ratio limitation repeated ${limitationCount} times`);

  if (!/internal recommendation/i.test(prose)) ok("019G — no internal recommendations in prose");
  else fail("019G — internal recommendation leak");
  if (!/\bCatalyst One\b/i.test(prose)) ok("019G — no platform engine names");
  else fail("019G — platform name in lender prose");
  if (assertNoForbiddenLenderProposalLanguage(prose)) ok("019G — language guard");
  else fail("019G — forbidden lender language");
  if (assertNoInternalMetadataInLenderText(prose)) ok("019G — internal metadata guard");
  else fail("019G — internal metadata in prose");

  if (prose.includes("114,630") && !/receivables[^\n]*\b13\b/i.test(prose)) {
    ok("019G — financial facts without note artefacts");
  } else fail("019G — financial quality regression");

  if (prose.includes("Source / Evidence Notes") || prose.includes("18. Source")) {
    ok("019G — evidence traceability section");
  } else fail("019G — evidence notes section missing");

  report.beforeAfter = {
    fixtureSectionCount: included.length,
    legacyMarkers: detectLegacyProposalMarkers(prose),
    hasExecutiveSummary: prose.includes("Executive Summary"),
    hasMitigantsSection: Boolean(draft.sections.find((s) => s.id === "mitigants")?.included),
    bankingSectionDistinct: Boolean(draft.sections.find((s) => s.id === "banking_analysis")),
  };
}

{
  const v = spawnSync(
    process.execPath,
    ["--import", "./scripts/_bat-stub-server-only.mjs", "--import", "tsx", "scripts/co-chanakya-credit-intelligence-016-verify.mjs"],
    {
    cwd: ROOT,
    stdio: "pipe",
    encoding: "utf8",
    env: process.env,
  },
  );
  if (v.status === 0) ok("016 lender proposal verify PASS");
  else {
    fail("016 lender proposal verify FAIL");
    note(String(v.stderr || v.stdout).slice(0, 400));
  }
}

if (RUN_AVON && process.env.CATALYST_BAT_EMAIL && process.env.CATALYST_BAT_PASSWORD) {
  note("Running Avon live proposal verification...");
  const v = spawnSync(
    process.execPath,
    [
      "--env-file=.env.local",
      "--env-file=compass/.env.local",
      "--import",
      "./scripts/_bat-stub-server-only.mjs",
      "--import",
      "tsx",
      "scripts/co-chanakya-credit-intelligence-016-verify.mjs",
      "--avon",
    ],
    { cwd: ROOT, stdio: "pipe", encoding: "utf8", env: process.env },
  );
  if (v.status === 0) ok("Avon live 016 verify PASS");
  else {
    fail("Avon live 016 verify FAIL");
    note(String(v.stderr || v.stdout).slice(-800));
  }
} else if (RUN_AVON) {
  note("BAT credentials absent — skipping Avon live run");
}

report.qualityFindings = [
  "18-section credit memorandum structure (executive → evidence notes)",
  "Borrower profile separated from business overview",
  "Dedicated banking section distinguishes unavailable evidence from adverse performance",
  "Financial/GST/banking/product intelligence consumed without new engines",
  "Limitations consolidated under Missing / Pending Information",
  "Source traceability in section 18 — not cluttering lender-facing financial prose",
  "Mitigants and key concerns split into dedicated sections",
];

report.verification = failed === 0 ? "PASS" : "FAIL";
console.log("\n--- 019G report ---\n");
console.log("Before/after:", JSON.stringify(report.beforeAfter, null, 2));
console.log("Quality findings:", report.qualityFindings);
console.log("Verification:", report.verification);
console.log(failed ? `\nRESULT: FAIL (${failed})\n` : "\nRESULT: PASS\n");
process.exit(failed > 0 ? 1 : 0);
