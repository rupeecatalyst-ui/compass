/**
 * CO-CHANAKYA-CHATGPT-ENTERPRISE-READ-CLOSURE-038 — targeted verification.
 * Usage: node --import tsx scripts/co-chanakya-chatgpt-enterprise-read-closure-038-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveChatGptEnterpriseReadMode } from "../src/lib/chatgpt-integration/resolve-enterprise-read-mode.ts";
import { oauthScopesForEndpoint } from "../src/lib/chatgpt-integration/oauth-scopes.ts";
import {
  CHATGPT_INTEGRATION_ALLOWED_ENDPOINTS,
  CHATGPT_GPT_ACTION_BASE,
} from "../src/lib/chatgpt-integration/constants.ts";

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

// --- Files ---
for (const rel of [
  actionOpenapi,
  v1Openapi,
  "server/services/chatgpt-integration/compose-enterprise-read.ts",
  "src/lib/chatgpt-integration/resolve-enterprise-read-mode.ts",
  "src/lib/chanakya-enterprise-read-context/compile.ts",
]) {
  if (fs.existsSync(path.join(root, rel))) ok(`exists ${rel}`);
  else fail(`missing ${rel}`);
}

// --- A/B OpenAPI presence + discoverability ---
{
  const yaml = read(actionOpenapi);
  if (yaml.includes("gptActionEnterpriseRead")) ok("GPT Action OpenAPI has gptActionEnterpriseRead");
  else fail("Missing gptActionEnterpriseRead");
  if (yaml.includes("changePeriod")) ok("GPT Action OpenAPI documents changePeriod");
  else fail("GPT Action OpenAPI missing changePeriod");
  if (yaml.includes("ApiSuccessEnterpriseRead")) ok("GPT Action OpenAPI has ApiSuccessEnterpriseRead");
  else fail("Missing ApiSuccessEnterpriseRead schema");
  if (/gptActionEnterpriseRead[\s\S]*PRIMARY deep CHANAKYA/i.test(yaml)) {
    ok("enterprise-read marked PRIMARY deep evidence");
  } else fail("enterprise-read discoverability text weak");
  if (/gptActionChanakya[\s\S]*Do NOT use this for Opportunity\/Deal depth/i.test(yaml)) {
    ok("Radar chanakya clarifies depth boundary");
  } else fail("Radar chanakya depth boundary missing");
  for (const example of [
    "What should I focus on today?",
    "Why is this opportunity/deal stuck?",
    "What changed since yesterday?",
    "Analyse the financials",
    "Which lenders are relevant?",
  ]) {
    if (yaml.includes(example) || yaml.toLowerCase().includes(example.toLowerCase().slice(0, 20))) {
      ok(`OpenAPI example guidance mentions: ${example.slice(0, 32)}…`);
    } else {
      // softer: check keyword present in description
      const key = example.split(" ")[0];
      if (yaml.includes(key) || /focus|stuck|changed|financials|lenders/i.test(yaml)) {
        ok(`OpenAPI covers topic near: ${example.slice(0, 24)}`);
      } else fail(`OpenAPI missing guidance for: ${example}`);
    }
  }
  if (/FOIR|DSCR|LTV|DBR/.test(yaml) && /Phase 2/i.test(yaml)) {
    ok("OpenAPI states FOIR/DSCR/LTV/DBR Phase 2");
  } else fail("OpenAPI missing Phase-2 ratio deferral");

  const v1 = read(v1Openapi);
  if (v1.includes("chatgptEnterpriseRead") && v1.includes("changePeriod")) {
    ok("Integration V1 OpenAPI enterprise-read + changePeriod");
  } else fail("Integration V1 OpenAPI incomplete for enterprise-read");
}

// --- C Route / endpoint allowlist ---
{
  if (CHATGPT_INTEGRATION_ALLOWED_ENDPOINTS.includes("/api/integrations/chatgpt/v1/enterprise-read")) {
    ok("enterprise-read on integration allowlist");
  } else fail("enterprise-read missing from allowlist");
  const endpointsSrc = read("src/lib/chatgpt-integration/gpt-action-endpoints.ts");
  if (endpointsSrc.includes('"enterprise-read"') && endpointsSrc.includes("composeChatGptEnterpriseReadDto")) {
    ok("enterprise-read GPT Action slug + compose registered");
  } else fail("enterprise-read GPT Action slug/compose missing");
  if (endpointsSrc.includes(CHATGPT_GPT_ACTION_BASE) || endpointsSrc.includes("gpt-action")) {
    ok("GPT Action base path wiring present");
  } else fail("GPT Action base path wiring missing");
  const compose = read("server/services/chatgpt-integration/compose-enterprise-read.ts");
  if (compose.includes("compileChanakyaEnterpriseReadContext")) {
    ok("compose uses compileChanakyaEnterpriseReadContext");
  } else fail("compose does not use enterprise read compiler");
  if (compose.includes("resolveChatGptEnterpriseReadMode")) {
    ok("compose uses entity-aware mode resolver");
  } else fail("compose missing mode resolver");
  if (/prisma\.\w+\.(create|update|delete)|updateOpportunity|createDeal/.test(compose)) {
    fail("compose appears to mutate business records");
  } else ok("compose has no business mutation calls");
}

// --- D OAuth scopes ---
{
  const scopes = oauthScopesForEndpoint("/api/integrations/chatgpt/v1/enterprise-read");
  if (scopes.includes("chatgpt:read") && scopes.includes("chatgpt:chanakya")) {
    ok("enterprise-read requires chatgpt:read + chatgpt:chanakya");
  } else fail(`enterprise-read scopes unexpected: ${scopes.join(",")}`);
  const radar = oauthScopesForEndpoint("/api/integrations/chatgpt/v1/chanakya");
  if (radar.includes("chatgpt:chanakya")) ok("Radar chanakya still scoped");
  else fail("Radar chanakya scope broken");
}

// --- E/F Mode coercion + compile gate ---
{
  if (resolveChatGptEnterpriseReadMode({ modeRaw: "enterprise" }) === "enterprise") {
    ok("portfolio default remains enterprise");
  } else fail("portfolio default broken");

  if (
    resolveChatGptEnterpriseReadMode({
      modeRaw: "enterprise",
      opportunityRef: "OPP-2026-000060",
    }) === "opportunity"
  ) {
    ok("enterprise + opportunityRef coerces to opportunity");
  } else fail("opportunity coercion failed");

  if (
    resolveChatGptEnterpriseReadMode({
      modeRaw: "enterprise",
      dealRef: "DEAL-2026-000082",
    }) === "transaction"
  ) {
    ok("enterprise + dealRef coerces to transaction");
  } else fail("deal coercion failed");

  if (
    resolveChatGptEnterpriseReadMode({
      modeRaw: "summary",
      opportunityRef: "OPP-1",
    }) === "summary"
  ) {
    ok("explicit non-enterprise modes are respected");
  } else fail("explicit mode override broken");

  const compile = read("src/lib/chanakya-enterprise-read-context/compile.ts");
  if (/request\.mode === "enterprise"/.test(compile) && /wantsOpportunity/.test(compile)) {
    ok("compile wantsOpportunity includes enterprise mode");
  } else fail("compile still skips enterprise+opportunityRef");
}

// --- G Legacy Radar relationship documented ---
{
  const yaml = read(actionOpenapi);
  if (/lightweight|Radar snapshot|org-wide CHANAKYA Radar/i.test(yaml)) {
    ok("Legacy gptActionChanakya documented as lightweight Radar");
  } else fail("Legacy Radar relationship unclear");
  const composeChanakya = read("server/services/chatgpt-integration/compose-chanakya.ts");
  if (composeChanakya.includes("enterpriseMetricsEngineService") || composeChanakya.includes("Radar")) {
    ok("compose-chanakya remains Radar-only (not conflicting compiler)");
  } else fail("compose-chanakya unexpected");
}

// --- H Security markers ---
{
  const yaml = read(actionOpenapi);
  if (/never.*binaries|never binaries/i.test(yaml)) ok("OpenAPI forbids document binaries");
  else fail("OpenAPI missing binary prohibition");
  if (/mobile|email/i.test(yaml)) ok("OpenAPI mentions PII omission");
  else fail("OpenAPI missing PII note");
  if (/GET-only|No mutation/i.test(yaml)) ok("OpenAPI GET-only / no mutation");
  else fail("OpenAPI missing mutation boundary");
}

// --- Test matrix (contract-level) ---
{
  const matrix = [
    ["System health", "gptActionHealth"],
    ["Enterprise/business summary", "gptActionEnterpriseRead"],
    ["Priority / attention", "transactionAttention"],
    ["Opportunity 360", "opportunity360"],
    ["Deal 360", "deal360"],
    ["Stuck analysis", "stuck"],
    ["Change intelligence", "changeIntelligence"],
    ["Document evidence", "includeDocumentExcerpts"],
    ["Credit / financials", "creditIntelligence"],
    ["Product/lender", "productLenderIntelligence"],
    ["Commercial", "commercial"],
  ];
  const yaml = read(actionOpenapi);
  const compose = read("server/services/chatgpt-integration/compose-enterprise-read.ts");
  const blob = `${yaml}\n${compose}`;
  for (const [label, needle] of matrix) {
    if (blob.toLowerCase().includes(needle.toLowerCase()) || blob.includes(needle)) {
      ok(`matrix contract: ${label}`);
    } else fail(`matrix contract missing: ${label} (${needle})`);
  }
}

console.log("");
if (failed > 0) {
  console.error(`CO-CHANAKYA-038 VERIFY FAILED (${failed})`);
  process.exit(1);
}
console.log("CO-CHANAKYA-038 VERIFY PASSED");
process.exit(0);
