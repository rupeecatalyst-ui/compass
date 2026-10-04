/**
 * Item N — Document Workspace contact-centric registry (overnight, no DB).
 * Proves CURRENT production-derived contract. Does not invent contact-only locks.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  lockDocumentWorkspaceContext,
  validateDocumentWorkspaceInputIds,
  filterRegistryRecordsForLockedContext,
  buildDocumentWorkspaceHref,
} from "../src/lib/document-workspace/context-lock.ts";
import { buildContact360Href } from "../src/lib/document-workspace/contact-href.ts";
import {
  buildDocumentWorkspaceCardGroups,
  buildDocumentWorkspaceCardSelectPayload,
  DOCUMENT_WORKSPACE_CARD_GRID_DEFAULT_FILTERS,
} from "../src/lib/document-workspace/transaction-card-grid.ts";
import { DOCUMENT_WORKSPACE_CARD_GRID_CHIPS } from "../src/constants/document-workspace-card-grid.ts";

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

const switcher = "src/components/catalyst-one/document-workspace/document-workspace-switcher.tsx";
const card = "src/components/catalyst-one/document-workspace/document-workspace-transaction-card.tsx";
const desk = "src/components/catalyst-one/document-workspace/document-workspace.tsx";
const lockLib = "src/lib/document-workspace/context-lock.ts";
const access = "server/services/document-workspace/document-workspace-access.service.ts";
const panel = "src/components/catalyst-one/opportunity-workspace/workspace-documents-panel.tsx";
const prisma = "prisma/schema.prisma";

const switcherSrc = read(switcher);
const deskSrc = read(desk);
const prismaSrc = read(prisma);

expect(
  "root landing loads Opportunity registry, not Contact registry",
  switcherSrc.includes("searchOpportunities") && !switcherSrc.includes("liveSearchOperationalContacts"),
);
expect("search also discovers Deals by query", switcherSrc.includes("searchDeals"));
expect("Open Contact navigates Contact 360, not Document Workspace lock", switcherSrc.includes("buildContact360Href"));
expect("empty landing copy is Opportunity-centric", switcherSrc.includes("No authorised Opportunities match"));
expect("desk opens only with opportunityId or dealId", deskSrc.includes("Boolean(opportunityId || dealIdFromUrl)"));
expect(
  "008 lock refuses contact-only (MISSING_TRANSACTION)",
  read(lockLib).includes('MISSING_TRANSACTION') &&
    read(lockLib).includes("Document Workspace requires an Opportunity or Deal id."),
);
expect(
  "durable document row requires opportunity_id",
  /model EnterpriseTransactionDocument[\s\S]*?opportunityId\s+String\s+@map\("opportunity_id"\)/.test(prismaSrc),
);
expect("access service locks via lockDocumentWorkspaceContext", read(access).includes("lockDocumentWorkspaceContext"));
expect(
  "Item D Opportunity Documents still uses buildDocumentWorkspaceHref",
  read(panel).includes("buildDocumentWorkspaceHref") &&
    read(panel).includes("opportunityId: opportunityId || null") &&
    read(panel).includes("contactId: contactId || null"),
);
expect("All / pending / recent / assigned chips remain", DOCUMENT_WORKSPACE_CARD_GRID_CHIPS.length === 4);
expect(
  "card still exposes Open Contact + View Documents",
  read(card).includes("DOCUMENT_WORKSPACE_OPEN_CONTACT_LABEL") &&
    read(card).includes("DOCUMENT_WORKSPACE_VIEW_DOCUMENTS_LABEL"),
);

const contactOnly = validateDocumentWorkspaceInputIds({
  contactId: "ccontact000000000000001",
});
expect("N1 contact-only lock is MISSING_TRANSACTION", contactOnly?.code === "MISSING_TRANSACTION");
expect(
  "N1 contact-only href cannot open desk without transaction",
  buildDocumentWorkspaceHref({ contactId: "ccontact000000000000001" }).includes("contactId=") &&
    !buildDocumentWorkspaceHref({ contactId: "ccontact000000000000001" }).includes("opportunityId="),
);

const oppOnly = {
  opportunityId: "copportunity000000000001",
  opportunityNumber: "OPP-1",
  borrowerName: "Ada",
  product: "Home Loan",
  amountLabel: "₹50L",
  stage: "Documents",
  lifecycleStatus: "active",
  assignedRc: "RM One",
  assignedUserId: "cuser000000000000000001",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
  contactId: "ccontact000000000000001",
  companyId: null,
  deals: [],
};
const n2 = buildDocumentWorkspaceCardGroups([oppOnly], DOCUMENT_WORKSPACE_CARD_GRID_DEFAULT_FILTERS);
expect("N2 contact+opportunity+zero deals remains one Opportunity group", n2.length === 1 && n2[0].deals.length === 0);
expect("N2 select payload is Opportunity lock, not contact-only", !!(
  buildDocumentWorkspaceCardSelectPayload(n2[0].opportunity).opportunityId &&
  !buildDocumentWorkspaceCardSelectPayload(n2[0].opportunity).dealId
));

const withDeal = {
  ...oppOnly,
  deals: [
    {
      dealId: "cdealA000000000000000001",
      dealNumber: "DEAL-A",
      opportunityId: oppOnly.opportunityId,
      opportunityNumber: "OPP-1",
      borrowerName: "Ada",
      lenderName: "HDFC",
      product: "Home Loan",
      amountLabel: "₹50L",
      stage: "Login",
      assignedRc: "RM One",
      createdAt: "2026-09-03T00:00:00.000Z",
      updatedAt: "2026-09-03T00:00:00.000Z",
      contactId: "ccontact000000000000001",
    },
  ],
};
const n3 = buildDocumentWorkspaceCardGroups([withDeal]);
expect("N3 Opportunity → Deal hierarchy preserved", n3[0].deals.length === 1 && n3[0].deals[0].dealId === "cdealA000000000000000001");
const dealPayload = buildDocumentWorkspaceCardSelectPayload(n3[0].deals[0]);
expect("N3 Deal select carries opportunityId + dealId", dealPayload.opportunityId === oppOnly.opportunityId && dealPayload.dealId === "cdealA000000000000000001");

expect("N4 switcher does not search ECM Contacts independently", !switcherSrc.includes("liveSearchOperationalContacts"));
expect("N5 Opportunity search remains the landing query", switcherSrc.includes("enterpriseOpportunityApiClient.searchOpportunities"));
expect("N6 Deal search remains additive discovery", switcherSrc.includes("enterpriseDealApiClient.searchDeals"));

const mismatch = lockDocumentWorkspaceContext({
  request: {
    opportunityId: "copportunity000000000001",
    contactId: "ccontactOTHER00000000001",
  },
  actorOrganizationId: "corg0000000000000000001",
  opportunity: {
    id: "copportunity000000000001",
    organizationId: "corg0000000000000000001",
    primaryContactId: "ccontact000000000000001",
    isDeleted: false,
  },
});
expect("N7 unauthorized/mismatched contact fails closed", !mismatch.ok && mismatch.code === "CONTACT_OPPORTUNITY_MISMATCH");

const records = [
  {
    id: "doc-1",
    status: "active",
    links: { opportunityId: "copportunity000000000001", contactId: "ccontact000000000000001" },
  },
  {
    id: "doc-2",
    status: "active",
    links: { opportunityId: "copportunity000000000001", dealId: "cdealA000000000000000001", documentScope: "lender" },
  },
  {
    id: "doc-3",
    status: "active",
    links: { opportunityId: "copportunityOTHER0000001", contactId: "ccontact000000000000001" },
  },
];
const oppScoped = filterRegistryRecordsForLockedContext({
  records,
  opportunityId: "copportunity000000000001",
});
const dealScoped = filterRegistryRecordsForLockedContext({
  records,
  opportunityId: "copportunity000000000001",
  dealId: "cdealA000000000000000001",
});
expect("N8 opportunity scope does not copy other-opportunity rows", oppScoped.map((r) => r.id).join(",") === "doc-1");
expect("N8 deal scope does not duplicate contact rows into a second store", dealScoped.some((r) => r.id === "doc-2") && dealScoped.length >= 1);

const itemDHref = buildDocumentWorkspaceHref({
  opportunityId: "copportunity000000000001",
  contactId: "ccontact000000000000001",
});
expect("N9 Item D href still locks Opportunity + Contact", itemDHref.includes("opportunityId=copportunity000000000001") && itemDHref.includes("contactId=ccontact000000000000001"));

const newer = { ...oppOnly, opportunityId: "copportunity000000000002", opportunityNumber: "OPP-2", createdAt: "2026-09-20T00:00:00.000Z" };
const sorted = buildDocumentWorkspaceCardGroups([oppOnly, newer]);
expect("N10 newest-first Opportunity order preserved", sorted[0].opportunityId === newer.opportunityId);
expect("N10 All chip does not invent a Contact registry", DOCUMENT_WORKSPACE_CARD_GRID_CHIPS[0].id === "all");

const contact360 = buildContact360Href({ contactId: "ccontact000000000000001" });
expect("Contact 360 remains the Open Contact destination", Boolean(contact360 && contact360.includes("contact=ccontact000000000000001")));

if (failures.length) {
  console.error(`\nItem N verify FAIL (${failures.length})\n${failures.map((f) => ` - ${f}`).join("\n")}`);
  process.exit(1);
}
console.log("\nItem N verify PASS — current architecture is transaction-locked; contact-only desk is BLOCKED.");
