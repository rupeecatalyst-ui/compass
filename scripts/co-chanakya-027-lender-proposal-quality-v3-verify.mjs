/**
 * CO-CHANAKYA-027 — Lender proposal quality V3 verification.
 *
 * Usage:
 *   node --env-file=.env.local --env-file=compass/.env.local --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-027-lender-proposal-quality-v3-verify.mjs
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
  process.env.JWT_SECRET || "verify-027-jwt-secret-at-least-32-characters-long";

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

console.log("\n=== CO-CHANAKYA-027 — Lender proposal quality V3 ===\n");
console.log("Hostinger production: FROZEN (CO-CHANAKYA-RELEASE-FREEZE-015)\n");

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
const { buildCrossDocumentComparisons } = await import(
  "../src/lib/chanakya-document-intelligence/cross-document.ts"
);
const {
  AVON_BS_NOTE_RECEIVABLES_FIXTURE,
  AVON_PNL_DEPRECIATION_FIXTURE,
} = await import(
  "../src/constants/chanakya-credit-intelligence/avon-financial-extraction-fixtures.ts"
);
const {
  AVON_GSTR3B_JAN_FIXTURE,
  AVON_GSTR3B_FEB_FIXTURE,
  AVON_GSTR3B_MAR_FIXTURE,
} = await import(
  "../src/constants/chanakya-credit-intelligence/avon-gst-extraction-fixtures.ts"
);
const { AVON_AXIS_METADATA_ONLY_INVENTORY } = await import(
  "../src/constants/chanakya-credit-intelligence/avon-bank-extraction-fixtures.ts"
);
const {
  AVON_PROJECT_FINANCE_PRODUCT_RECORD,
  AVON_PROJECT_FINANCE_MATRIX_LENDERS,
  AVON_PROJECT_FINANCE_SHALLOW_PROGRAM,
} = await import(
  "../src/constants/chanakya-credit-intelligence/avon-product-lender-fixtures.ts"
);
const {
  AVON_027_LOAN_AMOUNT,
  AVON_027_OPPORTUNITY,
  AVON_027_ASSIGNED_LENDER,
} = await import(
  "../src/constants/chanakya-credit-intelligence/avon-lender-proposal-v3-fixtures.ts"
);
const {
  buildProductContextEvidence,
  buildMatrixMappedLenders,
  buildPotentialLenderFitAssessments,
  assessMatrixDepth,
  assembleProductLenderIntelligence,
  buildTransactionLenderSnapshot,
  buildAssignedLenderAssessments,
} = await import(
  "../src/lib/chanakya-enterprise-read-context/product-lender-intelligence-core.ts"
);

const REQUIRED_SECTIONS = CHANAKYA_CREDIT_PROPOSAL_SECTIONS.map((s) => s.id);

if (REQUIRED_SECTIONS.length === 18) ok("027 — 18-section V2 structure preserved");
else fail(`027 — expected 18 sections, got ${REQUIRED_SECTIONS.length}`);

function buildAvon027Context() {
  const baseFinProv = {
    documentId: "doc_avon_027_fs",
    opportunityId: AVON_027_OPPORTUNITY.opportunityId,
    displayName: "Avon Audited FS FY2023-24.pdf",
    typeRef: "financial",
    mimeType: "application/pdf",
    documentVersionHint: null,
  };

  const finFacts = [
    ...extractStructuredFactsFromText({
      text: AVON_BS_NOTE_RECEIVABLES_FIXTURE,
      provenance: baseFinProv,
    }),
    ...extractStructuredFactsFromText({
      text: AVON_PNL_DEPRECIATION_FIXTURE,
      provenance: { ...baseFinProv, documentId: "doc_avon_027_pnl" },
    }),
  ];

  const gstFacts = [
    ...extractGstReturnFacts({
      text: AVON_GSTR3B_JAN_FIXTURE,
      provenance: {
        ...baseFinProv,
        documentId: "doc_gst_jan",
        displayName: "GSTR-3B Jan 2025-26.pdf",
        typeRef: "gst",
      },
    }),
    ...extractGstReturnFacts({
      text: AVON_GSTR3B_FEB_FIXTURE,
      provenance: {
        ...baseFinProv,
        documentId: "doc_gst_feb",
        displayName: "GSTR-3B Feb 2025-26.pdf",
        typeRef: "gst",
      },
    }),
    ...extractGstReturnFacts({
      text: AVON_GSTR3B_MAR_FIXTURE,
      provenance: {
        ...baseFinProv,
        documentId: "doc_gst_mar",
        displayName: "GSTR-3B Mar 2025-26.pdf",
        typeRef: "gst",
      },
    }),
  ];

  const structuredFacts = [...finFacts, ...gstFacts];

  const metadataReads = AVON_AXIS_METADATA_ONLY_INVENTORY.map((name, i) => ({
    documentId: `avon_meta_${i}`,
    opportunityId: AVON_027_OPPORTUNITY.opportunityId,
    displayName: name,
    typeRef: "doc:bank-statement",
    mimeType: "application/pdf",
    familyHint: "banking",
    status: "no_binary",
    extractionMethod: "unavailable",
    hasBinary: false,
    byteLength: 0,
    textExcerpt: null,
    textCharCount: 0,
    limitation: "metadata-only",
    provenance: {
      documentId: `avon_meta_${i}`,
      opportunityId: AVON_027_OPPORTUNITY.opportunityId,
      displayName: name,
      typeRef: "doc:bank-statement",
      mimeType: "application/pdf",
      documentVersionHint: null,
      page: null,
      sectionOrTable: null,
      extractionMethod: "unavailable",
      confidence: "none",
    },
  }));

  const finReads = [
    {
      documentId: "doc_avon_027_fs",
      displayName: "Avon Audited FS FY2023-24.pdf",
      status: "content_read",
      textCharCount: 800,
    },
    {
      documentId: "doc_avon_027_pnl",
      displayName: "Avon P&L FY2023-24.pdf",
      status: "content_read",
      textCharCount: 600,
    },
    ...metadataReads.map((r) => ({
      documentId: r.documentId,
      displayName: r.displayName,
      status: r.status,
      textCharCount: 0,
    })),
  ];

  const credit = assembleCreditIntelligence({
    opportunityId: AVON_027_OPPORTUNITY.opportunityId,
    structuredFacts,
    crossDocumentComparisons: buildCrossDocumentComparisons(structuredFacts),
    reads: metadataReads,
    fileSizeByDocId: new Map(metadataReads.map((r) => [r.documentId, 6_207_134])),
  });

  const productContext = buildProductContextEvidence({
    opportunityProductCode: AVON_027_OPPORTUNITY.productCode,
    opportunityProductLabel: AVON_027_OPPORTUNITY.productName,
    productRecord: AVON_PROJECT_FINANCE_PRODUCT_RECORD,
  });

  const matrix = buildMatrixMappedLenders({
    productCode: "PROJECT_FINANCE",
    lenders: AVON_PROJECT_FINANCE_MATRIX_LENDERS,
  });

  const programsByLender = new Map([
    ["lender_infra_a", [AVON_PROJECT_FINANCE_SHALLOW_PROGRAM]],
  ]);

  const matrixDepth = assessMatrixDepth({
    productCode: "PROJECT_FINANCE",
    matrixEvidence: matrix,
    programsByLender,
  });

  const assignedLenders = buildAssignedLenderAssessments([AVON_027_ASSIGNED_LENDER]);

  const potential = buildPotentialLenderFitAssessments({
    productCode: "PROJECT_FINANCE",
    matrixLenders: AVON_PROJECT_FINANCE_MATRIX_LENDERS,
    programsByLender,
    transaction: {
      requestedAmount: AVON_027_LOAN_AMOUNT,
      productCode: "PROJECT_FINANCE",
      productLabel: AVON_027_OPPORTUNITY.productName,
      cityLabel: AVON_027_OPPORTUNITY.city,
      stateLabel: "Gujarat",
    },
    assignedLenderIds: new Set([AVON_027_ASSIGNED_LENDER.lenderId]),
  });

  const productLenderIntelligence = assembleProductLenderIntelligence({
    productContext,
    assignedLenders,
    matrixEvidence: matrix,
    potentialFit: potential,
    propertyEvidence: {
      availability: "NOT_AVAILABLE",
      provenance: "enterprise_opportunity_registry",
    },
    missingInformation: [],
    internalRecommendations: [
      {
        recommendation: "INTERNAL ONLY: Prefer ICICI for speed — not for lender document",
        rationale: "internal test",
        availability: "AVAILABLE",
        provenance: ["internal"],
      },
    ],
    matrixDepth,
    transactionSnapshot: buildTransactionLenderSnapshot({
      productContext,
      assignedCount: assignedLenders.length,
      matrixEvidence: matrix,
      programAvailabilityCount: 1,
      transaction: {
        productCode: "PROJECT_FINANCE",
        productLabel: AVON_027_OPPORTUNITY.productName,
        cityLabel: AVON_027_OPPORTUNITY.city,
        stateLabel: "Gujarat",
      },
    }),
  });

  return {
    opportunityId: AVON_027_OPPORTUNITY.opportunityId,
    opportunityNumber: AVON_027_OPPORTUNITY.opportunityNumber,
    productName: AVON_027_OPPORTUNITY.productName,
    loanAmount: AVON_027_LOAN_AMOUNT,
    borrowerName: AVON_027_OPPORTUNITY.borrowerName,
    employmentType: "self-employed-business",
    city: AVON_027_OPPORTUNITY.city,
    companyName: AVON_027_OPPORTUNITY.companyName,
    purpose: null,
    transactionType: "fresh",
    relationshipManagerName: "RM Test",
    lenderName: AVON_027_OPPORTUNITY.lenderName,
    rmNote: null,
    stated: { statedTurnover: "120000000", statedBusinessVintage: "15 years" },
    documents: [{ name: "Audited FS.pdf", status: "active", typeRef: "financial", verified: false }],
    documentIntelligence: {
      documentsReviewed: 12,
      documentsWithBinary: 10,
      documentsWithReadableText: 4,
      documentsRequiringOcr: 0,
      documentsOcrFailed: 0,
      documentsRequiringVision: 0,
      structuredFacts,
      crossDocumentComparisons: buildCrossDocumentComparisons(structuredFacts),
      reads: finReads,
      limitations: ["Bank statements metadata-only"],
      capability: { note: "027 Avon" },
      visionProvider: { configured: false },
    },
    evidence: [],
    gaps: [],
    intelligence: {},
    productLenderIntelligence,
    creditIntelligence: credit,
  };
}

{
  const ctx = buildAvon027Context();
  const intel = buildLenderProposalIntelligence(ctx);
  const draft = composeChanakyaCreditProposalDraft(ctx);
  const prose = draft.fullText;

  if (prose.includes("50.0 Cr") || prose.includes("₹50.0 Cr") || prose.includes("50 Cr")) {
    ok("027 — Avon ₹50 Cr requested amount");
  } else fail("027 — Avon ₹50 Cr requested amount missing");

  if (/Project Finance/i.test(prose)) ok("027 — Project Finance product");
  else fail("027 — Project Finance missing");

  if (/ICICI Bank/i.test(prose)) ok("027 — ICICI Bank from assigned Deal registry");
  else fail("027 — ICICI Bank missing");

  if (prose.includes("114,630") && prose.includes("109,451")) {
    ok("027 — Total Assets FY2023-24 / FY2022-23");
  } else fail("027 — Total Assets multi-year figures missing");

  if (prose.includes("3,308")) ok("027 — Depreciation FY2023-24");
  else fail("027 — Depreciation FY2023-24 missing");

  if (!/receivables[^\n]*\b13\b/i.test(prose) && !/inventory[^\n]*\b13\b/i.test(prose)) {
    ok("027 — Trade Receivables / Inventory note-index 13 excluded");
  } else fail("027 — note-index artefacts leaked into proposal");

  if (/7702714|7,702,714|5977077|5977077\.90/i.test(prose)) {
    ok("027 — GST turnover values present");
  } else fail("027 — GST turnover values missing");

  if (
    /January|February|March|2025-26/i.test(prose) &&
    (draft.sections.find((s) => s.id === "gst_analysis")?.body ?? prose).length > 40
  ) {
    ok("027 — GST periods labelled");
  } else fail("027 — GST return periods missing");

  if (ctx.creditIntelligence.bankingAnalysis.availability === "NOT_AVAILABLE") {
    ok("027 — banking intelligence NOT_AVAILABLE (fixture)");
  } else fail("027 — banking must be NOT_AVAILABLE for Avon metadata-only");

  if (
    /could not be performed|readable bank statement content was not available|NOT AVAILABLE/i.test(
      prose,
    ) &&
    !/opening balance|closing balance|average balance/i.test(prose)
  ) {
    ok("027 — banking NOT_AVAILABLE in proposal without invented balances");
  } else fail("027 — banking section regression");

  if (
    /end-use of funds has \*\*not\*\* been captured|Purpose:\*\* Not Available|NOT AVAILABLE/i.test(
      prose,
    )
  ) {
    ok("027 — purpose unavailable when not captured");
  } else fail("027 — purpose unavailable wording missing");

  if (/FOIR.*DSCR.*LTV|FOIR \/ DSCR \/ LTV/i.test(prose)) {
    ok("027 — FOIR/DSCR/LTV limitation disclosed");
  } else fail("027 — ratio limitation missing");

  if (/INSUFFICIENT|matrix depth|Program parameters.*Not Available/i.test(prose)) {
    ok("027 — matrix / program limitations surfaced");
  } else fail("027 — matrix limitations missing");

  if (/audited P&L|readable bank statements|End-use of funds|FY\d{4}-\d{2}/i.test(prose)) {
    ok("027 — actionable pending information");
  } else fail("027 — pending information not actionable enough");

  if (prose.includes("|") && prose.includes("114,630")) {
    ok("027 — financial presentation uses table layout");
  } else note("027 — financial table markdown may render in UI only");

  if (!/INTERNAL ONLY|internal recommendation/i.test(prose)) {
    ok("027 — internal recommendations excluded from lender prose");
  } else fail("027 — internal recommendation leak");

  if (assertNoForbiddenLenderProposalLanguage(prose)) ok("027 — forbidden language guard");
  else fail("027 — forbidden lender language");

  if (assertNoInternalMetadataInLenderText(prose)) ok("027 — internal metadata guard");
  else fail("027 — platform metadata in lender prose");

  const finProv = intel.internalProvenance.find((p) => p.field === "total_assets");
  if (finProv?.period && finProv?.confidence) {
    ok("027 — internal provenance retains period and confidence");
  } else fail("027 — internal provenance traceability incomplete");

  if (intel.sections.length === 18) ok("027 — intelligence builds 18 sections");
  else fail(`027 — expected 18 intelligence sections, got ${intel.sections.length}`);

  const legacy = detectLegacyProposalMarkers(prose);
  if (!legacy.length) ok("027 — no legacy proposal markers");
  else fail(`027 — legacy markers: ${legacy.join(", ")}`);

  if (/may be considered subject to lender policy|subject to lender review/i.test(prose)) {
    ok("027 — advisory recommendation language");
  } else fail("027 — advisory recommendation missing");

  if (!/\bapproved\b|\bsanctioned\b|\bguaranteed\b|\beligible\b|\bbest lender\b/i.test(prose)) {
    ok("027 — no forbidden recommendation terms");
  } else fail("027 — forbidden recommendation terms in prose");
}

{
  const v3Core = fs.readFileSync(
    path.join(ROOT, "src/lib/chanakya-credit-proposal/lender-proposal-v3-core.ts"),
    "utf8",
  );
  if (v3Core.includes("buildFinancialStatementTable") && v3Core.includes("buildGstAnalysisV3")) {
    ok("027 — V3 core module wired");
  } else fail("027 — V3 core module incomplete");

  const intelCore = fs.readFileSync(
    path.join(ROOT, "src/lib/chanakya-credit-proposal/lender-proposal-intelligence-core.ts"),
    "utf8",
  );
  if (intelCore.includes("lender-proposal-v3-core")) ok("027 — intelligence core imports V3");
  else fail("027 — intelligence core still on V2 only");
}

for (const [label, script] of [
  ["019G V2 certification", "scripts/co-chanakya-credit-certification-019g-verify.mjs"],
  ["016 lender proposal", "scripts/co-chanakya-credit-intelligence-016-verify.mjs"],
  ["025 matrix depth", "scripts/co-chanakya-025-product-lender-matrix-depth-verify.mjs"],
  ["026 executive snapshot", "scripts/co-chanakya-026-transaction-executive-intelligence-verify.mjs"],
]) {
  const v = spawnSync(
    process.execPath,
    ["--import", "./scripts/_bat-stub-server-only.mjs", "--import", "tsx", script],
    { cwd: ROOT, stdio: "pipe", encoding: "utf8", env: process.env },
  );
  if (v.status === 0) ok(`027 regression — ${label} PASS`);
  else {
    fail(`027 regression — ${label} FAIL`);
    note(String(v.stderr || v.stdout).slice(0, 500));
  }
}

console.log(failed ? `\nRESULT: FAIL (${failed})\n` : "\nRESULT: PASS\n");
process.exit(failed ? 1 : 0);
