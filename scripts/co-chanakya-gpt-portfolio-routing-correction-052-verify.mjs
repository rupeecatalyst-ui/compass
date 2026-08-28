/**
 * CO-CHANAKYA-GPT-PORTFOLIO-ROUTING-CORRECTION-052 — activity filter + routing correction verify.
 * Usage: node --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-gpt-portfolio-routing-correction-052-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveGptEnterpriseReadView,
  resolveGptPortfolioActivityFilter,
  buildGptCompactPortfolioList,
} from "../server/services/chatgpt-integration/compact-enterprise-read.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OPENAPI = "docs/co-chatgpt-integration/CO-CHATGPT-GPT-ACTION.openapi.yaml";
const GUIDE =
  "docs/co-chatgpt-integration/CO-CHANAKYA-GPT-PORTFOLIO-ROUTING-049-GPT-BUILDER-INSTRUCTIONS.md";

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

const yaml = fs.readFileSync(path.join(root, OPENAPI), "utf8");
const guide = fs.readFileSync(path.join(root, GUIDE), "utf8");

// --- CO-052 activity filter: "currently" must NOT mean active ---
{
  const failingQ =
    "Give me the names of all customers currently lying in Deals with their Deal numbers, lender and current stages.";
  const filter = resolveGptPortfolioActivityFilter(failingQ);
  if (filter === "all") ok('TEST1 activityFilter=all for "currently lying in Deals"');
  else fail(`TEST1 expected activityFilter=all got ${filter}`);

  const view = resolveGptEnterpriseReadView({ requestHint: failingQ });
  if (view === "portfolio_list") ok("TEST1 compactView=portfolio_list");
  else fail(`TEST1 expected portfolio_list got ${view}`);

  const activeQ = "Give me all active Deals with customer name, lender and stage.";
  if (resolveGptPortfolioActivityFilter(activeQ) === "active") ok("TEST2 activityFilter=active");
  else fail("TEST2 active filter");

  const inactiveQ = "Give me all inactive Deals with customer name, lender and stage.";
  if (resolveGptPortfolioActivityFilter(inactiveQ) === "inactive") ok("TEST3 activityFilter=inactive");
  else fail("TEST3 inactive filter");

  const countQ = "How many deals are there?";
  if (resolveGptEnterpriseReadView({ requestHint: countQ }) === "portfolio_list") {
    ok("TEST5 how many deals → portfolio_list");
  } else fail("TEST5 routing");

  const activeCountQ = "How many active deals are there?";
  if (
    resolveGptEnterpriseReadView({ requestHint: activeCountQ }) === "portfolio_list" &&
    resolveGptPortfolioActivityFilter(activeCountQ) === "active"
  ) {
    ok("TEST6 how many active deals → portfolio_list + active filter");
  } else fail("TEST6 routing/filter");
}

// --- Mock portfolio build: currently returns all rows not active subset ---
{
  const mk = (i, cls) => ({
    customerName: `C${i}`,
    entityLabel: `C${i}`,
    dealNumber: `DEAL-2026-${String(i).padStart(6, "0")}`,
    opportunityNumber: `OPP-2026-${String(i).padStart(6, "0")}`,
    lender: "Bank",
    productLabel: "HL",
    requestedAmount: 1000000,
    stageLabel: "wip",
    activityClassification: cls,
    wealthPartner: { id: "wp1", name: "WP" },
    pendingDocs: 0,
    latestActivityLabel: "x",
  });
  const all = [mk(1, "active"), mk(2, "active"), mk(3, "inactive")];
  const compiled = {
    transactionAttention: {
      aggregates: { totalDeals: 3, activeDeals: 2 },
      portfolioHydration: {
        source: "enterprise_deal_registry",
        availability: "AVAILABLE",
        pagination: { totalDeals: 3, returnedCount: 3, limit: 25, page: 1, hasMore: false, nextCursor: null },
      },
      portfolioBusinessRegistry: {
        allDeals: all,
        activeDeals: all.filter((r) => r.activityClassification === "active"),
        inactiveDeals: all.filter((r) => r.activityClassification === "inactive"),
        byWealthPartner: {},
      },
    },
  };
  const currentlyQ =
    "Give me the names of all customers currently lying in Deals with their Deal numbers, lender and current stages.";
  const portfolio = buildGptCompactPortfolioList({
    compiled,
    view: "portfolio_list",
    requestHint: currentlyQ,
  });
  if (portfolio?.activityFilter === "all" && portfolio.deals.length === 3) {
    ok("currently lying in Deals returns all 3 registry rows");
  } else {
    fail(`currently filter wrong: activityFilter=${portfolio?.activityFilter} count=${portfolio?.deals.length}`);
  }
  const activePortfolio = buildGptCompactPortfolioList({
    compiled,
    view: "portfolio_list",
    requestHint: "Show all active Deals",
  });
  if (activePortfolio?.activityFilter === "active" && activePortfolio.deals.length === 2) {
    ok("explicit active deals returns 2 rows");
  } else fail("active-only portfolio count wrong");
}

// --- OpenAPI / guide routing corrections ---
if (/CO-CHANAKYA-GPT-PORTFOLIO-ROUTING-CORRECTION-052|CO-052/.test(yaml)) {
  ok("OpenAPI documents CO-052");
} else fail("OpenAPI missing CO-052");

if (/currently.*does.*not.*mean active|currently.*NOT.*active/i.test(yaml)) {
  ok("OpenAPI activity semantics: currently ≠ active");
} else fail("OpenAPI missing currently≠active rule");

if (/data\.portfolio\.deals|data\.portfolio\.summary/.test(guide)) {
  ok("GPT Builder instructions reference compact portfolio paths");
} else fail("Guide missing data.portfolio paths");

if (/portfolioBusinessRegistry.*not returned|Do \*\*not\*\* look for `transactionAttention\.portfolioBusinessRegistry`/i.test(guide)) {
  ok("Guide warns against stale portfolioBusinessRegistry path");
} else fail("Guide missing stale path warning");

if (/Never.*gptActionPipeline.*customer|Never.*Pipeline/i.test(guide)) {
  ok("Guide forbids Pipeline for deal lists");
} else fail("Guide missing pipeline forbid");

const entDesc = extractFoldedDescription(yaml, "gptActionEnterpriseRead");
if (entDesc.length > 0 && entDesc.length <= 300) {
  ok(`gptActionEnterpriseRead description ${entDesc.length} chars (<=300)`);
} else fail(`gptActionEnterpriseRead description length ${entDesc.length}`);

if (/portfolio\.deals|view=portfolio_list/.test(entDesc)) {
  ok("enterprise-read description mentions compact portfolio");
} else fail("enterprise-read description missing compact hints");

if (/portfolioRouting|activityFilter/.test(fs.readFileSync(path.join(root, "server/services/chatgpt-integration/compact-enterprise-read.ts"), "utf8"))) {
  ok("compact response exposes portfolioRouting + activityFilter");
} else fail("compact module missing routing metadata");

console.log(failed === 0 ? "\n052 VERIFY: PASS" : `\n052 VERIFY: FAIL (${failed})`);
process.exit(failed === 0 ? 0 : 1);
