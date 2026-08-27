/**
 * CO-CHANAKYA-023 — Banking intelligence verification.
 *
 * Usage:
 *   node --env-file=.env.local --env-file=compass/.env.local --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-023-banking-intelligence-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ETD_INLINE_CONTENT_BYTES_MAX } from "../src/constants/enterprise-document-object-storage/index.ts";

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
  process.env.JWT_SECRET || "verify-023-jwt-secret-at-least-32-characters-long";

let failed = 0;
function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.log(`FAIL  ${msg}`);
}

console.log("\n=== CO-CHANAKYA-023 — Banking intelligence ===\n");

{
  const v = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/co-chanakya-credit-intelligence-013-verify.mjs"],
    { cwd: ROOT, stdio: "pipe", encoding: "utf8", env: process.env },
  );
  if (v.status === 0) ok("013 banking baseline verify PASS");
  else fail("013 banking baseline verify FAIL");
}

const {
  AVON_BANK_READABLE_FIXTURE,
  AVON_BANK_READABLE_PRIOR_FIXTURE,
  AVON_BANK_INCOMPLETE_PERIOD_FIXTURE,
  AVON_BANK_MALFORMED_FIXTURE,
  AVON_BANK_NO_EMI_FIXTURE,
  AVON_AXIS_METADATA_ONLY_INVENTORY,
} = await import(
  "../src/constants/chanakya-credit-intelligence/avon-bank-extraction-fixtures.ts"
);
const { extractBankStatementFacts } = await import(
  "../src/lib/chanakya-document-intelligence/extract-bank-statements.ts"
);
const {
  resolveBankDocumentState,
  isBankStatementDocument,
  bankStateAllowsFactExtraction,
} = await import("../src/lib/chanakya-document-intelligence/resolve-bank-document-state.ts");
const {
  buildBankingAnalysisFromEvidence,
  buildBankDocumentInventory,
} = await import("../src/lib/chanakya-credit-intelligence/banking-intelligence-core.ts");
const {
  assessStatementPeriodCompleteness,
  resolveBankEvidenceTier,
} = await import("../src/lib/chanakya-credit-intelligence/banking-evidence-core.ts");
const { assembleCreditIntelligence } = await import(
  "../src/lib/chanakya-credit-intelligence/credit-intelligence-core.ts"
);
const { composeChanakyaCreditProposalDraft } = await import(
  "../src/lib/chanakya-credit-proposal/compose-proposal.ts"
);

const baseProv = {
  documentId: "doc_bank_023",
  opportunityId: "opp_avon_023",
  displayName: "Axis Bank Statement Current AC.pdf",
  typeRef: "doc:bank-statement",
  mimeType: "application/pdf",
  documentVersionHint: null,
};

function mkReadableRead(docId, displayName, textExcerpt) {
  return {
    documentId: docId,
    opportunityId: baseProv.opportunityId,
    displayName,
    typeRef: baseProv.typeRef,
    mimeType: baseProv.mimeType,
    familyHint: "banking",
    status: "content_read",
    extractionMethod: "pdf_text_layer",
    hasBinary: true,
    byteLength: 400_000,
    textExcerpt,
    textCharCount: textExcerpt?.length ?? 0,
    limitation: null,
    provenance: { ...baseProv, documentId: docId, displayName },
  };
}

// --- Three-state model ---
{
  const present = resolveBankEvidenceTier({
    availabilityState: "metadata_only",
    hasCoreFinancialFacts: false,
  });
  const readable = resolveBankEvidenceTier({
    availabilityState: "readable",
    hasCoreFinancialFacts: false,
  });
  const useful = resolveBankEvidenceTier({
    availabilityState: "readable",
    hasCoreFinancialFacts: true,
  });
  if (present !== "PRESENT") fail("023 PRESENT tier");
  else ok("023 — PRESENT tier for metadata-only documents");
  if (readable !== "READABLE") fail("023 READABLE tier");
  else ok("023 — READABLE tier without core financial facts");
  if (useful !== "FINANCIALLY_USEFUL") fail("023 FINANCIALLY_USEFUL tier");
  else ok("023 — FINANCIALLY_USEFUL tier when core facts extracted");
}

// --- Readable bank statement extraction ---
{
  const facts = extractBankStatementFacts({
    text: AVON_BANK_READABLE_FIXTURE,
    provenance: baseProv,
  });
  if (!facts.some((f) => f.key === "opening_balance" && f.value.includes("12,45,678"))) {
    fail("023 readable fixture opening balance");
  } else ok("023 — opening balance extracted from readable statement");
  if (!facts.some((f) => f.key === "closing_balance")) fail("023 closing balance");
  else ok("023 — closing balance extracted");
  if (!facts.some((f) => f.key === "statement_period")) fail("023 statement period");
  else ok("023 — statement period preserved");
  if (!facts.some((f) => f.key === "total_credits")) fail("023 total credits");
  else ok("023 — total credits extracted when labelled");
  if (!facts.some((f) => f.key === "average_balance")) fail("023 stated average balance");
  else ok("023 — stated average balance preserved");
  if (!facts.some((f) => f.key === "emi_indicator")) fail("023 EMI from narration");
  else ok("023 — EMI indicator from identifiable narration");
  if (!facts.some((f) => f.key === "cheque_return_indicator")) fail("023 cheque return");
  else ok("023 — cheque return indicator from narration");
}

// --- No EMI without evidence ---
{
  const facts = extractBankStatementFacts({
    text: AVON_BANK_NO_EMI_FIXTURE,
    provenance: { ...baseProv, documentId: "doc_no_emi" },
  });
  if (facts.some((f) => f.key === "emi_indicator")) {
    fail("023 must not invent EMI without narration evidence");
  } else ok("023 — no EMI indicator without identifiable evidence");
}

// --- Metadata-only → NOT_AVAILABLE ---
{
  const reads = AVON_AXIS_METADATA_ONLY_INVENTORY.map((name, i) => ({
    documentId: `axis_meta_${i}`,
    opportunityId: baseProv.opportunityId,
    displayName: name,
    typeRef: baseProv.typeRef,
    mimeType: baseProv.mimeType,
    familyHint: "banking",
    status: "no_binary",
    extractionMethod: "unavailable",
    hasBinary: false,
    byteLength: 0,
    textExcerpt: null,
    textCharCount: 0,
    limitation: "metadata-only",
    provenance: { ...baseProv, documentId: `axis_meta_${i}`, displayName: name },
  }));
  const fileSizes = new Map(
    reads.map((r) => [r.documentId, 6_207_134]),
  );
  const analysis = buildBankingAnalysisFromEvidence({ facts: [], reads, fileSizeByDocId: fileSizes });
  if (analysis.availability !== "NOT_AVAILABLE") {
    fail("023 Avon metadata-only must remain NOT_AVAILABLE");
  } else ok("023 — Avon eight metadata-only statements → NOT_AVAILABLE");
  if (analysis.evidenceTier !== "PRESENT") fail("023 Avon aggregate tier must be PRESENT");
  else ok("023 — Avon aggregate evidence tier = PRESENT only");
  if (analysis.accounts.some((a) => a.openingBalance || a.closingBalance)) {
    fail("023 must not fabricate balances for metadata-only Avon statements");
  } else ok("023 — no fabricated balances for Avon metadata-only inventory");
  if (analysis.accounts.length !== 8) {
    fail(`023 expected 8 Avon metadata accounts, got ${analysis.accounts.length}`);
  } else ok("023 — eight Avon Axis metadata-only accounts inventoried");
}

// --- binary_unavailable (STORAGE-009 object store miss) ---
{
  const state = resolveBankDocumentState({
    isBankDocument: true,
    hasBinary: false,
    binarySource: "none",
    fileSizeBytes: 2_500_000,
    storageKey: "org/opp/doc/key",
    readStatus: "no_binary",
    binaryAbsentReason: "object_store_miss",
  });
  if (state !== "binary_unavailable") fail("023 binary_unavailable state");
  else ok("023 — binary_unavailable when storageKey present but object store miss");
  if (bankStateAllowsFactExtraction(state)) {
    fail("023 binary_unavailable must block fact extraction");
  } else ok("023 — binary_unavailable blocks fact extraction");

  const analysis = buildBankingAnalysisFromEvidence({
    facts: [],
    reads: [
      {
        documentId: "axis_store_miss",
        opportunityId: baseProv.opportunityId,
        displayName: "Axis Bank Statement.pdf",
        typeRef: baseProv.typeRef,
        mimeType: baseProv.mimeType,
        familyHint: "banking",
        status: "no_binary",
        extractionMethod: "unavailable",
        hasBinary: false,
        byteLength: 0,
        textExcerpt: null,
        textCharCount: 0,
        limitation: "object_store_miss",
        provenance: { ...baseProv, documentId: "axis_store_miss" },
      },
    ],
    fileSizeByDocId: new Map([["axis_store_miss", 2_500_000]]),
    storageKeyByDocId: new Map([["axis_store_miss", true]]),
    binaryAbsentReasonByDocId: new Map([["axis_store_miss", "object_store_miss"]]),
  });
  if (analysis.availability !== "NOT_AVAILABLE") fail("023 object store miss analysis");
  else ok("023 — object store miss → NOT_AVAILABLE banking analysis");
}

// --- Incomplete period — no inferred average ---
{
  const incompleteFacts = extractBankStatementFacts({
    text: AVON_BANK_INCOMPLETE_PERIOD_FIXTURE,
    provenance: { ...baseProv, documentId: "doc_incomplete" },
  });
  const period = incompleteFacts.find((f) => f.key === "statement_period")?.value ?? null;
  const completeness = assessStatementPeriodCompleteness({ statementPeriod: period });
  if (completeness.complete) fail("023 incomplete period must be flagged incomplete");
  else ok("023 — incomplete statement period detected");

  const analysis = buildBankingAnalysisFromEvidence({
    facts: incompleteFacts,
    reads: [mkReadableRead("doc_incomplete", "Partial Axis Statement.pdf", AVON_BANK_INCOMPLETE_PERIOD_FIXTURE)],
  });
  const account = analysis.accounts.find((a) => a.documentId === "doc_incomplete");
  if (account?.averageBalance) {
    fail("023 must not infer average balance from incomplete period open/close");
  } else ok("023 — average balance not inferred for incomplete period");
}

// --- Malformed statement ---
{
  const facts = extractBankStatementFacts({
    text: AVON_BANK_MALFORMED_FIXTURE,
    provenance: { ...baseProv, documentId: "doc_malformed" },
  });
  if (facts.some((f) => ["opening_balance", "closing_balance"].includes(f.key))) {
    fail("023 malformed statement must not emit balances");
  } else ok("023 — malformed statement emits no balance facts");
}

// --- Banking trend from multiple readable periods ---
{
  const factsA = extractBankStatementFacts({
    text: AVON_BANK_READABLE_PRIOR_FIXTURE,
    provenance: { ...baseProv, documentId: "doc_prior" },
  });
  const factsB = extractBankStatementFacts({
    text: AVON_BANK_READABLE_FIXTURE,
    provenance: { ...baseProv, documentId: "doc_current" },
  });
  const analysis = buildBankingAnalysisFromEvidence({
    facts: [...factsA, ...factsB],
    reads: [
      mkReadableRead("doc_prior", "Axis Apr-Jul 2025.pdf", AVON_BANK_READABLE_PRIOR_FIXTURE),
      mkReadableRead("doc_current", "Axis Aug-Nov 2025.pdf", AVON_BANK_READABLE_FIXTURE),
    ],
  });
  if (analysis.availability !== "AVAILABLE") fail("023 readable multi-period banking");
  else ok("023 — readable statements produce AVAILABLE banking analysis");
  if (analysis.bankingTrend.availability !== "AVAILABLE") {
    fail("023 banking trend must be AVAILABLE for two complete periods");
  } else ok("023 — banking trend derived from consecutive readable statements");
  if (!analysis.bankingTrend.observations.some((o) => /closing balance/i.test(o))) {
    fail("023 banking trend must include closing balance observation");
  } else ok("023 — banking trend includes evidence-first closing balance observation");
}

// --- Credit intelligence + proposal must not invent Avon banking ---
{
  const metadataReads = AVON_AXIS_METADATA_ONLY_INVENTORY.map((name, i) => ({
    documentId: `avon_meta_${i}`,
    opportunityId: "opp_avon_023",
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
      opportunityId: "opp_avon_023",
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
  const credit = assembleCreditIntelligence({
    opportunityId: "opp_avon_023",
    structuredFacts: [],
    crossDocumentComparisons: [],
    reads: metadataReads,
    fileSizeByDocId: new Map(metadataReads.map((r) => [r.documentId, 6_207_134])),
  });
  if (credit.bankingAnalysis.availability !== "NOT_AVAILABLE") {
    fail("023 Avon credit intelligence banking must be NOT_AVAILABLE");
  } else ok("023 — Avon credit intelligence banking = NOT_AVAILABLE");

  const draft = composeChanakyaCreditProposalDraft({
    opportunityId: "opp_avon_023",
    opportunityNumber: "OPP-2026-000060",
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
      documentsReviewed: 8,
      documentsWithBinary: 0,
      documentsWithReadableText: 0,
      documentsRequiringOcr: 0,
      documentsRequiringVision: 0,
      structuredFacts: [],
      crossDocumentComparisons: [],
      reads: metadataReads,
      limitations: ["Bank statements metadata-only"],
      capability: { note: "023" },
      visionProvider: { configured: false },
    },
    evidence: [],
    gaps: [],
    intelligence: {},
    productLenderIntelligence: { availability: "NOT_AVAILABLE" },
    creditIntelligence: credit,
  });
  if (/opening balance|closing balance|average balance/i.test(draft.fullText)) {
    fail("023 lender proposal must not invent Avon banking balances");
  } else ok("023 — Avon lender proposal excludes invented banking balances");
}

// --- No fraud / suspicious language in banking core ---
{
  const bankingCore = fs.readFileSync(
    path.join(ROOT, "src/lib/chanakya-credit-intelligence/banking-intelligence-core.ts"),
    "utf8",
  );
  const evidenceCore = fs.readFileSync(
    path.join(ROOT, "src/lib/chanakya-credit-intelligence/banking-evidence-core.ts"),
    "utf8",
  );
  const bankExtract = fs.readFileSync(
    path.join(ROOT, "src/lib/chanakya-document-intelligence/extract-bank-statements.ts"),
    "utf8",
  );
  const combined = `${bankingCore}\n${evidenceCore}\n${bankExtract}`;
  if (/\bfraud\b|\bsuspicious\b/i.test(combined.replace(/not labelled fraud/gi, ""))) {
    fail("023 banking modules must not classify transactions as fraud/suspicious");
  } else ok("023 — no fraud/suspicious classification language in banking SSOT");
}

// --- TypeScript smoke (affected modules) ---
{
  const tsc = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "-e",
      `
import { buildBankingAnalysisFromEvidence } from "./src/lib/chanakya-credit-intelligence/banking-intelligence-core.ts";
import { resolveBankEvidenceTier } from "./src/lib/chanakya-credit-intelligence/banking-evidence-core.ts";
import { resolveBankDocumentState } from "./src/lib/chanakya-document-intelligence/resolve-bank-document-state.ts";
if (resolveBankEvidenceTier({ availabilityState: "metadata_only", hasCoreFinancialFacts: false }) !== "PRESENT") throw new Error("tier");
if (resolveBankDocumentState({ isBankDocument: true, hasBinary: false, binarySource: "none", fileSizeBytes: 6207134, storageKey: null, readStatus: "no_binary" }) !== "metadata_only") throw new Error("meta");
console.log("ok");
`,
    ],
    { cwd: ROOT, stdio: "pipe", encoding: "utf8", env: process.env },
  );
  if (tsc.status === 0 && (tsc.stdout || "").includes("ok")) {
    ok("023 — TypeScript import smoke (affected modules) PASS");
  } else {
    fail("023 — TypeScript import smoke FAIL");
    if (tsc.stderr) console.log(String(tsc.stderr).slice(0, 800));
  }
}

console.log(failed ? `\nRESULT: FAIL (${failed})\n` : "\nRESULT: PASS\n");
process.exit(failed ? 1 : 0);
