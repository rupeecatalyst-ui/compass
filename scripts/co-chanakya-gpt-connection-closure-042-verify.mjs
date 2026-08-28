/**
 * CO-CHANAKYA-GPT-CONNECTION-CLOSURE-042 — Custom GPT enterprise-read routing verification.
 * Usage: node --import tsx scripts/co-chanakya-gpt-connection-closure-042-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveChatGptEnterpriseReadMode } from "../src/lib/chatgpt-integration/resolve-enterprise-read-mode.ts";
import { oauthScopesForEndpoint } from "../src/lib/chatgpt-integration/oauth-scopes.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

let failed = 0;
function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.error(`FAIL  ${msg}`);
}

const actionOpenapi = "docs/co-chatgpt-integration/CO-CHATGPT-GPT-ACTION.openapi.yaml";
const v1Openapi = "docs/co-chatgpt-integration/CO-CHATGPT-INTEGRATION-V1.openapi.yaml";
const composePath = "server/services/chatgpt-integration/compose-enterprise-read.ts";

for (const rel of [actionOpenapi, v1Openapi, composePath]) {
  if (fs.existsSync(path.join(root, rel))) ok(`exists ${rel}`);
  else fail(`missing ${rel}`);
}

const yaml = read(actionOpenapi);
const v1 = read(v1Openapi);
const compose = read(composePath);

// --- A Action routing model ---
if (/Action routing model.*042/i.test(yaml)) ok("OpenAPI action routing model documented");
else fail("OpenAPI action routing model missing");

if (/gptActionEnterpriseRead[\s\S]*PRIMARY deep CHANAKYA/i.test(yaml)) {
  ok("enterprise-read marked PRIMARY");
} else fail("enterprise-read PRIMARY marker missing");

if (/gptActionChanakya[\s\S]*NEVER USE FOR/i.test(yaml)) {
  ok("Radar action lists NEVER USE FOR deal/opp depth");
} else fail("Radar NEVER USE FOR section missing");

if (!/operationId:\s*gptActionDeal/i.test(yaml)) ok("no duplicate per-deal GPT actions");
else fail("duplicate per-deal action detected");

// --- B Deal-wise routing ---
for (const needle of [
  "DEAL-2026-000082",
  "dealRef",
  "Deal 360",
  "Deal-wise access",
  "this deal",
  "lender stage",
  "post-disbursement",
]) {
  if (yaml.includes(needle) || yaml.toLowerCase().includes(needle.toLowerCase())) {
    ok(`deal routing doc: ${needle}`);
  } else fail(`deal routing doc missing: ${needle}`);
}

if (
  resolveChatGptEnterpriseReadMode({
    modeRaw: "enterprise",
    dealRef: "DEAL-2026-000082",
  }) === "transaction"
) {
  ok("dealRef coerces to transaction mode");
} else fail("dealRef mode coercion broken");

// --- C Opportunity-wise routing ---
for (const needle of [
  "OPP-2026-000060",
  "opportunityRef",
  "Opportunity 360",
  "Opportunity-wise access",
]) {
  if (yaml.includes(needle)) ok(`opportunity routing doc: ${needle}`);
  else fail(`opportunity routing doc missing: ${needle}`);
}

if (
  resolveChatGptEnterpriseReadMode({
    modeRaw: "enterprise",
    opportunityRef: "OPP-2026-000060",
  }) === "opportunity"
) {
  ok("opportunityRef coerces to opportunity mode");
} else fail("opportunityRef mode coercion broken");

// --- D Follow-up context ---
for (const needle of [
  "Follow-up",
  "requestedEntityRefs",
  "reuse",
  "What should I do next",
  "Why is it stuck",
]) {
  if (yaml.includes(needle)) ok(`follow-up guidance: ${needle}`);
  else fail(`follow-up guidance missing: ${needle}`);
}

if (compose.includes("requestedEntityRefs")) {
  ok("compose echoes requestedEntityRefs for follow-up");
} else fail("compose missing requestedEntityRefs echo");

// --- E Test matrix (contract-level) ---
const matrix = [
  ["Tell me about DEAL-2026-000082", "DEAL-2026-000082"],
  ["Why is this deal stuck", "stuck"],
  ["What changed in this deal", "changePeriod"],
  ["What documents are pending", "documents"],
  ["accounting/commercial status", "commercial"],
  ["Which lender is assigned", "lender"],
  ["What should I do next", "next"],
  ["OPP-2026-000060", "OPP-2026-000060"],
  ["complete 360 analysis", "360"],
];
for (const [label, needle] of matrix) {
  if (yaml.includes(needle)) ok(`test matrix coverage: ${label}`);
  else fail(`test matrix missing: ${label}`);
}

// --- F Security / Phase 2 ---
if (/FOIR[\s\S]*DSCR[\s\S]*LTV[\s\S]*DBR[\s\S]*Phase 2/i.test(yaml)) {
  ok("Phase-2 ratio deferral in OpenAPI");
} else fail("Phase-2 ratio deferral missing");

const scopes = oauthScopesForEndpoint("/api/integrations/chatgpt/v1/enterprise-read");
if (scopes.includes("chatgpt:read") && scopes.includes("chatgpt:chanakya")) {
  ok("OAuth scopes unchanged for enterprise-read");
} else fail("OAuth scopes unexpected");

if (/never binaries|Never document binaries/i.test(yaml) && /mobile|email/i.test(yaml)) {
  ok("PII/binary prohibitions documented");
} else fail("PII/binary prohibitions weak");

if (v1.includes("requestedEntityRefs") || v1.includes("Deal-wise")) {
  ok("V1 OpenAPI parity for 042 routing");
} else fail("V1 OpenAPI missing 042 routing parity");

if (yaml.includes("version: 1.1.0")) ok("GPT Action OpenAPI version bumped to 1.1.0");
else fail("GPT Action OpenAPI version not bumped");

console.log("");
if (failed > 0) {
  console.error(`CO-CHANAKYA-042 VERIFY FAILED (${failed})`);
  process.exit(1);
}
console.log("CO-CHANAKYA-042 VERIFY PASSED");
process.exit(0);
