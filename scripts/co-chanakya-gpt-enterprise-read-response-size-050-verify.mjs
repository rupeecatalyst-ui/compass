/**
 * CO-CHANAKYA-GPT-ENTERPRISE-READ-RESPONSE-SIZE-050 — compact GPT Action response verification.
 * Usage: node --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-gpt-enterprise-read-response-size-050-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveGptEnterpriseReadView,
  resolveGptDomainsForView,
  buildCompactGptEnterpriseReadResponse,
  enforceGptActionResponseSizeGuard,
  measureJsonUtf8Bytes,
} from "../server/services/chatgpt-integration/compact-enterprise-read.ts";
import {
  GPT_ACTION_RESPONSE_SAFE_MAX_BYTES,
  GPT_ENTERPRISE_READ_COMPACT_VIEWS,
} from "../src/types/chatgpt-enterprise-read-compact.ts";

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

function mockPortfolioRow(i) {
  return {
    customerName: `Customer ${i}`,
    entityLabel: `Customer ${i}`,
    dealNumber: `DEAL-2026-${String(i).padStart(6, "0")}`,
    opportunityNumber: `OPP-2026-${String(i).padStart(6, "0")}`,
    lender: "ICICI Bank",
    productLabel: "Home Loan",
    requestedAmount: 5000000 + i * 100000,
    stageLabel: "Logged In WIP",
    activityClassification: i % 3 === 0 ? "inactive" : "active",
    wealthPartner: { id: `wp_${i % 4}`, name: `Partner ${i % 4}` },
    pendingDocs: i % 2,
    latestActivityLabel: "Document uploaded",
    why: ["Idle 3 days", "Pending KYC", "RM follow-up due"],
    provenance: ["radar", "deal_registry"],
  };
}

function mockCompiledPortfolio(rows = 25) {
  const allDeals = Array.from({ length: rows }, (_, i) => mockPortfolioRow(i + 1));
  return {
    mode: "enterprise",
    organizationId: "org_test",
    compiledAt: new Date().toISOString(),
    correlationId: "corr_test",
    readOnly: true,
    opportunity360: null,
    deal360: null,
    domains: [],
    enterpriseSummary: { activeDeals: 13 },
    transactionAttention: {
      aggregates: { totalDeals: 22, activeDeals: 13 },
      portfolioHydration: {
        source: "enterprise_deal_registry",
        availability: "AVAILABLE",
        pagination: {
          totalDeals: 22,
          returnedCount: rows,
          limit: 25,
          page: 1,
          hasMore: rows < 22,
          nextCursor: rows < 22 ? "2" : null,
        },
      },
      portfolioBusinessRegistry: {
        allDeals,
        activeDeals: allDeals.filter((r) => r.activityClassification === "active"),
        inactiveDeals: allDeals.filter((r) => r.activityClassification === "inactive"),
        byWealthPartner: {
          wp_1: allDeals.filter((_, i) => i % 4 === 1),
        },
      },
    },
    changeIntelligence: null,
    productLenderIntelligence: null,
    creditIntelligence: null,
    transactionExecutiveSnapshot: null,
    privacy: {
      customerMobile: "REDACTED_OR_OMITTED",
      customerEmail: "REDACTED_OR_OMITTED",
      documentBinaries: "SERVER_CONTROLLED_NOT_RETURNED",
    },
    limitations: ["read-only"],
  };
}

// --- Architecture files ---
for (const rel of [
  "src/types/chatgpt-enterprise-read-compact.ts",
  "server/services/chatgpt-integration/compact-enterprise-read.ts",
  "server/services/chatgpt-integration/compose-enterprise-read.ts",
]) {
  if (fs.existsSync(path.join(root, rel))) ok(`exists ${rel}`);
  else fail(`missing ${rel}`);
}

const compose = read("server/services/chatgpt-integration/compose-enterprise-read.ts");
if (compose.includes("gptActionLane") && compose.includes("enforceGptActionResponseSizeGuard")) {
  ok("compose wires GPT Action compact lane + size guard");
} else fail("compose missing compact lane wiring");

const gptHandler = read("src/lib/chatgpt-integration/gpt-action-route-handler.ts");
if (gptHandler.includes("gptActionLane: true")) ok("gpt-action-route-handler sets gptActionLane");
else fail("gpt-action-route-handler missing gptActionLane");

const compile = read("src/lib/chanakya-enterprise-read-context/compile.ts");
if (compile.includes("gptCompactView")) ok("compile respects gptCompactView skips");
else fail("compile missing gptCompactView");

// --- View resolution ---
{
  const portfolioQ =
    "Give me all customers currently lying in Deals with Deal number, lender and stage.";
  const viewA = resolveGptEnterpriseReadView({ requestHint: portfolioQ });
  if (viewA === "portfolio_list") ok("A portfolio list question resolves portfolio_list view");
  else fail(`A expected portfolio_list got ${viewA}`);

  const activeQ = "Show all active Deals with customer, lender, amount and stage.";
  const viewB = resolveGptEnterpriseReadView({ requestHint: activeQ });
  if (viewB === "portfolio_list") ok("B active deals question resolves portfolio_list");
  else fail(`B expected portfolio_list got ${viewB}`);

  const wpQ = "Show Wealth Partner-wise active Deals.";
  const viewC = resolveGptEnterpriseReadView({ requestHint: wpQ });
  if (viewC === "portfolio_list") ok("C wealth partner question resolves portfolio_list");
  else fail(`C expected portfolio_list got ${viewC}`);

  const dealQ = "Tell me everything about DEAL-2026-000082.";
  const viewD = resolveGptEnterpriseReadView({
    requestHint: dealQ,
    dealRef: "DEAL-2026-000082",
  });
  if (viewD === "deal_summary") ok("D deal ref resolves deal_summary");
  else fail(`D expected deal_summary got ${viewD}`);

  const finQ = "Analyse the financials of DEAL-2026-000082.";
  const viewE = resolveGptEnterpriseReadView({
    requestHint: finQ,
    dealRef: "DEAL-2026-000082",
  });
  if (viewE === "financials") ok("E financials question resolves financials view");
  else fail(`E expected financials got ${viewE}`);

  const docQ = "What documents are pending?";
  if (resolveGptEnterpriseReadView({ requestHint: docQ }) === "documents") {
    ok("F documents question resolves documents view");
  } else fail("F documents view resolution");

  const changeQ = "What changed since yesterday?";
  if (resolveGptEnterpriseReadView({ requestHint: changeQ }) === "changes") {
    ok("G change question resolves changes view");
  } else fail("G changes view resolution");

  const acctQ = "What is accounting status?";
  if (resolveGptEnterpriseReadView({ requestHint: acctQ }) === "commercial") {
    ok("H accounting question resolves commercial view");
  } else fail("H commercial view resolution");

  if (resolveGptEnterpriseReadView({ viewParam: "attention" }) === "attention") {
    ok("explicit view param honoured");
  } else fail("explicit view param not honoured");
}

// --- Domain narrowing ---
{
  const domains = resolveGptDomainsForView("portfolio_list");
  if (
    domains?.length === 2 &&
    domains.includes("executive") &&
    domains.includes("transactions")
  ) {
    ok("portfolio_list narrows compile domains");
  } else fail("portfolio_list domain narrowing incorrect");
}

// --- Compact DTO shape + size ---
{
  const compiled = mockCompiledPortfolio(25);
  const compact = buildCompactGptEnterpriseReadResponse({
    meta: {
      requestId: "req",
      generatedAt: new Date().toISOString(),
      organizationId: "org",
      organizationSlug: "org",
      integrationVersion: "v1",
    },
    compiled,
    view: "portfolio_list",
    resolvedMode: "enterprise",
    requestedEntityRefs: { dealRef: null, opportunityRef: null },
    requestHint: "all deals",
  });

  if (compact.responseProfile === "gpt_action_compact") ok("compact responseProfile set");
  else fail("missing responseProfile");

  if (!("opportunity360" in compact) && !("deal360" in compact) && !("domains" in compact)) {
    ok("compact response omits full 360/domain trees");
  } else fail("compact response still includes heavy trees");

  const portfolio = compact.portfolio;
  if (portfolio?.deals?.length && portfolio.deals[0].dealRef) {
    ok("portfolio compact rows include dealRef");
  } else fail("portfolio compact rows missing");

  if (portfolio?.pagination?.hasMore !== undefined && "nextCursor" in portfolio.pagination) {
    ok("I pagination metadata present");
  } else fail("I pagination metadata missing");

  const bytes = measureJsonUtf8Bytes(compact);
  console.log(`INFO  portfolio compact payload bytes=${bytes}`);
  if (bytes < GPT_ACTION_RESPONSE_SAFE_MAX_BYTES) {
    ok(`J portfolio payload under safe max (${bytes} < ${GPT_ACTION_RESPONSE_SAFE_MAX_BYTES})`);
  } else fail(`J portfolio payload too large: ${bytes}`);

  const guarded = enforceGptActionResponseSizeGuard(compact);
  if (typeof guarded.responseSizeBytes === "number") ok("size guard reports responseSizeBytes");
  else fail("size guard missing responseSizeBytes");
}

// --- Size guard stress ---
{
  const huge = buildCompactGptEnterpriseReadResponse({
    meta: {
      requestId: "req",
      generatedAt: new Date().toISOString(),
      organizationId: "org",
      organizationSlug: "org",
      integrationVersion: "v1",
    },
    compiled: mockCompiledPortfolio(100),
    view: "portfolio_list",
    resolvedMode: "enterprise",
    requestedEntityRefs: { dealRef: null, opportunityRef: null },
  });
  const guarded = enforceGptActionResponseSizeGuard(huge, 8_000);
  const bytes = measureJsonUtf8Bytes(guarded);
  if (guarded.sizeGuardApplied && bytes <= 12_000) {
    ok("size guard compacts oversized portfolio with metadata");
  } else {
    fail(`size guard failed stress test bytes=${bytes}`);
  }
}

// --- Views catalog ---
if (GPT_ENTERPRISE_READ_COMPACT_VIEWS.length >= 10) {
  ok("compact view catalog defined");
} else fail("compact view catalog incomplete");

console.log(failed === 0 ? "\n050 VERIFY: PASS" : `\n050 VERIFY: FAIL (${failed})`);
process.exit(failed === 0 ? 0 : 1);
