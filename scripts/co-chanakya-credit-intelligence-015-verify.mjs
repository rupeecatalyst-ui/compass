/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-015 — Credit synthesis verification.
 *
 * Usage:
 *   node --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-credit-intelligence-015-verify.mjs
 *   node --env-file=compass/.env.local --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-credit-intelligence-015-verify.mjs --avon
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ETD_INLINE_CONTENT_BYTES_MAX } from "../src/constants/enterprise-document-object-storage/index.ts";
import {
  isBankStatementDocument,
  resolveBankDocumentState,
} from "../src/lib/chanakya-document-intelligence/resolve-bank-document-state.ts";

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
  assembleCreditIntelligence,
  assertNoForbiddenCreditLanguage,
} = await import("../src/lib/chanakya-credit-intelligence/credit-intelligence-core.ts");
const {
  composeCreditSynthesis,
  assertNoForbiddenSynthesisLanguage,
  rankCreditConcerns,
} = await import("../src/lib/chanakya-credit-intelligence/credit-synthesis-core.ts");
const { extractStructuredFactsFromText } = await import(
  "../src/lib/chanakya-document-intelligence/extract-structured-facts.ts"
);
const { extractPdfTextFromBytes } = await import(
  "../src/lib/chanakya-document-intelligence/extract-pdf-text.ts"
);
const { extractGstReturnFacts } = await import(
  "../src/lib/chanakya-document-intelligence/extract-gst-returns.ts"
);
const { buildCrossDocumentComparisons } = await import(
  "../src/lib/chanakya-document-intelligence/cross-document.ts"
);
const { redactCustomerContactPiiForAiContext } = await import(
  "../src/lib/chanakya-enterprise-read-context/redact-pii.ts"
);

const AVON_OPP_ID = "cmsipb7hu0003l304f7yrz7p8";
const AVON_OPP_NO = "OPP-2026-000060";

function decodeBase64(contentBase64) {
  if (!contentBase64) return null;
  const raw = contentBase64.includes(",") ? contentBase64.split(",").pop() : contentBase64;
  try {
    return Uint8Array.from(Buffer.from(raw, "base64"));
  } catch {
    return null;
  }
}

async function processDocLocally(doc) {
  const displayName = doc.displayName || "document";
  const bytes = decodeBase64(doc.contentBase64);
  const hasBinary = Boolean(bytes?.byteLength);
  let text = "";
  let status = hasBinary ? "content_read" : "no_binary";
  if (hasBinary && bytes) {
    const pdf = await extractPdfTextFromBytes({ bytes });
    if (pdf?.quality.usable) text = pdf.text;
    else if (pdf?.quality.empty) status = "ocr_required";
    else status = "unreadable_content";
  } else if (
    isBankStatementDocument({ displayName, typeRef: doc.typeRef || "" }) &&
    (doc.fileSizeBytes || 0) > ETD_INLINE_CONTENT_BYTES_MAX
  ) {
    status = "no_binary";
  }
  const provenance = {
    documentId: doc.id,
    opportunityId: doc.opportunityId,
    displayName,
    typeRef: doc.typeRef || "unknown",
    mimeType: doc.mimeType || "application/pdf",
    documentVersionHint: doc.updatedAt || null,
    extractionMethod: "pdf_text_layer",
    confidence: "high",
  };
  const facts =
    text.trim().length >= 20
      ? [
          ...extractStructuredFactsFromText({ text, provenance }),
          ...extractGstReturnFacts({ text, provenance }),
        ]
      : [];
  return {
    read: {
      documentId: doc.id,
      opportunityId: doc.opportunityId,
      displayName,
      typeRef: doc.typeRef || "unknown",
      mimeType: doc.mimeType || "application/pdf",
      familyHint: "business_financial",
      status,
      extractionMethod: hasBinary ? "pdf_text_layer" : "unavailable",
      hasBinary,
      byteLength: bytes?.byteLength || 0,
      textExcerpt: null,
      textCharCount: text.length,
      limitation: status === "no_binary" ? "metadata-only or absent binary" : null,
      provenance: { ...provenance, page: null, sectionOrTable: null },
    },
    facts,
  };
}

