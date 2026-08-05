/**
 * CO-WP-LENDER-API-002 — Partner Gateway must never call relative employee lender APIs.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  const p = path.join(root, rel);
  assert.ok(fs.existsSync(p), `Missing ${rel}`);
  return fs.readFileSync(p, "utf8");
}

const masters = read("src/app/api/partner/masters/lenders/route.ts");
assert.match(masters, /partnerLenderMasterService/);
assert.ok(!masters.includes("listCanonicalEnterpriseLenderOptionsAsync"));
assert.ok(!masters.includes("@/lib/api-client"));

const masterSvc = read("server/services/partner-gateway/partner-lender-master.service.ts");
assert.match(masterSvc, /lenderRegistryService/);
assert.match(masterSvc, /listPublishedOptionsForPartner/);
assert.ok(!masterSvc.includes("authenticatedJsonFetch"));
assert.ok(!masterSvc.includes("@/lib/api-client"));
assert.ok(!masterSvc.includes("listCanonicalEnterpriseLenderOptionsAsync"));
assert.ok(!masterSvc.includes("listApiPublished"));

const recSvc = read("server/services/partner-gateway/partner-opportunity-recommendations.service.ts");
assert.match(recSvc, /listPublishedOptionsForPartner/);
assert.match(recSvc, /registryOptions/);
assert.ok(!recSvc.includes("listCanonicalEnterpriseLenderOptionsAsync"));
assert.ok(!recSvc.includes("recommendPublishedLendersFromRegistryAsync"));

const project = read("src/lib/enterprise-partner-recommendations/project.ts");
assert.match(project, /recommendPublishedLendersFromOptions/);
assert.ok(!project.includes("recommendPublishedLendersFromRegistryAsync"));
assert.match(project, /registryOptions/);

const wpApi = path.join(
  path.dirname(root),
  "Wealth Partner App",
  "web",
  "src",
  "lib",
  "enterprise-api.ts",
);
if (fs.existsSync(wpApi)) {
  const src = fs.readFileSync(wpApi, "utf8");
  assert.match(src, /\/api\/partner\/masters\/lenders/);
  assert.ok(!src.includes("/api/lender-registry"));
  assert.match(src, /VITE_CATALYST_ONE_API_URL/);
  console.log("WP enterprise-api: PASS (Partner Gateway only)");
}

console.log("CO-WP-LENDER-API-002 verify: PASS");
