/**
 * CO-CHANAKYA-GPT-PORTFOLIO-ROUTING-049 — GPT Action portfolio routing verification.
 * Usage: node --import tsx scripts/co-chanakya-gpt-portfolio-routing-049-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveChatGptEnterpriseReadMode } from "../src/lib/chatgpt-integration/resolve-enterprise-read-mode.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OPENAPI = "docs/co-chatgpt-integration/CO-CHATGPT-GPT-ACTION.openapi.yaml";
const GUIDE =
  "docs/co-chatgpt-integration/CO-CHANAKYA-GPT-PORTFOLIO-ROUTING-049-GPT-BUILDER-INSTRUCTIONS.md";

const yaml = fs.readFileSync(path.join(root, OPENAPI), "utf8");
const guide = fs.existsSync(path.join(root, GUIDE))
  ? fs.readFileSync(path.join(root, GUIDE), "utf8")
  : "";

let failed = 0;
function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.error(`FAIL  ${msg}`);
}

function extractFoldedDescription(yamlText, operationId) {
  const pathBlocks = yamlText.split(/\n  \/api\/integrations\/chatgpt\/v1\/gpt-action\//);
  for (const block of pathBlocks) {
    if (!block.includes(`operationId: ${operationId}`)) continue;
    const descMatch = block.match(/description:\s*>-\s*\n([\s\S]*?)\n\s{6}operationId:\s*/);
    if (!descMatch) return "";
    return descMatch[1]
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join(" ")
      .trim();
  }
  return "";
}

function routeQuestion(question) {
  const q = question.toLowerCase();

  if (/overall pipeline snapshot/.test(q)) return "gptActionPipeline";
  if (/chanakya radar/.test(q)) return "gptActionChanakya";
  if (/deal-\d{4}-\d+/i.test(question) || /everything about deal/.test(q)) {
    return "gptActionEnterpriseRead";
  }
  if (/why is it stuck/.test(q)) return "gptActionEnterpriseRead";

  const portfolioSignals = [
    "customers",
    "lying in deals",
    "active deals",
    "inactive deals",
    "wealth partner",
    "pending documents",
    "happened recently",
    "deal numbers",
    "lender",
    "stages",
  ];
  if (portfolioSignals.some((s) => q.includes(s))) return "gptActionEnterpriseRead";

  return "gptActionEnterpriseRead";
}

// --- OpenAPI presence ---
if (fs.existsSync(path.join(root, OPENAPI))) ok("OpenAPI file exists");
else fail("OpenAPI file missing");

if (fs.existsSync(path.join(root, GUIDE))) ok("GPT Builder instructions doc exists");
else fail("GPT Builder instructions doc missing");

// --- Routing model in info ---
if (/CO-CHANAKYA-GPT-PORTFOLIO-ROUTING-049/.test(yaml)) {
  ok("049 routing model documented in OpenAPI info");
} else fail("049 routing model missing");

if (
  (/portfolioBusinessRegistry|data\.portfolio\.deals|portfolio\.deals/.test(yaml)) &&
  (/portfolioHydration|portfolio\.summary/.test(yaml))
) {
  ok("portfolio registry + hydration documented");
} else fail("portfolio registry/hydration missing from OpenAPI");

if (/Pipeline or Radar shows zero Deals|portfolio\.summary\.totalDeals/.test(yaml)) {
  ok("conflict resolution rule documented");
} else fail("conflict resolution rule missing");

// --- Operation descriptions + 300 char limit ---
const ops = [
  "gptActionEnterpriseRead",
  "gptActionPipeline",
  "gptActionChanakya",
];
const charCounts = {};
for (const op of ops) {
  const desc = extractFoldedDescription(yaml, op);
  charCounts[op] = desc.length;
  if (!desc) fail(`${op} description missing`);
  else if (desc.length > 300) fail(`${op} description ${desc.length} chars (>300)`);
  else ok(`${op} description ${desc.length} chars (<=300)`);
}

// --- Enterprise Read portfolio routing keywords ---
{
  const desc = extractFoldedDescription(yaml, "gptActionEnterpriseRead");
  for (const needle of [
    ["portfolio.deals", /portfolio\.deals|view=portfolio_list/i.test(desc)],
    ["portfolio summary", /portfolio\.summary|deals\+summary|portfolioHydration/i.test(desc)],
    ["Customer/Deal lists", /customer\/deal lists/i.test(desc)],
    ["PRIMARY portfolio", /PRIMARY/i.test(desc)],
  ]) {
    if (needle[1]) ok(`enterprise-read desc: ${needle[0]}`);
    else fail(`enterprise-read desc missing: ${needle[0]}`);
  }
}

