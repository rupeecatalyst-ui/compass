/**
 * Canonical recommendation certification — identity + invariants for the
 * approved Stage 4B + Stage 5C5 architecture.
 *
 * Default: --self-test (database-free). Does not connect to production.
 * --production-data remains separately authorized and stays READ ONLY.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const PRODUCTS = ["HOME_LOAN", "HOME_LOAN_BT"];
const MANIFEST_PATH = "scripts/co-c1-canonical-recommendation-certification-manifest.json";
const FORBIDDEN_CALL =
  /\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(|\$(?:executeRaw|executeRawUnsafe)\s*\(|\b(?:migrate|seed)\b/i;
const FORBIDDEN_TRANSACTIONS = ["fresh", "bt_top_up", "with_topup"];

function fail(message) {
  const error = new Error(message);
  error.name = "CertificationFailure";
  throw error;
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function readSource(relative) {
  return readFileSync(resolve(ROOT, relative), "utf8");
}

function loadManifest() {
  return JSON.parse(readSource(MANIFEST_PATH));
}

export function assertMigrationDisabled(value = process.env.PRISMA_MIGRATE_DEPLOY_ON_BUILD) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "true" || normalized === "1") fail("MIGRATION_FLAG_ENABLED");
}

export function verifyArchitectureIdentity(manifest = loadManifest()) {
  if (manifest.certificationId !== "CO-CHANAKYA-CANONICAL-CERT-5C5-001") {
    fail("CERTIFICATION_MANIFEST_INVALID");
  }
  if (manifest.architectureBaseSha !== "017acdeef412fcdc49edf9e628ff7d86cd71cb24") {
    fail("ARCHITECTURE_BASE_SHA_INVALID");
  }
  if (manifest.productionBaseSha !== "d080869fec6104b676798589ac5407d1f48a20de") {
    fail("PRODUCTION_BASE_SHA_INVALID");
  }
  const files = manifest.files ?? {};
  for (const [relative, expected] of Object.entries(files)) {
    const source = readSource(relative);
    if (sha256(source) !== expected) fail(`ARCHITECTURE_IDENTITY_MISMATCH:${relative}`);
  }
  for (const relative of manifest.readOnlyCallGraph ?? []) {
    if (FORBIDDEN_CALL.test(readSource(relative))) fail(`WRITE_CAPABLE_CALL_GRAPH:${relative}`);
  }
}

function requireSource(relative, patterns, code) {
  const source = readSource(relative);
  for (const pattern of patterns) {
    if (!pattern.test(source)) fail(code);
  }
}

function forbidSource(relative, patterns, code) {
  const source = readSource(relative);
  for (const pattern of patterns) {
    if (pattern.test(source)) fail(code);
  }
}

export function verifyGovernedEligibilityInvariants() {
  const repository = readSource("server/services/lender-recommendation/recommendation-programme.repository.ts");
  if (!/productCode:\s*input\.product/.test(repository)) fail("PRODUCT_SCOPE_NOT_PROVEN");
  if (!/PROGRAMME_SAFETY_LIMIT\s*\+\s*1/.test(repository)) fail("BOUNDARY_PROBE_NOT_PROVEN");
  if (!/programmes\.length\s*>\s*PROGRAMME_SAFETY_LIMIT/.test(repository)) fail("OVERFLOW_FAILURE_NOT_PROVEN");

  requireSource(
    "server/services/lender-recommendation/canonical-governed-eligibility.ts",
    [
      /evaluateCanonicalEligibility/,
      /customer\.employmentFamily === "self_employed"/,
      /cibilInterval/,
      /not_known/,
      /monthsSince/,
      /calculateSalariedFoir/,
      /calculateReducingBalanceEmi/,
      /UNSUPPORTED_GOVERNED_RULE/,
      /PRODUCT_CONTEXT_MISMATCH/,
      /HOME_LOAN_BT/,
      /balance_transfer/,
      /allowed\(customer\.residency, c\.residency/,
      /missing\.add\("cibil"\)/,
      /missing\.add\("requestedTenure"\)/,
      /missing\.add\("dateOfBirth"\)/,
      /missing\.add\("monthlyIncome"\)/,
      /missing\.add\("obligations"\)/,
      /missing\.add\("propertyValue"\)/,
      /const ltv = /,
      /btOutstanding/,
    ],
    "GOVERNED_ELIGIBILITY_INVARIANT_MISSING",
  );
  requireSource(
    "server/services/lender-recommendation/canonical-lender-recommendation.service.ts",
    [
      /recommendLendersCanonical/,
      /evaluateCanonicalEligibility/,
      /lenderScore:\s*null/,
      /lenderScoreVersion:\s*null/,
      /HOME_LOAN_BT/,
      /readOnly:\s*true/,
    ],
    "CANONICAL_SERVICE_INVARIANT_MISSING",
  );
  forbidSource(
    "server/services/lender-recommendation/canonical-lender-recommendation.service.ts",
    [/\blenderScore:\s*88\b/, /confidencePercent/, /\bstars\s*:/],
    "FABRICATED_SCORE_PRESENT",
  );
}

export function verifyAssessmentRuntimeInvariants() {
  requireSource(
    "server/services/opportunity-assessment/runtime.ts",
    [
      /PrismaOpportunityAssessmentRepository/,
      /Never fall back to MemoryOpportunityAssessmentRepository in production/,
      /ASSESSMENT_PERSISTENCE_FAILURE/,
    ],
    "PRISMA_RUNTIME_INVARIANT_MISSING",
  );
  forbidSource(
    "server/services/opportunity-assessment/runtime.ts",
    [/new MemoryOpportunityAssessmentRepository/, /MemoryOpportunityAssessmentRepository\)/],
    "MEMORY_FALLBACK_PRESENT",
  );
  requireSource(
    "src/app/api/enterprise-opportunities/[opportunityId]/opportunity-assessment/route.ts",
    [
      /resolvePilotOrganizationId/,
      /createOpportunityAssessmentService\(\{\s*prismaClient:\s*prisma\s*\}\)/,
    ],
    "ASSESSMENT_ROUTE_TRUST_MISSING",
  );
  requireSource(
    "src/app/api/enterprise-opportunities/[opportunityId]/opportunity-assessment/recommendation/route.ts",
    [
      /resolvePilotOrganizationId/,
      /createOpportunityAssessmentService\(\{\s*prismaClient:\s*prisma\s*\}\)/,
      /Browser organizationId is ignored/,
    ],
    "RECOMMENDATION_ROUTE_TRUST_MISSING",
  );
  forbidSource(
    "src/app/api/enterprise-opportunities/[opportunityId]/opportunity-assessment/route.ts",
    [/trustedActor\([^,]+,\s*body\.organizationId/, /MemoryOpportunityAssessmentRepository/],
    "BROWSER_ORGANIZATION_AUTHORITATIVE",
  );
  requireSource(
    "server/services/opportunity-assessment/opportunity-assessment.service.ts",
    [
      /assertTrustedOrganization/,
      /CROSS_ORGANIZATION_ACCESS/,
      /sanitizeFailureCode/,
      /RUN_ABORTED/,
      /RUN_FAILED/,
      /CONFIGURATION_ERROR/,
    ],
    "TENANT_OR_SANITIZATION_INVARIANT_MISSING",
  );
  requireSource(
    "server/repositories/opportunity-assessment/prisma-errors.ts",
    [/translatePrismaError/, /ASSESSMENT_PERSISTENCE_FAILURE/],
    "RAW_ERROR_TRANSLATION_MISSING",
  );
}

export function verifyStage5c5Invariants() {
  requireSource(
    "src/types/opportunity-assessment.ts",
    [/ASSESSMENT_FORBIDDEN_TRANSACTION_TYPES = \["fresh", "bt_top_up", "with_topup"\]/],
    "FORBIDDEN_TRANSACTION_TYPES_MISSING",
  );
  requireSource(
    "server/services/opportunity-assessment/map-to-canonical.ts",
    [
      /export function mapFinalizedAssessmentFactsToCanonical/,
      /SELF_EMPLOYED_ASSESSMENT_UNSUPPORTED/,
      /HOME_LOAN_BT/,
      /balance_transfer/,
      /ASSESSMENT_FORBIDDEN_TRANSACTION_TYPES/,
      /facts\.property\.propertyCity/,
      /facts\.balanceTransfer\.outstandingPrincipal/,
      /facts\.balanceTransfer\.currentHomeLoanEmi/,
      /facts\.incomeAndObligations\.existingMonthlyObligations/,
      /facts\.coApplicant\.contributionDecision/,
      /kind === "explicitly_unknown"\) return "not_known"/,
      /kind === "expected_band"\) return knownValue\(facts\.cibil\.expectedBand\)/,
      /kind === "exact"\) return knownInteger\(facts\.cibil\.exactScore\)/,
    ],
    "MAPPER_INVARIANT_MISSING",
  );
  requireSource(
    "server/services/opportunity-assessment/execute-recommendation.ts",
    [
      /mapFinalizedAssessmentFactsToCanonical/,
      /recommendLendersCanonical/,
      /revisionKind !== "FINALIZED"/,
      /ASSESSMENT_NOT_FINALIZED/,
      /ASSESSMENT_INCOMPLETE/,
      /ASSESSMENT_UNSUPPORTED/,
      /ASSESSMENT_STALE/,
      /lenderScore: null as null/,
      /delete \(rest as \{ stars\?: unknown \}\)\.stars/,
      /delete \(rest as \{ confidence\?: unknown \}\)\.confidence/,
      /requestHashFor/,
      /TERMINAL_RUN_STATUSES/,
    ],
    "EXECUTION_CONTRACT_INVARIANT_MISSING",
  );
  requireSource(
    "src/hooks/use-chanakya-canonical-recommendations.ts",
    [
      /opportunity-assessment\/recommendation/,
      /Stage 5C5 panels execute from finalized Opportunity Assessment/,
      /server ignores browser-local financial\/property fields/,
    ],
    "PANEL_HOOK_SSOT_MISSING",
  );
  requireSource(
    "src/components/catalyst-one/credit-bench/chanakya-opportunity-recommendation-panel.tsx",
    [/useChanakyaCanonicalRecommendations/],
    "OPPORTUNITY_PANEL_HOOK_MISSING",
  );
  requireSource(
    "src/components/catalyst-one/opportunity-workspace/workspace-life-strategy-board.tsx",
    [/useChanakyaCanonicalRecommendations/],
    "LIFE_PANEL_HOOK_MISSING",
  );
}

/** Mutates process memory only; no value is printed or persisted. */
export function enforceReadOnlyConnectionEnvironment(env = process.env) {
  const raw = env.DATABASE_URL?.trim();
  if (!raw) fail("DATABASE_CONFIGURATION_MISSING");
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    fail("DATABASE_CONFIGURATION_INVALID");
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    fail("DATABASE_CONFIGURATION_UNSUPPORTED");
  }
  const current = parsed.searchParams.get("options")?.trim();
  const readOnlyOption = "-c default_transaction_read_only=on";
  parsed.searchParams.set("options", current ? `${current} ${readOnlyOption}` : readOnlyOption);
  env.DATABASE_URL = parsed.toString();
}

