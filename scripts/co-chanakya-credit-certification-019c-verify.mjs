/**
 * CO-CHANAKYA-CREDIT-CERTIFICATION-019C — Loan purpose completeness verification.
 *
 * Usage:
 *   node --env-file=.env.local --env-file=compass/.env.local --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-credit-certification-019c-verify.mjs
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
  process.env.JWT_SECRET || "verify-019c-jwt-secret-at-least-32-characters-long";

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

console.log("\n=== CO-CHANAKYA-CREDIT-CERTIFICATION-019C — Loan purpose completeness ===\n");

const {
  resolveOpportunityLoanPurpose,
  mergeLoanPurposeIntoLendingExtension,
  isLoanPurposeCaptureVisible,
  OPPORTUNITY_LOAN_PURPOSE_CANONICAL_KEY,
} = await import("../src/lib/enterprise-opportunity/resolve-loan-purpose.ts");

const { CHANAKYA_CREDIT_PROPOSAL_UNAVAILABLE } = await import(
  "../src/constants/chanakya-credit-proposal/index.ts"
);
const { CHANAKYA_FIELD_AVAILABILITY } = await import(
  "../src/types/chanakya-enterprise-read-context.ts"
);
const { buildPropertyEvidence } = await import(
  "../src/lib/chanakya-enterprise-read-context/product-lender-intelligence-core.ts"
);
const {
  buildLenderProposalIntelligence,
  assertNoForbiddenLenderProposalLanguage,
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

/** Certification fixture — does NOT mutate production Avon (OPP-2026-000060). */
const FIXTURE_WITH_PURPOSE = {
  id: "fixture-opp-purpose-present",
  opportunityNumber: "OPP-FIXTURE-019C-001",
  productCode: "BUSINESS_LOAN_UNSECURED",
  productLabel: "Business Loan Unsecured",
  requestedAmount: 5_000_000,
  employmentTypeCode: "self-employed-business",
  companyName: "Fixture Appliances Pvt Ltd",
  lendingExtension: {
    loanPurpose: "Working capital for inventory and receivables",
    remarks: "Fixture only",
    lendingType: "unsecured",
  },
};

const FIXTURE_WITHOUT_PURPOSE = {
  id: "fixture-opp-purpose-absent",
  opportunityNumber: "OPP-FIXTURE-019C-002",
  productCode: "BUSINESS_LOAN_UNSECURED",
  productLabel: "Business Loan Unsecured",
  requestedAmount: 5_000_000,
  lendingExtension: { lendingType: "unsecured" },
};

const FIXTURE_LEGACY_PURPOSE = {
  id: "fixture-opp-legacy-purpose",
  lendingExtension: { purpose: "Legacy purpose key only" },
};

const resolvedPresent = resolveOpportunityLoanPurpose(FIXTURE_WITH_PURPOSE);
if (resolvedPresent === "Working capital for inventory and receivables") {
  ok("resolveOpportunityLoanPurpose reads lendingExtension.loanPurpose");
} else {
  fail(`resolveOpportunityLoanPurpose expected canonical value, got ${resolvedPresent}`);
}

const resolvedAbsent = resolveOpportunityLoanPurpose(FIXTURE_WITHOUT_PURPOSE);
if (resolvedAbsent == null) {
  ok("missing loan purpose resolves to null (NOT_AVAILABLE downstream)");
} else {
  fail(`missing purpose should be null, got ${resolvedAbsent}`);
}

const resolvedLegacy = resolveOpportunityLoanPurpose(FIXTURE_LEGACY_PURPOSE);
if (resolvedLegacy === "Legacy purpose key only") {
  ok("legacy lendingExtension.purpose remains readable fallback");
} else {
  fail("legacy purpose fallback failed");
}

const merged = mergeLoanPurposeIntoLendingExtension(
  { participants: [{ id: "p1" }], remarks: "keep-me" },
  "Term loan for machinery",
);
if (
  merged[OPPORTUNITY_LOAN_PURPOSE_CANONICAL_KEY] === "Term loan for machinery" &&
  merged.purpose === "Term loan for machinery" &&
  merged.remarks === "keep-me" &&
  Array.isArray(merged.participants)
) {
  ok("mergeLoanPurposeIntoLendingExtension preserves sibling lendingExtension keys");
} else {
  fail("mergeLoanPurposeIntoLendingExtension corrupts lendingExtension");
}

if (isLoanPurposeCaptureVisible("BUSINESS_LOAN_UNSECURED", "Business Loan")) {
  ok("loan purpose capture visible for business-loan products");
} else {
  fail("business-loan product should show loan purpose capture");
}
if (!isLoanPurposeCaptureVisible("HOME_LOAN", "Home Loan")) {
  ok("loan purpose capture hidden for non-business-loan products");
} else {
  fail("home loan should not show loan purpose capture");
}

