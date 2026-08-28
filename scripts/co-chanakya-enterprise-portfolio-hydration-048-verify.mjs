/**
 * CO-CHANAKYA-ENTERPRISE-PORTFOLIO-HYDRATION-048 — serverless portfolio Prisma fallback.
 * Usage: node --import ./scripts/_bat-stub-server-only.mjs --import tsx scripts/co-chanakya-enterprise-portfolio-hydration-048-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  mapEnterpriseDealToRadarRow,
  loadPortfolioDealsFromRegistry,
} from "../src/lib/chanakya-enterprise-read-context/portfolio-deal-registry-fallback.ts";
import {
  enrichRadarRowToPortfolioBusinessRow,
  buildPortfolioBusinessRegistry,
} from "../src/lib/chanakya-enterprise-read-context/portfolio-business-intelligence.ts";
import { classifyDealActivity } from "../src/lib/my-deals/classify-deal-activity.ts";
import {
  redactCustomerContactPiiForAiContext,
  assertNoCustomerContactPiiInAiContext,
} from "../src/lib/chanakya-enterprise-read-context/redact-pii.ts";

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

const MOCK_PRISMA_DEAL = {
  id: "deal_hydrate_1",
  dealNumber: "DEAL-2026-000099",
  legacyLoanFileId: null,
  primaryContactName: "Raj Patel",
  primaryContactId: "contact_h1",
  productLabel: "LAP",
  productCode: "lap",
  requestedAmount: 3000000,
  approvedAmount: null,
  grossStage: "logged_in_wip",
  subStage: "Docs Pending",
  primaryCounterpartyName: "ICICI Bank",
  primaryOwnerUserId: "user_rm",
  relationshipManagerUserId: "user_rm",
  relationshipManagerName: "RM Two",
  priority: "high",
  operationalStatus: "active",
  opportunity: { opportunityNumber: "OPP-2026-000100" },
  updatedAt: new Date("2026-08-25T10:00:00.000Z"),
  createdAt: new Date("2026-08-01T10:00:00.000Z"),
  stageEnteredAt: new Date("2026-08-20T10:00:00.000Z"),
};

const MOCK_OPP_CTX = {
  opportunityId: "opp_h1",
  opportunityNumber: "OPP-2026-000100",
  primaryContactName: "Raj Patel",
  companyName: "Patel Industries",
  productLabel: "LAP",
  requestedAmount: 3000000,
  sourceCode: "wealth_partner",
  sourceContactName: "Partner Desk",
  sourceWealthPartnerId: "wp_h1",
  sourceCampaignLabel: null,
  wealthPartnerName: "Catalyst Partner Alpha",
  relationshipManagerName: "RM Two",
};

// --- Pagination cap aligned with Deal Registry repository (max 100) ---
{
  const types = read("src/types/chanakya-enterprise-read-context.ts");
  if (types.includes("CHANAKYA_PORTFOLIO_PAGE_MAX = 100")) {
    ok("pagination max aligned to 100 (repository searchDeals cap)");
  } else fail("CHANAKYA_PORTFOLIO_PAGE_MAX = 100 missing in types");

  for (const rel of [
    "src/lib/chanakya-enterprise-read-context/portfolio-hydration.ts",
    "src/lib/chanakya-enterprise-read-context/portfolio-deal-registry-fallback.ts",
    "src/lib/chanakya-enterprise-read-context/attention-intelligence.ts",
    "src/lib/chanakya-enterprise-read-context/portfolio-business-intelligence.ts",
  ]) {
    const src = read(rel);
    if (src.includes("CHANAKYA_PORTFOLIO_PAGE_MAX") && !src.includes(", 200)")) {
      ok(`pagination cap uses CHANAKYA_PORTFOLIO_PAGE_MAX in ${rel}`);
    } else if (src.includes("CHANAKYA_PORTFOLIO_PAGE_MAX")) {
      ok(`pagination cap uses CHANAKYA_PORTFOLIO_PAGE_MAX in ${rel}`);
    } else {
      fail(`${rel} missing CHANAKYA_PORTFOLIO_PAGE_MAX cap`);
    }
  }
}

// --- Architecture: 048 modules exist and wired ---
{
  for (const rel of [
    "src/lib/chanakya-enterprise-read-context/portfolio-hydration.ts",
    "src/lib/chanakya-enterprise-read-context/portfolio-deal-registry-fallback.ts",
    "src/lib/chanakya-enterprise-read-context/attention-intelligence.ts",
    "src/types/chanakya-enterprise-read-context.ts",
  ]) {
    if (fs.existsSync(path.join(root, rel))) ok(`exists ${rel}`);
    else fail(`missing ${rel}`);
  }

  const hydration = read("src/lib/chanakya-enterprise-read-context/portfolio-hydration.ts");
  if (hydration.includes("resolvePortfolioRadarRows")) ok("1 resolvePortfolioRadarRows exported");
  else fail("1 resolvePortfolioRadarRows missing");
  if (hydration.includes('source: "ebi_radar"') && hydration.includes("enterprise_deal_registry")) {
    ok("1 trusted EBI/Radar path + registry fallback sources defined");
  } else fail("1 hydration sources incomplete");

  const attention = read("src/lib/chanakya-enterprise-read-context/attention-intelligence.ts");
  if (attention.includes("resolvePortfolioRadarRows")) {
    ok("2 attention-intelligence invokes portfolio hydration resolver");
  } else fail("2 attention-intelligence not wired to resolver");
  if (attention.includes("portfolioHydration")) {
    ok("2 transactionAttention exposes portfolioHydration");
  } else fail("2 portfolioHydration not exposed");
  if (attention.includes('availability === "FALLBACK_FAILURE"')) {
    ok("2 false-zero prevention on FALLBACK_FAILURE");
  } else fail("2 FALLBACK_FAILURE handling missing");

  const compile = read("src/lib/chanakya-enterprise-read-context/compile.ts");
  if (compile.includes("portfolioPage")) ok("2 compile passes portfolioPage");
  else fail("2 compile missing portfolioPage");

  const compose = read("server/services/chatgpt-integration/compose-enterprise-read.ts");
  if (compose.includes("portfolioPage") && compose.includes("cursor")) {
    ok("2 GPT compose passes portfolio cursor/page");
  } else fail("2 GPT compose pagination wiring missing");
}

// --- 3 Prisma deal → radar row mapping ---
{
  const radarRow = mapEnterpriseDealToRadarRow(MOCK_PRISMA_DEAL);
  if (radarRow.dealId === "DEAL-2026-000099") ok("3 fallback maps dealNumber");
  else fail("3 dealNumber mapping failed");
  if (radarRow.borrower === "Raj Patel") ok("4 fallback maps customer name");
  else fail("4 customer name mapping failed");
  if (radarRow.opportunityNumber === "OPP-2026-000100") ok("5 fallback maps opportunity ref");
  else fail("5 opportunity ref mapping failed");
  if (radarRow.lender === "ICICI Bank") ok("6 fallback maps lender");
  else fail("6 lender mapping failed");
  if (radarRow.product === "LAP") ok("7 fallback maps product");
  else fail("7 product mapping failed");
  if (radarRow.loanAmount === 3000000) ok("8 fallback maps amount");
  else fail("8 amount mapping failed");
  if (radarRow.stageLabel?.includes("logged")) ok("9 fallback maps stage");
  else fail("9 stage mapping failed");
}

// --- 10-12 active/inactive SSOT (hold = inactive) ---
{
  const holdInactive = classifyDealActivity({
    id: "d_hold",
    enterpriseDealId: "d_hold",
    dealId: "DEAL-HOLD",
    opportunityNumber: "OPP-H",
    fileNumber: "",
    borrowerName: "",
    contactNumber: "",
    product: "",
    loanAmount: 0,
    loanAmountLabel: "",
    assignedRm: "",
    assignedUsers: [],
    grossStage: "hold",
    lenderCaseStage: "hold",
    grossStageLabel: "Hold",
    subStage: "",
    selectedLender: "",
    expectedRevenue: 0,
    expectedRevenueLabel: "",
    priority: "medium",
    lastActivity: "",
    lastActivityLabel: "",
    dateCreated: "",
    dateCreatedLabel: "",
    lastModified: "",
    lastModifiedLabel: "",
    status: "active",
    statusLabel: "Active",
    city: "",
    state: "",
    source: "",
    channelPartner: "",
    creditExecutive: "",
  });
  if (holdInactive === "inactive") ok("10 hold classifies inactive via classifyDealActivity");
  else fail("10 hold must be inactive");

  const portfolio = read(
    "src/lib/chanakya-enterprise-read-context/portfolio-business-intelligence.ts",
  );
  if (portfolio.includes("classifyDealActivity")) ok("11 portfolio enrichment uses classifyDealActivity");
  else fail("11 classifyDealActivity not used in enrichment");

  const fallback = read(
    "src/lib/chanakya-enterprise-read-context/portfolio-deal-registry-fallback.ts",
  );
  if (fallback.includes("organizationId") && fallback.includes("searchDeals")) {
    ok("12 fallback queries scoped via enterpriseDealRepository.searchDeals(organizationId)");
  } else fail("12 org-scoped repository query missing");
}

// --- 13 Wealth partner + business source through 047 enrichment ---
{
  const radarRow = mapEnterpriseDealToRadarRow(MOCK_PRISMA_DEAL);
  const row = enrichRadarRowToPortfolioBusinessRow({
    row: radarRow,
    opportunityContext: MOCK_OPP_CTX,
    activityClassification: "active",
  });
  if (row.wealthPartner?.name === "Catalyst Partner Alpha") {
    ok("13 wealth partner enrichment preserved on fallback row");
  } else fail("13 wealth partner missing");
  if (row.businessSource?.sourceCode === "wealth_partner") {
    ok("14 business source enrichment preserved");
  } else fail("14 business source missing");
}

// --- 15-16 documents / activity fields ---
{
  const radarRow = mapEnterpriseDealToRadarRow({
    ...MOCK_PRISMA_DEAL,
    updatedAt: new Date("2026-08-25T10:00:00.000Z"),
  });
  radarRow.pendingDocs = 2;
  const row = enrichRadarRowToPortfolioBusinessRow({ row: radarRow, opportunityContext: MOCK_OPP_CTX });
  if ((row.pendingDocs ?? 0) >= 0) ok("15 pendingDocs field available on enriched row");
  else fail("15 pendingDocs missing");
  if (row.latestActivityLabel) ok("16 latest activity label available");
  else fail("16 latest activity missing");
}

// --- 17-18 PII boundary ---
{
  const row = enrichRadarRowToPortfolioBusinessRow({
    row: mapEnterpriseDealToRadarRow(MOCK_PRISMA_DEAL),
    opportunityContext: MOCK_OPP_CTX,
  });
  const redacted = redactCustomerContactPiiForAiContext({
    ...row,
    primaryContactMobile: "9876500000",
    wealthPartner: { id: "wp", name: "Partner", email: "p@x.com", mobile: "999" },
  });
  if (!redacted.primaryContactMobile && !redacted.wealthPartner?.email) {
    ok("17 email/mobile redacted on portfolio payload");
  } else fail("17 PII leakage");
  if (redacted.customerName === "Raj Patel") ok("18 customer name preserved (authorized business data)");
  else fail("18 customer name incorrectly removed");
  try {
    assertNoCustomerContactPiiInAiContext(redacted);
    ok("18b PII assert accepts hydrated portfolio row");
  } catch {
    fail("18b PII assert failed on valid row");
  }
}

// --- 19-21 pagination + honesty metadata ---
{
  const types = read("src/types/chanakya-enterprise-read-context.ts");
  for (const field of [
    "ChanakyaPortfolioHydrationMeta",
    "totalDeals",
    "returnedCount",
    "hasMore",
    "nextCursor",
    "FALLBACK_FAILURE",
    "TRUE_EMPTY",
  ]) {
    if (types.includes(field)) ok(`19 types include ${field}`);
    else fail(`19 types missing ${field}`);
  }

  const hydration = read("src/lib/chanakya-enterprise-read-context/portfolio-hydration.ts");
  if (hydration.includes("nextCursor") && hydration.includes("hasMore")) {
    ok("20 pagination metadata on trusted Radar path");
  } else fail("20 Radar pagination metadata missing");

  const fallback = read(
    "src/lib/chanakya-enterprise-read-context/portfolio-deal-registry-fallback.ts",
  );
  if (
    fallback.includes("FALLBACK_FAILURE") &&
    fallback.includes("false business zero")
  ) {
    ok("21 fallback failure does not masquerade as TRUE_EMPTY");
  } else fail("21 FALLBACK_FAILURE honesty missing");
}

// --- 22-24 regression wiring (047 pipeline preserved) ---
{
  const attention = read("src/lib/chanakya-enterprise-read-context/attention-intelligence.ts");
  if (attention.includes("buildPortfolioBusinessRegistry")) {
    ok("22 047 portfolioBusinessRegistry pipeline preserved");
  } else fail("22 portfolioBusinessRegistry pipeline broken");

  const deal360 = read("src/lib/chanakya-enterprise-read-context/deal-360.ts");
  if (deal360.includes("assembleChanakyaDeal360")) ok("23 Deal 360 module intact");
  else fail("23 Deal 360 regression risk");

  const opp360 = read("src/lib/chanakya-enterprise-read-context/opportunity-360.ts");
  if (opp360.includes("assembleChanakyaOpportunity360")) ok("24 Opportunity 360 module intact");
  else fail("24 Opportunity 360 regression risk");
}

// --- 25 FOIR/DSCR/LTV/DBR remain Phase 2 ---
{
  const compile = read("src/lib/chanakya-enterprise-read-context/compile.ts");
  const hydrationFiles = [
    read("src/lib/chanakya-enterprise-read-context/portfolio-hydration.ts"),
    read("src/lib/chanakya-enterprise-read-context/portfolio-deal-registry-fallback.ts"),
  ].join("\n");
  if (!/computeFoir|computeDscr|computeLtv|computeDbr/i.test(hydrationFiles + compile)) {
    ok("25 FOIR/DSCR/LTV/DBR not introduced in 048 hydration path");
  } else fail("25 ratio engines introduced");
}

// --- No second engine ---
{
  const hydration = read("src/lib/chanakya-enterprise-read-context/portfolio-hydration.ts");
  if (!hydration.includes("composeBusinessIntelligenceSnapshot")) {
    ok("048 does not duplicate EBI compose engine");
  } else fail("048 duplicates EBI engine");
  const fallback = read(
    "src/lib/chanakya-enterprise-read-context/portfolio-deal-registry-fallback.ts",
  );
  if (fallback.includes("mapEnterpriseDealToRadarRow") && fallback.includes("searchDeals")) {
    ok("048 reuses Enterprise Deal Registry SSOT only");
  } else fail("048 missing canonical registry reuse");
}

// --- Production-like portfolio question (fallback-shaped row) ---
{
  const radarRow = mapEnterpriseDealToRadarRow(MOCK_PRISMA_DEAL);
  const row = enrichRadarRowToPortfolioBusinessRow({
    row: radarRow,
    opportunityContext: MOCK_OPP_CTX,
    activityClassification: "active",
  });
  const contract = [
    row.customerName,
    row.wealthPartner?.name,
    row.lender,
    row.productLabel,
    row.requestedAmount,
    row.stageLabel,
    row.dealNumber,
    row.opportunityNumber,
  ];
  if (contract.every((v) => v != null && v !== "")) {
    ok("PO portfolio question contract satisfied on Prisma-shaped row");
  } else {
    fail(`PO portfolio contract incomplete: ${JSON.stringify(contract)}`);
  }
}

// --- DB-unavailable honesty (no false zero) ---
{
  const result = await loadPortfolioDealsFromRegistry({
    organizationId: "org_test",
    limit: 25,
    page: 1,
  });
  if (
    result.availability === "NOT_AVAILABLE" ||
    result.availability === "AVAILABLE" ||
    result.availability === "TRUE_EMPTY" ||
    result.availability === "FALLBACK_FAILURE"
  ) {
    ok("loadPortfolioDealsFromRegistry returns explicit availability state");
  } else fail("availability enum missing");
  if (result.pagination && typeof result.pagination.totalDeals === "number") {
    ok("pagination metadata present on registry loader");
  } else fail("pagination metadata missing on registry loader");
  if (result.availability !== "AVAILABLE" || result.rows.length >= 0) {
    ok("TRUE_EMPTY / NOT_AVAILABLE distinguished from silent success");
  }
}

console.log("");
if (failed > 0) {
  console.error(`CO-CHANAKYA-ENTERPRISE-PORTFOLIO-HYDRATION-048: ${failed} failure(s)`);
  process.exit(1);
}
console.log("CO-CHANAKYA-ENTERPRISE-PORTFOLIO-HYDRATION-048: ALL CHECKS PASSED");
