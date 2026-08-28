/**
 * CO-CHANAKYA-ENTERPRISE-READ-COVERAGE-047 — enterprise-read business graph coverage.
 * Usage: node --import tsx scripts/co-chanakya-enterprise-read-coverage-047-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  redactCustomerContactPiiForAiContext,
  assertNoCustomerContactPiiInAiContext,
} from "../src/lib/chanakya-enterprise-read-context/redact-pii.ts";
import {
  enrichRadarRowToPortfolioBusinessRow,
  buildPortfolioBusinessRegistry,
} from "../src/lib/chanakya-enterprise-read-context/portfolio-business-intelligence.ts";
import { classifyDealActivity } from "../src/lib/my-deals/classify-deal-activity.ts";

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

const MOCK_RADAR_ROW = {
  id: "deal_cov_1",
  fileId: "file_1",
  enterpriseDealId: "deal_cov_1",
  dealId: "DEAL-2026-000082",
  opportunityNumber: "OPP-2026-000060",
  borrower: "Asha Sharma",
  product: "Home Loan",
  loanAmount: 5000000,
  loanAmountLabel: "₹50,00,000",
  assignedRm: "RM One",
  quadrant: "follow_up_required",
  quadrantLabel: "Follow-up Required",
  stageLabel: "Credit Pending",
  subStageLabel: "WIP",
  lender: "HDFC Bank",
  lastActivity: "2026-08-20T10:00:00.000Z",
  lastActivityLabel: "20 Aug 2026",
  idleDays: 8,
  daysInStage: 5,
  workedToday: false,
  activityMomentumScore: 40,
  activityState: "needs_follow_up",
  activityStateLabel: "Needs Follow-up",
  activityMomentumTrend: "stable",
  isHealthyWaiting: false,
  pendingDocs: 3,
  openTasks: 2,
  priority: "high",
  status: "active",
  dealHealthScore: 55,
  classificationReason: "Document gaps",
  recommendation: "Collect pending KYC",
};

const MOCK_OPP_CTX = {
  opportunityId: "opp_cov_1",
  opportunityNumber: "OPP-2026-000060",
  primaryContactName: "Asha Sharma",
  companyName: "Sharma Enterprises Pvt Ltd",
  productLabel: "Home Loan",
  requestedAmount: 5000000,
  sourceCode: "wealth_partner",
  sourceContactName: "Partner Desk",
  sourceWealthPartnerId: "wp_cov_1",
  sourceCampaignLabel: "Q3 Campaign",
  wealthPartnerName: "Rupee Catalyst Partner One",
  relationshipManagerName: "RM One",
};

// --- Architecture wiring ---
{
  for (const rel of [
    "src/lib/chanakya-enterprise-read-context/portfolio-business-intelligence.ts",
    "src/lib/chanakya-enterprise-read-context/attention-intelligence.ts",
    "src/lib/chanakya-enterprise-read-context/opportunity-360.ts",
    "src/lib/chanakya-enterprise-read-context/deal-360.ts",
    "src/lib/chanakya-enterprise-read-context/compile.ts",
  ]) {
    if (fs.existsSync(path.join(root, rel))) ok(`exists ${rel}`);
    else fail(`missing ${rel}`);
  }

  const attention = read("src/lib/chanakya-enterprise-read-context/attention-intelligence.ts");
  if (attention.includes("buildPortfolioBusinessRegistry")) {
    ok("attention-intelligence wires portfolioBusinessRegistry");
  } else fail("attention-intelligence missing portfolioBusinessRegistry");
  if (attention.includes("portfolioBusinessRegistry:")) {
    ok("transactionAttention exposes portfolioBusinessRegistry");
  } else fail("transactionAttention missing portfolioBusinessRegistry export");
  if (attention.includes("customerName")) {
    ok("attention lists use enriched portfolio rows");
  } else fail("attention lists not enriched with customerName");

  const opp360 = read("src/lib/chanakya-enterprise-read-context/opportunity-360.ts");
  if (opp360.includes("customerName") && opp360.includes("wealthPartner")) {
    ok("Opportunity 360 exposes customer + wealth partner context");
  } else fail("Opportunity 360 missing customer/wealth partner fields");

  const deal360 = read("src/lib/chanakya-enterprise-read-context/deal-360.ts");
  if (
    deal360.includes("customerName") &&
    deal360.includes("businessSource") &&
    deal360.includes("wealthPartner")
  ) {
    ok("Deal 360 exposes customer + business source + wealth partner");
  } else fail("Deal 360 missing business graph fields");
}

// --- 1 Portfolio list: customer name + deal + stage ---
{
  const row = enrichRadarRowToPortfolioBusinessRow({
    row: MOCK_RADAR_ROW,
    opportunityContext: MOCK_OPP_CTX,
    activityClassification: "active",
  });
  if (row.customerName === "Asha Sharma") ok("1 portfolio row includes customerName");
  else fail(`1 customerName missing (got ${row.customerName})`);
  if (row.dealNumber === "DEAL-2026-000082") ok("1 portfolio row includes dealNumber");
  else fail("1 dealNumber missing");
  if (row.stageLabel === "Credit Pending") ok("1 portfolio row includes stageLabel");
  else fail("1 stageLabel missing");
}

// --- 2 Deal query fields (contract) ---
{
  const deal360 = read("src/lib/chanakya-enterprise-read-context/deal-360.ts");
  for (const field of [
    "customerName",
    "opportunityNumber",
    "lenderName",
    "grossStage",
  ]) {
    if (deal360.includes(field)) ok(`2 Deal 360 includes ${field}`);
    else fail(`2 Deal 360 missing ${field}`);
  }
}

// --- 3 Opportunity query: customer + deals ---
{
  const opp360 = read("src/lib/chanakya-enterprise-read-context/opportunity-360.ts");
  if (/dealsPayload.*customerName/s.test(opp360)) ok("3 Opportunity deals include customerName");
  else if (opp360.includes("customerName: d.primaryContactName")) {
    ok("3 Opportunity deals include customerName");
  } else fail("3 Opportunity deals missing customerName");
  if (opp360.includes("dealCount")) ok("3 Opportunity execution includes dealCount");
  else fail("3 Opportunity dealCount missing");
}

// --- 4 Deal wealth partner / business source ---
{
  const row = enrichRadarRowToPortfolioBusinessRow({
    row: MOCK_RADAR_ROW,
    opportunityContext: MOCK_OPP_CTX,
  });
  if (row.wealthPartner?.name === "Rupee Catalyst Partner One") {
    ok("4 portfolio row includes wealth partner name");
  } else fail("4 wealth partner name missing");
  if (row.businessSource?.sourceCode === "wealth_partner") {
    ok("4 portfolio row includes business source");
  } else fail("4 business source missing");
}

// --- 5 Wealth partner portfolio traversal ---
{
  if (typeof buildPortfolioBusinessRegistry === "function") {
    ok("5 buildPortfolioBusinessRegistry exported");
  } else fail("5 buildPortfolioBusinessRegistry missing");
  const portfolioSrc = read(
    "src/lib/chanakya-enterprise-read-context/portfolio-business-intelligence.ts",
  );
  if (portfolioSrc.includes("byWealthPartner")) ok("5 byWealthPartner registry present");
  else fail("5 byWealthPartner missing");
}

// --- 6 Pending documents with identifiable transactions ---
{
  const row = enrichRadarRowToPortfolioBusinessRow({
    row: MOCK_RADAR_ROW,
    opportunityContext: MOCK_OPP_CTX,
  });
  if ((row.pendingDocs ?? 0) > 0 && row.customerName && row.dealNumber) {
    ok("6 pending-docs row retains customer + deal identity");
  } else fail("6 pending-docs row missing business labels");
}

// --- 7 Activity: latest activity label ---
{
  const row = enrichRadarRowToPortfolioBusinessRow({ row: MOCK_RADAR_ROW });
  if (row.latestActivityLabel === "20 Aug 2026") ok("7 latestActivityLabel exposed");
  else fail("7 latestActivityLabel missing");
}

// --- 8 Dialogue evidence path preserved ---
{
  const evidence = read("src/lib/chanakya-enterprise-read-context/evidence-projections.ts");
  if (evidence.includes("projectDialogueEvidence")) ok("8 Dialogue evidence projection exists");
  else fail("8 Dialogue projection missing");
  const deal360 = read("src/lib/chanakya-enterprise-read-context/deal-360.ts");
  if (deal360.includes("dialogueEvidence")) ok("8 Deal 360 includes dialogue evidence");
  else fail("8 Deal 360 dialogue missing");
}

// --- 9 Task intelligence on portfolio row ---
{
  const row = enrichRadarRowToPortfolioBusinessRow({ row: MOCK_RADAR_ROW });
  if (row.openTasks === 2) ok("9 openTasks exposed on portfolio row");
  else fail("9 openTasks missing");
}

// --- 10 Stage chronology fields ---
{
  const row = enrichRadarRowToPortfolioBusinessRow({ row: MOCK_RADAR_ROW });
  if (row.stageLabel && row.dealNumber) ok("10 stage chronology fields present on row");
  else fail("10 stage fields missing");
}

// --- 11-13 PII redaction ---
{
  const toxic = {
    customerName: "Asha Sharma",
    primaryContactMobile: "9876543210",
    primaryContactEmail: "asha@example.com",
    wealthPartner: { id: "wp1", name: "Partner", mobile: "9999999999", email: "p@x.com" },
    nested: { mobile: "9111111111", email: "secret@example.com" },
  };
  const redacted = redactCustomerContactPiiForAiContext(toxic);
  if (!redacted.primaryContactMobile && !redacted.primaryContactEmail) {
    ok("11 customer email/mobile redacted");
  } else fail("11 customer PII leaked");
  if (!redacted.nested?.mobile && !redacted.nested?.email) ok("12 nested contact PII redacted");
  else fail("12 nested PII leaked");
  if (!redacted.wealthPartner?.mobile && !redacted.wealthPartner?.email) {
    ok("13 wealth partner contact channels redacted");
  } else fail("13 wealth partner PII leaked");
  if (redacted.customerName === "Asha Sharma") ok("13b customer NAME preserved (not PII)");
  else fail("13b customer name incorrectly removed");
  try {
    assertNoCustomerContactPiiInAiContext(redacted);
    ok("PII assert accepts redacted portfolio payload");
  } catch {
    fail("PII assert rejected valid redacted payload");
  }
}

// --- 14 Tokens/secrets not in enterprise-read compiler ---
{
  const compile = read("src/lib/chanakya-enterprise-read-context/compile.ts");
  if (!/password|refreshToken|apiKey|JWT_SECRET/i.test(compile)) {
    ok("14 compile does not expose credential fields");
  } else fail("14 compile may expose credential-like fields");
}

// --- 15 Tenant isolation markers ---
{
  const compile = read("src/lib/chanakya-enterprise-read-context/compile.ts");
  if (compile.includes("organizationId")) ok("15 compile scoped by organizationId");
  else fail("15 organizationId scoping missing");
  const portfolio = read(
    "src/lib/chanakya-enterprise-read-context/portfolio-business-intelligence.ts",
  );
  if (portfolio.includes("organizationId: input.organizationId")) {
    ok("15 portfolio joins scoped by organizationId");
  } else fail("15 portfolio org scoping missing");
}

// --- 16-17 Follow-up entity refs ---
{
  const row = enrichRadarRowToPortfolioBusinessRow({
    row: MOCK_RADAR_ROW,
    opportunityContext: MOCK_OPP_CTX,
  });
  if (row.dealNumber === "DEAL-2026-000082") ok("16 follow-up retains deal reference");
  else fail("16 deal reference missing");
  if (row.opportunityNumber === "OPP-2026-000060") ok("17 follow-up retains opportunity reference");
  else fail("17 opportunity reference missing");
}

// --- 18 Portfolio uses names where available ---
{
  const row = enrichRadarRowToPortfolioBusinessRow({
    row: { ...MOCK_RADAR_ROW, borrower: "" },
    opportunityContext: MOCK_OPP_CTX,
  });
  if (row.customerName === "Asha Sharma" && row.entityLabel === "Asha Sharma") {
    ok("18 portfolio resolves name from Opportunity SSOT when Radar borrower empty");
  } else fail("18 name resolution from Opportunity SSOT failed");
}

// --- 19 Active/inactive uses My Deals SSOT ---
{
  const portfolio = read(
    "src/lib/chanakya-enterprise-read-context/portfolio-business-intelligence.ts",
  );
  const attention = read("src/lib/chanakya-enterprise-read-context/attention-intelligence.ts");
  if (
    portfolio.includes("activityClassification") &&
    (attention.includes("buildPortfolioBusinessRegistry") ||
      attention.includes("buildEnrichedPortfolioRows"))
  ) {
    ok("19 active/inactive wired via activityClassification");
  } else fail("19 activityClassification missing");
  if (portfolio.includes("classifyDealActivity")) ok("19 uses classifyDealActivity SSOT");
  else fail("19 classifyDealActivity not used");
  const inactive = classifyDealActivity({
    id: "d1",
    enterpriseDealId: "d1",
    dealId: "DEAL-X",
    opportunityNumber: "OPP-X",
    fileNumber: "",
    borrowerName: "",
    contactNumber: "",
    product: "",
    loanAmount: 0,
    loanAmountLabel: "",
    assignedRm: "",
    assignedUsers: [],
    grossStage: "lost",
    lenderCaseStage: "lost",
    grossStageLabel: "Lost",
    subStage: "",
    selectedLender: "",
    expectedRevenue: 0,
    expectedRevenueLabel: "",
    priority: "low",
    lastActivity: "",
    lastActivityLabel: "",
    dateCreated: "",
    dateCreatedLabel: "",
    lastModified: "",
    lastModifiedLabel: "",
    status: "inactive",
    statusLabel: "Inactive",
    city: "",
    state: "",
    source: "",
    channelPartner: "",
    creditExecutive: "",
  });
  if (inactive === "inactive") ok("19b lost stage classifies inactive via SSOT");
  else fail("19b inactive classification broken");
}

// --- 20 FOIR/DSCR/LTV/DBR remain Phase 2 ---
{
  const credit = read("src/lib/chanakya-credit-intelligence/project-credit-intelligence.ts");
  const compile = read("src/lib/chanakya-enterprise-read-context/compile.ts");
  const openapi = read("docs/co-chatgpt-integration/CO-CHATGPT-GPT-ACTION.openapi.yaml");
  const hasPhase2Deferral =
    (/Phase 2/i.test(openapi) && /FOIR|DSCR|LTV|DBR/.test(openapi)) ||
    /foir|dscr|ltv|dbr/i.test(credit);
  if (/Phase 2/i.test(openapi) && /FOIR|DSCR|LTV|DBR/.test(openapi)) {
    ok("20 OpenAPI defers FOIR/DSCR/LTV/DBR to Phase 2");
  } else if (!/fabricate.*foir|computeFoir/i.test(compile)) {
    ok("20 compile does not newly compute FOIR/DSCR/LTV/DBR");
  } else fail("20 ratio computation may have been introduced");
  if (!hasPhase2Deferral && /computeFoir/i.test(compile)) fail("20 FOIR compute in compile");
}

// --- Realistic PO portfolio question contract ---
{
  const row = enrichRadarRowToPortfolioBusinessRow({
    row: MOCK_RADAR_ROW,
    opportunityContext: MOCK_OPP_CTX,
    activityClassification: "active",
  });
  const fields = [
    row.customerName,
    row.wealthPartner?.name,
    row.lender,
    row.productLabel,
    row.requestedAmount,
    row.stageLabel,
    row.pendingDocs,
    row.latestActivityLabel,
  ];
  if (fields.every((v) => v != null && v !== "")) {
    ok("PO question contract: active deal row has name, source, lender, product, amount, stage, docs, activity");
  } else {
    fail(`PO question contract incomplete: ${JSON.stringify(fields)}`);
  }
}

// --- No duplicate intelligence engine ---
{
  const portfolio = read(
    "src/lib/chanakya-enterprise-read-context/portfolio-business-intelligence.ts",
  );
  if (
    portfolio.includes("loadEbiDataContext") &&
    portfolio.includes("composeBusinessIntelligenceSnapshot")
  ) {
    fail("portfolio module must not duplicate EBI/Radar engines");
  } else ok("portfolio enrichment reuses Radar rows + SSOT joins only");
}

console.log("");
if (failed > 0) {
  console.error(`CO-CHANAKYA-ENTERPRISE-READ-COVERAGE-047: ${failed} failure(s)`);
  process.exit(1);
}
console.log("CO-CHANAKYA-ENTERPRISE-READ-COVERAGE-047: ALL CHECKS PASSED");
