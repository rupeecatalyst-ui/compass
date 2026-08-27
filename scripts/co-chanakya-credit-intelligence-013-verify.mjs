/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-013 — Banking intelligence verification.
 *
 * Usage:
 *   node --import tsx scripts/co-chanakya-credit-intelligence-013-verify.mjs
 *   node --env-file=compass/.env.local --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-credit-intelligence-013-verify.mjs --avon
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ETD_INLINE_CONTENT_BYTES_MAX } from "../src/constants/enterprise-document-object-storage/index.ts";

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
const { assembleCreditIntelligence } = await import(
  "../src/lib/chanakya-credit-intelligence/credit-intelligence-core.ts"
);

const baseProv = {
  documentId: "doc_bank_fixture",
  opportunityId: "opp_fixture_013",
  displayName: "Axis Bank Statement Current AC.pdf",
  typeRef: "doc:bank-statement",
  mimeType: "application/pdf",
  documentVersionHint: null,
};

// --- Metadata-only never produces banking facts ---
{
  const state = resolveBankDocumentState({
    isBankDocument: true,
    hasBinary: false,
    binarySource: "none",
    fileSizeBytes: 6_000_000,
    storageKey: null,
    readStatus: "no_binary",
  });
  if (state !== "metadata_only") fail("013 oversized metadata-only must resolve metadata_only");
  else ok("Metadata-only bank statement state resolved");
  if (bankStateAllowsFactExtraction(state)) {
    fail("013 metadata_only must not allow fact extraction");
  } else ok("Metadata-only state blocks fact extraction");
}

// --- Readable bank statement extraction ---
{
  const text = `
Axis Bank Ltd
Account Statement — Current Account
Statement Period: 01/08/2025 to 30/11/2025
Opening Balance: ₹ 12,45,678.00
Closing Balance: ₹ 15,89,320.50
Total Credits: ₹ 45,00,000.00
Total Debits: ₹ 41,56,357.50
01/08/2025 NEFT/CR ACME SUPPLIERS CR 5,00,000.00
15/08/2025 EMI/HDFC LOAN DR 45,000.00
`;
  const facts = extractBankStatementFacts({ text, provenance: baseProv });
  if (!facts.some((f) => f.key === "opening_balance")) fail("013 opening balance extraction");
  else ok("Opening balance extracted from labelled statement");
  if (!facts.some((f) => f.key === "closing_balance")) fail("013 closing balance extraction");
  else ok("Closing balance extracted from labelled statement");
  if (!facts.some((f) => f.key === "statement_period")) fail("013 statement period preserved");
  else ok("Statement period preserved");
  if (!facts.some((f) => f.key === "total_credits")) fail("013 total credits extraction");
  else ok("Total credits extracted when labelled");
  if (!facts.some((f) => f.key === "emi_indicator")) fail("013 EMI indicator from narration");
  else ok("EMI indicator derived from narration (not invented)");
}

// --- Unavailable binary never produces transactions ---
{
  const inventory = buildBankDocumentInventory({
    reads: [
      {
        documentId: "axis_meta",
        opportunityId: "opp",
        displayName: "Axis Bank Statement OD AC.pdf",
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
        provenance: { ...baseProv, documentId: "axis_meta" },
      },
    ],
    fileSizeByDocId: new Map([["axis_meta", 6_207_134]]),
  });
  const analysis = buildBankingAnalysisFromEvidence({
    facts: [],
    reads: inventory.map((d) => ({
      documentId: d.documentId,
      opportunityId: "opp",
      displayName: d.documentName,
      typeRef: "doc:bank-statement",
      mimeType: "application/pdf",
      familyHint: "banking",
      status: "no_binary",
      extractionMethod: "unavailable",
      hasBinary: false,
      byteLength: 0,
      textExcerpt: null,
      textCharCount: 0,
      limitation: d.limitation,
      provenance: { ...baseProv, documentId: d.documentId },
    })),
    fileSizeByDocId: new Map([["axis_meta", 6_207_134]]),
  });
  if (analysis.availability !== "NOT_AVAILABLE") {
    fail("013 metadata-only bank docs must yield NOT_AVAILABLE banking analysis");
  } else ok("Unavailable binary yields NOT_AVAILABLE banking analysis");
  if (analysis.accounts.some((a) => a.openingBalance || a.closingBalance)) {
    fail("013 must not fabricate balances for metadata-only docs");
  } else ok("No fabricated balances for metadata-only docs");
}

// --- Bankable DPR must not classify as bank statement ---
{
  if (
    isBankStatementDocument({
      displayName: "Bankable_DPR_Part_2_Revised_with_Raw_Material_Costing.pdf",
      typeRef: "doc:other",
    })
  ) {
    fail("013 Bankable DPR must not classify as bank statement");
  } else ok("Bankable DPR excluded from bank statement classification");
}

// --- Provenance preserved ---
{
  const facts = extractBankStatementFacts({
    text: "Axis Bank\nOpening Balance: 100,000\nClosing Balance: 120,000\nStatement Period: 01/01/2025 to 31/01/2025",
    provenance: baseProv,
  });
  if (!facts[0]?.provenance.documentId || facts[0].provenance.extractionMethod !== "table_extraction") {
    fail("013 provenance must survive bank extraction");
  } else ok("Bank fact provenance preserved");
}

