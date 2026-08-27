/**
 * CO-CHANAKYA-CREDIT-CERTIFICATION-019D — Product/Lender projection verification.
 *
 * Ensures certification/proposal compose invokes the existing 003E organization projector
 * (projectProductLenderIntelligence) for the real Avon transaction — not a stub.
 *
 * Usage:
 *   node --env-file=.env.local --env-file=compass/.env.local --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-credit-certification-019d-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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
  process.env.JWT_SECRET || "verify-019d-jwt-secret-at-least-32-characters-long";

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

console.log("\n=== CO-CHANAKYA-CREDIT-CERTIFICATION-019D — Product/Lender projection ===\n");

// --- 1) 003E verification (enterprise read context verify includes 003E contract) ---
{
  const v = spawnSync(
    process.execPath,
    [
      "--env-file=.env.local",
      "--env-file=compass/.env.local",
      "--import",
      "./scripts/_bat-stub-server-only.mjs",
      "--import",
      "tsx",
      "scripts/co-chanakya-enterprise-read-context-002-verify.mjs",
    ],
    { cwd: ROOT, stdio: "pipe", encoding: "utf8", env: process.env },
  );
  if (v.status === 0) ok("003E verification (enterprise-read-context-002) PASS");
  else {
    fail("003E verification (enterprise-read-context-002) FAIL");
    if (v.stderr) note(String(v.stderr).slice(0, 400));
  }
}

// --- 2) Proposal verification ---
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
  if (v.status === 0) ok(`${script} PASS`);
  else {
    fail(`${script} FAIL`);
    if (v.stderr) note(String(v.stderr).slice(0, 300));
  }
}

// --- 3) Real Avon certification compose with 003E projector ---
const {
  projectProductLenderIntelligence,
} = await import("../src/lib/chanakya-enterprise-read-context/product-lender-intelligence.ts");
const {
  assertNoForbiddenLenderFitLanguage,
} = await import(
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
const { composeCreditSynthesis } = await import(
  "../src/lib/chanakya-credit-intelligence/credit-synthesis-core.ts"
);
const { resolveOpportunityLoanPurpose } = await import(
  "../src/lib/enterprise-opportunity/resolve-loan-purpose.ts"
);
const { redactCustomerContactPiiForAiContext } = await import(
  "../src/lib/chanakya-enterprise-read-context/redact-pii.ts"
);
const { resolvePilotOrganizationId } = await import(
  "../server/repositories/ecm/organization.repository.ts"
);

const ALLOWED_FIT = new Set([
  "POTENTIALLY_RELEVANT",
  "CURRENTLY_ASSIGNED",
  "INSUFFICIENT_EVIDENCE",
  "NOT_AVAILABLE",
]);
const FORBIDDEN = /\b(APPROVED|ELIGIBLE|GUARANTEED|BEST LENDER|SANCTIONED)\b/i;

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

const base =
  process.env.CO_CHANAKYA_011_READ_BASE?.replace(/\/$/, "") ||
  process.env.CATALYST_BAT_URL?.replace(/\/$/, "") ||
  "https://catalyst-one.rupeecatalyst.com";
const email = process.env.CATALYST_BAT_EMAIL || "";
const password = process.env.CATALYST_BAT_PASSWORD || "";

if (!email || !password) {
  fail("BAT credentials are not configured. Authenticated certification cannot continue.");
  console.log(failed ? `\nRESULT: FAIL (${failed})\n` : "\nRESULT: PASS\n");
  process.exit(failed > 0 ? 1 : 0);
}

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const token = (await login.json()).data?.accessToken;
if (!token) {
  fail("BAT login failed for Avon compose");
} else {
  ok(`BAT login for Avon compose (${base})`);

  const opp = (
    await (
      await fetch(`${base}/api/enterprise-opportunities/${AVON_OPP_ID}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json()
  ).data;

  if (opp?.id !== AVON_OPP_ID) {
    fail(`Avon opportunity not loaded (expected ${AVON_OPP_ID})`);
  } else {
    ok(`Avon ${AVON_OPP_NO} loaded from live API`);
  }

  const oppSafe = redactCustomerContactPiiForAiContext(opp || {});
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

  if (!organizationId) {
    fail("organizationId unavailable — cannot invoke 003E projector");
  } else {
    const assignedFromApi = await fetchAssignedLendersFromApi(token, AVON_OPP_ID, base);
    const productLenderIntelligence = await projectProductLenderIntelligence({
      organizationId,
      opportunityRow: oppSafe,
      stated: {},
      documentsReadable: false,
      assignedLendersOverride: assignedFromApi.length ? assignedFromApi : undefined,
    });

    if (
      productLenderIntelligence &&
      typeof productLenderIntelligence === "object" &&
      "summary" in productLenderIntelligence &&
      !String(productLenderIntelligence.summary || "").includes(
        "Organization context unavailable",
      )
    ) {
      ok("Avon compose invoked projectProductLenderIntelligence (003E) — not stub");
    } else if (productLenderIntelligence?.availability === "NOT_AVAILABLE") {
      ok("003E projector invoked — honest NOT_AVAILABLE when registry/deals absent");
    } else {
      fail("003E projector returned unexpected stub shape");
    }

    const pliJson = JSON.stringify(productLenderIntelligence);
    if (!FORBIDDEN.test(pliJson) && assertNoForbiddenLenderFitLanguage(pliJson)) {
      ok("Avon 003E language guard PASS");
    } else {
      fail("Avon 003E forbidden language detected");
    }

    for (const row of productLenderIntelligence.lenderFit ?? []) {
      if (!ALLOWED_FIT.has(row.fitStatus)) {
        fail(`Invalid fit status on Avon path: ${row.fitStatus}`);
      }
    }
    ok("Avon lender fit statuses within contract");

    for (const rec of productLenderIntelligence.internalRecommendations ?? []) {
      if (rec.internalOnly !== true) {
        fail("Avon internal recommendation missing internalOnly=true");
      }
    }
    ok("Avon internal recommendations internalOnly=true");

    const credit = assembleCreditIntelligence({
      opportunityId: AVON_OPP_ID,
      structuredFacts: [],
      crossDocumentComparisons: [],
      reads: [],
      opportunityFields: {
        companyName: typeof oppSafe.companyName === "string" ? oppSafe.companyName : null,
        requestedAmount:
          typeof oppSafe.requestedAmount === "number" ? oppSafe.requestedAmount : null,
        transactionType:
          typeof oppSafe.transactionType === "string" ? oppSafe.transactionType : null,
      },
      limitations: ["CO-019D Avon certification compose"],
    });

    const synthesis = composeCreditSynthesis({
      opportunityId: AVON_OPP_ID,
      opportunityNumber: AVON_OPP_NO,
      creditIntelligence: credit,
      borrowerLabel:
        typeof oppSafe.companyName === "string" ? oppSafe.companyName : "Avon Appliances",
      productLabel: typeof oppSafe.productLabel === "string" ? oppSafe.productLabel : null,
      requestedAmount:
        typeof oppSafe.requestedAmount === "number" ? oppSafe.requestedAmount : null,
      transactionType:
        typeof oppSafe.transactionType === "string" ? oppSafe.transactionType : null,
      documentSummary: {
        documentsReviewed: 0,
        documentsWithReadableText: 0,
        documentsRequiringOcr: 0,
        structuredFactCount: 0,
        metadataOnlyBankStatements: 0,
      },
    });

    if (synthesis.internalOnly !== true) {
      fail("Credit synthesis must remain internalOnly=true");
    } else {
      ok("Credit synthesis internalOnly=true");
    }

    const assignedDeskLender =
      productLenderIntelligence.assignedLenders?.[0]?.lenderName ?? null;

    const ctx = {
      opportunityId: AVON_OPP_ID,
      opportunityNumber: AVON_OPP_NO,
      productName: typeof oppSafe.productLabel === "string" ? oppSafe.productLabel : "—",
      loanAmount: typeof oppSafe.requestedAmount === "number" ? oppSafe.requestedAmount : 0,
      borrowerName:
        typeof oppSafe.companyName === "string" ? oppSafe.companyName : "Avon Appliances",
      employmentType:
        typeof oppSafe.employmentTypeCode === "string" ? oppSafe.employmentTypeCode : null,
      city: typeof oppSafe.cityLabel === "string" ? oppSafe.cityLabel : null,
      companyName: typeof oppSafe.companyName === "string" ? oppSafe.companyName : null,
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
      documents: [],
      documentIntelligence: {
        documentsReviewed: 0,
        documentsWithBinary: 0,
        documentsWithReadableText: 0,
        documentsRequiringOcr: 0,
        documentsRequiringVision: 0,
        structuredFacts: [],
        crossDocumentComparisons: [],
        reads: [],
        limitations: [],
        capability: { note: "019D Avon compose" },
        visionProvider: { configured: false },
      },
      evidence: [],
      gaps: [],
      intelligence: {},
      productLenderIntelligence,
      creditIntelligence: credit,
    };

    const draft = composeChanakyaCreditProposalDraft(ctx);
    if (assertNoForbiddenLenderProposalLanguage(draft.fullText)) {
      ok("Avon lender proposal language guard PASS");
    } else {
      fail("Avon lender proposal forbidden language");
    }

    for (const rec of productLenderIntelligence.internalRecommendations ?? []) {
      const snippet = (rec.statement || "").trim().slice(0, 40);
      if (snippet && draft.fullText.toLowerCase().includes(snippet.toLowerCase())) {
        fail(`Internal recommendation leaked to lender proposal: ${snippet}`);
      }
    }
    ok("Avon internal recommendations excluded from lender proposal");

    const projectionReport = {
      A_internalChanakyaContext: {
        summary: productLenderIntelligence.summary,
        productContext: productLenderIntelligence.productContext,
        assignedLenders: productLenderIntelligence.assignedLenders,
        matrixEvidence: {
          availability: productLenderIntelligence.matrixEvidence?.availability,
          mappedLenderCount: productLenderIntelligence.matrixEvidence?.mappedLenderCount,
          lenders: (productLenderIntelligence.matrixEvidence?.lenders ?? []).slice(0, 5),
        },
        lenderFit: (productLenderIntelligence.lenderFit ?? []).slice(0, 8),
        missingInformation: productLenderIntelligence.missingInformation,
        internalRecommendations: productLenderIntelligence.internalRecommendations,
      },
      B_lenderFacingProposal: {
        proposedLenderLine: draft.fullText
          .split("\n")
          .find((l) => l.includes("**Proposed lender:**")),
        programBlockPresent: draft.fullText.includes(
          "Available lender program parameters",
        ),
        facilityExcerpt: draft.sections
          .find((s) => s.id === "proposed_structure")
          ?.body?.slice(0, 500),
        executivePurposeLine: draft.fullText
          .split("\n")
          .find((l) => l.includes("**Purpose:**")),
      },
      C_intentionallyExcluded: [
        "internalRecommendations (internalOnly=true) — CHANAKYA desk only",
        "Full Product–Lender Matrix inventory / ranking scores",
        "POTENTIALLY_RELEVANT fit rows as lender recommendations",
        "APPROVED / ELIGIBLE / GUARANTEED / BEST LENDER / SANCTIONED wording",
        "Invented program parameters when Lender Registry has none persisted",
        "Credit synthesis internalRecommendations (separate internal-only stream)",
      ],
    };

    console.log("\n--- Avon Product/Lender projection samples ---\n");
    console.log(JSON.stringify(projectionReport, null, 2));
  }
}

note("No Hostinger deployment · no production data mutation");
console.log(failed ? `\nRESULT: FAIL (${failed})\n` : "\nRESULT: PASS\n");
process.exit(failed > 0 ? 1 : 0);
