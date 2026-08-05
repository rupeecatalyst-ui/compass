/**
 * CO-LM-003 — Default Foreign Banks in Lender Registry (static verify).
 * No migrate / no deploy / no Opportunity·Deal·Loan mutation.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

const REQUIRED = [
  "Standard Chartered Bank",
  "HSBC Bank",
  "DBS Bank India",
  "Deutsche Bank",
  "Bank of America",
  "Citibank",
  "Shinhan Bank",
  "State Bank of Mauritius",
  "Doha Bank",
];

const SEED_KEYS = [
  "standard_chartered",
  "hsbc",
  "dbs_india",
  "deutsche_bank",
  "bank_of_america",
  "citibank",
  "shinhan_bank",
  "state_bank_mauritius",
  "doha_bank",
];

for (const rel of [
  "src/constants/enterprise-lender-registry/master-seed-catalog.ts",
  "server/services/tier2-registry/seed-catalog.ts",
  "server/services/tier2-registry/seed-tier2-registries.service.ts",
  "src/lib/enterprise-lender-registry/bootstrap-master.ts",
  "docs/co-lm-003/CO-LM-003-FOREIGN-BANKS-READINESS-REPORT.md",
]) {
  assert.ok(exists(rel), `missing ${rel}`);
}

const catalog = read("src/constants/enterprise-lender-registry/master-seed-catalog.ts");
assert.match(catalog, /CO_ARCH_004_MASTER_SEED_VERSION = 2/);
assert.match(catalog, /FOREIGN_BANKS/);
assert.match(catalog, /categoryCode:\s*"foreign_bank"/);
assert.match(catalog, /classification:\s*"foreign_bank"/);
assert.match(catalog, /defaultRecord:\s*true/);
assert.match(catalog, /CO_LM_003_FOREIGN_BANK_SEED_KEYS/);

for (const name of REQUIRED) {
  assert.ok(catalog.includes(`displayName: "${name}"`), `missing displayName ${name}`);
}
for (const key of SEED_KEYS) {
  assert.ok(catalog.includes(`seedKey: "${key}"`), `missing seedKey ${key}`);
}

const seedKeys = [...catalog.matchAll(/seedKey:\s*"([^"]+)"/g)].map((m) => m[1]);
assert.equal(new Set(seedKeys).size, seedKeys.length, "duplicate seedKey in catalog");
for (const key of SEED_KEYS) {
  assert.equal(
    seedKeys.filter((k) => k === key).length,
    1,
    `seedKey ${key} must appear exactly once`,
  );
}

const foreignBlock = catalog.slice(catalog.indexOf("const FOREIGN_BANKS"));
const foreignDisplayNames = [
  ...foreignBlock.matchAll(/displayName:\s*"([^"]+)"/g),
].map((m) => m[1]);
assert.equal(foreignDisplayNames.length, 9, `expected 9 foreign banks, got ${foreignDisplayNames.length}`);
assert.deepEqual(foreignDisplayNames.sort(), [...REQUIRED].sort());

const seedCat = read("server/services/tier2-registry/seed-catalog.ts");
assert.match(seedCat, /code:\s*"foreign_bank"/);
assert.match(seedCat, /label:\s*"Foreign Bank"/);
assert.match(seedCat, /categoryCode:\s*normalizeLenderRegistryCode\(\s*l\.categoryCode/);

const seedSvc = read("server/services/tier2-registry/seed-tier2-registries.service.ts");
assert.match(seedSvc, /foreign_bank/);
assert.match(seedSvc, /Duplicate check by display name/);
assert.match(seedSvc, /classification !== "foreign_bank"/);

const boot = read("src/lib/enterprise-lender-registry/bootstrap-master.ts");
assert.match(boot, /foreign_bank/);
assert.match(boot, /Foreign Bank/);
assert.match(boot, /ensureCategory/);
assert.match(boot, /co-lm-003/);

const types = read("src/types/enterprise-lender-registry.ts");
assert.match(types, /foreign_bank/);
assert.match(types, /Foreign Bank/);

const wizard = read(
  "src/components/catalyst-one/lender-registry-admin/new-lender-wizard.tsx",
);
assert.match(wizard, /foreign_bank:\s*"bank"/);

assert.ok(!exists("prisma/migrations/20260729130000_co_lm_003_foreign_banks"));

console.log("CO-LM-003 Default Foreign Banks verify: PASS");
console.log(`Foreign banks in catalog: ${REQUIRED.length}`);
console.log("Duplicate seedKeys: none");
console.log("NOTE: No migrate / no deploy / no Opportunity·Deal·Loan mutation.");
