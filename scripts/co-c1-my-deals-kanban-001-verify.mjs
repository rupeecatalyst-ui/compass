/**
 * CO-C1-MY-DEALS-KANBAN-001
 * Loans-only My Deals + configurable end-to-end Deal Kanban.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MY_DEALS_OFFICIAL_NAME } from "../src/constants/my-deals.ts";
import {
  MY_DEALS_KANBAN_DEFAULT_STAGE_IDS,
  MY_DEALS_KANBAN_COLUMNS,
  MY_DEALS_KANBAN_DEFAULT_FIELD_IDS,
} from "../src/constants/my-deals-kanban.ts";
import { LENDER_CASE_STAGES } from "../src/constants/lender-pipeline.ts";
import {
  filterLoanDealRegistryRows,
  isLoanDealRegistryRow,
} from "../src/lib/my-deals/loan-deals.ts";
import {
  groupDealsForMyDealsKanban,
  resolveMyDealsKanbanColumnId,
} from "../src/lib/my-deals/kanban-board.ts";
import {
  resolveMyDealsKanbanCta,
  MY_DEALS_KANBAN_ACCOUNTING_CTA,
  MY_DEALS_KANBAN_LENDER_CTA,
} from "../src/lib/my-deals/kanban-cta.ts";
import { kanbanActionAvailability } from "../src/lib/my-deals/kanban-participants.ts";
import { defaultMyDealsKanbanPrefs } from "../src/lib/my-deals/kanban-prefs.ts";
import { primaryMyDealsKanbanAlert } from "../src/lib/my-deals/kanban-alerts.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function mustContain(rel, needle, label = needle) {
  if (!read(rel).includes(needle)) failures.push(`${rel} missing ${label}`);
}

function mustNotContain(rel, needle, label = needle) {
  if (read(rel).includes(needle)) failures.push(`${rel} must not contain ${label}`);
}

function expect(name, condition) {
  if (!condition) failures.push(name);
}

mustContain("src/lib/enterprise-deal/deal-registry-port.ts", 'productFamily: "lending"', "registry port loans-only");
const workspace = "src/components/catalyst-one/my-deals/my-deals-workspace.tsx";
const card = "src/components/catalyst-one/my-deals/my-deals-kanban-card.tsx";
const composer = "src/components/catalyst-one/my-deals/my-deals-kanban-composer.tsx";
const board = "src/components/catalyst-one/my-deals/my-deals-kanban-board.tsx";
const stagesConst = "src/constants/my-deals-kanban.ts";
const logo = "src/components/catalyst-one/shared/lender-logo.tsx";

mustContain(workspace, "MY_DEALS_OFFICIAL_NAME", "loans-only official name");
mustNotContain(workspace, "MY_DEALS_BUSINESS_TABS", "Soon business tabs in My Deals UI");
mustContain(workspace, "MY_DEALS_WORKSPACE_VIEWS", "Deals / Kanban views");
mustContain(card, "borrowerName", "mandatory borrower");
mustContain(card, "LenderLogo", "official lender logo");
mustContain(card, "loanAmountLabel", "mandatory amount");
mustContain(card, "row.product", "mandatory product");
mustNotContain(card, "window.open(`tel:", "immediate tel: send");
mustNotContain(card, "wa.me", "immediate WhatsApp send");
mustContain(composer, "EmailContextWorkspace", "email composer");
mustContain(composer, "WhatsAppContextWorkspace", "whatsapp composer");
mustContain(composer, "EnterpriseActivityComposer", "activity composer");
mustContain(board, "overflow-x-auto", "horizontal board scroll");
mustContain(board, "overflow-y-auto", "independent column scroll");
mustContain(board, "sticky top-0", "sticky stage headers");
mustContain(stagesConst, "LENDER_CASE_STAGES", "canonical lender stages");
mustContain(stagesConst, "LENDER_LOST_REASONS", "canonical rejected label");
mustContain(logo, "PlaceholderMark", "initials fallback");
mustContain(
  "src/components/catalyst-one/accounting/accounting-cases-panel.tsx",
  "focusCaseId",
  "accounting case deep-link",
);
mustContain("src/lib/my-deals/kanban-cta.ts", "Open Accounting Case", "accounting CTA");
mustContain("src/lib/my-deals/kanban-cta.ts", "Open Lender Workflow", "lender workflow CTA");

expect(
  "official name constant",
  MY_DEALS_OFFICIAL_NAME === "My Deals · Loan Deal Registry",
);

expect(
  "default stages include Pre Login from canonical catalog",
  MY_DEALS_KANBAN_DEFAULT_STAGE_IDS.includes("prelogin") &&
    LENDER_CASE_STAGES.some((s) => s.id === "prelogin"),
);
expect(
  "default stages include PDC and Accounting",
  MY_DEALS_KANBAN_DEFAULT_STAGE_IDS.includes("post_disbursement_confirmation") &&
    MY_DEALS_KANBAN_DEFAULT_STAGE_IDS.includes("accounting"),
);
expect(
  "Hold/Lost/Cancelled/Rejected are optional",
  !MY_DEALS_KANBAN_DEFAULT_STAGE_IDS.includes("hold") &&
    !MY_DEALS_KANBAN_DEFAULT_STAGE_IDS.includes("lost") &&
    MY_DEALS_KANBAN_COLUMNS.some((c) => c.id === "hold" && !c.defaultSelected) &&
    MY_DEALS_KANBAN_COLUMNS.some((c) => c.id === "cancelled" && !c.defaultSelected) &&
    MY_DEALS_KANBAN_COLUMNS.some((c) => c.id === "rejected" && !c.defaultSelected),
);

function fixture(partial) {
  return {
    id: "row-1",
    enterpriseDealId: "deal-1",
    opportunityId: "opp-1",
    dealId: "DL-1",
    opportunityNumber: "OPP-1",
    fileNumber: "F-1",
    borrowerName: "Test Borrower",
    contactNumber: "—",
    product: "Home Loan",
    loanAmount: 1_000_000,
    loanAmountLabel: "₹10,00,000",
    assignedRm: "Asha",
    assignedUsers: [{ id: "u1", name: "Asha" }],
    grossStage: "pre_login",
    lenderCaseStage: "prelogin",
    grossStageLabel: "Pre Login",
    subStage: "—",
    selectedLender: "HDFC Bank",
    expectedRevenue: 0,
    expectedRevenueLabel: "₹0",
    priority: "medium",
    lastActivity: "2026-09-01T00:00:00.000Z",
    lastActivityLabel: "01 Sep",
    dateCreated: "2026-08-01T00:00:00.000Z",
    dateCreatedLabel: "01 Aug",
    lastModified: "2026-09-01T00:00:00.000Z",
    lastModifiedLabel: "01 Sep",
    status: "on_track",
    statusLabel: "on track",
    city: "—",
    state: "—",
    source: "Walk-in",
    channelPartner: "—",
    creditExecutive: "—",
    operationsExecutive: "—",
    branch: "—",
    sanctionAmount: 0,
    sanctionAmountLabel: "₹0",
    disbursedAmount: 0,
    disbursedAmountLabel: "₹0",
    roi: 0,
    roiLabel: "—",
    tatDays: 3,
    nextFollowUp: "—",
    documentsPending: 0,
    tasksPending: 0,
    riskIndicator: "Low",
    productFamily: "lending",
    ...partial,
  };
}

const oppDeals = Array.from({ length: 5 }, (_, i) =>
  fixture({
    id: `row-${i}`,
    enterpriseDealId: `deal-${i}`,
    dealId: `DL-${i}`,
    selectedLender: `Lender ${i + 1}`,
    lenderCaseStage: "logged_in_wip",
    grossStageLabel: "Logged In – WIP",
  }),
);

const grouped = groupDealsForMyDealsKanban(oppDeals, ["logged_in_wip"]);
expect("one Opportunity with 5 Deals produces 5 cards", grouped[0]?.dealCount === 5);

const mixedFamilies = [
  fixture({ productFamily: "lending" }),
  fixture({ id: "mf", enterpriseDealId: "mf", productFamily: "mutual_fund" }),
  fixture({ id: "ins", enterpriseDealId: "ins", productFamily: "insurance" }),
];
expect("loan-only filter drops non-lending", filterLoanDealRegistryRows(mixedFamilies).length === 1);
expect("lending row is loan", isLoanDealRegistryRow(mixedFamilies[0]));
expect("mf row is not loan", !isLoanDealRegistryRow(mixedFamilies[1]));

const emptyBoard = groupDealsForMyDealsKanban(oppDeals, []);
expect("empty stage selection renders no columns", emptyBoard.length === 0);

const optionalOnly = groupDealsForMyDealsKanban(
  [fixture({ lenderCaseStage: "hold", lifecycleStatus: "on_hold" })],
  ["hold"],
);
expect("optional Hold column works", optionalOnly[0]?.dealCount === 1);

const cancelled = fixture({ lifecycleStatus: "cancelled", lenderCaseStage: "prelogin" });
expect("cancelled maps to cancelled column", resolveMyDealsKanbanColumnId(cancelled) === "cancelled");

const rejected = fixture({ lenderCaseStage: "lost", subStage: "rejected" });
expect("rejected maps to rejected column", resolveMyDealsKanbanColumnId(rejected) === "rejected");

const accountingRow = fixture({
  lenderCaseStage: "post_disbursement_confirmation",
  accountingCaseId: "case-99",
});
expect(
  "accounting-linked deal maps to accounting column",
  resolveMyDealsKanbanColumnId(accountingRow) === "accounting",
);

const completedAccounting = fixture({
  lenderCaseStage: "post_disbursement_confirmation",
  accountingCaseId: "case-done",
  accountingStatus: "completed",
});
expect(
  "completed accounting case maps to completed column",
  resolveMyDealsKanbanColumnId(completedAccounting) === "completed",
);

const acctCta = resolveMyDealsKanbanCta(accountingRow, "accounting");
expect("accounting CTA label", acctCta.label === MY_DEALS_KANBAN_ACCOUNTING_CTA);
expect("accounting CTA href is exact case", acctCta.href?.includes("case=case-99") === true);

const pdcCta = resolveMyDealsKanbanCta(
  fixture({ lenderCaseStage: "post_disbursement_confirmation", enterpriseDealId: "deal-pdc" }),
  "post_disbursement_confirmation",
);
expect("PDC uses lender workflow CTA", pdcCta.label === MY_DEALS_KANBAN_LENDER_CTA);
expect("PDC href is deal workspace", pdcCta.href?.includes("/deals/") === true);

const tenPlus = Array.from({ length: 12 }, (_, i) =>
  fixture({
    id: `bulk-${i}`,
    enterpriseDealId: `bulk-${i}`,
    lenderCaseStage: "prelogin",
  }),
);
const bulkCol = groupDealsForMyDealsKanban(tenPlus, ["prelogin"])[0];
expect("10+ cards remain in one column", bulkCol?.dealCount === 12);

mustContain("src/lib/my-deals/kanban-prefs.ts", "${PREFIX}:${resolveOrgScope(organizationId)}:${userId", "org + employee pref key");
mustContain("src/lib/my-deals/kanban-board.ts", "isCompletedAccountingCase", "completed accounting not in active Accounting");
mustNotContain(
  "src/components/catalyst-one/accounting/accounting-cases-panel.tsx",
  "openEdit(hit)",
  "case deep-link must not auto-open edit",
);

const prefs = defaultMyDealsKanbanPrefs();
expect(
  "default field prefs include RC employee",
  prefs.visibleOptionalFieldIds.includes("assignedRcEmployee") &&
    MY_DEALS_KANBAN_DEFAULT_FIELD_IDS.includes("assignedRcEmployee"),
);

const comms = kanbanActionAvailability(
  [
    {
      id: "c1",
      name: "Borrower",
      recipientType: "customer",
    },
  ],
  "email",
);
expect(
  "disabled comms explain missing channel",
  comms.available === false && String(comms.reason).toLowerCase().includes("email"),
);

const alertRow = fixture({ riskIndicator: "High", documentsPending: 2, tasksPending: 1 });
const alert = primaryMyDealsKanbanAlert(alertRow);
expect("highest alert shown with extra count", Boolean(alert.primary) && alert.extraCount >= 1);

if (failures.length) {
  console.error("FAIL");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

console.log("PASS CO-C1-MY-DEALS-KANBAN-001");
console.log(` default stages: ${MY_DEALS_KANBAN_DEFAULT_STAGE_IDS.join(", ")}`);
console.log(` 5-deal opportunity cards: ${grouped[0].dealCount}`);
console.log(` loan-only remaining: ${filterLoanDealRegistryRows(mixedFamilies).length}`);
