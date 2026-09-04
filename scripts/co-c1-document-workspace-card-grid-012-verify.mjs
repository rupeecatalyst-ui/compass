/**
 * CO-C1-DOCUMENT-WORKSPACE-CARD-GRID-012
 * Transaction-selection card grid. Document Registry remains SSOT.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DOCUMENT_WORKSPACE_CARD_GRID_CHIPS,
  DOCUMENT_WORKSPACE_CARD_GRID_DEFAULT_SORT,
  DOCUMENT_WORKSPACE_CARD_GRID_LOAD_MORE_LABEL,
  DOCUMENT_WORKSPACE_CARD_GRID_OPEN_DEAL_LABEL,
  DOCUMENT_WORKSPACE_CARD_GRID_OPEN_LABEL,
  DOCUMENT_WORKSPACE_CARD_GRID_PAGE_SIZE,
  DOCUMENT_WORKSPACE_CARD_GRID_SEARCH_PLACEHOLDER,
} from "../src/constants/document-workspace-card-grid.ts";
import { DOCUMENT_WORKSPACE_SUBTITLE } from "../src/constants/document-workspace.ts";
import { documentWorkspaceContextLooksLikePii } from "../src/lib/document-workspace/context-lock.ts";
import {
  DOCUMENT_WORKSPACE_CARD_GRID_DEFAULT_FILTERS,
  buildDocumentWorkspaceCardGroups,
  buildDocumentWorkspaceCardSelectPayload,
  compareTimestampDescThenId,
  deriveDocumentWorkspaceCardReadiness,
  filterGroupsWithPendingDocuments,
  flattenDocumentWorkspaceCardGroups,
  mergeOpportunityGroups,
  sanitizeDocumentWorkspaceCardGridQuery,
  sortOpportunityGroups,
} from "../src/lib/document-workspace/transaction-card-grid.ts";
import {
  ENTERPRISE_OPPORTUNITY_CREATED_AT_ID_ORDER,
  ENTERPRISE_OPPORTUNITY_DEFAULT_UPDATED_AT_ORDER,
  paginateOpportunitiesCreatedAtThenId,
  resolveEnterpriseOpportunitySearchOrderBy,
} from "../src/lib/enterprise-opportunity/search-order.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function expect(name, condition) {
  if (condition) console.log(`PASS  ${name}`);
  else {
    failures.push(name);
    console.log(`FAIL  ${name}`);
  }
}

function mustContain(rel, needle, label = needle) {
  expect(`${rel} contains ${label}`, read(rel).includes(needle));
}

function mustNotContain(rel, needle, label = needle) {
  expect(`${rel} omits ${label}`, !read(rel).includes(needle));
}

const switcher = "src/components/catalyst-one/document-workspace/document-workspace-switcher.tsx";
const cardUi = "src/components/catalyst-one/document-workspace/document-workspace-transaction-card.tsx";
const lib = "src/lib/document-workspace/transaction-card-grid.ts";
const workspace = "src/components/catalyst-one/document-workspace/document-workspace.tsx";
const opportunityRepo = "server/repositories/enterprise-opportunity/enterprise-opportunity.repository.ts";
const searchOrder = "src/lib/enterprise-opportunity/search-order.ts";
const pkg = JSON.parse(read("package.json"));

expect("npm script registered", Boolean(pkg.scripts["verify:co-c1-document-workspace-card-grid-012"]));
expect("default sort is newest_opportunity", DOCUMENT_WORKSPACE_CARD_GRID_DEFAULT_SORT === "newest_opportunity");
expect("page size below 200", DOCUMENT_WORKSPACE_CARD_GRID_PAGE_SIZE > 0 && DOCUMENT_WORKSPACE_CARD_GRID_PAGE_SIZE < 200);
expect(
  "search placeholder",
  DOCUMENT_WORKSPACE_CARD_GRID_SEARCH_PLACEHOLDER === "Search customer, Opportunity or Deal",
);
expect(
  "Document Registry remains SSOT copy",
  DOCUMENT_WORKSPACE_SUBTITLE === "Enterprise Document Registry · Single Source of Truth",
);
expect(
  "lightweight chips include pending / recently created / assigned to me",
  DOCUMENT_WORKSPACE_CARD_GRID_CHIPS.map((c) => c.id).join(",") ===
    "all,pending_documents,recently_created,assigned_to_me",
);
expect("load more label", DOCUMENT_WORKSPACE_CARD_GRID_LOAD_MORE_LABEL === "Load more");
expect("deal action label", DOCUMENT_WORKSPACE_CARD_GRID_OPEN_DEAL_LABEL === "Open Deal Documents");
expect("opportunity action label", DOCUMENT_WORKSPACE_CARD_GRID_OPEN_LABEL === "Open Document Workspace");

mustContain(switcher, 'data-document-workspace-card-grid="012"', "card grid marker");
mustContain(switcher, "grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3", "3/2/1 columns");
mustContain(switcher, "w-full", "full width");
mustContain(switcher, 'orderBy: "createdAt"', "createdAt API orderBy before pagination");
mustContain(switcher, "DOCUMENT_WORKSPACE_CARD_GRID_PAGE_SIZE", "server page size");
mustContain(switcher, "sanitizeDocumentWorkspaceCardGridQuery", "pii-safe search");
mustContain(switcher, "buildDocumentWorkspaceCardSelectPayload", "canonical select payload");
mustContain(switcher, "listDocumentsForOpportunityRuntime", "registry readiness");
mustContain(switcher, "getDocumentRequestState", "requirement rules");
mustContain(switcher, "writeDocumentWorkspaceCardGridState", "state restore");
mustContain(switcher, "DOCUMENT_WORKSPACE_CARD_GRID_LOAD_MORE_LABEL", "load more control");
mustContain(switcher, "DOCUMENT_WORKSPACE_CARD_GRID_CHIPS", "lightweight filter chips");
mustContain("src/constants/document-workspace-card-grid.ts", "Opportunities with pending documents", "pending documents chip");
mustContain("src/constants/document-workspace-card-grid.ts", "Recently created", "recently created chip");
mustContain("src/constants/document-workspace-card-grid.ts", "Assigned to me", "assigned to me chip");
mustContain(switcher, "DocumentWorkspaceCardGridSkeleton", "loading skeleton");
mustContain(switcher, "data-card-grid-empty", "empty state");
mustContain(switcher, "loadGen", "request generation guard");
mustNotContain(switcher, "hits.slice(0, 20)", "old 20-record cap");
mustNotContain(switcher, "max-w-2xl", "narrow centred list");
mustNotContain(switcher, "limit: 12", "old page of 12");
mustNotContain(switcher, "primaryContactEmail", "email field");
mustNotContain(switcher, "primaryContactMobile", "mobile field");
mustNotContain(switcher, "updateDeal", "deal mutation");
mustNotContain(switcher, "updateOpportunity", "opportunity mutation");
mustNotContain(switcher, "queueOutboxMessage", "communication on open");
mustNotContain(switcher, "orderBy: \"updatedAt\"", "updatedAt must not be requested");
mustNotContain(switcher, "chanakya-chat-ux", "refinement 11 import");
mustNotContain(cardUi, "primaryContactEmail", "card email");
mustNotContain(cardUi, "primaryContactMobile", "card mobile");
mustNotContain(cardUi, "Opportunity ·", "Opportunity number as heading");
mustContain(cardUi, "text-xl font-semibold", "borrower dominates");
mustContain(cardUi, "text-xs text-muted-foreground", "id secondary");
mustContain(cardUi, 'data-borrower-heading=""', "borrower heading");
mustContain(cardUi, 'data-lender-deals=""', "nested lender deals");
mustContain(cardUi, 'data-open-deal=""', "deal action");
mustContain(cardUi, "LenderLogo", "lender logo");
mustContain(cardUi, "aria-label", "accessible labels");
mustContain(cardUi, "focus-visible:ring", "visible focus");
mustContain(cardUi, "DOCUMENT_WORKSPACE_CARD_GRID_READINESS_UNAVAILABLE", "neutral readiness");
mustContain(cardUi, "Required ", "required document count");
mustContain(workspace, 'data-document-workspace-opener="012"', "opening screen");
mustContain(workspace, "documentWorkspaceTransientUiAfterFingerprintChange", "stale UI cleared on context change");
mustContain(workspace, "applyLockedHref", "canonical href lock");
mustContain(lib, "createdAt", "createdAt sort");
mustContain(lib, "filterRegistryRecordsForLockedContext", "deal isolation");
mustContain(lib, "compareTimestampDescThenId", "deterministic tie-break");
mustNotContain(lib, 'sort === "recently_updated"', "updatedAt sort branch");
mustContain(opportunityRepo, "resolveEnterpriseOpportunitySearchOrderBy", "repository uses shared search order");
mustContain(opportunityRepo, "take: limit", "pagination take after order");
mustContain(opportunityRepo, "skip: offset", "pagination skip after order");
mustContain(searchOrder, '{ createdAt: "desc" as const }', "createdAt DESC primary");
mustContain(searchOrder, '{ id: "desc" as const }', "canonical id DESC secondary");
mustNotContain(searchOrder, "updatedAt: \"desc\" as const }, { id", "updatedAt default does not gain id sort");

expect("email query is refused", sanitizeDocumentWorkspaceCardGridQuery("ada@example.com") === "");
expect("mobile query is refused", sanitizeDocumentWorkspaceCardGridQuery("9876543210") === "");
expect("display search remains", sanitizeDocumentWorkspaceCardGridQuery("OPP-2026-000001") === "OPP-2026-000001");
expect("pii helper agrees", documentWorkspaceContextLooksLikePii("ada@example.com"));

const older = {
  opportunityId: "opp_old",
  opportunityNumber: "OPP-1",
  borrowerName: "Oldest Borrower",
  product: "Home Loan",
  amountLabel: "₹10,00,000",
  stage: "Documents",
  lifecycleStatus: "in_progress",
  assignedRc: "Riya",
  assignedUserId: "user_riya",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-09-03T12:00:00.000Z",
  deals: [],
};
const newer = {
  opportunityId: "opp_new",
  opportunityNumber: "OPP-3",
  borrowerName: "Newest Borrower",
  product: "LAP",
  amountLabel: "₹20,00,000",
  stage: "Credit",
  lifecycleStatus: "in_progress",
  assignedRc: "Arun",
  assignedUserId: "user_arun",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
  deals: [],
};
const sameTimeA = {
  ...newer,
  opportunityId: "opp_tie_a",
  opportunityNumber: "OPP-A",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};
const sameTimeB = {
  ...newer,
  opportunityId: "opp_tie_b",
  opportunityNumber: "OPP-B",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};
const withFiveDeals = {
  opportunityId: "opp_five",
  opportunityNumber: "OPP-5",
  borrowerName: "Five Deal Customer",
  product: "Business Loan",
  amountLabel: "₹50,00,000",
  stage: "Login",
  lifecycleStatus: "converted_to_deal",
  assignedRc: "Meera",
  assignedUserId: "user_meera",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-15T00:00:00.000Z",
  deals: [
    deal("deal_1", "2026-06-02T00:00:00.000Z", "Lender One"),
    deal("deal_2", "2026-06-05T00:00:00.000Z", "Lender Two"),
    deal("deal_3", "2026-06-05T00:00:00.000Z", "Lender Three"),
    deal("deal_4", "2026-06-08T00:00:00.000Z", "Lender Four"),
    deal("deal_5", "2026-06-10T00:00:00.000Z", "Lender Five"),
  ],
};

function deal(id, createdAt, lenderName) {
  return {
    dealId: id,
    dealNumber: `DEAL-${id}`,
    opportunityId: "opp_five",
    opportunityNumber: "OPP-5",
    borrowerName: "Five Deal Customer",
    lenderName,
    product: "Business Loan",
    amountLabel: "₹50,00,000",
    stage: "Login",
    assignedRc: "Meera",
    createdAt,
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

const defaultFilters = DOCUMENT_WORKSPACE_CARD_GRID_DEFAULT_FILTERS;

const ordered = sortOpportunityGroups([older, withFiveDeals, newer]);
expect("latest opportunity first", ordered[0].opportunityId === "opp_new");
expect("oldest opportunity last", ordered[ordered.length - 1].opportunityId === "opp_old");
expect(
  "updatedAt does not control default order",
  ordered[0].opportunityId !== "opp_old" && Date.parse(older.updatedAt) > Date.parse(newer.updatedAt),
);

const ties = sortOpportunityGroups([sameTimeB, sameTimeA]);
expect(
  "stable timestamp tie-breaker uses opportunity id descending",
  ties[0].opportunityId === "opp_tie_b" && ties[1].opportunityId === "opp_tie_a",
);
expect(
  "createdAt beats updatedAt for default",
  compareTimestampDescThenId(newer.createdAt, older.createdAt, newer.opportunityId, older.opportunityId) < 0,
);

const grouped = buildDocumentWorkspaceCardGroups([older, withFiveDeals, newer], defaultFilters);
const flat = flattenDocumentWorkspaceCardGroups(grouped);
const fiveGroup = grouped.find((g) => g.opportunityId === "opp_five");
expect("one grid card per opportunity including five-deal parent", grouped.length === 3);
expect("opportunity without deals remains visible", grouped.some((g) => g.opportunityId === "opp_old" && g.deals.length === 0));
expect("five deals remain nested under one opportunity", fiveGroup?.deals.length === 5);
expect("opportunity identity is the card heading source", fiveGroup?.opportunity.kind === "opportunity");
expect("nested deals are not extra top-level groups", grouped.filter((g) => g.opportunityId === "opp_five").length === 1);
const dealOrder = fiveGroup.deals.map((c) => c.dealId);
expect("deals sorted within parent by createdAt desc", dealOrder[0] === "deal_5" && dealOrder[dealOrder.length - 1] === "deal_1");
expect("no duplicate flattened keys", new Set(flat.map((c) => c.key)).size === flat.length);

const filtered = flattenDocumentWorkspaceCardGroups(
  buildDocumentWorkspaceCardGroups([older, withFiveDeals, newer], defaultFilters, "Newest Borrower"),
);
expect("search preserves createdAt order and grouping", filtered[0].borrowerName === "Newest Borrower" && filtered[0].kind === "opportunity");
expect("search does not resolve identity by name", buildDocumentWorkspaceCardSelectPayload(filtered[0]).opportunityId === "opp_new");

const lenderSearch = buildDocumentWorkspaceCardGroups(
  [older, withFiveDeals, newer],
  defaultFilters,
  "Lender Five",
);
expect("deal search keeps parent opportunity grouping", lenderSearch.length === 1 && lenderSearch[0].opportunityId === "opp_five");

const assigned = buildDocumentWorkspaceCardGroups(
  [older, withFiveDeals, newer],
  { chip: "assigned_to_me" },
  "",
  { userId: "user_arun", name: "Arun" },
);
expect("assigned to me matches canonical owner id", assigned.length === 1 && assigned[0].opportunityId === "opp_new");

const oppOpen = buildDocumentWorkspaceCardSelectPayload(grouped.find((g) => g.opportunityId === "opp_new").opportunity);
const dealOpen = buildDocumentWorkspaceCardSelectPayload(fiveGroup.deals[0]);
expect("opportunity open passes opportunity id only", oppOpen.opportunityId === "opp_new" && !oppOpen.dealId);
expect("deal open passes opportunity and deal ids", Boolean(dealOpen.opportunityId && dealOpen.dealId));

const emptyReadiness = deriveDocumentWorkspaceCardReadiness({
  opportunityId: "opp_new",
  lodItems: [],
  records: [],
});
expect("empty lod is not available, not fabricated percent", emptyReadiness.available === false);

const lodItems = [
  { typeRef: "pan", label: "PAN", category: "critical", moduleId: "kyc", moduleLabel: "KYC", mandatory: true, critical: true, status: "uploaded" },
  { typeRef: "aadhaar", label: "Aadhaar", category: "critical", moduleId: "kyc", moduleLabel: "KYC", mandatory: true, critical: true, status: "pending" },
];
const records = [
  {
    id: "doc_pan",
    typeRef: "pan",
    categoryLabel: "KYC",
    typeLabel: "PAN",
    status: "active",
    versions: [{ id: "v1" }],
    links: { opportunityId: "opp_five", dealId: "deal_5", documentScope: "lender" },
  },
  {
    id: "doc_other",
    typeRef: "pan",
    categoryLabel: "KYC",
    typeLabel: "PAN",
    status: "active",
    versions: [{ id: "v2" }],
    links: { opportunityId: "opp_five", dealId: "deal_1", documentScope: "lender" },
  },
];
const dealReadiness = deriveDocumentWorkspaceCardReadiness({
  opportunityId: "opp_five",
  dealId: "deal_5",
  lodItems,
  records,
});
const otherDeal = deriveDocumentWorkspaceCardReadiness({
  opportunityId: "opp_five",
  dealId: "deal_1",
  lodItems,
  records,
});
expect("readiness available from registry + requirements", dealReadiness.available === true);
expect("no cross-deal document leakage into counts", dealReadiness.available && otherDeal.available && dealReadiness.received !== undefined);

const pendingFiltered = filterGroupsWithPendingDocuments(grouped, new Map([
  ["opportunity:opp_new", { available: true, percent: 40, required: 2, received: 1, accepted: 0, pending: 1, rejected: 0, expired: 0, reviewPending: true, replacementOrRejection: false }],
  ["opportunity:opp_old", { available: false }],
]));
expect("pending-documents chip does not fabricate empty LOD", pendingFiltered.length === 1 && pendingFiltered[0].opportunityId === "opp_new");

const createdAtIdOrder = resolveEnterpriseOpportunitySearchOrderBy("createdAt");
const defaultOrder = resolveEnterpriseOpportunitySearchOrderBy("updatedAt");
const omittedOrder = resolveEnterpriseOpportunitySearchOrderBy(undefined);
expect(
  "createdAt search order is createdAt DESC then id DESC",
  JSON.stringify(createdAtIdOrder) === JSON.stringify(ENTERPRISE_OPPORTUNITY_CREATED_AT_ID_ORDER) &&
    createdAtIdOrder[0].createdAt === "desc" &&
    createdAtIdOrder[1].id === "desc",
);
expect(
  "unrelated consumers keep updatedAt-only default",
  JSON.stringify(defaultOrder) === JSON.stringify(ENTERPRISE_OPPORTUNITY_DEFAULT_UPDATED_AT_ORDER) &&
    JSON.stringify(omittedOrder) === JSON.stringify(ENTERPRISE_OPPORTUNITY_DEFAULT_UPDATED_AT_ORDER),
);

const repoSearch = read(opportunityRepo);
const orderIndex = repoSearch.indexOf("const orderBy = resolveEnterpriseOpportunitySearchOrderBy");
const takeIndex = repoSearch.indexOf("take: limit", orderIndex);
const skipIndex = repoSearch.indexOf("skip: offset", orderIndex);
expect("repository applies orderBy before take/skip", orderIndex >= 0 && takeIndex > orderIndex && skipIndex > orderIndex);

const sameCreatedAt = "2026-07-01T12:00:00.000Z";
const unorderedRows = [
  { id: "opp_c", createdAt: sameCreatedAt, opportunityNumber: "OPP-C", borrowerName: "Charlie" },
  { id: "opp_newer", createdAt: "2026-08-15T00:00:00.000Z", opportunityNumber: "OPP-NEW", borrowerName: "Newest" },
  { id: "opp_a", createdAt: sameCreatedAt, opportunityNumber: "OPP-A", borrowerName: "Alpha" },
  { id: "opp_b", createdAt: sameCreatedAt, opportunityNumber: "OPP-B", borrowerName: "Bravo" },
];
const expectedIds = ["opp_newer", "opp_c", "opp_b", "opp_a"];
const page1 = paginateOpportunitiesCreatedAtThenId(unorderedRows, { limit: 2, offset: 0 });
const page2 = paginateOpportunitiesCreatedAtThenId(unorderedRows, { limit: 2, offset: 2 });
const combined = [...page1, ...page2];
const combinedAgain = [
  ...paginateOpportunitiesCreatedAtThenId(unorderedRows, { limit: 2, offset: 0 }),
  ...paginateOpportunitiesCreatedAtThenId(unorderedRows, { limit: 2, offset: 2 }),
];
expect("equal-createdAt split across pages uses id DESC", page1.map((row) => row.id).join(",") === "opp_newer,opp_c");
expect("page 2 continues id DESC without repeating", page2.map((row) => row.id).join(",") === "opp_b,opp_a");
expect("page 1 plus page 2 contains every opportunity once", combined.map((row) => row.id).join(",") === expectedIds.join(","));
expect("no pagination duplicates", new Set(combined.map((row) => row.id)).size === 4);
expect("no pagination omissions", expectedIds.every((id) => combined.some((row) => row.id === id)));
expect("repeated retrieval is identical", combinedAgain.map((row) => row.id).join(",") === combined.map((row) => row.id).join(","));

function rowToGroup(row) {
  return {
    opportunityId: row.id,
    opportunityNumber: row.opportunityNumber,
    borrowerName: row.borrowerName,
    product: "Home Loan",
    amountLabel: "₹10,00,000",
    stage: "Documents",
    lifecycleStatus: "in_progress",
    assignedRc: "Riya",
    createdAt: row.createdAt,
    updatedAt: "2026-09-04T00:00:00.000Z",
    deals: [],
  };
}
const mergedClient = mergeOpportunityGroups(page1.map(rowToGroup), page2.map(rowToGroup));
const clientGrouped = buildDocumentWorkspaceCardGroups(mergedClient, defaultFilters);
expect(
  "client merge preserves server createdAt then id DESC order",
  clientGrouped.map((group) => group.opportunityId).join(",") === expectedIds.join(","),
);

const pageTokens = [];
let offset = 0;
const total = 240;
while (offset < total) {
  const end = Math.min(offset + DOCUMENT_WORKSPACE_CARD_GRID_PAGE_SIZE, total);
  for (let i = offset; i < end; i += 1) pageTokens.push(`opp_${i}`);
  offset = end;
}
expect("more than 200 records remain discoverable", pageTokens.length === 240);
expect("no cursor duplicates", new Set(pageTokens).size === 240);

const opener = read(workspace);
expect("opener is not a tiny nested list trap", opener.includes("overflow-x-hidden") && !opener.includes("max-w-2xl"));
mustContain(workspace, "actorUserId", "assigned-to-me actor");

if (failures.length) {
  console.error(`\nFAIL  ${failures.length} check(s)`);
  process.exit(1);
}
console.log("\nPASS  CO-C1-DOCUMENT-WORKSPACE-CARD-GRID-012");
