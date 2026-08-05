/**
 * CO-WP-LENDER-SSOT-001 — static verify (no deploy).
 * Ensures Partner lender search uses Prisma Enterprise Lender Registry (not browser fetch).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  const p = path.join(root, rel);
  assert.ok(fs.existsSync(p), `Missing: ${rel}`);
  return fs.readFileSync(p, "utf8");
}

const route = read("src/app/api/partner/masters/lenders/route.ts");
assert.match(route, /partnerLenderMasterService/);
assert.ok(!route.includes("listCanonicalEnterpriseLenderOptionsAsync"));
assert.ok(!route.includes("@/lib/api-client"));
assert.ok(!route.includes("listLocalPublished"));

const svc = read("server/services/partner-gateway/partner-lender-master.service.ts");
assert.match(svc, /lenderRegistryService/);
assert.match(svc, /searchPartnerEnterpriseLenders/);
assert.match(svc, /operationalStatus/);
assert.match(svc, /aliases/);
assert.ok(!svc.includes("authenticatedJsonFetch"));
assert.ok(!svc.includes("listLocalPublished"));

const barrel = read("server/services/partner-gateway/index.ts");
assert.match(barrel, /partnerLenderMasterService/);

const masterSeed = read("src/constants/enterprise-lender-registry/master-seed-catalog.ts");
assert.match(masterSeed, /Axis Bank/);
assert.match(masterSeed, /seedKey:\s*"axis"/);

const wpSelect = path.join(
  path.dirname(root),
  "Wealth Partner App",
  "web",
  "src",
  "components",
  "business",
  "PartnerLenderSelect.tsx",
);
if (fs.existsSync(wpSelect)) {
  const src = fs.readFileSync(wpSelect, "utf8");
  assert.match(src, /partnerSearchLenders/);
  assert.match(src, /hit\.id/);
  assert.ok(!/AXIS_BANK|hardcodedLenders/i.test(src));
  console.log("WP PartnerLenderSelect: PASS (stores Registry id)");
} else {
  console.log("WP PartnerLenderSelect: SKIP (path not found)");
}

console.log("CO-WP-LENDER-SSOT-001 verify: PASS");
