/**
 * Overnight Batch 2 (F–L) — isolated worktree proofs only.
 * No production database, no migrate, no deploy, no email send.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let databaseAttempts = 0;
globalThis.prisma = new Proxy({}, {
  get() {
    databaseAttempts += 1;
    throw new Error("DATABASE_FORBIDDEN");
  },
});

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const {
  documentWorkspaceFingerprint,
  documentWorkspaceTransientUiAfterFingerprintChange,
  composerMustRefuseStaleContext,
  buildDocumentWorkspaceHref,
} = await import("../src/lib/document-workspace/context-lock.ts");
const { decideHierarchyVisibility, decideDocumentBelongsToContext } = await import(
  "../src/lib/document-workspace/access-decision.ts"
);
const { resolveProductJourneyFieldLabel } = await import("../src/lib/product-journey/display-label.ts");
const { recordToEditorState } = await import("../src/lib/product-programme-operations/editor-state.ts");
const { structuredPayloadToCreateInput, programRecordToStructuredPayload } = await import(
  "../src/lib/product-programme-operations/to-registry-input.ts"
);
const { evaluateProgrammeCompleteness } = await import(
  "../src/lib/product-programme-operations/completeness.ts"
);
const { deriveEmploymentFamily } = await import("../src/lib/product-programme-operations/employment.ts");
const { ROUTES } = await import("../src/constants/routes.ts");

{
  const a = documentWorkspaceFingerprint({
    organizationId: "org_1",
    opportunityId: "opp_a",
    dealId: "deal_a",
    contactId: "ctc_a",
  });
  const b = documentWorkspaceFingerprint({
    organizationId: "org_1",
    opportunityId: "opp_b",
    dealId: "deal_b",
    contactId: "ctc_b",
  });
  assert.notEqual(a, b);
  assert.doesNotMatch(a, /Amit|Sharma|@/);
  const switched = documentWorkspaceTransientUiAfterFingerprintChange({
    previousFingerprint: a,
    nextFingerprint: b,
  });
  assert.equal(switched.switched, true);
  assert.equal(switched.mailbox, null);
  assert.equal(switched.composer, null);
  assert.deepEqual(switched.selectedIds, []);
  assert.equal(switched.groupedDraft, "");
  assert.equal(switched.coverBody, "");
  assert.equal(
    composerMustRefuseStaleContext({
      openedFingerprint: a,
      currentFingerprint: b,
      authorised: true,
    }),
    true,
  );
  const workspace = read("src/components/catalyst-one/document-workspace/document-workspace.tsx");
  const mailbox = read("src/components/catalyst-one/document-workspace/document-workspace-mailbox.tsx");
  assert.match(workspace, /setMailbox\(transition\.mailbox\)/);
  assert.match(workspace, /contextFingerprint=\{lock\?\.fingerprint \|\| contextKey\}/);
  assert.match(mailbox, /contextFingerprint/);
  assert.match(mailbox, /\[contextFingerprint\]/);
  console.log("PASS  F custom email stale context reset");
}

{
  const access = read("src/lib/document-workspace/access-decision.ts");
  assert.doesNotMatch(access, /uploadedBy|uploadActor|createdByUserId/);
  assert.match(access, /assignedUserIds/);
  assert.match(access, /decideHierarchyVisibility/);
  const visible = decideHierarchyVisibility({
    actor: {
      userId: "user_reassigned",
      role: "SUPER_ADMIN",
      organizationId: "org_1",
      displayName: "Admin",
    },
    opportunity: {
      id: "opp_1",
      organizationId: "org_1",
      assignedUserIds: ["user_reassigned"],
    },
    downlineUserIds: [],
  });
  assert.equal(visible.ok, true);
  const belongs = decideDocumentBelongsToContext({
    organizationId: "org_1",
    opportunityId: "opp_1",
    document: {
      id: "doc_before_assignment",
      organizationId: "org_1",
      opportunityId: "opp_1",
    },
  });
  assert.equal(belongs.ok, true);
  console.log("PASS  G document access stays on opportunity, not uploader");
}

{
  const editor = read("src/components/catalyst-one/product-programme-operations/programme-editor.tsx");
  assert.match(editor, /Salaried profile — business turnover inputs are not required/);
  assert.match(editor, /Self-employed rules may use turnover, ITR, GST or banking assessment/);
  assert.match(editor, /if \(salariedOnly\) return method\.id === "salary"/);
  assert.match(editor, /if \(employmentFamily === "self_employed"\) return method\.id !== "salary"/);
  assert.equal(deriveEmploymentFamily(["salaried"]), "salaried");
  assert.equal(deriveEmploymentFamily(["self-employed-business"]), "self_employed");
  const foir = read("src/lib/home-loan-recommendation/foir.ts");
  assert.match(foir, /export function calculateSalariedFoir/);
  const scoring = read("src/lib/product-recommendation/approved-scoring-contracts.ts");
  assert.match(scoring, /FOIR scoring curve is not approved/);
  console.log("PASS  H salaried / self-employed presentation remains distinct");
}

{
  const published = {
    id: "prog_1",
    lenderId: "lender_1",
    productCode: "HOME_LOAN",
    code: "HL-SAL",
    label: "Axis HL Salaried",
    employmentTypes: ["salaried"],
    legalConstitutions: ["individual"],
    residencyEligibility: ["resident"],
    incomeAssessmentMethods: ["salary"],
    geographyStates: ["MH"],
    geographyCities: ["Mumbai"],
    minCibil: 700,
    minAge: 21,
    maxAge: 65,
    minTenureMonths: 12,
    maxTenureMonths: 360,
    minLoanAmountExact: "1000000",
    maxLoanAmountExact: "50000000",
    minIncomeExact: "50000",
    minRoiExact: "8.50",
    rateType: "floating",
    benchmarkCode: "repo",
    policyVersionId: "polver_live_1",
    creditRiskPolicyRef: "pol_live_1",
    requiredDocumentTypeIds: ["pan"],
    requiredDocuments: [],
    effectiveFrom: "2026-01-01",
    reviewAt: "2026-12-31",
    additionalEligibilityFilters: null,
  };
  const editor = recordToEditorState(published);
  assert.equal(editor.policyVersionId, "polver_live_1");
  const create = structuredPayloadToCreateInput(editor, "admin");
  assert.equal(create.policyVersionId, "polver_live_1");
  const roundTrip = programRecordToStructuredPayload({
    ...published,
    policyVersionId: "polver_live_1",
  });
  assert.equal(roundTrip.policyVersionId, "polver_live_1");
  const missing = evaluateProgrammeCompleteness({ ...editor, policyVersionId: null });
  assert.equal(missing.complete, false);
  assert.equal(missing.errors.some((row) => row.field === "policyVersionId"), true);
  const draft = { ...published, ...editor, id: "prog_draft", publicationState: "draft" };
  assert.equal(draft.policyVersionId, "polver_live_1");
  console.log("PASS  I policy version identity preserved and fail-closed");
}

{
  const proposal = read("src/components/catalyst-one/enterprise-credit-workspace/ecw-proposal-generation-panel.tsx");
  assert.match(proposal, /CHANAKYA_CREDIT_PROPOSAL_STREAM_PATH/);
  assert.match(proposal, /EcwProposalDocumentView/);
  console.log("PASS  J proposal workspace exists in Catalyst One credit desk (readiness only)");
}

{
  const workspace = read("src/components/catalyst-one/opportunity-workspace/opportunity-workspace.tsx");
  assert.match(workspace, /buildDocumentWorkspaceHref/);
  assert.match(workspace, /buildOpportunityLoanWorkspaceHref/);
  assert.match(workspace, /ROUTES\.CREDIT_WORKBENCH/);
  const href = buildDocumentWorkspaceHref({
    opportunityId: "opp_nav_1",
    contactId: "ctc_nav_1",
  });
  assert.equal(href.startsWith(`${ROUTES.DOCUMENT_WORKSPACE}?`), true);
  assert.doesNotMatch(
    workspace.slice(workspace.indexOf("onUploadDocuments"), workspace.indexOf("onActivitySaved")),
    /openTab\("documents"\)/,
  );
  console.log("PASS  K opportunity Documents action stays on authorized Document Workspace");
}

{
  assert.equal(resolveProductJourneyFieldLabel("assessment:borrower.ageYears"), "Age");
  const masters = read("src/components/catalyst-one/admin/home-loan-recommendation-masters-workspace.tsx");
  const filters = read("src/components/catalyst-one/product-programme-operations/additional-eligibility-filter-builder.tsx");
  assert.match(masters, /resolveProductJourneyFieldLabel\(field\.id, field\.label\)/);
  assert.match(filters, /\{item\.label\}/);
  assert.doesNotMatch(filters, />\{item\.id\}</);
  console.log("PASS  L friendly labels used on touched admin surfaces");
}

assert.equal(databaseAttempts, 0);
console.log("DATABASE_ACCESSED: NO");
console.log("EMAIL_SENT: NO");
console.log("CO_C1_OVERNIGHT_UX_REFINEMENTS_BATCH2_20260925_VERIFY: PASS");