// --- Aggregate analytics from evidence only ---
{
  const mkFact = (key, value) => ({
    id: `d:${key}`,
    key,
    label: key,
    value,
    unit: "inr",
    periodLabel: null,
    provenance: {
      ...baseProv,
      page: null,
      sectionOrTable: "Bank Statement",
      extractionMethod: "table_extraction",
      confidence: "high",
    },
    lenderFacingEligible: true,
  });
  const analysis = buildBankingAnalysisFromEvidence({
    facts: [
      mkFact("opening_balance", "100,000"),
      mkFact("closing_balance", "200,000"),
      mkFact("total_credits", "500,000"),
      mkFact("total_debits", "400,000"),
    ],
    reads: [
      {
        documentId: baseProv.documentId,
        opportunityId: baseProv.opportunityId,
        displayName: baseProv.displayName,
        typeRef: baseProv.typeRef,
        mimeType: baseProv.mimeType,
        familyHint: "banking",
        status: "content_read",
        extractionMethod: "pdf_text_layer",
        hasBinary: true,
        byteLength: 500_000,
        textExcerpt: null,
        textCharCount: 500,
        limitation: null,
        provenance: baseProv,
      },
    ],
  });
  if (analysis.availability !== "AVAILABLE") fail("013 readable bank with balances must be AVAILABLE");
  else ok("Readable bank statement produces AVAILABLE banking analysis");
  if (!analysis.aggregate.totalCredits) fail("013 aggregate credits from extracted facts");
  else ok("Aggregate credits derived from evidence");
  if (!analysis.accounts[0]?.averageBalance) fail("013 average balance derived from open/close");
  else ok("Average balance derived from opening/closing evidence");
}

// --- Preserve 012 verify ---
{
  const verify = spawnSync(
    process.execPath,
    ["--import", "tsx", path.join(ROOT, "scripts/co-chanakya-credit-intelligence-012-verify.mjs")],
    { cwd: ROOT, stdio: "inherit", env: process.env },
  );
  if (verify.status !== 0) fail("012 verify regression");
  else ok("012 + 002–011 checks still PASS");
}

// --- Optional Avon live banking report ---
if (RUN_AVON) {
  console.log("\n--- Avon OPP-2026-000060 banking inventory (read-only BAT) ---\n");
  const base =
    process.env.CO_CHANAKYA_011_READ_BASE?.replace(/\/$/, "") ||
    "https://catalyst-one.rupeecatalyst.com";
  const email = process.env.CATALYST_BAT_EMAIL || "";
  const password = process.env.CATALYST_BAT_PASSWORD || "";
  if (!email || !password) {
    fail("BAT credentials are not configured. Authenticated certification cannot continue.");
  } else {
    const login = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const loginJson = await login.json();
    const token = loginJson.data?.accessToken;
    if (!login.ok || !token) {
      fail(`BAT login failed against ${base} — Avon banking inventory skipped`);
    } else {
      ok(`BAT login (read-only) against ${base}`);
    }
    if (!token) {
      // Skip Avon fetches when auth unavailable (e.g. wrong CATALYST_BAT_URL override).
    } else {
    const docs = (
      await (
        await fetch(
          `${base}/api/enterprise-transaction-documents?opportunityId=cmsipb7hu0003l304f7yrz7p8&includeContent=1`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
      ).json()
    ).data?.items || [];

    const axisStatements = docs.filter(
      (d) =>
        isBankStatementDocument({
          displayName: d.displayName || "",
          typeRef: d.typeRef || "",
        }) && /\baxis\b/i.test(d.displayName || ""),
    );

    console.log(`Axis bank statements found: ${axisStatements.length}`);
    for (const d of axisStatements) {
      const hasBinary = Boolean(d.contentBase64);
      const state = resolveBankDocumentState({
        isBankDocument: true,
        hasBinary,
        binarySource: d.storageKey ? "object_store" : hasBinary ? "inline" : "none",
        fileSizeBytes: d.fileSizeBytes || 0,
        storageKey: d.storageKey || null,
        readStatus: hasBinary ? "content_read" : "no_binary",
      });
      console.log(
        `  · ${d.displayName.slice(0, 65)} | ${(d.fileSizeBytes / 1_048_576).toFixed(1)}MB | state=${state}`,
      );
      if (state !== "metadata_only") {
        fail(`013 Avon Axis statement expected metadata_only got ${state}: ${d.displayName}`);
      }
    }
    if (axisStatements.length === 8) ok("All eight Avon Axis statements reported metadata_only");
    else fail(`013 expected 8 Axis statements, found ${axisStatements.length}`);

    const inlineReadable = docs.filter(
      (d) =>
        isBankStatementDocument({ displayName: d.displayName || "", typeRef: d.typeRef || "" }) &&
        d.contentBase64 &&
        (d.fileSizeBytes || 0) <= ETD_INLINE_CONTENT_BYTES_MAX,
    );
    console.log(`Inline-durable bank statements readable: ${inlineReadable.length}`);
    if (inlineReadable.length > 0) {
      ok(`Found ${inlineReadable.length} smaller inline-durable bank statement(s)`);
    } else {
      ok("No inline-durable bank statements on Avon — banking NOT_AVAILABLE as expected");
    }
    }
  }
}

console.log(failed ? `\nRESULT: FAIL (${failed})\n` : "\nRESULT: PASS\n");
process.exit(failed ? 1 : 0);
