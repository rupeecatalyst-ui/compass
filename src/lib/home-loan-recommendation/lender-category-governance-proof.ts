import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  LENDER_CATEGORY_BAND_DEFINITIONS,
  planLenderCategoryDraft,
  planLenderCategoryTransition,
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

  const ownApproval = planLenderCategoryTransition({
    row: row({ id: "r", lifecycleStatus: "checker_review", makerUserId: "maker-1" }),
    action: "approve",
    actorUserId: "maker-1",
    activeSiblingIds: [],
  });
  assert.deepEqual(ownApproval, { error: "Maker and checker cannot be the same user." });

  const approved = planLenderCategoryTransition({
    row: row({ id: "r", lifecycleStatus: "checker_review", makerUserId: "maker-1" }),
    action: "approve",
    actorUserId: "checker-2",
    activeSiblingIds: ["r"],
  });
  if ("error" in approved) assert.fail(approved.error);
  assert.equal(approved.lifecycleStatus, "approved");
  assert.deepEqual(approved.supersedeIds, []);

  const activated = planLenderCategoryTransition({
    row: row({ id: "next", lifecycleStatus: "approved", makerUserId: "maker-1" }),
    action: "activate",
    actorUserId: "checker-2",
    activeSiblingIds: ["prior-active", "next", "prior-active"],
  });
  if ("error" in activated) assert.fail(activated.error);
  assert.equal(activated.lifecycleStatus, "active");
  assert.deepEqual(activated.supersedeIds, ["prior-active"]);
  assert.equal(activated.setActivatedAt, true);

  const makerActivate = planLenderCategoryTransition({
    row: row({ id: "next", lifecycleStatus: "approved", makerUserId: "maker-1" }),
    action: "activate",
    actorUserId: "maker-1",
    activeSiblingIds: [],
  });
  assert.deepEqual(makerActivate, { error: "Maker and checker cannot be the same user." });

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
}
