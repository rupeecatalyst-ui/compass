/**
 * CO-PROG-004 — Baseline commercial program seed verify (static). No migrate / no deploy.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

for (const rel of [
  "src/constants/enterprise-lender-registry/baseline-commercial-program-seed.ts",
  "server/services/tier2-registry/seed-baseline-commercial-programs.service.ts",
  "src/lib/enterprise-lender-registry/seed-baseline-programs.ts",
  "src/app/api/lender-registry/seed-baseline-programs/route.ts",
  "docs/co-prog-004/CO-PROG-004-DEFAULT-LENDER-PROGRAM-SEEDING-READINESS-REPORT.md",
]) {
  assert.ok(exists(rel), `missing ${rel}`);
}

const catalog = read(
  "src/constants/enterprise-lender-registry/baseline-commercial-program-seed.ts",
);
assert.match(catalog, /CO_PROG_004_SEED_TAG/);
assert.match(catalog, /getBaselineCommercialProgramSeeds/);
assert.match(catalog, /normalizeSupportedProductCodes/);
assert.match(catalog, /No website auto-sync/);

const service = read(
  "server/services/tier2-registry/seed-baseline-commercial-programs.service.ts",
);
assert.match(service, /seedBaselineCommercialPrograms/);
assert.match(service, /create-missing|programsSkipped|capabilityFilled/);
assert.match(service, /Never overwrites|never overwrite/i);

const seedCatalog = read("server/services/tier2-registry/seed-catalog.ts");
assert.match(seedCatalog, /normalizeSupportedProductCodes/);
assert.match(seedCatalog, /getLenderProgramSeeds/);
assert.match(seedCatalog, /return \[\];/);
assert.match(seedCatalog, /CO-PROG-004/);

const wizardHelper = read("src/lib/enterprise-lender-registry/program-architecture.ts");
assert.match(wizardHelper, /normalizeSupportedProductCodes/);

const ui = read(
  "src/components/catalyst-one/lender-registry-admin/lender-registry-admin-workspace.tsx",
);
assert.match(ui, /Seed Default Programs/);
assert.match(ui, /seed-baseline-programs/);

const productMaster = read("src/constants/enterprise-product-master/canonical-catalog.ts");
assert.match(productMaster, /GOLD_LOAN/);

const repo = read("server/repositories/lender-registry/lender-registry.repository.ts");
assert.match(repo, /productCode: input\.productCode/);

const tier2Lender = read("server/services/tier2-registry/seed-tier2-registries.service.ts");
assert.match(tier2Lender, /fillCapability/);
assert.match(tier2Lender, /never overwrite administrator capability/i);
console.log("CO-PROG-004 Default Lender Program Seeding verify: PASS");
console.log("NOTE: One-time seed only — no auto-sync; no migrate/deploy in this sprint.");