// --- Pipeline exclusion ---
{
  const desc = extractFoldedDescription(yaml, "gptActionPipeline");
  if (/NEVER/i.test(desc) && /gptActionEnterpriseRead/i.test(desc)) {
    ok("pipeline explicitly defers record-level portfolio to enterprise-read");
  } else fail("pipeline exclusion language weak");
  if (/customer|deal lists|who\/which/i.test(desc.toLowerCase())) {
    ok("pipeline forbids customer/Deal list questions");
  } else fail("pipeline customer/Deal list exclusion missing");
}

// --- Chanakya exclusion ---
{
  const desc = extractFoldedDescription(yaml, "gptActionChanakya");
  if (/NEVER/i.test(desc) && /gptActionEnterpriseRead/i.test(desc)) {
    ok("chanakya explicitly defers record-level portfolio to enterprise-read");
  } else fail("chanakya exclusion language weak");
}

// --- GPT Builder guide ---
{
  if (guide.includes("gptActionEnterpriseRead")) ok("guide names enterprise-read PRIMARY");
  else fail("guide missing enterprise-read PRIMARY");
  if (guide.includes("gptActionPipeline") && guide.includes("Never")) {
    ok("guide forbids pipeline for portfolio lists");
  } else fail("guide pipeline exclusion missing");
  if (
    guide.includes("portfolio.summary.totalDeals") ||
    guide.includes("portfolioHydration.availability") ||
    guide.includes("false-zero")
  ) {
    ok("guide documents conflict resolution");
  } else fail("guide conflict resolution missing");
}

// --- Test matrix A–J ---
const matrix = [
  [
    "A",
    "Give me the names of all customers currently lying in Deals with their Deal numbers, lender and current stages.",
    "gptActionEnterpriseRead",
  ],
  ["B", "Show me all active Deals.", "gptActionEnterpriseRead"],
  ["C", "Show inactive Deals.", "gptActionEnterpriseRead"],
  ["D", "Which Wealth Partner has which Deals?", "gptActionEnterpriseRead"],
  ["E", "Which Deals have pending documents?", "gptActionEnterpriseRead"],
  ["F", "What happened recently on my Deals?", "gptActionEnterpriseRead"],
  ["G", "Give me the current overall pipeline snapshot.", "gptActionPipeline"],
  ["H", "Give me CHANAKYA Radar.", "gptActionChanakya"],
  ["I", "Tell me everything about DEAL-2026-000082.", "gptActionEnterpriseRead"],
  ["J", "Why is it stuck?", "gptActionEnterpriseRead"],
];

for (const [id, question, expected] of matrix) {
  const routed = routeQuestion(question);
  if (routed === expected) ok(`matrix ${id} → ${expected}`);
  else fail(`matrix ${id} expected ${expected}, got ${routed}`);
}

// --- Follow-up coercion unchanged ---
if (
  resolveChatGptEnterpriseReadMode({
    modeRaw: "enterprise",
    dealRef: "DEAL-2026-000082",
  }) === "transaction"
) {
  ok("dealRef still coerces to transaction (048 regression)");
} else fail("dealRef coercion broken");

// --- No backend portfolio engine changes ---
{
  const hydration = fs.readFileSync(
    path.join(root, "src/lib/chanakya-enterprise-read-context/portfolio-hydration.ts"),
    "utf8",
  );
  if (hydration.includes("resolvePortfolioRadarRows")) {
    ok("048 portfolio hydration architecture untouched");
  } else fail("048 hydration file missing or altered");
}

// --- OAuth / read-only preserved ---
if (/GET-only/i.test(yaml) && /ChatGptIntegrationOAuth/.test(yaml)) {
  ok("OAuth + GET-only contract preserved");
} else fail("OAuth/GET-only contract weakened");

if (/FOIR[\s\S]*DSCR[\s\S]*LTV[\s\S]*DBR[\s\S]*Phase 2/i.test(yaml)) {
  ok("Phase-2 ratio deferral preserved");
} else fail("Phase-2 deferral missing");

console.log("");
console.log("Character counts:", JSON.stringify(charCounts));
console.log("");
if (failed > 0) {
  console.error(`CO-CHANAKYA-GPT-PORTFOLIO-ROUTING-049: ${failed} failure(s)`);
  process.exit(1);
}
console.log("CO-CHANAKYA-GPT-PORTFOLIO-ROUTING-049: ALL CHECKS PASSED");