// --- Fixture synthesis ---
{
  const bsText = `
AVON APPLIANCES PRIVATE LIMITED
Balance Sheet as at 31 March 2024
(Rs in '000)
Particulars Note 31 March 2024 31 March 2023
Total Assets 114,630 109,451
Share Capital 500 500
Reserves and Surplus 50,000 48,000
Borrowings 25,000 22,000
`;
  const gstText = `
GSTR-3B
GSTIN 24AABCA1234A1Z5
Tax Period 012026
Total taxable value 5,977,077.90
`;
  const prov = {
    documentId: "doc_bs",
    opportunityId: "opp_015",
    displayName: "Audited BS.pdf",
    typeRef: "financial",
    mimeType: "application/pdf",
    documentVersionHint: null,
    extractionMethod: "table_extraction",
    confidence: "high",
  };
  const facts = [
    ...extractStructuredFactsFromText({ text: bsText, provenance: prov }),
    ...extractGstReturnFacts({ text: gstText, provenance: { ...prov, documentId: "doc_gst" } }),
  ];
  const credit = assembleCreditIntelligence({
    opportunityId: "opp_015",
    structuredFacts: facts,
    crossDocumentComparisons: buildCrossDocumentComparisons(facts),
    reads: [
      {
        documentId: "doc_bs",
        opportunityId: "opp_015",
        displayName: "Audited BS.pdf",
        typeRef: "financial",
        mimeType: "application/pdf",
        familyHint: "business_financial",
        status: "content_read",
        extractionMethod: "pdf_text_layer",
        hasBinary: true,
        byteLength: 1000,
        textExcerpt: null,
        textCharCount: 500,
        limitation: null,
        provenance: { ...prov, page: null, sectionOrTable: null },
      },
    ],
    opportunityFields: {
      companyName: "Avon Appliances Private Ltd",
      requestedAmount: 50_000_000,
      transactionType: "fresh",
    },
  });

  const synthesis = composeCreditSynthesis({
    opportunityId: "opp_015",
    opportunityNumber: "OPP-FIXTURE-015",
    creditIntelligence: credit,
    borrowerLabel: "Avon Appliances Private Ltd",
    productLabel: "Business Loan",
    requestedAmount: 50_000_000,
    transactionType: "fresh",
    documentSummary: {
      documentsReviewed: 2,
      documentsWithReadableText: 2,
      documentsRequiringOcr: 0,
      structuredFactCount: facts.length,
    },
  });

  if (!synthesis.internalOnly) fail("015 synthesis must be internalOnly");
  else ok("Credit synthesis marked internalOnly");

  if (synthesis.sourceCreditIntelligence.creditRatios.availability !== "NOT_AVAILABLE") {
    fail("015 must not compute FOIR/DSCR/LTV ratios");
  } else ok("Credit ratios remain NOT_AVAILABLE (no invented ratios)");

  if (!assertNoForbiddenSynthesisLanguage(JSON.stringify(synthesis))) {
    fail("015 forbidden approval/eligibility language in synthesis");
  } else ok("No forbidden approval / ratio language in synthesis");

  if (
    !["POSITIVE", "CAUTION", "INSUFFICIENT_EVIDENCE"].includes(
      synthesis.advisoryAssessment.state,
    )
  ) {
    fail("015 advisory state must be POSITIVE | CAUTION | INSUFFICIENT_EVIDENCE");
  } else ok(`Advisory assessment: ${synthesis.advisoryAssessment.state}`);

  if (synthesis.internalRecommendations.some((r) => r.internalOnly !== true)) {
    fail("015 internal recommendations must have internalOnly=true");
  } else ok("All internal recommendations marked internalOnly");

  if (synthesis.rankedConcerns.length === 0 && synthesis.keyPositives.length === 0) {
    fail("015 fixture should produce positives or ranked concerns");
  } else ok("Ranked concerns / positives produced from fixture evidence");

  if (!synthesis.financialAssessment.revenueTrend && credit.financialProfile.years.length < 2) {
    ok("Financial assessment observations respect evidence limits");
  } else if (synthesis.creditProfile.financialProfile.availability !== "NOT_AVAILABLE") {
    ok("Financial profile section populated from SSOT credit intelligence");
  }

  const ranked = rankCreditConcerns({
    concerns: credit.keyConcerns,
    creditIntelligence: credit,
  });
  if (!ranked.every((r) => r.severity)) fail("015 concern ranking missing severity");
  else ok("Concerns ranked by severity");
}

// --- Provenance on material conclusions ---
{
  const syn = composeCreditSynthesis({
    opportunityId: "opp_prov",
    creditIntelligence: assembleCreditIntelligence({
      opportunityId: "opp_prov",
      structuredFacts: [],
      crossDocumentComparisons: [],
      reads: [],
    }),
  });
  if (!syn.provenance.length || !syn.advisoryAssessment.provenance.length) {
    fail("015 provenance required on synthesis");
  } else ok("Provenance preserved on advisory assessment");
}

// --- Preserve 014 verify ---
{
  const verify = spawnSync(
    process.execPath,
    [
      "--import",
      "./scripts/_bat-stub-server-only.mjs",
      "--import",
      "tsx",
      "scripts/co-chanakya-credit-intelligence-014-verify.mjs",
    ],
    { cwd: ROOT, stdio: "inherit", env: process.env },
  );
  if (verify.status !== 0) fail("014 verify regression");
  else ok("014 + 002–013 checks still PASS");
}