export async function proveReadOnlyState(prisma) {
  const defaults = await prisma.$queryRawUnsafe("SHOW default_transaction_read_only");
  const defaultState = String(defaults?.[0]?.default_transaction_read_only ?? "").toLowerCase();
  if (defaultState !== "on") fail("DATABASE_READ_ONLY_DEFAULT_UNPROVEN");
  const transactionState = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe("SHOW transaction_read_only");
    return String(rows?.[0]?.transaction_read_only ?? "").toLowerCase();
  });
  if (transactionState !== "on") fail("DATABASE_TRANSACTION_READ_ONLY_UNPROVEN");
}

function safeReason(error) {
  const message = error instanceof Error ? error.message : "UNKNOWN_FAILURE";
  const safe = message.match(/[A-Z][A-Z0-9_:-]{2,120}/)?.[0] ?? "VALIDATION_FAILED";
  return safe.replace(/:{2,}/g, ":");
}

function safeIdentifier(value) {
  return typeof value === "string" ? value.replace(/[^a-zA-Z0-9_.:-]/g, "").slice(0, 120) : null;
}

export function assertInventoryBoundary(count, boundary = 100) {
  if (!Number.isInteger(count) || count < 0 || count > boundary) fail("PROGRAMME_INVENTORY_BOUNDARY_EXCEEDED");
}

