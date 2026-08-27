/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-016 — Lender proposal intelligence verification.
 *
 * Usage:
 *   node --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-credit-intelligence-016-verify.mjs
 *   node --env-file=compass/.env.local --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-credit-intelligence-016-verify.mjs --avon
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
} = await import("../src/lib/chanakya-credit-intelligence/credit-intelligence-core.ts");
const {
  buildLenderProposalIntelligence,
  assertNoForbiddenLenderProposalLanguage,
  assertNoInternalMetadataInLenderText,
  detectLegacyProposalMarkers,
  shouldUseLenderProposalIntelligence,
} = await import("../src/lib/chanakya-credit-proposal/lender-proposal-intelligence-core.ts");
const {
  composeChanakyaCreditProposalDraft,
  composeLegacyChanakyaCreditProposalDraft,
} = await import("../src/lib/chanakya-credit-proposal/compose-proposal.ts");
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

function buildMinimalContextPack(credit, extra = {}) {
  return {
    opportunityId: "opp_016_fixture",
    opportunityNumber: "OPP-FIXTURE-016",
    productName: "Business Loan",
    loanAmount: 50_000_000,
    borrowerName: "Avon Appliances Private Ltd",
    employmentType: "self-employed-business",
    city: "Ahmedabad",
    companyName: "Avon Appliances Private Ltd",
    purpose: "Working capital",
    transactionType: "fresh",
    relationshipManagerName: "RM Test",
    lenderName: "Sample Bank",
    rmNote: null,
    stated: {
      statedTurnover: "120000000",
      statedBusinessVintage: "15 years",
      statedConstitution: "Private Limited",
      statedNatureOfBusiness: "Manufacturing",
    },
    documents: [{ name: "Audited BS.pdf", status: "active", typeRef: "financial", verified: false }],
    documentIntelligence: {
      documentsReviewed: 2,
      documentsWithBinary: 2,
      documentsWithReadableText: 2,
      documentsRequiringOcr: 0,
      documentsRequiringVision: 0,
      structuredFacts: credit.financialProfile.allFacts.map((f) => ({
        key: f.field,
        label: f.label,
        value: f.value,
        periodLabel: f.financialYear,
        provenance: {
          documentId: f.provenance.documentId,
          displayName: f.provenance.documentName,
          sectionOrTable: f.provenance.section,
          extractionMethod: f.provenance.extractionMethod,
          confidence: f.provenance.confidence,
        },
      })),
      crossDocumentComparisons: [],
      reads: [
        {
          documentId: "doc_bs",
          displayName: "Audited BS.pdf",
          typeRef: "financial",
          status: "content_read",
          textCharCount: 500,
        },
      ],
      limitations: [],
      capability: { note: "fixture" },
      visionProvider: { configured: false },
    },
    evidence: [],
    gaps: [],
    intelligence: {} ,
    productLenderIntelligence: {
      availability: "AVAILABLE",
      assignedLenders: [
        {
          lenderId: "l1",
          lenderName: "Sample Bank",
          programParameters: { maxTenureMonths: 120, maxLtvPercent: 75 },
        },
      ],
    },
    creditIntelligence: credit,
    ...extra,
  };
}

