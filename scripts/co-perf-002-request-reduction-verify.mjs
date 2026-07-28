/**

 * CO-PERF-002 — Request reduction + progressive loading engineering gate.

 * Run: node scripts/co-perf-002-request-reduction-verify.mjs

 */



import assert from "node:assert/strict";

import fs from "node:fs";

import path from "node:path";

import { fileURLToPath } from "node:url";



const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");



const move = read("src/lib/strategic-lender-pipeline/move-to-deal.ts");

assert.doesNotMatch(move, /invalidatePublishedLendersSession/);

assert.match(move, /Promise\.all/);

assert.match(move, /Parallel Deal creates/);



const runtime = read("src/lib/enterprise-deal/deal-pipeline-runtime.ts");

assert.match(runtime, /peekSessionOpportunity|bootstrapDealWorkspace/);

assert.match(runtime, /CO-PERF-002/);

assert.match(runtime, /Parallel soft-deletes|Optimistic merge after confirmed soft-delete/);

assert.doesNotMatch(

  runtime,

  /return loadDealPipelineRuntime\(reloadId, \{ forceRefresh: true \}\)/,

);



const ctx = read(

  "src/components/catalyst-one/opportunity-workspace/opportunity-workspace-context.tsx",

);

assert.match(ctx, /peekSessionOpportunity/);

assert.match(ctx, /Skip org-wide Deal list hydrate/);



const creation = read(

  "src/components/catalyst-one/opportunity-workspace/opportunity-creation-stage.tsx",

);

assert.match(creation, /peekSessionOpportunity/);



const ecm = read("src/lib/enterprise-persistence/ecm-persist.ts");

assert.match(ecm, /hydrateCompanyLinksFromPrisma/);

assert.doesNotMatch(ecm, /companiesResult\.items\.map\(\(c\) => ecmApiClient\.listCompanyLinks/);



const modal = read(

  "src/components/catalyst-one/companies/company-workspace-modal.tsx",

);

assert.match(modal, /hydrateCompanyLinksFromPrisma/);



// Sprint C — progressive My Deals + bootstrap + Tier-0

assert.match(read("server/services/enterprise-deal/deal-serialize.ts"), /serializeDealSummary/);

assert.match(

  read("src/lib/enterprise-deal/deal-registry-port.ts"),

  /view: "summary"/,

);

assert.match(

  read("src/lib/enterprise-deal/deal-registry-port.ts"),

  /enrichMyDealsDealRegistryRows/,

);

assert.match(

  read("src/components/catalyst-one/my-deals/my-deals-workspace.tsx"),

  /enrichMyDealsDealRegistryRows/,

);

assert.match(read("src/lib/enterprise-deal/deal-api-client.ts"), /bootstrapDealWorkspace/);

assert.match(read("src/lib/enterprise-deal/deal-pipeline-runtime.ts"), /bootstrapDealWorkspace/);

assert.match(read("src/types/enterprise-deal.ts"), /"siblings"/);

assert.match(read("src/lib/enterprise-tier0-cache/index.ts"), /warmTier0EnterpriseCache/);

assert.match(read("src/layouts/dashboard-layout.tsx"), /warmTier0EnterpriseCache/);

assert.match(

  read("src/components/catalyst-one/deal-workspace/deal-workspace-host.tsx"),

  /opens on demand/,

);



console.log(

  "CO-PERF-002 progressive loading verify PASS (engineering gate — RUM still required for certification).",

);


