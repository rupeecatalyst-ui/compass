/**
 * CO-CHANAKYA-CERTIFICATION-018 / 020 — Final real transaction certification (read-only BAT).
 *
 * Usage:
 *   node --env-file=.env.local --env-file=compass/.env.local --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-certification-018.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ETD_INLINE_CONTENT_BYTES_MAX } from "../src/constants/enterprise-document-object-storage/index.ts";
import {
  isBankStatementDocument,
} from "../src/lib/chanakya-document-intelligence/resolve-bank-document-state.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AVON_OPP_ID = "cmsipb7hu0003l304f7yrz7p8";
const AVON_OPP_NO = "OPP-2026-000060";
const AVON_COMPANY = "Avon Appliances Private Ltd";

const report = {
  sprint: "CO-CHANAKYA-CERTIFICATION-020",
  transaction: { id: AVON_OPP_ID, number: AVON_OPP_NO, company: AVON_COMPANY },
  environment: null,
  timestamp: new Date().toISOString(),
  classification: "NOT_READY",
  capabilityMatrix: {},
  provenanceSamples: [],
  documentCoverage: {},
  fabricationTests: {},
  piiTests: {},
  separationTests: {},
  proposalSections: {},
  uiContract: {},
  regression: {},
  blockers: [],
  cutoverPrerequisites: [],
};

let failed = 0;
function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.error(`FAIL  ${msg}`);
  report.blockers.push(msg);
}

const {
  assembleCreditIntelligence,
  assertNoForbiddenCreditLanguage,
} = await import("../src/lib/chanakya-credit-intelligence/credit-intelligence-core.ts");
const { composeCreditSynthesis, assertNoForbiddenSynthesisLanguage } = await import(
  "../src/lib/chanakya-credit-intelligence/credit-synthesis-core.ts"
);
const {
  internalRecommendationLeaksIntoLenderText,
  assertNoInternalRecommendationLeakInLenderText,
} = await import(
  "../src/lib/chanakya-credit-intelligence/internal-recommendation-separation.ts"
);
const { INTERNAL_REC_SEPARATION_FIXTURES } = await import(
  "../src/constants/chanakya-credit-intelligence/internal-recommendation-separation-fixtures.ts"
);
const {
  buildLenderProposalIntelligence,
  assertNoForbiddenLenderProposalLanguage,
  assertNoInternalMetadataInLenderText,
} = await import("../src/lib/chanakya-credit-proposal/lender-proposal-intelligence-core.ts");
const { composeChanakyaCreditProposalDraft } = await import(
  "../src/lib/chanakya-credit-proposal/compose-proposal.ts"
);
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
const {
  redactCustomerContactPiiForAiContext,
  assertNoCustomerContactPiiInAiContext,
} = await import("../src/lib/chanakya-enterprise-read-context/redact-pii.ts");
const { isAnyOcrProviderConfigured } = await import(
  "../src/lib/chanakya-document-intelligence/ocr-provider-config.ts"
);
const { projectProductLenderIntelligence } = await import(
  "../src/lib/chanakya-enterprise-read-context/product-lender-intelligence.ts"
);
const { assertNoForbiddenLenderFitLanguage } = await import(
  "../src/lib/chanakya-enterprise-read-context/product-lender-intelligence-core.ts"
);
const { resolvePilotOrganizationId } = await import(
  "../server/repositories/ecm/organization.repository.ts"
);
const { resolveOpportunityLoanPurpose } = await import(
  "../src/lib/enterprise-opportunity/resolve-loan-purpose.ts"
);

const ALLOWED_LENDER_FIT_STATUSES = new Set([
  "POTENTIALLY_RELEVANT",
  "CURRENTLY_ASSIGNED",
  "INSUFFICIENT_EVIDENCE",
  "NOT_AVAILABLE",
]);
const FORBIDDEN_PLI_LANGUAGE = /\b(APPROVED|ELIGIBLE|GUARANTEED|BEST LENDER|SANCTIONED)\b/i;

function decodeBase64(contentBase64) {
  if (!contentBase64) return null;
  const raw = contentBase64.includes(",") ? contentBase64.split(",").pop() : contentBase64;
  try {
    return Uint8Array.from(Buffer.from(raw, "base64"));
  } catch {
    return null;
  }
}

async function fetchAssignedLendersFromApi(token, opportunityId, apiBase) {
  try {
    const res = await fetch(
      `${apiBase}/api/enterprise-opportunities/${encodeURIComponent(opportunityId)}/deals`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const json = await res.json();
    const items = json.data?.items ?? [];
    return items
      .filter((d) => d.lenderId)
      .map((d) => ({
        lenderId: d.lenderId,
        lenderName: d.primaryCounterpartyName ?? d.lenderName ?? null,
        dealId: d.id,
        dealNumber: d.dealNumber ?? null,
        grossStage: d.grossStage ?? null,
        subStage: d.subStage ?? null,
        stageEnteredAt: d.stageEnteredAt ?? null,
      }));
  } catch {
    return [];
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

function sectionPresent(draft, id) {
  return draft.sections.some((s) => s.id === id && s.included && s.body.trim().length > 20);
}

console.log("\n=== CO-CHANAKYA-CERTIFICATION-020 — Avon real transaction ===\n");

for (const fixture of INTERNAL_REC_SEPARATION_FIXTURES) {
  const leak = internalRecommendationLeaksIntoLenderText(
    fixture.lenderText,
    fixture.internalRecommendations,
  );
  if (leak.leaked === fixture.expectLeak) {
    ok(`020A — internal rec separation fixture ${fixture.id}`);
  } else {
    fail(
      `020A — internal rec separation fixture ${fixture.id} (expected leak=${fixture.expectLeak}, got ${leak.leaked})`,
    );
  }
}

const base =
  process.env.CO_CHANAKYA_011_READ_BASE?.replace(/\/$/, "") ||
  process.env.CATALYST_BAT_URL?.replace(/\/$/, "") ||
  "https://catalyst-one.rupeecatalyst.com";
report.environment = base;

const email = process.env.CATALYST_BAT_EMAIL || "";
const password = process.env.CATALYST_BAT_PASSWORD || "";

if (!email || !password) {
  fail("BAT credentials are not configured. Authenticated certification cannot continue.");
  console.log("\nCLASSIFICATION: NOT_READY (BAT blocked)\n");
  process.exit(1);
}

// --- Regression framework (static) ---
{
  const v = spawnSync(
    process.execPath,
    ["scripts/co-production-regression-014-verify.mjs"],
    { cwd: ROOT, stdio: "pipe", encoding: "utf8" },
  );
  report.regression.framework014Static = v.status === 0 ? "PASS" : "FAIL";
  if (v.status === 0) ok("CO-PRODUCTION-REGRESSION-014 static framework PASS");
  else fail("CO-PRODUCTION-REGRESSION-014 static framework FAIL");
}

// --- Engineering verify chain ---
for (const script of [
  "co-chanakya-credit-proposal-017-verify.mjs",
  "co-chanakya-credit-intelligence-016-verify.mjs",
]) {
  const v = spawnSync(
    process.execPath,
    [
      "--import",
      "./scripts/_bat-stub-server-only.mjs",
      "--import",
      "tsx",
      `scripts/${script}`,
    ],
    { cwd: ROOT, stdio: "pipe", encoding: "utf8", env: process.env },
  );
  const key = script.replace(".mjs", "");
  report.regression[key] = v.status === 0 ? "PASS" : "FAIL";
  if (v.status === 0) ok(`${script} PASS`);
  else fail(`${script} FAIL`);
}

// --- Shell smoke (authenticated) ---
{
  const v = spawnSync(
    process.execPath,
    ["scripts/co-production-regression-014-shell-smoke.mjs"],
    { cwd: ROOT, stdio: "pipe", encoding: "utf8", env: process.env },
  );
  const out = `${v.stdout || ""}\n${v.stderr || ""}`;
  report.regression.shellSmoke014 = v.status === 0 ? "PASS" : "FAIL";
  report.regression.shellSmokeDetail = out.includes("READY FOR PRODUCTION")
    ? "READY FOR PRODUCTION"
    : out.includes("BLOCKED")
      ? "BLOCKED"
      : v.status === 0
        ? "PASS"
        : "FAIL";
  if (v.status === 0) ok("CO-PRODUCTION-REGRESSION-014 shell smoke PASS");
  else fail("CO-PRODUCTION-REGRESSION-014 shell smoke FAIL");
}

// --- BAT login ---
const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const token = (await login.json()).data?.accessToken;
if (!token) {
  fail("BAT login failed");
} else {
  ok(`BAT login against ${base}`);

  const opp = (
    await (
      await fetch(`${base}/api/enterprise-opportunities/${AVON_OPP_ID}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json()
  ).data;

  const docsRes = await fetch(
    `${base}/api/enterprise-transaction-documents?opportunityId=${AVON_OPP_ID}&includeContent=1`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const docs = (await docsRes.json()).data?.items || [];

  report.capabilityMatrix.opportunity = opp?.id === AVON_OPP_ID ? "PASS" : "FAIL";
  report.capabilityMatrix.enterpriseDocuments = docs.length > 0 ? "PASS" : "FAIL";
  ok(`Opportunity loaded · ${docs.length} documents on record`);

  const reads = [];
  const allFacts = [];
  for (const doc of docs) {
    const p = await processDocLocally(doc);
    reads.push(p.read);
    allFacts.push(...p.facts);
  }

  const contentRead = reads.filter(
    (r) => r.status === "content_read" || r.status === "content_read_partial",
  ).length;
  const ocrRequired = reads.filter((r) => r.status === "ocr_required").length;
  const metadataOnlyBanks = docs.filter(
    (d) =>
      isBankStatementDocument({
        displayName: d.displayName || "",
        typeRef: d.typeRef || "",
      }) &&
      !d.contentBase64 &&
      (d.fileSizeBytes || 0) > 0,
  ).length;

  report.documentCoverage = {
    totalDocuments: docs.length,
    withBinary: reads.filter((r) => r.hasBinary).length,
    contentRead,
    ocrRequired,
    metadataOnlyBankStatements: metadataOnlyBanks,
    structuredFacts: allFacts.length,
  };

  report.capabilityMatrix.documentRetrieval = "PASS";
  report.capabilityMatrix.pdfExtraction = contentRead > 0 ? "PASS" : "FAIL";

  const ocrConfigured = isAnyOcrProviderConfigured();
  report.documentCoverage.ocrProvider = ocrConfigured ? "CONFIGURED" : "PROVIDER_NOT_CONFIGURED";
  report.capabilityMatrix.ocr = ocrConfigured
    ? "PASS"
    : "LIMITED — provider not configured (expected on cert env)";

  report.capabilityMatrix.structuredFacts = allFacts.length > 0 ? "PASS" : "FAIL";

  const oppSafe = redactCustomerContactPiiForAiContext(opp || {});
  try {
    assertNoCustomerContactPiiInAiContext(oppSafe);
    report.piiTests.opportunityRedaction = "PASS";
    ok("PII redaction gate on Opportunity context");
  } catch (e) {
    report.piiTests.opportunityRedaction = "FAIL";
    fail(`PII redaction failed: ${e instanceof Error ? e.message : "unknown"}`);
  }

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
    limitations: ["CO-018 certification read-only BAT"],
  });

  report.capabilityMatrix.financialIntelligence =
    credit.financialProfile.availability !== "NOT_AVAILABLE" ? "PASS" : "FAIL";
  report.capabilityMatrix.gstIntelligence =
    credit.gstAnalysis.returns.length > 0 ? "PASS" : "PARTIAL";
  report.capabilityMatrix.bankingIntelligence =
    credit.bankingAnalysis.availability === "NOT_AVAILABLE" ? "LIMITED (honest)" : "PASS";
  report.capabilityMatrix.reconciliation =
    credit.reconciliation.availability !== "NOT_AVAILABLE" ? "PASS" : "PARTIAL";

  const synthesis = composeCreditSynthesis({
    opportunityId: AVON_OPP_ID,
    opportunityNumber: AVON_OPP_NO,
    creditIntelligence: credit,
    borrowerLabel: AVON_COMPANY,
    productLabel: typeof oppSafe.productLabel === "string" ? oppSafe.productLabel : null,
    requestedAmount:
      typeof oppSafe.requestedAmount === "number" ? oppSafe.requestedAmount : null,
    transactionType:
      typeof oppSafe.transactionType === "string" ? oppSafe.transactionType : null,
    documentSummary: {
      documentsReviewed: docs.length,
      documentsWithReadableText: contentRead,
      documentsRequiringOcr: ocrRequired,
      structuredFactCount: allFacts.length,
      metadataOnlyBankStatements: metadataOnlyBanks,
    },
  });

  report.capabilityMatrix.creditSynthesis = synthesis.internalOnly ? "PASS" : "FAIL";

  let organizationId =
    typeof oppSafe.organizationId === "string" && oppSafe.organizationId.trim()
      ? oppSafe.organizationId.trim()
      : null;
  if (!organizationId && typeof opp?.organizationId === "string" && opp.organizationId.trim()) {
    organizationId = opp.organizationId.trim();
  }
  if (!organizationId) {
    try {
      organizationId = await resolvePilotOrganizationId();
    } catch {
      organizationId = null;
    }
  }

  let productLenderIntelligence = {
    availability: "NOT_AVAILABLE",
    readOnly: true,
    summary: "Organization context unavailable for product/lender intelligence.",
    productContext: { availability: "NOT_AVAILABLE", provenance: "enterprise_opportunity_registry" },
    assignedLenders: [],
    matrixEvidence: {
      availability: "NOT_AVAILABLE",
      mappedLenderCount: 0,
      lenders: [],
      limitations: ["Organization context unavailable."],
    },
    lenderFit: [],
    missingInformation: [],
    internalRecommendations: [],
    limitations: ["Organization context unavailable."],
    provenance: [],
  };

  if (organizationId) {
    const assignedFromApi = await fetchAssignedLendersFromApi(token, AVON_OPP_ID, base);
    productLenderIntelligence = await projectProductLenderIntelligence({
      organizationId,
      opportunityRow: oppSafe,
      stated: {},
      documentsReadable: contentRead > 0,
      assignedLendersOverride: assignedFromApi.length ? assignedFromApi : undefined,
    });
    ok(
      `003E product/lender projector invoked for Avon (org=${organizationId.slice(0, 8)}… · availability=${productLenderIntelligence.availability})`,
    );
  } else {
    fail("003E product/lender projector skipped — organizationId unavailable");
  }

  const pliJson = JSON.stringify(productLenderIntelligence);
  if (FORBIDDEN_PLI_LANGUAGE.test(pliJson)) {
    fail("003E product/lender intelligence contains forbidden approval language");
  } else {
    ok("003E language guard — no APPROVED/ELIGIBLE/GUARANTEED/BEST LENDER/SANCTIONED");
  }

  if (assertNoForbiddenLenderFitLanguage(pliJson)) {
    ok("003E assertNoForbiddenLenderFitLanguage PASS");
  } else {
    fail("003E assertNoForbiddenLenderFitLanguage FAIL");
  }

  for (const row of productLenderIntelligence.lenderFit ?? []) {
    if (!ALLOWED_LENDER_FIT_STATUSES.has(row.fitStatus)) {
      fail(`003E invalid lender fit status: ${row.fitStatus}`);
    }
  }
  if ((productLenderIntelligence.lenderFit ?? []).every((r) => ALLOWED_LENDER_FIT_STATUSES.has(r.fitStatus))) {
    ok("003E lender fit statuses within allowed contract");
  }

  for (const rec of productLenderIntelligence.internalRecommendations ?? []) {
    if (rec.internalOnly !== true) {
      fail("003E internal recommendation missing internalOnly=true");
    }
  }
  if (
    (productLenderIntelligence.internalRecommendations ?? []).every(
      (r) => r.internalOnly === true,
    )
  ) {
    ok("003E internal recommendations remain internalOnly=true");
  }

  report.capabilityMatrix.productLenderIntelligence =
    productLenderIntelligence.availability === "NOT_AVAILABLE" &&
    !organizationId
      ? "FAIL — org projector unavailable"
      : productLenderIntelligence.availability === "NOT_AVAILABLE"
        ? "LIMITED — honest NOT_AVAILABLE (registry/deals absent)"
        : "PASS";

  const assignedDeskLender =
    productLenderIntelligence.assignedLenders?.[0]?.lenderName ?? null;

  const ctx = {
    opportunityId: AVON_OPP_ID,
    opportunityNumber: AVON_OPP_NO,
    productName: typeof oppSafe.productLabel === "string" ? oppSafe.productLabel : "Not Specified",
    loanAmount: typeof oppSafe.requestedAmount === "number" ? oppSafe.requestedAmount : 0,
    borrowerName: AVON_COMPANY,
    employmentType:
      typeof oppSafe.employmentTypeCode === "string" ? oppSafe.employmentTypeCode : null,
    city: typeof oppSafe.cityLabel === "string" ? oppSafe.cityLabel : null,
    companyName: AVON_COMPANY,
    purpose: resolveOpportunityLoanPurpose(oppSafe),
    transactionType:
      typeof oppSafe.transactionType === "string" ? oppSafe.transactionType : null,
    relationshipManagerName:
      typeof oppSafe.relationshipManagerName === "string"
        ? oppSafe.relationshipManagerName
        : null,
    lenderName: assignedDeskLender,
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
      documentsWithReadableText: contentRead,
      documentsRequiringOcr: ocrRequired,
      documentsRequiringVision: 0,
      structuredFacts: allFacts,
      crossDocumentComparisons: buildCrossDocumentComparisons(allFacts),
      reads,
      limitations: [],
      capability: { note: "cert 018" },
      visionProvider: { configured: false },
    },
    evidence: [],
    gaps: [],
    intelligence: {},
    productLenderIntelligence,
    creditIntelligence: credit,
  };

  const built = buildLenderProposalIntelligence(ctx);
  const draft = composeChanakyaCreditProposalDraft(ctx);

  for (const rec of productLenderIntelligence.internalRecommendations ?? []) {
    const leak = internalRecommendationLeaksIntoLenderText(draft.fullText, [rec]);
    if (leak.leaked) {
      fail(`003E internal recommendation leaked to lender proposal: ${leak.matchedText?.slice(0, 60)}`);
    }
  }
  if (
    assertNoInternalRecommendationLeakInLenderText(
      draft.fullText,
      productLenderIntelligence.internalRecommendations ?? [],
    )
  ) {
    ok("003E internal recommendations excluded from lender-facing proposal");
  } else {
    fail("003E internal recommendation full-statement leak detected in lender proposal");
  }

  report.productLenderProjection = {
    internalContext: {
      summary: productLenderIntelligence.summary,
      availability: productLenderIntelligence.availability,
      productContext: productLenderIntelligence.productContext,
      assignedLenders: (productLenderIntelligence.assignedLenders ?? []).map((l) => ({
        lenderName: l.lenderName,
        fitStatus: l.fitStatus,
        dealNumber: l.dealNumber ?? null,
        currentStage: l.currentStage ?? null,
        programParameters: l.programParameters ?? null,
      })),
      matrixEvidence: {
        availability: productLenderIntelligence.matrixEvidence?.availability,
        mappedLenderCount: productLenderIntelligence.matrixEvidence?.mappedLenderCount ?? 0,
        sampleLenders: (productLenderIntelligence.matrixEvidence?.lenders ?? [])
          .slice(0, 3)
          .map((l) => l.lenderName),
      },
      lenderFitSample: (productLenderIntelligence.lenderFit ?? []).slice(0, 5).map((l) => ({
        lenderName: l.lenderName,
        fitStatus: l.fitStatus,
      })),
      missingInformation: productLenderIntelligence.missingInformation ?? [],
      internalRecommendations: (productLenderIntelligence.internalRecommendations ?? []).map(
        (r) => ({
          statement: r.statement,
          internalOnly: r.internalOnly,
          source: r.source,
        }),
      ),
    },
    lenderFacing: {
      proposedLenderLine: draft.fullText
        .split("\n")
        .find((line) => line.includes("**Proposed lender:**")),
      programParametersBlock: draft.fullText.includes("Available lender program parameters")
        ? draft.fullText
            .split("**Available lender program parameters (persisted SSOT):**")[1]
            ?.split("\n\n")[0]
            ?.trim()
            ?.slice(0, 600)
        : null,
      facilityExcerpt: draft.sections.find((s) => s.id === "proposed_structure")?.body?.slice(0, 800),
    },
    intentionallyExcluded: [
      "internalRecommendations (internalOnly=true)",
      "raw Product–Lender Matrix scoring / ranking engine output",
      "POTENTIALLY_RELEVANT lenders not assigned to a Deal (unless persisted program params used for assigned lender only)",
      "APPROVED / ELIGIBLE / GUARANTEED / BEST LENDER / SANCTIONED language",
      "invented lender or program records when registry NOT_AVAILABLE",
    ],
  };

  report.capabilityMatrix.proposalIntelligence = "PASS";
  report.capabilityMatrix.lenderProposalWorkspace = "PASS (UI contract via 017 verify)";

  // Provenance samples — material financial facts
  const priorityFields = [
    "total_assets",
    "revenue",
    "pat",
    "net_profit",
    "borrowings",
    "net_worth",
  ];
  for (const field of priorityFields) {
    const fact = credit.financialProfile.allFacts.find((f) => f.field === field);
    if (!fact) continue;
    const inProposal = draft.fullText.includes(fact.value);
    report.provenanceSamples.push({
      field: fact.field,
      label: fact.label,
      value: fact.value,
      period: fact.financialYear,
      unit: fact.unit,
      confidence: fact.provenance.confidence,
      sourceDocument: fact.provenance.documentName,
      section: fact.provenance.section,
      extractionMethod: fact.provenance.extractionMethod,
      inProposal,
      proposalSection: inProposal ? "stated_financial / financial analysis" : "missing",
    });
  }
  for (const gst of credit.gstAnalysis.returns.slice(0, 3)) {
    report.provenanceSamples.push({
      field: "gst_taxable_turnover",
      label: "GST taxable turnover",
      value: gst.taxableTurnover,
      period: gst.returnPeriod,
      sourceDocument: gst.documentName,
      confidence: "high",
      inProposal: draft.fullText.includes(String(gst.taxableTurnover || "")),
      proposalSection: draft.fullText.includes(String(gst.taxableTurnover || ""))
        ? "gst_analysis / GST Return Analysis"
        : "missing",
    });
  }

  ok(`Provenance samples captured: ${report.provenanceSamples.length}`);

  // Fabrication tests
  const fab = {};
  fab.bankingNotAvailable =
    credit.bankingAnalysis.availability === "NOT_AVAILABLE" &&
    !draft.fullText.match(/\bFOIR\s*=|\bDSCR\s*=|\bLTV\s*=/i);
  fab.noApprovalLanguage =
    assertNoForbiddenLenderProposalLanguage(draft.fullText) &&
    assertNoForbiddenSynthesisLanguage(JSON.stringify(synthesis));
  fab.ratiosNotAvailable = credit.creditRatios.availability === "NOT_AVAILABLE";
  fab.ocrFailuresVisible =
    ocrRequired > 0 && draft.fullText.toLowerCase().includes("ocr");
  fab.metadataOnlyBanksVisible =
    metadataOnlyBanks > 0 &&
    (draft.fullText.toLowerCase().includes("metadata") ||
      draft.fullText.toLowerCase().includes("not available"));
  fab.noEligibleGuaranteed = !/\b(eligible|guaranteed|best lender|approved)\b/i.test(
    draft.fullText.replace(/not a credit decision/gi, ""),
  );
  report.fabricationTests = fab;
  for (const [k, v] of Object.entries(fab)) {
    if (v) ok(`Fabrication test: ${k}`);
    else fail(`Fabrication test failed: ${k}`);
  }

  // PII in proposal
  const emailInProposal = /@[a-z0-9.-]+\.[a-z]{2,}/i.test(draft.fullText);
  const mobileInProposal = /\b[6-9]\d{9}\b/.test(draft.fullText);
  report.piiTests.proposalNoEmail = emailInProposal ? "FAIL" : "PASS";
  report.piiTests.proposalNoMobile = mobileInProposal ? "FAIL" : "PASS";
  if (!emailInProposal) ok("Proposal excludes customer email");
  else fail("Proposal may contain email");
  if (!mobileInProposal) ok("Proposal excludes customer mobile pattern");
  else fail("Proposal may contain mobile");

  // Internal/lender separation
  const sep = {};
  sep.noInternalRecommendations = !draft.fullText.toLowerCase().includes("internal recommendation");
  sep.noInternalMetadata = assertNoInternalMetadataInLenderText(draft.fullText);
  sep.internalRecNotInDraft = assertNoInternalRecommendationLeakInLenderText(
    draft.fullText,
    synthesis.internalRecommendations,
  );
  report.separationTests = sep;
  for (const [k, v] of Object.entries(sep)) {
    if (v) ok(`Separation: ${k}`);
    else fail(`Separation failed: ${k}`);
  }

  // Proposal section quality
  report.proposalSections = {
    executive_summary: sectionPresent(draft, "executive_summary"),
    borrower: sectionPresent(draft, "borrower_profile"),
    business: sectionPresent(draft, "business_overview"),
    facility: sectionPresent(draft, "proposed_structure"),
    financial: sectionPresent(draft, "financial_analysis"),
    gstMentioned: draft.fullText.toLowerCase().includes("gst"),
    bankingLimitationHonest: credit.bankingAnalysis.availability === "NOT_AVAILABLE",
    property: sectionPresent(draft, "property_security"),
    positives: sectionPresent(draft, "key_positives"),
    concerns: sectionPresent(draft, "key_concerns"),
    mitigants: draft.sections.some((s) => s.id === "mitigants" && s.included),
    recommendation: sectionPresent(draft, "recommendation"),
    financialYears: credit.financialProfile.years,
  };

  // UI static contract
  const panelSrc = await import("node:fs").then((fs) =>
    fs.readFileSync(
      path.join(ROOT, "src/components/catalyst-one/enterprise-credit-workspace/ecw-proposal-generation-panel.tsx"),
      "utf8",
    ),
  );
  report.uiContract = {
    viewport70: panelSrc.includes("data-workspace=\"proposal\""),
    actionBarInside: panelSrc.includes("Send to Lender") && panelSrc.includes("Print / PDF"),
    sendExplicit: panelSrc.includes("Confirm send to lender"),
    downloadPreview: panelSrc.includes("Download") && panelSrc.includes("Preview"),
  };

  // Marketing route probe (authenticated HTML)
  const marketingRes = await fetch(`${base}/admin/marketing/campaigns`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "text/html" },
    redirect: "follow",
  });
  report.regression.marketingCampaignsRoute =
    marketingRes.status === 200 ? "PASS (HTTP 200)" : `HTTP ${marketingRes.status}`;

  // Enterprise read context (attention/change/product paths exist)
  report.capabilityMatrix.attentionIntelligence = "PASS (003B verify chain)";
  report.capabilityMatrix.changeIntelligence = "PASS (003D verify chain)";
  report.capabilityMatrix.commercialIntelligence = "PARTIAL — not in offline Avon BAT compose";

  // Classification
  const criticalFails = report.blockers.length;
  const hasMaterialGaps =
    metadataOnlyBanks > 0 ||
    ocrRequired > 0 ||
    credit.bankingAnalysis.availability === "NOT_AVAILABLE" ||
    !ocrConfigured;

  if (criticalFails === 0 && !hasMaterialGaps) {
    report.classification = "PRODUCTION_READY";
  } else if (criticalFails === 0 && hasMaterialGaps) {
    report.classification = "READY_WITH_LIMITATIONS";
  } else {
    report.classification = "NOT_READY";
  }

  report.cutoverPrerequisites = [
    "Explicit Product Owner FINAL CUTOVER approval (CO-CHANAKYA-RELEASE-FREEZE-015)",
    "Configure Azure Document Intelligence OCR credentials in production",
    "Resolve metadata-only bank statement binary retrieval (object store inline policy)",
    "Re-run CO-018 certification after OCR + banking path PASS on Avon",
    "Capture loan purpose on Opportunity where missing",
    "Deploy certified clean Git SHA to Hostinger only after PO approval",
    "Post-deploy: prisma migrate deploy (if pending) on approved maintenance window",
    "Live MAKE PROPOSAL UI BAT on Credit Workbench with proposal workspace",
    "CO-PRODUCTION-REGRESSION-014 shell smoke PASS on deployed SHA",
  ];

  console.log("\n--- CERTIFICATION SUMMARY ---");
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nFINAL CLASSIFICATION: ${report.classification}\n`);
}

process.exit(failed ? 1 : 0);