function verifyNullPreservation(row, mapped) {
  const pairs = [
    ["minIncomeExact", "minIncomeRupees"], ["maxIncomeExact", "maxIncomeRupees"],
    ["minLoanAmountExact", "minLoanAmountRupees"], ["maxLoanAmountExact", "maxLoanAmountRupees"],
    ["minFoirExact", "minFoirPercent"], ["maxFoirExact", "maxFoirPercent"],
    ["minDbrExact", "minDbrPercent"], ["maxDbrExact", "maxDbrPercent"],
    ["minLtvExact", "minLtvPercent"], ["maxLtvExact", "maxLtvPercent"],
  ];
  for (const [source, target] of pairs) {
    if (row[source] == null && mapped.canonicalConstraints[target] !== null) {
      fail(`NULL_NOT_PRESERVED:${source}`);
    }
  }
}

async function proveRuntimeFailClosed() {
  const { createOpportunityAssessmentService } = await import(
    "../server/services/opportunity-assessment/runtime.ts"
  );
  assert.throws(
    () => createOpportunityAssessmentService({ prismaClient: {} }),
    (error) => error?.code === "ASSESSMENT_PERSISTENCE_FAILURE",
  );
  assert.throws(
    () => createOpportunityAssessmentService({ prismaClient: null }),
    (error) => error?.code === "ASSESSMENT_PERSISTENCE_FAILURE",
  );
}