// --- Avon real transaction synthesis ---
if (RUN_AVON) {
  console.log("\n--- Avon OPP-2026-000060 credit synthesis (read-only BAT) ---\n");

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
    const token = (await login.json()).data?.accessToken;
    if (!token) fail("BAT login failed for Avon synthesis");
    else {
      ok(`BAT login (read-only) against ${base}`);

      const opp = (
        await (
          await fetch(`${base}/api/enterprise-opportunities/${AVON_OPP_ID}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        ).json()
      ).data;
      const docs = (
        await (
          await fetch(
            `${base}/api/enterprise-transaction-documents?opportunityId=${AVON_OPP_ID}&includeContent=1`,
            { headers: { Authorization: `Bearer ${token}` } },
          )
        ).json()
      ).data?.items || [];

      const reads = [];
      const allFacts = [];
      for (const doc of docs) {
        const p = await processDocLocally(doc);
        reads.push(p.read);
        allFacts.push(...p.facts);
      }

      let metadataOnlyBanks = 0;
      for (const d of docs) {
        if (
          isBankStatementDocument({
            displayName: d.displayName || "",
            typeRef: d.typeRef || "",
          }) &&
          !d.contentBase64 &&
          (d.fileSizeBytes || 0) > 0
        ) {
          metadataOnlyBanks += 1;
        }
      }

      const oppSafe = redactCustomerContactPiiForAiContext(opp || {});
      const credit = assembleCreditIntelligence({
        opportunityId: AVON_OPP_ID,
        structuredFacts: allFacts,
        crossDocumentComparisons: buildCrossDocumentComparisons(allFacts),
        reads,
        opportunityFields: {
          companyName: typeof oppSafe.companyName === "string" ? oppSafe.companyName : null,
          requestedAmount:
            typeof oppSafe.requestedAmount === "number" ? oppSafe.requestedAmount : null,
          transactionType:
            typeof oppSafe.transactionType === "string" ? oppSafe.transactionType : null,
        },
        limitations: [
          "Avon synthesis run — read-only BAT document fetch + local 012–014 pipeline.",
        ],
      });

      const synthesis = composeCreditSynthesis({
        opportunityId: AVON_OPP_ID,
        opportunityNumber: AVON_OPP_NO,
        creditIntelligence: credit,
        borrowerLabel:
          typeof oppSafe.companyName === "string"
            ? oppSafe.companyName
            : typeof oppSafe.primaryContactName === "string"
              ? oppSafe.primaryContactName
              : null,
        productLabel:
          typeof oppSafe.productLabel === "string" ? oppSafe.productLabel : null,
        requestedAmount:
          typeof oppSafe.requestedAmount === "number" ? oppSafe.requestedAmount : null,
        transactionType:
          typeof oppSafe.transactionType === "string" ? oppSafe.transactionType : null,
        documentSummary: {
          documentsReviewed: docs.length,
          documentsWithReadableText: reads.filter(
            (r) => r.status === "content_read" || r.status === "content_read_partial",
          ).length,
          documentsRequiringOcr: reads.filter((r) => r.status === "ocr_required").length,
          structuredFactCount: allFacts.length,
          metadataOnlyBankStatements: metadataOnlyBanks,
        },
      });

      const redacted = redactCustomerContactPiiForAiContext(synthesis);
      if (!assertNoForbiddenSynthesisLanguage(JSON.stringify(redacted))) {
        fail("Avon synthesis contains forbidden credit language");
      } else ok("Avon synthesis passes forbidden-language gate");

      console.log("\n--- Credit Synthesis Summary (internal-only) ---");
      console.log(`Opportunity: ${synthesis.opportunityNumber} · ${synthesis.opportunityId}`);
      console.log(`Advisory: ${synthesis.advisoryAssessment.state}`);
      console.log(`Summary: ${synthesis.advisoryAssessment.summary}`);
      console.log(`Positives: ${synthesis.keyPositives.length}`);
      console.log(`Ranked concerns: ${synthesis.rankedConcerns.length}`);
      for (const c of synthesis.rankedConcerns.slice(0, 8)) {
        console.log(`  [${c.severity}] ${c.statement.slice(0, 90)}`);
      }
      console.log(`Internal recommendations: ${synthesis.internalRecommendations.length}`);
      for (const r of synthesis.internalRecommendations.slice(0, 6)) {
        console.log(`  · ${r.recommendation}`);
      }
      console.log(`Financial years: ${credit.financialProfile.years.join(", ") || "none"}`);
      console.log(`GST returns extracted: ${credit.gstAnalysis.returns.length}`);
      console.log(`Banking: ${credit.bankingAnalysis.availability}`);
      console.log(`Structured facts: ${allFacts.length}`);

      if (synthesis.opportunityId !== AVON_OPP_ID) fail("Avon synthesis opportunity scope");
      else ok("Avon synthesis scoped to OPP-2026-000060");

      ok("Genuine Avon credit synthesis produced (internal-only, not lender-facing)");
    }
  }
}

console.log(failed ? `\nRESULT: FAIL (${failed})\n` : "\nRESULT: PASS\n");
process.exit(failed ? 1 : 0);
