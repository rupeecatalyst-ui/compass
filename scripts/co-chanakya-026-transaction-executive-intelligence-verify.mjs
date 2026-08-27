/**
 * CO-CHANAKYA-026 — Transaction executive intelligence verification.
 *
 * Usage:
 *   node --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-026-transaction-executive-intelligence-verify.mjs
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
  process.env.JWT_SECRET || "verify-026-jwt-secret-at-least-32-characters-long";

let failed = 0;
function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.log(`FAIL  ${msg}`);
}

console.log("\n=== CO-CHANAKYA-026 — Transaction executive intelligence ===\n");

// --- Prior sprint regressions ---
for (const script of [
  "scripts/co-chanakya-025-product-lender-matrix-depth-verify.mjs",
]) {
  const v = spawnSync(
    process.execPath,
    ["--import", "./scripts/_bat-stub-server-only.mjs", "--import", "tsx", script],
    { cwd: ROOT, stdio: "pipe", encoding: "utf8", env: process.env },
  );
  if (v.status === 0) ok(`${path.basename(script, ".mjs")} PASS (regression)`);
  else fail(`${path.basename(script, ".mjs")} FAIL (regression)`);
}

const {
  AVON_EXECUTIVE_OPPORTUNITY,
  AVON_EXECUTIVE_DEAL,
  AVON_EXECUTIVE_RADAR_ROW,
  AVON_EXECUTIVE_ENTITY_ATTENTION,
  AVON_EXECUTIVE_DOCUMENT_READINESS,
  AVON_EXECUTIVE_CHANGE,
  AVON_EXECUTIVE_CREDIT_STUB,
} = await import(
  "../src/constants/chanakya-credit-intelligence/avon-transaction-executive-fixtures.ts"
);

const {
  composeTransactionExecutiveSnapshot,
  assertNoPiiInExecutiveText,
} = await import(
  "../src/lib/chanakya-enterprise-read-context/transaction-executive-snapshot-core.ts"
);

const { assembleProductLenderIntelligence, buildProductContextEvidence, buildMatrixMappedLenders } =
  await import(
    "../src/lib/chanakya-enterprise-read-context/product-lender-intelligence-core.ts"
  );

const { AVON_PROJECT_FINANCE_MATRIX_LENDERS, AVON_PROJECT_FINANCE_PRODUCT_RECORD } =
  await import(
    "../src/constants/chanakya-credit-intelligence/avon-product-lender-fixtures.ts"
  );

// --- 20-section snapshot contract ---
{
  const productContext = buildProductContextEvidence({
    opportunityProductCode: AVON_EXECUTIVE_OPPORTUNITY.productCode,
    opportunityProductLabel: AVON_EXECUTIVE_OPPORTUNITY.productLabel,
    productRecord: AVON_PROJECT_FINANCE_PRODUCT_RECORD,
  });
  const matrix = buildMatrixMappedLenders({
    productCode: "PROJECT_FINANCE",
    lenders: AVON_PROJECT_FINANCE_MATRIX_LENDERS,
  });
  const pli = assembleProductLenderIntelligence({
    productContext,
    assignedLenders: [],
    matrixEvidence: matrix,
    potentialFit: [],
    propertyEvidence: { availability: "NOT_AVAILABLE", provenance: "test" },
    missingInformation: [],
    internalRecommendations: [],
  });

  const snapshot = composeTransactionExecutiveSnapshot({
    entityKind: "deal",
    scopeLabel: AVON_EXECUTIVE_OPPORTUNITY.opportunityNumber,
    opportunity: AVON_EXECUTIVE_OPPORTUNITY,
    deal: AVON_EXECUTIVE_DEAL,
    deals: [AVON_EXECUTIVE_DEAL],
    entityAttention: AVON_EXECUTIVE_ENTITY_ATTENTION,
    radarRow: AVON_EXECUTIVE_RADAR_ROW,
    changeIntelligence: AVON_EXECUTIVE_CHANGE,
    productLenderIntelligence: pli,
    creditIntelligence: AVON_EXECUTIVE_CREDIT_STUB,
    documentReadiness: AVON_EXECUTIVE_DOCUMENT_READINESS,
    documentIntelligence: { documentsWithReadableText: 0 },
    openTasks: [{ title: "Follow up lender login", status: "open" }],
    postDisbursement: { status: "NOT_AVAILABLE" },
    commercial: { status: "NOT_AVAILABLE" },
  });

  const requiredSections = [
    "identity",
    "borrowerProfile",
    "product",
    "requestedAmount",
    "currentStage",
    "lenders",
    "stageAge",
    "lastMeaningfulActivity",
    "documents",
    "tasks",
    "attention",
    "changes",
    "financialIntelligence",
    "gst",
    "banking",
    "productLender",
    "commercialAccounting",
    "postDisbursement",
    "missingInformation",
    "recommendedNextHumanAction",
  ];

  const missing = requiredSections.filter((k) => !(k in snapshot));
  if (missing.length) {
    fail(`026 snapshot missing sections: ${missing.join(", ")}`);
  } else ok("026 — 20-section transaction executive snapshot assembled");

  if (snapshot.scopeLabel !== "OPP-2026-000060") {
    fail("026 Avon scope label must resolve OPP-2026-000060");
  } else ok("026 — Avon OPP-2026-000060 snapshot identity");

  if (
    snapshot.attention.classification !== "follow_up_required" ||
    !snapshot.attention.why.length
  ) {
    fail("026 attention must reuse Radar classification without new score");
  } else ok("026 — attention uses existing Radar classification");

  if (
    !snapshot.executiveSynthesis.includes("Recommended next action") ||
    snapshot.executiveSynthesis.length < 80
  ) {
    fail("026 executive synthesis must be coherent narrative");
  } else ok("026 — executive synthesis is coherent (not raw dump)");

  if (
    !snapshot.recommendedNextHumanAction.traceableTo.length ||
    snapshot.recommendedNextHumanAction.availability !== "AVAILABLE"
  ) {
    fail("026 recommended action must be traceable to evidence");
  } else ok("026 — recommended next human action traceable");

  const blob = JSON.stringify(snapshot);
  if (!assertNoPiiInExecutiveText(blob) || /primaryContactMobile|primaryContactEmail/.test(blob)) {
    fail("026 snapshot must not contain PII patterns");
  } else ok("026 — no email/mobile PII in executive snapshot");

  if (/\briskScore\b|"inventedRiskScore"/i.test(blob)) {
    fail("026 must not invent a new risk score");
  } else ok("026 — no invented risk score");

  if (snapshot.readOnly !== true) {
    fail("026 snapshot must be read-only");
  } else ok("026 — read-only contract");
}

// --- Compile wiring presence ---
{
  const compileSrc = fs.readFileSync(
    path.join(ROOT, "src/lib/chanakya-enterprise-read-context/compile.ts"),
    "utf8",
  );
  const typesSrc = fs.readFileSync(
    path.join(ROOT, "src/types/chanakya-enterprise-read-context.ts"),
    "utf8",
  );
  if (!/transactionExecutiveSnapshot/.test(compileSrc)) {
    fail("026 must wire transactionExecutiveSnapshot into compile");
  } else ok("026 — compile.ts exposes transactionExecutiveSnapshot");
  if (!/ChanakyaTransactionExecutiveSnapshot/.test(typesSrc)) {
    fail("026 executive snapshot type missing");
  } else ok("026 — ChanakyaTransactionExecutiveSnapshot type present");
}

console.log(failed ? `\nRESULT: FAIL (${failed})\n` : "\nRESULT: PASS\n");
process.exit(failed ? 1 : 0);
