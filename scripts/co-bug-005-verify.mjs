/**
 * CO-BUG-005 — Banker Institution ↔ Enterprise Lender Registry integration (static gates).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const required = [
  "src/components/catalyst-one/contacts/banker-lender-registry-fields.tsx",
  "docs/co-bug-005/CO-BUG-005-LENDER-REGISTRY-LOOKUP-INVESTIGATION.md",
];
for (const rel of required) {
  assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
}

const banker = read(
  "src/components/catalyst-one/contacts/banker-lender-registry-fields.tsx",
);
assert.match(banker, /EnterpriseLenderRegistrySelect/);
assert.match(banker, /lenderRegistryClient/);
assert.match(banker, /BankerInstitutionSelect/);
assert.match(banker, /BankerCitySelect/);
assert.match(banker, /BankerBranchSelect/);

const modal = read(
  "src/components/catalyst-one/contacts/contact-workspace-modal.tsx",
);
assert.match(modal, /BankerInstitutionSelect/);
assert.match(modal, /ensureTier2RegistryPortsHydrated/);
assert.match(modal, /CO-BUG-005/);

const cache = read("src/lib/enterprise-tier2-ports/ports/cache-store.ts");
assert.match(cache, /CO-BUG-005/);
assert.match(cache, /id: record\.id/);
const lenderFn = cache.slice(cache.indexOf("function toLenderOption"));
assert.match(lenderFn.slice(0, 800), /id: record\.id/);
assert.ok(!lenderFn.slice(0, 800).includes("id: record.code"), "toLenderOption must not use code as id");

const masters = read("src/constants/enterprise-contact-master/masters.ts");
assert.match(masters, /Empty Tier-2 cache must not block/);

const template = read("src/constants/enterprise-contact-master/role-templates.ts");
assert.match(template, /Enterprise Lender Registry/);
assert.match(template, /parentFieldKey: \"institution\"/);

console.log("CO-BUG-005 verify: PASS");