const docFacts = extractStructuredFactsFromText({
  text: "Loan purpose: Purchase of commercial property and working capital expansion.",
  provenance: {
    documentId: "doc-fixture",
    opportunityId: FIXTURE_WITHOUT_PURPOSE.id,
    displayName: "Application.pdf",
    typeRef: "loan_application",
    mimeType: "application/pdf",
    documentVersionHint: null,
    extractionMethod: "pdf_text_layer",
    confidence: "medium",
  },
});

  const propertyEvidence = buildPropertyEvidence({
    opportunity: FIXTURE_WITHOUT_PURPOSE,
    stated: {},
  });

if (
  propertyEvidence.purpose == null &&
  propertyEvidence.availability === CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE
) {
  ok("product-lender read-context: missing purpose stays NOT_AVAILABLE (no doc inference)");
} else {
  fail("purpose must not be inferred from documents when Opportunity field absent");
}

function buildMinimalProposalCtx(opp, purpose) {
  const creditIntelligence = assembleCreditIntelligence({
    opportunityId: String(opp.id),
    structuredFacts: docFacts,
    crossDocumentComparisons: [],
    reads: [],
    opportunityFields: {
      companyName: opp.companyName ?? null,
      requestedAmount: opp.requestedAmount ?? null,
      transactionType: null,
    },
    limitations: ["CO-019C fixture — purpose must not be inferred from documents"],
  });

  return {
    opportunityId: String(opp.id),
    opportunityNumber: opp.opportunityNumber ?? null,
    productName: opp.productLabel ?? "Business Loan",
    loanAmount: Number(opp.requestedAmount ?? 0),
    borrowerName: opp.companyName ?? "Fixture Borrower",
    employmentType: opp.employmentTypeCode ?? null,
    city: null,
    companyName: opp.companyName ?? null,
    purpose,
    transactionType: null,
    relationshipManagerName: null,
    lenderName: "Fixture Bank",
    rmNote: null,
    stated: {},
    documents: [],
    documentIntelligence: {
      documentsReviewed: 0,
      structuredFacts: docFacts,
      reads: [],
      limitations: [],
    },
    evidence: [],
    gaps: purpose ? [] : ["Loan purpose is not captured on the Opportunity."],
    intelligence: {},
    productLenderIntelligence: { availability: "NOT_AVAILABLE" },
    creditIntelligence,
  };
}

const ctxWithPurpose = buildMinimalProposalCtx(
  FIXTURE_WITH_PURPOSE,
  resolveOpportunityLoanPurpose(FIXTURE_WITH_PURPOSE),
);
const lenderWithPurpose = buildLenderProposalIntelligence(ctxWithPurpose);
const lenderPurposeLine = lenderWithPurpose.sections
  .flatMap((s) => s.body.split("\n"))
  .find((line) => line.includes("**Purpose:**"));
if (lenderPurposeLine?.includes("Working capital")) {
  ok("lender proposal intelligence includes captured loan purpose");
} else {
  fail(`lender proposal missing purpose line: ${lenderPurposeLine ?? "none"}`);
}

const ctxWithoutPurpose = buildMinimalProposalCtx(FIXTURE_WITHOUT_PURPOSE, null);
const draftWithout = composeChanakyaCreditProposalDraft(ctxWithoutPurpose);
const draftText = draftWithout.sections.map((s) => s.body).join("\n");
if (
  draftText.includes("**Purpose:**") &&
  (draftText.includes(CHANAKYA_CREDIT_PROPOSAL_UNAVAILABLE) ||
    draftText.includes("Not Available"))
) {
  ok("lender proposal draft shows NOT_AVAILABLE when purpose absent");
} else {
  fail("missing purpose must render NOT_AVAILABLE in proposal draft");
}

if (
  !draftWithout.sections.some((s) =>
    s.body.toLowerCase().includes("purchase of commercial property"),
  )
) {
  ok("proposal does not infer purpose from unrelated document text");
} else {
  fail("proposal must not infer loan purpose from documents");
}

const allLenderText = lenderWithPurpose.sections.map((s) => s.body).join("\n");
if (assertNoForbiddenLenderProposalLanguage(allLenderText)) {
  ok("lender proposal language guard passes with purpose present");
} else {
  fail("forbidden lender proposal language detected");
}

note("Avon OPP-2026-000060 intentionally NOT modified — fixture-only verification");
note("Production Avon remains without loan purpose until RM captures via Lead Information or Credit Workbench");

for (const script of [
  "co-chanakya-credit-certification-019b-verify.mjs",
  "co-chanakya-enterprise-read-context-002-verify.mjs",
]) {
  const args = [
    "--env-file=.env.local",
    "--env-file=compass/.env.local",
    "--import",
    "./scripts/_bat-stub-server-only.mjs",
    "--import",
    "tsx",
    `scripts/${script}`,
  ];
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

console.log("\n--- 019C summary ---\n");
console.log(`SSOT field: Opportunity.lendingExtension.${OPPORTUNITY_LOAN_PURPOSE_CANONICAL_KEY}`);
console.log("Migration required: NO (JSON lendingExtension only)");
console.log(failed ? `\nRESULT: FAIL (${failed})\n` : "\nRESULT: PASS\n");
process.exit(failed > 0 ? 1 : 0);