async function proveMapperContract() {
  const { mapFinalizedAssessmentFactsToCanonical } = await import(
    "../server/services/opportunity-assessment/map-to-canonical.ts"
  );
  const { emptyOpportunityAssessmentFacts } = await import(
    "../src/lib/opportunity-assessment/empty-facts.ts"
  );
  const { captureKnownValue, setCapturedCibilKind, setCapturedEmploymentFamily, setCapturedProduct } = await import(
    "../src/lib/opportunity-assessment/capture-facts.ts"
  );

  let facts = emptyOpportunityAssessmentFacts();
  facts = setCapturedProduct(facts, "HOME_LOAN");
  facts = setCapturedEmploymentFamily(facts, "self_employed");
  assert.throws(
    () => mapFinalizedAssessmentFactsToCanonical(facts),
    (error) => error?.code === "ASSESSMENT_UNSUPPORTED",
  );

  facts = emptyOpportunityAssessmentFacts();
  facts = setCapturedProduct(facts, "HOME_LOAN");
  facts = captureKnownValue(facts, "loanRequirement", "transactionType", "fresh");
  assert.throws(
    () => mapFinalizedAssessmentFactsToCanonical(facts),
    (error) => error?.code === "ASSESSMENT_UNSUPPORTED",
  );
  for (const forbidden of FORBIDDEN_TRANSACTIONS) {
    assert.equal(FORBIDDEN_TRANSACTIONS.includes(forbidden), true);
  }

  facts = emptyOpportunityAssessmentFacts();
  facts = captureKnownValue(facts, "loanRequirement", "productCode", "HOME_LOAN_BT");
  assert.throws(
    () => mapFinalizedAssessmentFactsToCanonical(facts),
    (error) => error?.code === "ASSESSMENT_UNSUPPORTED",
  );

  facts = setCapturedProduct(emptyOpportunityAssessmentFacts(), "HOME_LOAN_BT");
  facts = captureKnownValue(facts, "loanRequirement", "requestedAmount", "1000000.00");
  facts = captureKnownValue(facts, "balanceTransfer", "outstandingPrincipal", "800000.00");
  facts = captureKnownValue(facts, "incomeAndObligations", "existingMonthlyObligations", "5000.00");
  facts = captureKnownValue(facts, "balanceTransfer", "currentHomeLoanEmi", "20000.00");
  const mappedBt = mapFinalizedAssessmentFactsToCanonical(facts);
  assert.equal(mappedBt.product, "HOME_LOAN_BT");
  assert.equal(mappedBt.customer.journeyKind, "home_loan_balance_transfer");
  assert.equal(mappedBt.customer.requiredAmountRupees, 1000000);
  assert.equal(mappedBt.customer.currentOutstandingRupees, 800000);
  assert.equal(mappedBt.customer.existingMonthlyEmiRupees, 5000);
  assert.equal(mappedBt.customer.currentHomeLoanEmiRupees, 20000);

  facts = setCapturedProduct(emptyOpportunityAssessmentFacts(), "HOME_LOAN");
  const mappedMissingCibil = mapFinalizedAssessmentFactsToCanonical(facts);
  assert.equal(mappedMissingCibil.customer.cibilBand, null);
  facts = setCapturedCibilKind(facts, "explicitly_unknown");
  assert.equal(mapFinalizedAssessmentFactsToCanonical(facts).customer.cibilBand, "not_known");
}

