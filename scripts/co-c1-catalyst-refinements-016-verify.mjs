/**
 * CO-C1-CATALYST-REFINEMENTS-016 — focused verifier.
 * Sticky Notes four-block workspace, COMPASS Advantage handoff, Documents CTA.
 * No production mutation, deploy, migrate apply, or Hostinger.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STICKY_NOTE_WORKSPACE_BLOCKS } from "../src/constants/sticky-notes.ts";
import { decideCompassSubmissionAdvantageCommit } from "../src/lib/advantage-committed/compass-handoff.ts";
import {
  buildAuthorisedDocumentWorkspaceHref,
  resolveAuthorisedDocumentWorkspaceOpportunityId,
} from "../src/lib/document-workspace/context-lock.ts";
import { buildCanonicalJourneyStageHref } from "../src/constants/canonical-journey-header.ts";
import { buildBusinessJourneyHref } from "../src/constants/enterprise-business-journey-navigation.ts";
import { ROUTES } from "../src/constants/routes.ts";
import { publicDocumentWorkspaceAccessMessage } from "../src/lib/document-workspace/access-decision.ts";
import {
  DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE,
} from "../src/constants/document-workspace-security.ts";

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
function expect(name, condition) {
  if (condition) ok(name);
  else fail(name);
}
function mustContain(rel, needle, label = needle) {
  expect(`${rel} contains ${label}`, read(rel).includes(needle));
}
function mustNotContain(rel, needle, label = needle) {
  expect(`${rel} omits ${label}`, !read(rel).includes(needle));
}

console.log("\n--- A Sticky Notes four-block workspace ---");
expect("four blocks recovered from existing note fields", STICKY_NOTE_WORKSPACE_BLOCKS.length === 4);
expect("title block", STICKY_NOTE_WORKSPACE_BLOCKS[0].id === "title" && STICKY_NOTE_WORKSPACE_BLOCKS[0].label === "Title");
expect("body block", STICKY_NOTE_WORKSPACE_BLOCKS[1].id === "body" && STICKY_NOTE_WORKSPACE_BLOCKS[1].label === "Private notes");
expect("checklist block", STICKY_NOTE_WORKSPACE_BLOCKS[2].id === "checklist");
expect("reminder/link block", STICKY_NOTE_WORKSPACE_BLOCKS[3].id === "reminder_link");
mustContain("src/components/catalyst-one/sticky-notes/sticky-notes-workspace.tsx", "data-sticky-block");
mustContain("src/components/catalyst-one/sticky-notes/sticky-notes-workspace.tsx", "min-h-[14rem]");
mustContain("src/components/catalyst-one/sticky-notes/sticky-notes-workspace.tsx", "bg-card");
mustContain("src/components/catalyst-one/sticky-notes/sticky-notes-workspace.tsx", "text-foreground");
mustContain("src/components/catalyst-one/sticky-notes/sticky-notes-workspace.tsx", "bg-accent");
mustContain("src/components/catalyst-one/sticky-notes/sticky-notes-workspace.tsx", "text-accent-foreground");
mustNotContain(
  "src/components/catalyst-one/sticky-notes/sticky-notes-workspace.tsx",
  "bg-amber-100",
  "legacy sticky-card fill",
);
mustNotContain(
  "src/components/catalyst-one/sticky-notes/sticky-notes-workspace.tsx",
  "sm:grid-cols-2 xl:grid-cols-3",
  "legacy sticky-card grid",
);
mustContain("src/components/catalyst-one/sticky-notes/sticky-notes-workspace.tsx", "@/lib/sticky-notes/client");
mustContain("src/components/catalyst-one/sticky-notes/sticky-notes-workspace.tsx", "createStickyNote");
mustContain("src/components/catalyst-one/sticky-notes/sticky-notes-workspace.tsx", "updateStickyNote");
mustContain("src/components/catalyst-one/sticky-notes/sticky-notes-workspace.tsx", "Save");
mustContain("src/components/catalyst-one/sticky-notes/sticky-notes-workspace.tsx", "datetime-local");
mustContain("src/components/catalyst-one/sticky-notes/sticky-notes-workspace.tsx", "form.linkKind");
mustContain("src/components/catalyst-one/sticky-notes/sticky-notes-workspace.tsx", "archiveStickyNote");
mustContain("src/components/catalyst-one/sticky-notes/sticky-notes-workspace.tsx", "lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]");
mustContain("src/components/catalyst-one/sticky-notes/sticky-notes-workspace.tsx", "lg:grid-cols-2");
mustNotContain("src/components/catalyst-one/sticky-notes/sticky-notes-workspace.tsx", "autosave");
mustContain("server/services/sticky-notes/sticky-notes.service.ts", "ownerUserId: scope.ownerUserId");
mustNotContain("src/components/catalyst-one/sticky-notes/sticky-notes-workspace.tsx", "localStorage");
mustNotContain("prisma/schema.prisma", "EmployeePrivateStickyNoteV2", "second notes model");

console.log("\n--- B COMPASS Advantage commitment visibility ---");
const submittedBase = {
  opportunityId: "clopportunitysanjay01",
  snapshotOpportunityId: "clopportunitysanjay01",
  productCode: "home-loan",
  existingCommittedAmount: null,
  snapshotTotalAdvantageAmount: "125000",
  snapshotCalculationStatus: "ready",
  snapshotCalculatedAt: "2026-09-09T10:00:00.000Z",
  journeySubmittedAt: "2026-09-09T10:05:00.000Z",
};
const hl = decideCompassSubmissionAdvantageCommit(submittedBase);
expect(
  "eligible submitted HL journey commits by Opportunity id",
  hl.action === "commit" && hl.reason === "submitted_snapshot" && hl.amount === "125000",
);

const hlbt = decideCompassSubmissionAdvantageCommit({
  ...submittedBase,
  productCode: "home-loan-balance-transfer",
  snapshotTotalAdvantageAmount: "250000",
});
expect(
  "eligible submitted HLBT journey commits",
  hlbt.action === "commit" && hlbt.amount === "250000",
);

const provisional = decideCompassSubmissionAdvantageCommit({
  ...submittedBase,
  journeySubmittedAt: null,
  opportunitySnapshot: {},
});
expect(
  "non-submitted/provisional snapshot is not committed",
  provisional.action === "skip" && provisional.reason === "journey_not_submitted",
);

const recalcAfter = decideCompassSubmissionAdvantageCommit({
  ...submittedBase,
  snapshotCalculatedAt: "2026-09-09T12:00:00.000Z",
  journeySubmittedAt: "2026-09-09T10:05:00.000Z",
});
expect(
  "recalculated snapshot after submission is not committed",
  recalcAfter.action === "skip" && recalcAfter.reason === "snapshot_after_submission",
);

const personal = decideCompassSubmissionAdvantageCommit({
  ...submittedBase,
  productCode: "PERSONAL_LOAN",
});
expect("Cash Advantage skips non-HL products", personal.action === "skip" && personal.reason === "product_not_applicable");

const noSnapshot = decideCompassSubmissionAdvantageCommit({
  ...submittedBase,
  snapshotOpportunityId: null,
  snapshotTotalAdvantageAmount: null,
  snapshotCalculationStatus: null,
});
expect("missing snapshot is skip, not invented", noSnapshot.action === "skip" && noSnapshot.reason === "snapshot_absent");

const mismatch = decideCompassSubmissionAdvantageCommit({
  ...submittedBase,
  snapshotOpportunityId: "clotheropportunity99",
});
expect("snapshot id mismatch is skip", mismatch.action === "skip" && mismatch.reason === "snapshot_opportunity_mismatch");

const already = decideCompassSubmissionAdvantageCommit({
  ...submittedBase,
  existingCommittedAmount: "125000",
  snapshotTotalAdvantageAmount: "999999",
});
expect("existing commitment is never overwritten", already.action === "skip" && already.reason === "already_committed");

const firstOpen = decideCompassSubmissionAdvantageCommit(submittedBase);
const secondOpen = decideCompassSubmissionAdvantageCommit({
  ...submittedBase,
  existingCommittedAmount: firstOpen.action === "commit" ? firstOpen.amount : null,
});
expect("duplicate open/read remains idempotent", firstOpen.action === "commit" && secondOpen.action === "skip" && secondOpen.reason === "already_committed");

const schemaSnap = read("prisma/schema.prisma");
const snapBlock = schemaSnap.slice(
  schemaSnap.indexOf("model CompassAdvantageSnapshot"),
  schemaSnap.indexOf("model CompassAdvantageAudit"),
);
expect("snapshot model has no submitted/frozen column", !snapBlock.includes("submittedAt") && snapBlock.includes("calculatedAt"));

const display = read("src/lib/advantage-committed/display.ts");
expect("empty amount stays Not committed", display.includes("NOT_COMMITTED") || display.includes("not_committed"));
mustContain("server/services/compass-customer-gateway/compass-journey.service.ts", "commitAdvantageFromCompassSnapshot");
mustContain("server/services/compass-customer-gateway/compass-journey.service.ts", "compassSubmittedAt");
mustContain("server/services/enterprise-opportunity/index.ts", "commitAdvantageFromCompassSnapshot");
mustContain("server/services/advantage-committed/advantage-committed.service.ts", "readCompassJourneySubmittedAt");
mustNotContain("src/lib/advantage-committed/compass-handoff.ts", "Sanjay");
mustNotContain("server/services/advantage-committed/advantage-committed.service.ts", "primaryContactName");
mustNotContain("src/lib/advantage-committed/compass-handoff.ts", "wallet");

console.log("\n--- C Documents CTA → Document Workspace ---");
const canonicalOpp = "clopportunitydocs001";
const authorised = buildAuthorisedDocumentWorkspaceHref({ opportunityId: canonicalOpp });
expect(
  "authorised href is Document Workspace + opportunityId only",
  authorised === `${ROUTES.DOCUMENT_WORKSPACE}?opportunityId=${canonicalOpp}`,
);
expect("display OPP- number is rejected", resolveAuthorisedDocumentWorkspaceOpportunityId("OPP-1024") === null);
expect("name is rejected", resolveAuthorisedDocumentWorkspaceOpportunityId("Sanjay Shah") === null);
expect(
  "bare workspace when id missing",
  buildAuthorisedDocumentWorkspaceHref({ opportunityId: null }) === ROUTES.DOCUMENT_WORKSPACE,
);
expect(
  "canonical documents hop uses authorised href",
  buildCanonicalJourneyStageHref("documents", { opportunityId: canonicalOpp, fileId: "deal-file-1" }) ===
    authorised,
);
const continueHref = buildBusinessJourneyHref(
  { id: "document_center", label: "Documents", href: ROUTES.DOCUMENT_WORKSPACE, leadModuleId: "document_center" },
  { fileId: "deal-file-1", opportunityId: canonicalOpp },
);
expect("Continue Documents omits file=", !continueHref.includes("file="));
expect("Continue Documents omits organizationId", !continueHref.includes("organizationId"));
expect("Continue Documents omits dealId", !continueHref.includes("dealId="));
expect("Continue Documents uses Document Workspace", continueHref.startsWith(ROUTES.DOCUMENT_WORKSPACE));
expect(
  "inaccessible resource stays generic 404",
  publicDocumentWorkspaceAccessMessage(404) === DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE,
);

mustContain(
  "src/components/catalyst-one/opportunity-workspace/opportunity-workspace.tsx",
  "buildAuthorisedDocumentWorkspaceHref",
);
mustContain(
  "src/components/catalyst-one/opportunity-workspace/opportunity-workspace.tsx",
  "Opening Document Workspace",
);
mustNotContain(
  "src/components/catalyst-one/opportunity-workspace/opportunity-workspace.tsx",
  "WorkspaceDocumentRequestsPanel",
);
mustContain(
  "src/components/catalyst-one/chanakya-radar/chanakya-radar-workspace.tsx",
  "file.enterpriseOpportunityId",
);
mustContain(
  "src/constants/canonical-journey-header.ts",
  "href: ROUTES.DOCUMENT_WORKSPACE",
);
mustContain(
  "src/constants/lead-opportunity-journey.ts",
  "href: ROUTES.DOCUMENT_WORKSPACE",
);
mustNotContain(
  "src/components/catalyst-one/opportunity-workspace/opportunity-workspace.tsx",
  "ROUTES.DOCUMENT_CENTER",
);

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nCO-C1-CATALYST-REFINEMENTS-016 verifier PASS");
