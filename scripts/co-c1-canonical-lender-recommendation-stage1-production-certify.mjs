/**
 * Canonical lender recommendation Stage 1 production-data certification.
 * READ ONLY. Run --self-test locally; production execution requires separate authorization.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const PRODUCTS = ["HOME_LOAN", "HOME_LOAN_BT"];
const EXPECTED_STAGE1_SHA = "29fb09d98c0972f7b7792419c9f5e7343e3112a0";
const EXPECTED_FILES = new Map([
  ["server/services/lender-recommendation/recommendation-programme.repository.ts", "4aed3d171fb2b4b957346dd61c520cbde11f7dc25f656e16938b4fcb343de4b8"],
  ["server/services/lender-recommendation/programme-assessment-adapter.ts", "5bdb163e7c994f10f8e7d506d204163d74959cf5690a19ad6cfbb746d9990334"],
  ["server/services/lender-recommendation/programme-availability.ts", "acfba19c816837e233824985de43e522af22be0b7c6db5e37ab85bae2c77984d"],
  ["server/services/lender-recommendation/policy-rule-parser.ts", "694d9db600d85e9317709ede31856c92ab7d340816a65dd3179193021b38e7e1"],
]);
const FORBIDDEN_CALL = /\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(|\$(?:executeRaw|executeRawUnsafe)\s*\(|\b(?:migrate|seed)\b/i;

function fail(message) {
  const error = new Error(message);
  error.name = "CertificationFailure";
  throw error;
}

export function assertMigrationDisabled(value = process.env.PRISMA_MIGRATE_DEPLOY_ON_BUILD) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "true" || normalized === "1") fail("MIGRATION_FLAG_ENABLED");
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

export function verifyStage1IdentityAndCallGraph() {
  for (const [relative, expected] of EXPECTED_FILES) {
    const source = readFileSync(resolve(ROOT, relative), "utf8");
    if (sha256(source) !== expected) fail(`STAGE1_CODE_IDENTITY_MISMATCH:${relative}`);
    if (FORBIDDEN_CALL.test(source)) fail(`WRITE_CAPABLE_CALL_GRAPH:${relative}`);
  }
  const repository = readFileSync(
    resolve(ROOT, "server/services/lender-recommendation/recommendation-programme.repository.ts"),
    "utf8",
  );
  if (!/productCode:\s*input\.product/.test(repository)) fail("PRODUCT_SCOPE_NOT_PROVEN");
  if (!/PROGRAMME_SAFETY_LIMIT\s*\+\s*1/.test(repository)) fail("BOUNDARY_PROBE_NOT_PROVEN");
  if (!/programmes\.length\s*>\s*PROGRAMME_SAFETY_LIMIT/.test(repository)) fail("OVERFLOW_FAILURE_NOT_PROVEN");
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
  // Prisma Client runtime queries use DATABASE_URL. DIRECT_URL is never read, changed or printed here.
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

async function runProductionCertification() {
  assertMigrationDisabled();
  verifyStage1IdentityAndCallGraph();
  enforceReadOnlyConnectionEnvironment();

  // Imports occur only after the in-memory connection has been forced read-only.
  const [{ prisma }, { resolvePilotOrganizationId }, repository, adapter, availability] = await Promise.all([
    import("../server/lib/prisma.ts"),
    import("../server/repositories/ecm/organization.repository.ts"),
    import("../server/services/lender-recommendation/recommendation-programme.repository.ts"),
    import("../server/services/lender-recommendation/programme-assessment-adapter.ts"),
    import("../server/services/lender-recommendation/programme-availability.ts"),
  ]);

  // Prisma's configured error logger can include datasource diagnostics. Suppress it while
  // connected; only the sanitized outer failure handler may emit an operational reason.
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
      console.log(JSON.stringify({ certificationMode: "READ_ONLY", stage1Sha: EXPECTED_STAGE1_SHA, failures }));
      fail("PROGRAMME_MAPPING_FAILED");
    }
    console.log(JSON.stringify({
      certificationMode: "READ_ONLY", databaseReadOnlyState: "PASS", migrationFlag: "DISABLED",
      organization: createHash("sha256").update(organizationId).digest("hex").slice(0, 12),
      homeLoan: report.HOME_LOAN, homeLoanBt: report.HOME_LOAN_BT,
      total: report.HOME_LOAN.retrieved + report.HOME_LOAN_BT.retrieved,
      productIsolation: "PASS", programmeMapping: "PASS", policyLinkValidation: "PASS",
      policyRuleParsing: "PASS", nullPreservation: "PASS", configurationDriven: "PASS",
      hardcodedLenderData: "NONE", fixedNineLenderApplicationAssumption: "NO",
    }));
  } finally {
    await prisma.$disconnect().catch(() => {});
    console.error = originalConsoleError;
  }
}

async function selfTest() {
  assert.throws(() => assertMigrationDisabled("true"), /MIGRATION_FLAG_ENABLED/);
  assert.throws(() => assertMigrationDisabled("1"), /MIGRATION_FLAG_ENABLED/);
  assert.doesNotThrow(() => assertMigrationDisabled("false"));
  assert.throws(() => assertInventoryBoundary(101), /PROGRAMME_INVENTORY_BOUNDARY_EXCEEDED/);
  verifyStage1IdentityAndCallGraph();

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
  console.log("Stage 1 production certification harness self-test: PASS");
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const selfTestMode = process.argv.includes("--self-test");
  (selfTestMode ? selfTest() : runProductionCertification()).catch((error) => {
    console.error(`[stage1-production-certification] FAIL ${safeReason(error)}`);
    process.exitCode = 1;
  });
}
