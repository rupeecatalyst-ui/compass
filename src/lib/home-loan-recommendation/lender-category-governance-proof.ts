import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AUTHORISED_CIBIL_CATEGORY_RULES,
} from "@/lib/home-loan-recommendation/cibil-category";
import {
  LENDER_CATEGORY_BAND_DEFINITIONS,
  LENDER_CATEGORY_PUBLICATION_REQUIRED,
  planLenderCategoryDraft,
  planLenderCategoryTransition,
  publicationLenderCategoryDecision,
  type LenderCategoryAssignmentRow,
} from "@/lib/home-loan-recommendation/lender-category-governance";

function row(partial: Partial<LenderCategoryAssignmentRow> & Pick<LenderCategoryAssignmentRow, "id" | "lifecycleStatus">): LenderCategoryAssignmentRow {
  return {
    lenderId: "lender-sbi",
    category: "A",
    lineageId: "lineage-1",
    versionNumber: 1,
    previousVersionId: null,
    makerUserId: "maker-1",
    ...partial,
  };
}

export function runLenderCategoryGovernanceProof(): void {
  assert.equal(LENDER_CATEGORY_BAND_DEFINITIONS.A, "Prime / Conservative Credit Appetite");
  assert.equal(LENDER_CATEGORY_BAND_DEFINITIONS.B, "Standard / Broader Credit Appetite");
  assert.equal(LENDER_CATEGORY_BAND_DEFINITIONS.C, "Credit-Flexible / Exception Appetite");

  for (const category of [undefined, null, "", "D", "a", ["A", "B"]]) {
    const refused = planLenderCategoryDraft({ lenderId: "lender-sbi", category, existing: [] });
    assert.equal(refused.action, "refuse");
    if (refused.action === "refuse") assert.match(refused.reason, /No default is applied/);
  }

  const bulk = planLenderCategoryDraft({ lenderId: ["lender-sbi"], category: "A", existing: [] });
  assert.equal(bulk.action, "refuse");
  if (bulk.action === "refuse") assert.match(bulk.reason, /Bulk assignment is not available/);

  const first = planLenderCategoryDraft({ lenderId: " lender-sbi ", category: "A", existing: [] });
  assert.deepEqual(first, {
    action: "create",
    lenderId: "lender-sbi",
    category: "A",
    lineageId: "",
    versionNumber: 1,
    previousVersionId: null,
  });

  const active = row({ id: "v1", lifecycleStatus: "active", category: "A" });
  const next = planLenderCategoryDraft({ lenderId: "lender-sbi", category: "B", existing: [active] });
  assert.equal(active.category, "A");
  assert.deepEqual(next, {
    action: "create",
    lenderId: "lender-sbi",
    category: "B",
    lineageId: "lineage-1",
    versionNumber: 2,
    previousVersionId: "v1",
  });

  const draft = row({ id: "draft-1", lifecycleStatus: "draft" });
  assert.equal(planLenderCategoryDraft({ lenderId: "lender-sbi", category: "A", existing: [draft] }).action, "reuse_draft");
  const revised = planLenderCategoryDraft({ lenderId: "lender-sbi", category: "C", existing: [draft] });
  assert.equal(revised.action, "revise_draft");
  if (revised.action === "revise_draft") {
    assert.equal(revised.row.id, "draft-1");
    assert.equal(revised.category, "C");
  }
  assert.equal(draft.category, "A");

  const waiting = row({ id: "review-1", lifecycleStatus: "checker_review" });
  const blocked = planLenderCategoryDraft({ lenderId: "lender-sbi", category: "B", existing: [waiting] });
  assert.equal(blocked.action, "refuse");

  const otherLender = row({ id: "other", lenderId: "lender-axis", lifecycleStatus: "active", category: "C" });
  const isolated = planLenderCategoryDraft({
    lenderId: "lender-sbi",
    category: "A",
    existing: [otherLender],
  });
  assert.equal(isolated.action, "create");
  if (isolated.action === "create") assert.equal(isolated.versionNumber, 1);
  assert.equal(otherLender.category, "C");

  const makerDraft = row({ id: "d", lifecycleStatus: "draft", makerUserId: "maker-1" });
  const submitted = planLenderCategoryTransition({
    row: makerDraft,
    action: "submit_review",
    actorUserId: "maker-1",
    activeSiblingIds: ["active-old"],
  });
  assert.equal("error" in submitted, false);
  if (!("error" in submitted)) {
    assert.equal(submitted.lifecycleStatus, "checker_review");
    assert.deepEqual(submitted.supersedeIds, []);
  }

  const admin = "admin-1";
  const priorActive = row({ id: "prior-active", lifecycleStatus: "active", category: "B", makerUserId: "earlier-admin" });
  let current = row({
    id: "next",
    lifecycleStatus: "draft",
    makerUserId: admin,
    versionNumber: 2,
    previousVersionId: priorActive.id,
    category: "A",
  });
  const audit: Array<{ event: string; actorUserId: string }> = [
    { event: "created_category_draft", actorUserId: admin },
  ];
  for (const action of ["submit_review", "approve", "activate"] as const) {
    const plan = planLenderCategoryTransition({
      row: current,
      action,
      actorUserId: admin,
      activeSiblingIds: action === "activate" ? [priorActive.id, current.id, priorActive.id] : [],
    });
    if ("error" in plan) assert.fail(plan.error);
    audit.push({ event: action, actorUserId: admin });
    current = {
      ...current,
      lifecycleStatus: plan.lifecycleStatus,
    };
    if (action === "approve") {
      assert.equal(plan.lifecycleStatus, "approved");
      assert.equal(plan.checkerUserId, admin);
      assert.equal(plan.setApprovedAt, true);
      assert.deepEqual(plan.supersedeIds, []);
    }
    if (action === "activate") {
      assert.equal(plan.lifecycleStatus, "active");
      assert.equal(plan.checkerUserId, admin);
      assert.equal(plan.setActivatedAt, true);
      assert.deepEqual(plan.supersedeIds, [priorActive.id]);
    }
  }
  assert.equal(current.lifecycleStatus, "active");
  assert.equal(current.category, "A");
  assert.equal(priorActive.lifecycleStatus, "active");
  assert.equal(priorActive.category, "B");
  assert.deepEqual(audit.map((entry) => entry.actorUserId), [admin, admin, admin, admin]);

  const approveDraft = planLenderCategoryTransition({
    row: row({ id: "d", lifecycleStatus: "draft", makerUserId: admin }),
    action: "approve",
    actorUserId: admin,
    activeSiblingIds: [],
  });
  assert.deepEqual(approveDraft, { error: "Only Checker Review versions can be approved." });
  const activateReview = planLenderCategoryTransition({
    row: row({ id: "r", lifecycleStatus: "checker_review", makerUserId: admin }),
    action: "activate",
    actorUserId: admin,
    activeSiblingIds: [],
  });
  assert.deepEqual(activateReview, { error: "Only Approved versions can be activated." });
  const submitActive = planLenderCategoryTransition({
    row: row({ id: "a", lifecycleStatus: "active", makerUserId: admin }),
    action: "submit_review",
    actorUserId: admin,
    activeSiblingIds: [],
  });
  assert.deepEqual(submitActive, { error: "Only Draft versions can be submitted." });

  const root = resolve(process.cwd());
  const route = readFileSync(resolve(root, "src/app/api/admin/home-loan-recommendation-masters/route.ts"), "utf8");
  const service = readFileSync(
    resolve(root, "server/services/home-loan-recommendation/hl-recommendation-masters.service.ts"),
    "utf8",
  );
  const workspace = readFileSync(
    resolve(root, "src/components/catalyst-one/admin/home-loan-recommendation-masters-workspace.tsx"),
    "utf8",
  );
  assert.match(route, /create_category_draft/);
  assert.match(route, /createLenderCategoryDraft/);
  assert.match(service, /planLenderCategoryDraft/);
  assert.match(service, /planLenderCategoryTransition/);
  assert.match(service, /lifecycleStatus: "superseded"/);
  assert.doesNotMatch(service, /hlRecommendationLenderCategoryAssignment\.delete/);
  assert.match(workspace, /create_category_draft/);
  assert.match(workspace, /LENDER_CATEGORY_BAND_DEFINITIONS/);
  assert.match(workspace, /searchActiveLenders/);

  const roleGate = route.indexOf("WRITE_ROLES.has(actor.role)");
  const categoryIntent = route.indexOf('intent === "create_category_draft"');
  assert.ok(roleGate >= 0 && categoryIntent > roleGate);
  assert.match(route, /Administrator access is required/);

  const categoryBranch = service.slice(
    service.indexOf('if (input.kind === "category")'),
    service.indexOf('if (input.kind === "weights")'),
  );
  const otherMasters = service.slice(service.indexOf('if (input.kind === "weights")'));
  assert.doesNotMatch(categoryBranch, /Maker and checker cannot be the same user/);
  assert.match(categoryBranch, /actorUserId: input.actorUserId/);
  assert.match(categoryBranch, /at: now.toISOString\(\)/);
  assert.match(categoryBranch, /lifecycleStatus: "superseded"/);
  assert.match(categoryBranch, /effectiveUntil: now/);
  assert.match(otherMasters, /Maker and checker cannot be the same user/);
  const weights = readFileSync(resolve(root, "src/lib/product-recommendation/weight-lineage.ts"), "utf8");
  assert.match(weights, /Maker and checker cannot be the same user/);

  const now = new Date("2026-10-02T00:00:00.000Z");
  const publicationBlocked = [
    { category: null, lifecycleStatus: null },
    { category: "A", lifecycleStatus: "draft" },
    { category: "A", lifecycleStatus: "checker_review" },
    { category: "B", lifecycleStatus: "approved" },
    { category: "C", lifecycleStatus: "rejected" },
    { category: "A", lifecycleStatus: "active", isDeleted: true },
    { category: "D", lifecycleStatus: "active" },
    { category: null, lifecycleStatus: "active" },
  ];
  for (const sample of publicationBlocked) {
    const decision = publicationLenderCategoryDecision({ ...sample, now });
    assert.equal(decision.ok, false);
    if (!decision.ok) assert.equal(decision.reason, LENDER_CATEGORY_PUBLICATION_REQUIRED);
  }
  for (const category of ["A", "B", "C"] as const) {
    const decision = publicationLenderCategoryDecision({ category, lifecycleStatus: "active", now });
    assert.deepEqual(decision, { ok: true, category });
  }
  const future = publicationLenderCategoryDecision({
    category: "A",
    lifecycleStatus: "active",
    effectiveFrom: "2026-12-01T00:00:00.000Z",
    now,
  });
  assert.equal(future.ok, false);

  assert.deepEqual(AUTHORISED_CIBIL_CATEGORY_RULES, {
    notKnownCategories: ["A"],
    below700Categories: ["C"],
    atOrAbove700Categories: ["A", "B", "C"],
    belowThreshold: 700,
  });

  const publishSource = readFileSync(
    resolve(root, "server/services/product-programme-operations/programme.service.ts"),
    "utf8",
  );
  const completenessCheck = publishSource.indexOf("if (!completeness.complete)");
  const categoryCheck = publishSource.indexOf("publicationLenderCategoryDecision({");
  const publishWrite = publishSource.indexOf("publishApprovedProgram");
  assert.ok(completenessCheck >= 0 && categoryCheck > completenessCheck && publishWrite > categoryCheck);
  assert.match(publishSource, /LENDER_CATEGORY_PUBLICATION_REQUIRED/);
  const governanceSource = readFileSync(
    resolve(root, "src/lib/home-loan-recommendation/lender-category-governance.ts"),
    "utf8",
  );
  assert.match(governanceSource, /Lender Category is required before this programme can be published/);
  assert.doesNotMatch(publishSource, /category:\s*"A"/);
  assert.doesNotMatch(publishSource, /createLenderCategoryDraft/);

  const eligibility = readFileSync(
    resolve(root, "server/services/lender-recommendation/canonical-governed-eligibility.ts"),
    "utf8",
  );
  assert.match(eligibility, /LENDER_CATEGORY_NOT_PERMITTED/);
}
