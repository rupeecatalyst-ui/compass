/**
 * CO-C1-SSOT-SYNC-001 — static verify Contact + Deal amount SSOT wiring.
 * Usage: node scripts/co-c1-ssot-sync-001-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.error(`FAIL  ${msg}`);
}
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const propagate = read("server/services/ecm/contact-ssot-propagate.ts");
const oppSerialize = read("server/services/enterprise-opportunity/opportunity-serialize.ts");
const dealSerialize = read("server/services/enterprise-deal/deal-serialize.ts");
const oppService = read("server/services/enterprise-opportunity/index.ts");
const dealService = read("server/services/enterprise-deal/enterprise-deal.service.ts");
const pipeline = read("src/lib/enterprise-deal/deal-pipeline-runtime.ts");
const contactService = read("server/services/ecm/contact.service.ts");

if (propagate.includes("hydrateTransactionContactIdentity")) {
  ok("Contact SSOT hydrate helper present");
} else fail("Missing hydrateTransactionContactIdentity");

if (propagate.includes("syncContactIdentityPatchToEcm")) {
  ok("Opportunity/Deal → ECM write-through helper present");
} else fail("Missing syncContactIdentityPatchToEcm");

if (contactService.includes("propagateContactIdentityToTransactions")) {
  ok("Contact update propagates to Opp/Deal mirrors");
} else fail("Contact service missing propagate hook");

if (oppSerialize.includes("serializeOpportunityWithContactSsot")) {
  ok("Opportunity API hydrates ECM identity on serialize");
} else fail("Opportunity serialize missing ECM hydration");

if (dealSerialize.includes("serializeDealWithContactSsot")) {
  ok("Deal API hydrates ECM identity on serialize");
} else fail("Deal serialize missing ECM hydration");

if (oppService.includes("syncContactIdentityPatchToEcm")) {
  ok("Opportunity PATCH writes contact-owned fields to ECM");
} else fail("Opportunity service missing ECM write-through");

if (dealService.includes("syncContactIdentityPatchToEcm")) {
  ok("Deal PATCH writes contact-owned fields to ECM");
} else fail("Deal service missing ECM write-through");

if (/deal\.requestedAmount\s*\?\?\s*derived\?\.expectedLoanAmount/.test(pipeline)) {
  ok("Pipeline read prefers Deal.requestedAmount over snapshot");
} else fail("dealToLenderExecution must prefer requestedAmount");

if (pipeline.includes("requestedAmount: nextRequestedAmount")) {
  ok("Deal Control persist writes requestedAmount");
} else fail("persistDealPipelineLenders must PATCH requestedAmount");

if (pipeline.includes("toDealPipelineContext(resolvedAnchor)")) {
  ok("Runtime context rebuilds from patched anchor deal");
} else fail("toRuntime must hydrate context from resolved anchor");

if (failed === 0) {
  console.log("\nCO-C1-SSOT-SYNC-001: PASS");
  process.exit(0);
}
console.error(`\nCO-C1-SSOT-SYNC-001: FAIL (${failed})`);
process.exit(1);