// --- Fixture lender proposal intelligence ---
{
  const bsText = `
AVON APPLIANCES PRIVATE LIMITED
Balance Sheet as at 31 March 2024
(Rs in '000)
Particulars Note 31 March 2024 31 March 2023
Total Assets 114,630 109,451
Revenue from operations 95,000 88,000
Profit After Tax 8,500 7,200
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
    opportunityId: "opp_016",
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
    opportunityId: "opp_016",
    structuredFacts: facts,
    crossDocumentComparisons: buildCrossDocumentComparisons(facts),
    reads: [
      {
        documentId: "doc_bs",
        opportunityId: "opp_016",
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

  const ctx = buildMinimalContextPack(credit);
  if (!shouldUseLenderProposalIntelligence(ctx)) {
    fail("016 fixture should use lender proposal intelligence path");
  } else ok("Intelligence path selected when credit intelligence present");

  const built = buildLenderProposalIntelligence(ctx);
  const fullText = built.sections.map((s) => s.body).join("\n");

  if (!assertNoForbiddenLenderProposalLanguage(fullText)) {
    fail("016 fixture contains forbidden lender language");
  } else ok("No forbidden approval/eligibility language in lender proposal");

  if (!assertNoInternalMetadataInLenderText(fullText)) {
    fail("016 fixture leaked internal implementation metadata");
  } else ok("No internal metadata in lender-facing text");

  if (detectLegacyProposalMarkers(fullText).length) {
    fail(`016 fixture still has legacy markers: ${detectLegacyProposalMarkers(fullText).join(", ")}`);
  } else ok("Legacy proposal markers absent from intelligence path");

  if (!fullText.includes("FY") && credit.financialProfile.years.length === 0) {
    ok("Financial years respect evidence limits in fixture");
  } else if (credit.financialProfile.years.some((y) => fullText.includes(y))) {
    ok("Multi-year financials surfaced in lender proposal");
  } else {
    fail("016 fixture missing financial year content");
  }

  if (fullText.toLowerCase().includes("internal recommendation")) {
    fail("016 leaked internal recommendations into lender draft");
  } else ok("Internal recommendations excluded from lender draft");

  if (built.internalProvenance.length === 0 && credit.financialProfile.allFacts.length > 0) {
    fail("016 internal provenance not captured");
  } else ok("Internal provenance captured for traceability");

  const draft = composeChanakyaCreditProposalDraft(ctx);
  if (detectLegacyProposalMarkers(draft.fullText).length) {
    fail("Composed draft still contains legacy markers");
  } else ok("composeChanakyaCreditProposalDraft uses intelligence path");

  const legacy = composeLegacyChanakyaCreditProposalDraft(ctx);
  if (detectLegacyProposalMarkers(legacy.fullText).length === 0) {
    fail("Legacy compose should retain legacy markers for comparison baseline");
  } else ok("Legacy compose baseline retains pre-016 markers for comparison");
}

// --- Preserve 015 verify ---
{
  const verify = spawnSync(
    process.execPath,
    [
      "--import",
      "./scripts/_bat-stub-server-only.mjs",
      "--import",
      "tsx",
      "scripts/co-chanakya-credit-intelligence-015-verify.mjs",
    ],
    { cwd: ROOT, stdio: "inherit", env: process.env },
  );
  if (verify.status !== 0) fail("015 verify regression");
  else ok("015 + 002–014 checks still PASS");
}

// --- Avon OPP-2026-000060 proposal comparison ---
if (RUN_AVON) {
  console.log("\n--- Avon OPP-2026-000060 lender proposal comparison (read-only BAT) ---\n");

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
    if (!token) fail("BAT login failed for Avon proposal");
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
        limitations: ["Avon proposal run — read-only BAT."],
      });

      const ctx = {
        opportunityId: AVON_OPP_ID,
        opportunityNumber: AVON_OPP_NO,
        productName:
          typeof oppSafe.productLabel === "string" ? oppSafe.productLabel : "Not Specified",
        loanAmount:
          typeof oppSafe.requestedAmount === "number" ? oppSafe.requestedAmount : 0,
        borrowerName:
          typeof oppSafe.companyName === "string"
            ? oppSafe.companyName
            : typeof oppSafe.primaryContactName === "string"
              ? oppSafe.primaryContactName
              : "Not Specified",
        employmentType:
          typeof oppSafe.employmentTypeCode === "string" ? oppSafe.employmentTypeCode : null,
        city: typeof oppSafe.cityLabel === "string" ? oppSafe.cityLabel : null,
        companyName: typeof oppSafe.companyName === "string" ? oppSafe.companyName : null,
        purpose: null,
        transactionType:
          typeof oppSafe.transactionType === "string" ? oppSafe.transactionType : null,
        relationshipManagerName:
          typeof oppSafe.relationshipManagerName === "string"
            ? oppSafe.relationshipManagerName
            : null,
        lenderName: null,
        rmNote: null,
        stated: {},
        documents: reads.map((r) => ({
          name: r.displayName,
          status: r.status,
          typeRef: r.typeRef,
          verified: false,
        })),
        documentIntelligence: {
          documentsReviewed: docs.length,
          documentsWithBinary: reads.filter((r) => r.hasBinary).length,
          documentsWithReadableText: reads.filter(
            (r) => r.status === "content_read" || r.status === "content_read_partial",
          ).length,
          documentsRequiringOcr: reads.filter((r) => r.status === "ocr_required").length,
          documentsRequiringVision: 0,
          structuredFacts: allFacts,
          crossDocumentComparisons: buildCrossDocumentComparisons(allFacts),
          reads,
          limitations: [],
          capability: { note: "avon bat" },
          visionProvider: { configured: false },
        },
        evidence: [],
        gaps: [],
        intelligence: {},
        productLenderIntelligence: { availability: "NOT_AVAILABLE" },
        creditIntelligence: credit,
      };

      const legacyDraft = composeLegacyChanakyaCreditProposalDraft(ctx);
      const newDraft = composeChanakyaCreditProposalDraft(ctx);

      const legacyMarkers = detectLegacyProposalMarkers(legacyDraft.fullText);
      const newMarkers = detectLegacyProposalMarkers(newDraft.fullText);

      console.log("\n--- Proposal delta (OPP-2026-000060) ---");
      console.log(`Legacy markers in old proposal: ${legacyMarkers.join(", ") || "none"}`);
      console.log(`Legacy markers in new proposal: ${newMarkers.join(", ") || "none"}`);
      console.log(`Financial years in credit intelligence: ${credit.financialProfile.years.join(", ") || "none"}`);
      console.log(`Structured facts: ${allFacts.length}`);
      console.log(`GST returns: ${credit.gstAnalysis.returns.length}`);
      console.log(`Banking: ${credit.bankingAnalysis.availability}`);
      console.log(`Metadata-only bank statements: ${metadataOnlyBanks}`);

      const newlyCaptured = [];
      if (credit.financialProfile.years.some((y) => newDraft.fullText.includes(y))) {
        newlyCaptured.push("Multi-year financial statement facts in proposal body");
      }
      if (credit.gstAnalysis.returns.length && newDraft.fullText.toLowerCase().includes("gst")) {
        newlyCaptured.push("GST return evidence and comparison language");
      }
      if (
        newDraft.fullText.includes("Primary source documents") ||
        newDraft.fullText.includes("Documents contributing evidence")
      ) {
        newlyCaptured.push("Document evidence summary in evidence notes section");
      }
      if (newDraft.fullText.includes("Missing / Pending Information") || newDraft.fullText.includes("Outstanding verification")) {
        newlyCaptured.push("Missing / pending information section");
      }
      if (newDraft.fullText.includes("Mitigants") || newDraft.sections.some((s) => s.id === "mitigants")) {
        newlyCaptured.push("Credit mitigants from synthesis (dedicated section)");
      }

      const corrected = [];
      if (legacyMarkers.length && newMarkers.length < legacyMarkers.length) {
        corrected.push("Removed legacy platform/phase wording from lender-facing text");
      }
      if (
        legacyDraft.fullText.includes("engine SSOT pending") &&
        !newDraft.fullText.includes("engine SSOT pending")
      ) {
        corrected.push("Banking/ratio limitations stated in professional document-review language");
      }

      const removed = [];
      if (
        legacyDraft.fullText.includes("Document inventory reflects presence") &&
        !newDraft.fullText.includes("Document inventory reflects presence")
      ) {
        removed.push("Full document inventory dump (replaced with evidence summary)");
      }
      if (
        legacyDraft.fullText.includes("Structured financial extraction and ratio engines are **not** available yet") &&
        !newDraft.fullText.includes("Structured financial extraction and ratio engines are **not** available yet")
      ) {
        removed.push("Outdated 'extraction not available' narrative despite extracted financials");
      }
      if (legacyDraft.fullText.includes("see CHANAKYA internal recommendations")) {
        removed.push("Internal recommendation references (not in new lender draft)");
      }

      const remainingGaps = [];
      if (credit.bankingAnalysis.availability === "NOT_AVAILABLE") {
        remainingGaps.push("Readable bank statement transaction analysis");
      }
      if (ctx.documentIntelligence.documentsRequiringOcr > 0) {
        remainingGaps.push(`${ctx.documentIntelligence.documentsRequiringOcr} OCR-required scanned documents`);
      }
      if (metadataOnlyBanks > 0) {
        remainingGaps.push(`${metadataOnlyBanks} metadata-only bank statements`);
      }
      if (!ctx.purpose) {
        remainingGaps.push("Loan purpose not captured on Opportunity");
      }

      console.log("\nNewly captured:");
      for (const item of newlyCaptured) console.log(`  + ${item}`);
      console.log("\nCorrected:");
      for (const item of corrected) console.log(`  ~ ${item}`);
      console.log("\nRemoved (unreliable / internal):");
      for (const item of removed) console.log(`  - ${item}`);
      console.log("\nRemaining gaps:");
      for (const item of remainingGaps) console.log(`  · ${item}`);

      if (!assertNoForbiddenLenderProposalLanguage(newDraft.fullText)) {
        fail("Avon proposal contains forbidden lender language");
      } else ok("Avon lender proposal passes forbidden-language gate");

      if (!assertNoInternalMetadataInLenderText(newDraft.fullText)) {
        fail("Avon proposal leaked internal metadata");
      } else ok("Avon lender proposal has no internal metadata leak");

      if (newMarkers.length) {
        fail(`Avon new proposal still has legacy markers: ${newMarkers.join(", ")}`);
      } else ok("Avon new proposal free of legacy markers");

      if (newDraft.opportunityId !== AVON_OPP_ID) fail("Avon proposal opportunity scope");
      else ok("Avon proposal scoped to OPP-2026-000060");
    }
  }
}

console.log(failed ? `\nRESULT: FAIL (${failed})\n` : "\nRESULT: PASS\n");
process.exit(failed ? 1 : 0);