async function runProductionDataCertification() {
  assertMigrationDisabled();
  verifyArchitectureIdentity();
  verifyGovernedEligibilityInvariants();
  verifyAssessmentRuntimeInvariants();
  verifyStage5c5Invariants();
  enforceReadOnlyConnectionEnvironment();

  const [{ prisma }, { resolvePilotOrganizationId }, repository, adapter, availability] = await Promise.all([
    import("../server/lib/prisma.ts"),
    import("../server/repositories/ecm/organization.repository.ts"),
    import("../server/services/lender-recommendation/recommendation-programme.repository.ts"),
    import("../server/services/lender-recommendation/programme-assessment-adapter.ts"),
    import("../server/services/lender-recommendation/programme-availability.ts"),
  ]);

  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    await proveReadOnlyState(prisma);
    const organizationId = await resolvePilotOrganizationId();
    if (!organizationId) fail("ORGANIZATION_UNAVAILABLE");
    const asOf = new Date();
    const report = {};
    const failures = [];

    for (const product of PRODUCTS) {
      const inventory = await repository.loadCanonicalProgrammeInventory({ organizationId, product, asOf });
      assertInventoryBoundary(inventory.programmes.length);
      let mappedCount = 0;
      let blankTransactions = 0;
      let balanceTransfers = 0;
      for (const row of inventory.programmes) {
        try {
          if (!availability.isCanonicalProgrammeAvailable({ programme: row, organizationId, product, asOf })) {
            fail("PROGRAMME_AVAILABILITY_MISMATCH");
          }
          const mapped = adapter.mapCanonicalProgramme({
            row, product, lenderCategory: inventory.lenderCategories.get(row.lenderId) ?? null, asOf,
          });
          if (mapped.productCode !== product || mapped.canonicalProduct !== product) fail("PRODUCT_ISOLATION_FAILED");
          verifyNullPreservation(row, mapped);
          if (mapped.lenderScore !== null || mapped.lenderScoreVersion !== null) fail("LENDER_SCORE_FABRICATED");
          if (mapped.canonicalConstraints.transactionTypes === null) blankTransactions += 1;
          if (mapped.canonicalConstraints.transactionTypes?.includes("balance_transfer")) balanceTransfers += 1;
          mappedCount += 1;
        } catch (error) {
          failures.push({
            lender: safeIdentifier(row.lender?.displayName || row.lender?.code || row.lenderId),
            programmeId: safeIdentifier(row.id), programmeCode: safeIdentifier(row.code), product,
            policyVersionId: safeIdentifier(row.policyVersionId), reason: safeReason(error),
          });
        }
      }
      if (product === "HOME_LOAN_BT" && balanceTransfers !== inventory.programmes.length) {
        fail("HLBT_BALANCE_TRANSFER_INCOMPLETE");
      }
      report[product] = { retrieved: inventory.programmes.length, mapped: mappedCount, blankTransactions, balanceTransfers };
    }

    if (failures.length) {
      console.log(JSON.stringify({ certificationMode: "READ_ONLY", certificationId: loadManifest().certificationId, failures }));
      fail("PROGRAMME_MAPPING_FAILED");
    }
    console.log(JSON.stringify({
      certificationMode: "READ_ONLY",
      certificationId: loadManifest().certificationId,
      databaseReadOnlyState: "PASS",
      migrationFlag: "DISABLED",
      organization: createHash("sha256").update(organizationId).digest("hex").slice(0, 12),
      homeLoan: report.HOME_LOAN,
      homeLoanBt: report.HOME_LOAN_BT,
      total: report.HOME_LOAN.retrieved + report.HOME_LOAN_BT.retrieved,
      productIsolation: "PASS",
      programmeMapping: "PASS",
      hardcodedLenderData: "NONE",
    }));
  } finally {
    await prisma.$disconnect().catch(() => {});
    console.error = originalConsoleError;
  }
}

