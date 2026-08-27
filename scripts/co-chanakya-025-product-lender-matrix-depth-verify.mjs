/**
 * CO-CHANAKYA-025 — Product/Lender matrix depth verification.
 *
 * Usage:
 *   node --env-file=.env.local --env-file=compass/.env.local --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-025-product-lender-matrix-depth-verify.mjs
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
  process.env.JWT_SECRET || "verify-025-jwt-secret-at-least-32-characters-long";

let failed = 0;
function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.log(`FAIL  ${msg}`);
}

console.log("\n=== CO-CHANAKYA-025 — Product/Lender matrix depth ===\n");

// --- 003E baseline regression ---
{
  const v = spawnSync(
    process.execPath,
    [
      "--import",
      "./scripts/_bat-stub-server-only.mjs",
      "--import",
      "tsx",
      "scripts/co-chanakya-enterprise-read-context-002-verify.mjs",
    ],
    { cwd: ROOT, stdio: "pipe", encoding: "utf8", env: process.env },
  );
  if (v.status === 0) ok("003E enterprise read context verify PASS (regression)");
  else fail("003E enterprise read context verify FAIL (regression)");
}

const {
  AVON_PROJECT_FINANCE_OPPORTUNITY,
  AVON_PROJECT_FINANCE_PRODUCT_RECORD,
  AVON_PROJECT_FINANCE_MATRIX_LENDERS,
  AVON_PROJECT_FINANCE_SHALLOW_PROGRAM,
  AVON_HOME_LOAN_DEEP_PROGRAM,
} = await import(
  "../src/constants/chanakya-credit-intelligence/avon-product-lender-fixtures.ts"
);

const {
  buildProductContextEvidence,
  buildMatrixMappedLenders,
  buildPotentialLenderFitAssessments,
  buildProgramParameterEvidence,
  buildProgramFitExplanation,
  assessMatrixDepth,
  assembleProductLenderIntelligence,
  buildTransactionLenderSnapshot,
  programParametersToSnapshot,
  assertNoForbiddenLenderFitLanguage,
} = await import(
  "../src/lib/chanakya-enterprise-read-context/product-lender-intelligence-core.ts"
);

// --- Structured program parameters: only persisted fields ---
{
  const deep = buildProgramParameterEvidence(AVON_HOME_LOAN_DEEP_PROGRAM);
  const expected = [
    "roiPercent",
    "maxLtvPercent",
    "maxFoirPercent",
    "maxDbrPercent",
    "maxTenureMonths",
    "minFundingAmount",
    "maxFundingAmount",
    "eligibleStates",
    "eligibleCities",
    "lifecycleStatus",
  ];
  if (
    deep.availability !== "AVAILABLE" ||
    !expected.every((k) => deep.populatedFields.includes(k))
  ) {
    fail("025 deep program must expose all persisted SSOT parameter fields");
  } else ok("025 — persisted program fields exposed when SSOT contains them");

  const shallow = buildProgramParameterEvidence(AVON_PROJECT_FINANCE_SHALLOW_PROGRAM);
  if (
    shallow.populatedFields.some((k) =>
      ["roiPercent", "maxLtvPercent", "maxFundingAmount", "maxFoirPercent"].includes(k),
    ) ||
    shallow.availability === "AVAILABLE"
  ) {
    fail("025 shallow program must not invent parameter depth");
  } else ok("025 — shallow program remains NOT_AVAILABLE for parameters");
}

// --- Avon Project Finance: insufficient matrix depth ---
{
  const productContext = buildProductContextEvidence({
    opportunityProductCode: AVON_PROJECT_FINANCE_OPPORTUNITY.productCode,
    opportunityProductLabel: AVON_PROJECT_FINANCE_OPPORTUNITY.productLabel,
    productRecord: AVON_PROJECT_FINANCE_PRODUCT_RECORD,
  });

  const matrix = buildMatrixMappedLenders({
    productCode: "PROJECT_FINANCE",
    lenders: AVON_PROJECT_FINANCE_MATRIX_LENDERS,
  });

  const programsByLender = new Map([
    ["lender_infra_a", [AVON_PROJECT_FINANCE_SHALLOW_PROGRAM]],
  ]);

  const depth = assessMatrixDepth({
    productCode: "PROJECT_FINANCE",
    matrixEvidence: matrix,
    programsByLender,
  });

  if (depth.status !== "INSUFFICIENT_EVIDENCE") {
    fail(`025 Avon Project Finance matrix depth must be INSUFFICIENT_EVIDENCE (got ${depth.status})`);
  } else ok("025 — Avon Project Finance matrix depth INSUFFICIENT_EVIDENCE");

  const potential = buildPotentialLenderFitAssessments({
    productCode: "PROJECT_FINANCE",
    matrixLenders: AVON_PROJECT_FINANCE_MATRIX_LENDERS,
    programsByLender,
    transaction: {
      requestedAmount: AVON_PROJECT_FINANCE_OPPORTUNITY.requestedAmount,
      productCode: "PROJECT_FINANCE",
      productLabel: AVON_PROJECT_FINANCE_OPPORTUNITY.productLabel,
      cityLabel: AVON_PROJECT_FINANCE_OPPORTUNITY.cityLabel,
      stateLabel: AVON_PROJECT_FINANCE_OPPORTUNITY.stateLabel,
    },
    assignedLenderIds: new Set(),
  });

  if (
    !potential.length ||
    !potential.every((p) => p.fitStatus === "INSUFFICIENT_EVIDENCE")
  ) {
    fail("025 Avon Project Finance potential fit must stay INSUFFICIENT_EVIDENCE");
  } else ok("025 — Avon Project Finance lender fit INSUFFICIENT_EVIDENCE (no ranking)");

  const assembled = assembleProductLenderIntelligence({
    productContext,
    assignedLenders: [],
    matrixEvidence: matrix,
    potentialFit: potential,
    propertyEvidence: {
      availability: "NOT_AVAILABLE",
      provenance: "enterprise_opportunity_registry",
    },
    missingInformation: [],
    internalRecommendations: [],
    matrixDepth: depth,
    transactionSnapshot: buildTransactionLenderSnapshot({
      productContext,
      assignedCount: 0,
      matrixEvidence: matrix,
      programAvailabilityCount: 1,
      transaction: {
        productCode: "PROJECT_FINANCE",
        productLabel: AVON_PROJECT_FINANCE_OPPORTUNITY.productLabel,
        cityLabel: AVON_PROJECT_FINANCE_OPPORTUNITY.cityLabel,
        stateLabel: AVON_PROJECT_FINANCE_OPPORTUNITY.stateLabel,
      },
    }),
  });

  if (
    assembled.matrixDepth.status !== "INSUFFICIENT_EVIDENCE" ||
    assembled.transactionSnapshot.isSecured !== true ||
    assembled.transactionSnapshot.matrixSupportedLenderCount < 2
  ) {
    fail("025 Avon assembled context must reflect matrix mapping without parameter depth");
  } else ok("025 — Avon transaction snapshot + matrix depth assembled");
}

// --- Program matching narrative (no scoring) ---
{
  const match = buildProgramFitExplanation({
    programs: [AVON_HOME_LOAN_DEEP_PROGRAM],
    transaction: {
      requestedAmount: 5_000_000,
      productCode: "HOME_LOAN",
      productLabel: "Home Loan",
      cityLabel: "Ahmedabad",
      stateLabel: "Gujarat",
    },
    matrixMapped: true,
  });

  if (
    !match.whyMayFit.length ||
    !match.supportingTransactionEvidence.length ||
    match.whyMayFit.some((s) => !assertNoForbiddenLenderFitLanguage(s)) ||
    /\bscore\b|\brank\b|\bbest\b/i.test(JSON.stringify(match))
  ) {
    fail("025 program match must explain evidence without scoring or forbidden language");
  } else ok("025 — program match explains why/supporting/missing without scoring");

  const potential = buildPotentialLenderFitAssessments({
    productCode: "HOME_LOAN",
    matrixLenders: [
      {
        lenderId: "lender_hl_1",
        lenderName: "Home Loan Bank",
        productsSupported: ["HOME_LOAN"],
        enabled: true,
        status: "active",
      },
    ],
    programsByLender: new Map([["lender_hl_1", [AVON_HOME_LOAN_DEEP_PROGRAM]]]),
    transaction: { requestedAmount: 5_000_000, productCode: "HOME_LOAN" },
    assignedLenderIds: new Set(),
  });

  const row = potential[0];
  if (
    !row ||
    row.fitStatus !== "POTENTIALLY_RELEVANT" ||
    !row.programAvailability?.length ||
    !row.programMatch?.whyMayFit.length
  ) {
    fail("025 deep matrix lender must be POTENTIALLY_RELEVANT with program availability");
  } else ok("025 — deep program yields POTENTIALLY_RELEVANT with structured availability");

  const snap = programParametersToSnapshot(
    buildProgramParameterEvidence(AVON_HOME_LOAN_DEEP_PROGRAM),
  );
  if (!snap?.maxDbrPercent || !snap?.eligibleStates) {
    fail("025 legacy program snapshot must include DBR and geography when persisted");
  } else ok("025 — legacy programParameters snapshot includes DBR + geography");
}

// --- Fit status vocabulary guard ---
{
  const forbidden = /\b(BEST_LENDER|ELIGIBLE|APPROVED|GUARANTEED)\b/;
  const samples = [
    buildProgramFitExplanation({
      programs: [AVON_HOME_LOAN_DEEP_PROGRAM],
      transaction: { productCode: "HOME_LOAN" },
      matrixMapped: true,
    }),
  ];
  const text = JSON.stringify(samples);
  if (forbidden.test(text)) {
    fail("025 must never emit BEST_LENDER/ELIGIBLE/APPROVED/GUARANTEED");
  } else ok("025 — fit vocabulary restricted to evidence-first statuses");
}

// --- Banking + OCR regression ---
for (const script of [
  "scripts/co-chanakya-023-banking-intelligence-verify.mjs",
  "scripts/co-chanakya-024-ocr-integration-readiness-verify.mjs",
]) {
  const v = spawnSync(
    process.execPath,
    ["--import", "./scripts/_bat-stub-server-only.mjs", "--import", "tsx", script],
    { cwd: ROOT, stdio: "pipe", encoding: "utf8", env: process.env },
  );
  const label = path.basename(script, ".mjs");
  if (v.status === 0) ok(`${label} PASS (regression)`);
  else fail(`${label} FAIL (regression)`);
}

console.log(failed ? `\nRESULT: FAIL (${failed})\n` : "\nRESULT: PASS\n");
process.exit(failed ? 1 : 0);
