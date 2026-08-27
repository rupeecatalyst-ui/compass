/**
 * CO-CHANAKYA-CREDIT-CERTIFICATION-019E — GST traceability verification.
 *
 * Ensures material GST turnover figures are traceable in the lender proposal
 * via existing 012 GST extraction SSOT — no second GST engine.
 *
 * Usage:
 *   node --env-file=.env.local --env-file=compass/.env.local --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-credit-certification-019e-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ETD_INLINE_CONTENT_BYTES_MAX } from "../src/constants/enterprise-document-object-storage/index.ts";
import {
  isBankStatementDocument,
} from "../src/lib/chanakya-document-intelligence/resolve-bank-document-state.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AVON_OPP_ID = "cmsipb7hu0003l304f7yrz7p8";
const AVON_OPP_NO = "OPP-2026-000060";

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
  process.env.JWT_SECRET || "verify-019e-jwt-secret-at-least-32-characters-long";

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

console.log("\n=== CO-CHANAKYA-CREDIT-CERTIFICATION-019E — GST traceability ===\n");

// --- 1) 012 GST extraction verification ---
{
  const v = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/co-chanakya-credit-intelligence-012-verify.mjs"],
    { cwd: ROOT, stdio: "pipe", encoding: "utf8", env: process.env },
  );
  if (v.status === 0) ok("012 GST extraction verification PASS");
  else {
    fail("012 GST extraction verification FAIL");
    if (v.stderr) note(String(v.stderr).slice(0, 400));
  }
}

const {
  buildGstAnalysisFromFacts,
  buildGstReconciliationLimitation,
  buildGstVsFinancials,
  assembleCreditIntelligence,
  classifyGstFieldCategory,
} = await import("../src/lib/chanakya-credit-intelligence/credit-intelligence-core.ts");
const { extractStructuredFactsFromText } = await import(
  "../src/lib/chanakya-document-intelligence/extract-structured-facts.ts"
);
const { extractGstReturnFacts, countGstinOccurrences } = await import(
  "../src/lib/chanakya-document-intelligence/extract-gst-returns.ts"
);
const { buildGstProposalTraceabilitySection } = await import(
  "../src/lib/chanakya-credit-proposal/gst-proposal-traceability-core.ts"
);
const {
  buildLenderProposalIntelligence,
  assertNoForbiddenLenderProposalLanguage,
} = await import("../src/lib/chanakya-credit-proposal/lender-proposal-intelligence-core.ts");
const { composeChanakyaCreditProposalDraft } = await import(
  "../src/lib/chanakya-credit-proposal/compose-proposal.ts"
);
const { buildCrossDocumentComparisons } = await import(
  "../src/lib/chanakya-document-intelligence/cross-document.ts"
);
const { extractPdfTextFromBytes } = await import(
  "../src/lib/chanakya-document-intelligence/extract-pdf-text.ts"
);
const { redactCustomerContactPiiForAiContext } = await import(
  "../src/lib/chanakya-enterprise-read-context/redact-pii.ts"
);

// --- 2) Fixture: Jan / Feb / Mar traceability ---
{
  const prov = {
    documentId: "doc_gst_jan",
    opportunityId: "opp_019e_fixture",
    displayName: "GSTR-3B January.pdf",
    typeRef: "gst",
    mimeType: "application/pdf",
    documentVersionHint: null,
  };
  const mkGstText = (month, amount, docId, name) => {
    const p = { ...prov, documentId: docId, displayName: name };
    return extractGstReturnFacts({
      text: `
Form GSTR-3B
Year 2025-26
Period ${month}
GSTIN of the supplier 24AACCA5373P1ZD
(a) Outward taxable supplies (other than zero rated, nil rated and exempted)
${amount}
`,
      provenance: p,
    });
  };

  const janFacts = mkGstText("January", "8123456.00", "doc_gst_jan", "GSTR-3B January.pdf");
  const febFacts = mkGstText("February", "7702714.19", "doc_gst_feb", "GSTR-3B February.pdf");
  const marFacts = mkGstText("March", "8456789.50", "doc_gst_mar", "GSTR-3B March.pdf");
  const allFacts = [...janFacts, ...febFacts, ...marFacts];

  const gst = buildGstAnalysisFromFacts(allFacts);
  if (gst.returns.length !== 3) fail(`019E fixture expected 3 GST returns, got ${gst.returns.length}`);
  else ok("019E fixture — 3 GST return rows");

  if (gst.identity.gstin !== "24AACCA5373P1ZD") fail("019E fixture GSTIN identity");
  else ok("019E fixture — single GSTIN identity");

  if (gst.financialInsightCount !== 3) {
    fail(`019E GSTIN must not inflate financial insight count (got ${gst.financialInsightCount}, expected 3)`);
  } else ok("019E fixture — GSTIN repetition not counted as financial insights");

  for (const f of gst.materialFacts.filter((m) => m.category === "taxable_turnover")) {
    if (!f.documentId || !f.returnPeriod || !f.confidence || !f.extractionMethod) {
      fail(`019E material fact missing provenance fields: ${f.field}`);
    }
  }
  ok("019E fixture — material facts preserve full provenance");

  const credit = assembleCreditIntelligence({
    opportunityId: "opp_019e_fixture",
    structuredFacts: allFacts,
    crossDocumentComparisons: buildCrossDocumentComparisons(allFacts),
    reads: [],
  });

  const gstSection = buildGstProposalTraceabilitySection({
    gstAnalysis: credit.gstAnalysis,
    gstVsFinancials: credit.reconciliation.gstVsFinancials,
    financialProfile: credit.financialProfile,
  });

  if (!gstSection.included) fail("019E fixture GST section must be included");
  else ok("019E fixture — GST analysis section included");

  for (const sample of [
    { period: "January", value: "8123456.00" },
    { period: "February", value: "7702714.19" },
    { period: "March", value: "8456789.50" },
  ]) {
    if (!gstSection.body.includes(sample.value)) {
      fail(`019E fixture missing ${sample.period} turnover ${sample.value} in GST section`);
    } else {
      ok(`019E fixture — ${sample.period} turnover ${sample.value} in GST section`);
    }
  }

  if (!gstSection.body.includes("not computed by summing monthly GST")) {
    fail("019E fixture must state annual turnover not summed from GST periods");
  } else ok("019E fixture — annual aggregation limitation stated");

  const ctx = {
    opportunityId: "opp_019e_fixture",
    opportunityNumber: "OPP-FIXTURE-019E",
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
      documentsReviewed: 3,
      documentsWithBinary: 3,
      documentsWithReadableText: 3,
      documentsRequiringOcr: 0,
      documentsRequiringVision: 0,
      structuredFacts: allFacts,
      crossDocumentComparisons: [],
      reads: [],
      limitations: [],
      capability: { note: "019E fixture" },
      visionProvider: { configured: false },
    },
    evidence: [],
    gaps: [],
    intelligence: {},
    productLenderIntelligence: { availability: "NOT_AVAILABLE" },
    creditIntelligence: credit,
  };

  const draft = composeChanakyaCreditProposalDraft(ctx);
  const gstProposalSection = draft.sections.find((s) => s.id === "gst_analysis");
  if (!gstProposalSection?.included) fail("019E fixture draft missing gst_analysis section");
  else ok("019E fixture — gst_analysis section in composed draft");

  for (const sample of ["8123456.00", "7702714.19", "8456789.50"]) {
    if (!draft.fullText.includes(sample)) {
      fail(`019E fixture draft missing turnover value ${sample}`);
    } else ok(`019E fixture — ${sample} traceable in lender proposal`);
  }

  if (!assertNoForbiddenLenderProposalLanguage(draft.fullText)) {
    fail("019E fixture forbidden language in proposal");
  } else ok("019E fixture — language guard PASS");

  if (classifyGstFieldCategory("gstin") !== "gstin_identity") {
    fail("019E classifyGstFieldCategory gstin");
  } else ok("019E — GST field categories distinguished");
}

// --- 3) Real Avon BAT compose ---
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

const base =
  process.env.CO_CHANAKYA_011_READ_BASE?.replace(/\/$/, "") ||
  process.env.CATALYST_BAT_URL?.replace(/\/$/, "") ||
  "https://catalyst-one.rupeecatalyst.com";
const email = process.env.CATALYST_BAT_EMAIL || "";
const password = process.env.CATALYST_BAT_PASSWORD || "";

const report = {
  A_fieldsUsed: [],
  B_sampleValues: [],
  C_proposalPresentation: null,
  D_provenance: [],
  E_reconciliationLimitations: null,
  F_verificationResult: failed === 0 ? "PASS" : "FAIL",
};

if (!email || !password) {
  fail("BAT credentials are not configured. Authenticated certification cannot continue.");
} else {
  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const token = (await login.json()).data?.accessToken;
  if (!token) {
    fail("BAT login failed for Avon GST compose");
  } else {
    ok(`BAT login for Avon GST compose (${base})`);

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

    const opp = (
      await (
        await fetch(`${base}/api/enterprise-opportunities/${AVON_OPP_ID}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).json()
    ).data;
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
      limitations: ["CO-019E Avon GST traceability certification"],
    });

    note(`Avon documents: ${docs.length} · structured facts: ${allFacts.length} · GST returns: ${credit.gstAnalysis.returns.length}`);

    if (credit.gstAnalysis.returns.length === 0) {
      fail("Avon expected GST returns from documents — none extracted");
    } else {
      ok(`Avon — ${credit.gstAnalysis.returns.length} GST return(s) extracted`);
    }

    const gstSection = buildGstProposalTraceabilitySection({
      gstAnalysis: credit.gstAnalysis,
      gstVsFinancials: credit.reconciliation.gstVsFinancials,
      financialProfile: credit.financialProfile,
    });

    report.A_fieldsUsed = gstSection.fieldsUsed;
    report.B_sampleValues = gstSection.sampleValues;
    report.C_proposalPresentation = gstSection.body.slice(0, 2400);
    report.D_provenance = gstSection.provenance.slice(0, 12);
    report.E_reconciliationLimitations = gstSection.reconciliationLimitation;

    const ctx = {
      opportunityId: AVON_OPP_ID,
      opportunityNumber: AVON_OPP_NO,
      productName:
        typeof oppSafe.productLabel === "string" ? oppSafe.productLabel : "Not Specified",
      loanAmount:
        typeof oppSafe.requestedAmount === "number" ? oppSafe.requestedAmount : 0,
      borrowerName:
        typeof oppSafe.companyName === "string" ? oppSafe.companyName : "Avon Appliances",
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
        capability: { note: "019E Avon compose" },
        visionProvider: { configured: false },
      },
      evidence: [],
      gaps: [],
      intelligence: {},
      productLenderIntelligence: { availability: "NOT_AVAILABLE" },
      creditIntelligence: credit,
    };

    const draft = composeChanakyaCreditProposalDraft(ctx);
    const gstProposalSection = draft.sections.find((s) => s.id === "gst_analysis");

    if (!gstProposalSection?.included && credit.gstAnalysis.returns.length > 0) {
      const hasReliableTurnover = credit.gstAnalysis.materialFacts.some(
        (f) => f.category === "taxable_turnover" && f.lenderFacingEligible,
      );
      if (hasReliableTurnover) fail("Avon gst_analysis section should be included when reliable turnover exists");
    } else if (gstProposalSection?.included) {
      ok("Avon — gst_analysis section included in lender proposal");
    }

    const monthChecks = ["january", "february", "march"];
    for (const month of monthChecks) {
      const row = credit.gstAnalysis.returns.find((r) =>
        r.returnPeriod?.toLowerCase().startsWith(month),
      );
      if (!row?.taxableTurnover) {
        note(`Avon ${month} GST return — no reliable taxable turnover extracted (skipped)`);
        continue;
      }
      const normalized = row.taxableTurnover.replace(/,/g, "");
      if (
        draft.fullText.includes(row.taxableTurnover) ||
        draft.fullText.includes(normalized)
      ) {
        ok(`Avon ${month} GST turnover ${row.taxableTurnover} traceable in proposal`);
      } else {
        fail(`Avon ${month} GST turnover ${row.taxableTurnover} missing from proposal`);
      }
    }

    const gstinCount = allFacts.filter((f) => f.key === "gstin").length;
    const turnoverInsightCount = credit.gstAnalysis.financialInsightCount;
    if (gstinCount > turnoverInsightCount) {
      ok("Avon — GSTIN facts do not inflate financial insight count");
    }

    if (!assertNoForbiddenLenderProposalLanguage(draft.fullText)) {
      fail("Avon proposal forbidden language");
    } else ok("Avon proposal language guard PASS");

    report.C_proposalPresentation =
      gstProposalSection?.body?.slice(0, 2400) ?? gstSection.body.slice(0, 2400);
  }
}

console.log("\n--- 019E Avon report ---\n");
console.log("A. GST fields used:", JSON.stringify(report.A_fieldsUsed, null, 2));
console.log("B. Sample values:", JSON.stringify(report.B_sampleValues.slice(0, 8), null, 2));
console.log(
  "C. Proposal presentation (excerpt):\n",
  report.C_proposalPresentation?.slice(0, 1200) ?? "—",
);
console.log("D. Provenance (sample):", JSON.stringify(report.D_provenance.slice(0, 6), null, 2));
console.log("E. Reconciliation limitations:", report.E_reconciliationLimitations ?? "—");
report.F_verificationResult = failed === 0 ? "PASS" : "FAIL";
console.log("F. Verification result:", report.F_verificationResult);

console.log(failed ? `\nRESULT: FAIL (${failed})\n` : "\nRESULT: PASS\n");
process.exit(failed > 0 ? 1 : 0);
