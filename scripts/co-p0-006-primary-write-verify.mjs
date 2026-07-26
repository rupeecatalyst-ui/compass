/**
 * CO-P0-006 Wave 1 — static regression + wiring gate (no Preview/Production deploy).
 * Asserts primary-write create path is wired; does not expand to updates/migration/LS removal.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(name) {
  const path = resolve(process.cwd(), name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

let failed = false;

function ok(msg) {
  console.log(`OK: ${msg}`);
}
function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed = true;
}

function mustContain(rel, needles, label = rel) {
  const path = resolve(process.cwd(), rel);
  if (!existsSync(path)) {
    fail(`missing ${rel}`);
    return;
  }
  const text = readFileSync(path, "utf8");
  for (const needle of needles) {
    if (!text.includes(needle)) fail(`${label} missing "${needle}"`);
  }
  ok(label);
}

const requiredFiles = [
  "src/lib/enterprise-deal/primary-write.ts",
  "src/lib/enterprise-deal/deal-data-access.ts",
  "src/constants/enterprise-deal-registry/flags.ts",
  "scripts/co-p0-006-primary-write-verify.mjs",
  "docs/incidents/CO-P0-006-PRIMARY-PERSISTENCE-CUTOVER-PLAN.md",
];

for (const rel of requiredFiles) {
  if (!existsSync(resolve(process.cwd(), rel))) fail(`missing ${rel}`);
  else ok(rel);
}

mustContain("src/constants/enterprise-deal-registry/flags.ts", [
  "DEAL_REGISTRY_PRIMARY_WRITE",
  "NEXT_PUBLIC_DEAL_REGISTRY_PRIMARY_WRITE",
  "isDealRegistryPrimaryWriteEnabled",
]);

mustContain("src/lib/enterprise-deal/deal-data-access.ts", [
  "createDealAsync",
  "persistNewDealToEnterpriseRegistry",
  "SYNC_CREATE_FORBIDDEN",
  "isDealRegistryPrimaryWriteEnabled",
]);

mustContain("src/lib/enterprise-deal/primary-write.ts", [
  "DealCreatePersistenceError",
  "persistNewDealToEnterpriseRegistry",
  "attachEnterpriseDealIdentity",
]);

mustContain("src/types/catalyst-one.ts", ["enterpriseDealId?", "dealNumber?"]);

mustContain("src/hooks/use-loan-files-workspace.ts", [
  "addFileAsync",
  "createDealAsync",
  "SYNC_CREATE_FORBIDDEN",
]);

// CO-ARCH-006 — create-loan-modal.tsx retired (orphan Soft Go-Live book).
mustContain("src/components/catalyst-one/loan-files/loan-information-workspace.tsx", [
  "addFileAsync",
]);

mustContain("src/lib/enterprise-deal/deal-create-from-opportunity.ts", [
  "createDealFromOpportunity",
]);

mustContain("src/components/catalyst-one/contacts/contact-workspace-modal.tsx", [
  "createDealAsync",
]);

mustContain("src/components/catalyst-one/customers/customer-360-modal.tsx", [
  "createDealAsync",
]);

mustContain("src/lib/strategic-lender-pipeline/ensure-loan-workspace.ts", [
  "createDealAsync",
  "ensureLoanWorkspaceForOpportunityAsync",
]);

mustContain("src/components/catalyst-one/loan-files/loan-create-form-dialog.tsx", [
  "submitting",
  "Promise<void>",
]);

mustContain(".env.example", [
  "DEAL_REGISTRY_PRIMARY_WRITE",
  "NEXT_PUBLIC_DEAL_REGISTRY_PRIMARY_WRITE",
]);

// Scope protection — Wave 1 must not remove localStorage SoR module or add migration importer
const storage = readFileSync(resolve(process.cwd(), "src/lib/loan-files-storage.ts"), "utf8");
if (!storage.includes("export function saveLoanFiles") && !storage.includes("function saveLoanFiles")) {
  fail("loan-files-storage saveLoanFiles unexpectedly removed (Wave 1 keeps cache path)");
} else {
  ok("loan-files-storage retained (cache / rollback)");
}

const dal = readFileSync(resolve(process.cwd(), "src/lib/enterprise-deal/deal-data-access.ts"), "utf8");
if (!dal.includes("export function updateDeal")) {
  fail("updateDeal missing — Wave 1 must not rewrite update path");
} else {
  ok("updateDeal retained (Wave 1 create-only cutover)");
}

if (dal.includes("persistNewDealToEnterpriseRegistry") && dal.includes("export async function updateDealAsync")) {
  fail("updateDealAsync present — out of Wave 1 scope");
} else {
  ok("no primary updateDealAsync (scope protected)");
}

// Preconditions for local primary write
const mode = process.env.ENTERPRISE_PERSISTENCE_MODE;
const pub = process.env.NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE;
if (mode !== "prisma" || pub !== "prisma") {
  fail(
    `Local primary write requires ENTERPRISE_PERSISTENCE_MODE=prisma and NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE=prisma (got ${mode}/${pub})`,
  );
} else {
  ok("persistence mode prisma (server + public)");
}

const primaryExplicit = process.env.DEAL_REGISTRY_PRIMARY_WRITE ?? process.env.NEXT_PUBLIC_DEAL_REGISTRY_PRIMARY_WRITE;
if (primaryExplicit === "false" || primaryExplicit === "0") {
  fail("DEAL_REGISTRY_PRIMARY_WRITE explicitly false — Wave 1 Local Certification expects primary ON");
} else {
  ok(
    primaryExplicit
      ? `DEAL_REGISTRY_PRIMARY_WRITE=${primaryExplicit}`
      : "DEAL_REGISTRY_PRIMARY_WRITE unset (defaults ON under prisma)",
  );
}

if (failed) {
  console.error("\nCO-P0-006 Wave 1 VERIFY FAILED");
  process.exit(1);
}
console.log("\nCO-P0-006 Wave 1 VERIFY PASSED");