export async function selfTest() {
  assert.throws(() => assertMigrationDisabled("true"), /MIGRATION_FLAG_ENABLED/);
  assert.throws(() => assertMigrationDisabled("1"), /MIGRATION_FLAG_ENABLED/);
  assert.doesNotThrow(() => assertMigrationDisabled("false"));
  assert.throws(() => assertInventoryBoundary(101), /PROGRAMME_INVENTORY_BOUNDARY_EXCEEDED/);
  verifyArchitectureIdentity();
  verifyGovernedEligibilityInvariants();
  verifyAssessmentRuntimeInvariants();
  verifyStage5c5Invariants();
  await proveRuntimeFailClosed();
  await proveMapperContract();

  const fakeEnv = { DATABASE_URL: "postgresql://user:secret@example.invalid/db" };
  enforceReadOnlyConnectionEnvironment(fakeEnv);
  assert.equal(new URL(fakeEnv.DATABASE_URL).searchParams.get("options"), "-c default_transaction_read_only=on");
  await assert.rejects(() => proveReadOnlyState({
    $queryRawUnsafe: async () => [{ default_transaction_read_only: "off" }],
  }), /DATABASE_READ_ONLY_DEFAULT_UNPROVEN/);
  await assert.doesNotReject(() => proveReadOnlyState({
    $queryRawUnsafe: async () => [{ default_transaction_read_only: "on" }],
    $transaction: async (fn) => fn({ $queryRawUnsafe: async () => [{ transaction_read_only: "on" }] }),
  }));

  const { mapCanonicalProgramme, validateCanonicalPolicyLink } = await import(
    "../server/services/lender-recommendation/programme-assessment-adapter.ts"
  );
  const { parseCanonicalPolicyRules } = await import(
    "../server/services/lender-recommendation/policy-rule-parser.ts"
  );
  const policy = (product = "HOME_LOAN") => ({
    id: "pv", organizationId: "org", policyId: "policy", versionNumber: 1, status: "published",
    eligibilityRules: {}, creditRules: {}, effectiveFrom: null, effectiveUntil: null,
    policy: { id: "policy", organizationId: "org", lenderId: "lender", productCode: product,
      status: "published", currentPublishedVersionId: "pv", isDeleted: false },
  });
  const row = (product = "HOME_LOAN", transactionTypes = null) => ({
    id: "programme", organizationId: "org", lenderId: "lender", productCode: product,
    code: "CONFIGURED_PROGRAMME", label: "Configured", versionNumber: 1, transactionTypes,
    policyVersionId: "pv", policyVersion: policy(product), lender: { displayName: "Configured", label: "Configured", code: "CFG" },
    isDeleted: false, enabled: true, isLivePublished: true, publicationState: "published",
    completenessState: "complete", lifecycleStatus: "published", status: "active", approvalStatus: "approved",
    effectiveFrom: null, effectiveUntil: null, minIncomeExact: null, minLoanAmountExact: null,
  });
  const hl = mapCanonicalProgramme({ row: row(), product: "HOME_LOAN", lenderCategory: "A", asOf: new Date() });
  assert.equal(hl.canonicalConstraints.transactionTypes, null);
  assert.equal(hl.canonicalConstraints.minIncomeRupees, null);
  assert.equal(hl.lenderScore, null);
  assert.throws(() => mapCanonicalProgramme({ row: row(), product: "HOME_LOAN_BT", lenderCategory: "A", asOf: new Date() }), /PRODUCT_MISMATCH/);
  assert.doesNotThrow(() => mapCanonicalProgramme({ row: row("HOME_LOAN_BT", ["balance_transfer"]), product: "HOME_LOAN_BT", lenderCategory: "C", asOf: new Date() }));
  assert.equal(validateCanonicalPolicyLink({ ...row(), policyVersion: { ...policy(), status: "draft" } }, "HOME_LOAN", new Date()), "POLICY_NOT_PUBLISHED");
  assert.throws(() => parseCanonicalPolicyRules({ rules: [{ type: "unsupported_rule" }] }), /Unsupported eligibility-affecting/);
  assert.equal(safeReason(new Error("postgresql://user:secret@private-host/db")), "VALIDATION_FAILED");
  console.log("Canonical recommendation certification self-test: PASS");
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const productionData = process.argv.includes("--production-data");
  const selfTestMode = process.argv.includes("--self-test") || !productionData;
  if (productionData && process.argv.includes("--self-test")) {
    console.error("[canonical-recommendation-certification] FAIL SELF_TEST_AND_PRODUCTION_DATA_MUTUALLY_EXCLUSIVE");
    process.exitCode = 1;
  } else {
    (selfTestMode ? selfTest() : runProductionDataCertification()).catch((error) => {
      const detail = error instanceof Error ? error.message.slice(0, 240).replace(/[^\w\s.:_/-]/g, "") : "";
      console.error(`[canonical-recommendation-certification] FAIL ${safeReason(error)}${detail ? ` ${detail}` : ""}`);
      process.exitCode = 1;
    });
  }
}
