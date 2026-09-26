import assert from "node:assert/strict";
import {
  CANONICAL_RECOMMENDATION_FIELD_PROJECTION,
  listProjectedRecommendationFields,
} from "@/lib/product-recommendation/field-projection";
import {
  asMatchPercentLineageRow,
  displayedCriteriaBelongToRow,
  matchPercentCriterionDisplayLabel,
  matchPercentDraftIsEditable,
  matchPercentReviewCriteria,
  matchPercentReviewIsReadOnly,
  matchPercentReviewTotal,
  matchPercentSaveDraftRequest,
  matchPercentSelectValueIsInOptions,
  matchPercentTransitionRequest,
  matchPercentVisibleReviewActions,
  resolveMatchPercentDisplayedRow,
} from "@/lib/product-recommendation/weight-review";
import type { MatchPercentLineageRow } from "@/lib/product-recommendation/weight-lineage";

const GOVERNED_ID = "cmudxss71005354auhux3br6i";
const LEFTOVER_DRAFT_ID = "cmudxh05s004r54auxkve7jq5";
const OTHER_DRAFT_A = "cmudxg3zz004h54au8i2lr7yi";
const OTHER_DRAFT_B = "cmtxwzkwd0009548qkg29sips";

const GOVERNED_WEIGHTS = {
  "derived:applicableRoiPercent": 35,
  "derived:assessedOfferRupees": 20,
  "derived:foirPercent": 15,
  "derived:ltvPercent": 15,
  "derived:effectiveTenureMonths": 15,
} as const;

const LEGACY_DEMO_WEIGHTS = {
  roiCompetitiveness: 15,
  ltvFit: 7,
  lenderScore: 12,
  turnaroundTime: 8,
  feesAndTotalCost: 8,
  topUpSuitability: 5,
  approvalReliability: 10,
  policyEligibilityFit: 15,
  tenureEmiFlexibility: 7,
  balanceTransferBenefit: 5,
  eligibilityGapProximity: 8,
} as const;

const LEGACY_KEYS_MISLABELLED_AS_RESIDENCY = [
  "lenderScore",
  "turnaroundTime",
  "feesAndTotalCost",
  "topUpSuitability",
  "approvalReliability",
  "policyEligibilityFit",
  "tenureEmiFlexibility",
  "balanceTransferBenefit",
  "eligibilityGapProximity",
] as const;

function row(input: {
  id: string;
  lifecycleStatus: string;
  weightsJson: Record<string, number>;
  updatedAt: string;
  versionNumber?: number;
}): MatchPercentLineageRow {
  return asMatchPercentLineageRow(
    {
      id: input.id,
      productCode: "HOME_LOAN",
      lineageId: "e170cd6d-dcd5-4154-8f5b-cd1387122230",
      versionNumber: input.versionNumber ?? 1,
      lifecycleStatus: input.lifecycleStatus,
      weightsJson: input.weightsJson,
      updatedAt: input.updatedAt,
      createdAt: input.updatedAt,
    },
    "HOME_LOAN",
  );
}

function productionLikeRows(governedStatus: string): MatchPercentLineageRow[] {
  return [
    row({
      id: GOVERNED_ID,
      lifecycleStatus: governedStatus,
      weightsJson: { ...GOVERNED_WEIGHTS },
      updatedAt: "2026-09-26T08:57:29.157Z",
      versionNumber: 1,
    }),
    row({
      id: LEFTOVER_DRAFT_ID,
      lifecycleStatus: "draft",
      weightsJson: { ...LEGACY_DEMO_WEIGHTS },
      updatedAt: "2026-09-23T09:56:01.091Z",
    }),
    row({
      id: OTHER_DRAFT_A,
      lifecycleStatus: "draft",
      weightsJson: { lenderScore: 12, ltvFit: 7 },
      updatedAt: "2026-09-23T09:50:00.000Z",
    }),
    row({
      id: OTHER_DRAFT_B,
      lifecycleStatus: "draft",
      weightsJson: { roiCompetitiveness: 15 },
      updatedAt: "2026-09-20T09:00:00.000Z",
    }),
  ];
}

/** Documents the HTML select mismatch that painted leftover keys as Residency. */
function htmlSelectVisibleLabel(value: string, options: readonly { id: string; label: string }[]): string {
  const match = options.find((option) => option.id === value);
  return match?.label ?? options[0]?.label ?? "";
}

function CHECKER_VERSION_IDENTITY_TEST() {
  const rows = productionLikeRows("checker_review");
  const displayed = resolveMatchPercentDisplayedRow({
    rows,
    productCode: "HOME_LOAN",
    selectedVersionId: GOVERNED_ID,
  });
  assert.equal(displayed?.id, GOVERNED_ID);
  const criteria = matchPercentReviewCriteria(displayed?.weightsJson);
  assert.equal(displayedCriteriaBelongToRow(criteria, displayed!), true);
  const leftover = rows.find((item) => item.id === LEFTOVER_DRAFT_ID);
  assert.equal(displayedCriteriaBelongToRow(criteria, leftover!), false);
  assert.deepEqual(
    criteria.map((item) => [item.storedKey, item.weight]),
    Object.entries(GOVERNED_WEIGHTS),
  );
}

function NO_EDITOR_FALLTHROUGH_TEST() {
  const rows = productionLikeRows("checker_review");
  const implicit = resolveMatchPercentDisplayedRow({
    rows,
    productCode: "HOME_LOAN",
    selectedVersionId: null,
  });
  assert.equal(implicit?.id, GOVERNED_ID, "checker_review must not fall through to leftover draft");
  const missingId = resolveMatchPercentDisplayedRow({
    rows,
    productCode: "HOME_LOAN",
    selectedVersionId: "does-not-exist",
  });
  assert.equal(missingId, null, "unknown selected id must not fall through");
  const leftover = resolveMatchPercentDisplayedRow({
    rows,
    productCode: "HOME_LOAN",
    selectedVersionId: LEFTOVER_DRAFT_ID,
  });
  assert.equal(leftover?.id, LEFTOVER_DRAFT_ID);
}

function CHECKER_READ_ONLY_TEST() {
  const rows = productionLikeRows("checker_review");
  const displayed = resolveMatchPercentDisplayedRow({
    rows,
    productCode: "HOME_LOAN",
    selectedVersionId: GOVERNED_ID,
  });
  assert.equal(matchPercentReviewIsReadOnly(displayed!.lifecycleStatus), true);
  assert.equal(
    matchPercentDraftIsEditable({
      row: displayed,
      selectedVersionId: GOVERNED_ID,
      productRows: rows,
    }),
    false,
  );
  const actions = matchPercentVisibleReviewActions({
    lifecycleStatus: displayed!.lifecycleStatus,
    editable: false,
  });
  assert.equal(actions.saveDraft, false);
  assert.equal(actions.addOrRemoveCriteria, false);
  assert.equal(actions.submitForChecker, false);
  assert.equal(actions.approve, true);
  assert.equal(actions.reject, true);
}

function APPROVE_ID_BINDING_TEST() {
  const payload = matchPercentTransitionRequest(GOVERNED_ID, "approve");
  assert.deepEqual(payload, {
    intent: "transition",
    kind: "weights",
    id: GOVERNED_ID,
    action: "approve",
  });
  const leftover = matchPercentTransitionRequest(LEFTOVER_DRAFT_ID, "approve");
  assert.notEqual(leftover.id, GOVERNED_ID);
}

function REJECT_ID_BINDING_TEST() {
  const payload = matchPercentTransitionRequest(GOVERNED_ID, "reject");
  assert.deepEqual(payload, {
    intent: "transition",
    kind: "weights",
    id: GOVERNED_ID,
    action: "reject",
  });
}

function LEGACY_LABEL_SAFETY_TEST() {
  const selectable = listProjectedRecommendationFields({ productCode: "HOME_LOAN" });
  assert.equal(selectable[0]?.id, "assessment:borrower.residency");
  assert.equal(selectable[0]?.label, "Residency");
  for (const key of LEGACY_KEYS_MISLABELLED_AS_RESIDENCY) {
    const unsafe = htmlSelectVisibleLabel(key, selectable);
    assert.equal(unsafe, "Residency", `old select mismatch must paint ${key} as Residency`);
    assert.equal(matchPercentSelectValueIsInOptions(key, selectable), false);
    const safe = matchPercentCriterionDisplayLabel(key);
    assert.notEqual(safe, "Residency");
    assert.equal(safe.includes("Residency"), false);
  }
  const leftoverCriteria = matchPercentReviewCriteria({ ...LEGACY_DEMO_WEIGHTS });
  for (const item of leftoverCriteria) {
    assert.notEqual(item.label, "Residency");
    assert.equal(item.label.includes("Residency"), false);
  }
  const unknown = matchPercentCriterionDisplayLabel("totallyUnknownHistoricalKey");
  assert.equal(unknown, "Legacy criterion — totallyUnknownHistoricalKey");
  assert.equal(matchPercentCriterionDisplayLabel("assessment:borrower.residency"), "Residency");
}

function GOVERNED_ROW_DISPLAY_TEST() {
  const criteria = matchPercentReviewCriteria({ ...GOVERNED_WEIGHTS });
  assert.deepEqual(
    criteria.map((item) => [item.label, item.weight]),
    [
      ["Applicable ROI", 35],
      ["Eligible / tentative loan amount", 20],
      ["FOIR", 15],
      ["LTV", 15],
      ["Max Tenure Months", 15],
    ],
  );
  assert.equal(matchPercentReviewTotal(criteria), 100);
  assert.equal(criteria.length, 5);
}

function DRAFT_EDIT_IDENTITY_TEST() {
  const rows = productionLikeRows("checker_review");
  const leftover = rows.find((item) => item.id === LEFTOVER_DRAFT_ID)!;
  assert.equal(
    matchPercentDraftIsEditable({
      row: leftover,
      selectedVersionId: null,
      productRows: rows,
    }),
    false,
    "leftover draft must not become editable just because checker_review left draft",
  );
  assert.equal(
    matchPercentDraftIsEditable({
      row: leftover,
      selectedVersionId: LEFTOVER_DRAFT_ID,
      productRows: rows,
    }),
    true,
  );
  const save = matchPercentSaveDraftRequest(LEFTOVER_DRAFT_ID, { ...LEGACY_DEMO_WEIGHTS });
  assert.equal(save.id, LEFTOVER_DRAFT_ID);
  assert.notEqual(save.id, GOVERNED_ID);

  const draftsOnly = productionLikeRows("draft").filter((item) => item.id !== GOVERNED_ID);
  const newestDraft = resolveMatchPercentDisplayedRow({
    rows: draftsOnly,
    productCode: "HOME_LOAN",
    selectedVersionId: null,
  });
  assert.equal(newestDraft?.id, LEFTOVER_DRAFT_ID);
  assert.equal(
    matchPercentDraftIsEditable({
      row: newestDraft,
      selectedVersionId: null,
      productRows: draftsOnly,
    }),
    true,
  );
}

function APPROVED_VERSION_IDENTITY_TEST() {
  const rows = productionLikeRows("approved");
  const implicit = resolveMatchPercentDisplayedRow({
    rows,
    productCode: "HOME_LOAN",
    selectedVersionId: null,
  });
  assert.equal(implicit?.id, GOVERNED_ID, "approved row must not fall through to a leftover draft");
  assert.equal(implicit?.lifecycleStatus, "approved");
  const explicit = resolveMatchPercentDisplayedRow({
    rows,
    productCode: "HOME_LOAN",
    selectedVersionId: GOVERNED_ID,
  });
  assert.equal(explicit?.id, GOVERNED_ID);
  const criteria = matchPercentReviewCriteria(explicit?.weightsJson);
  assert.equal(displayedCriteriaBelongToRow(criteria, explicit!), true);
  const leftover = rows.find((item) => item.id === LEFTOVER_DRAFT_ID)!;
  assert.equal(displayedCriteriaBelongToRow(criteria, leftover), false);
}

function APPROVED_READ_ONLY_TEST() {
  const rows = productionLikeRows("approved");
  const displayed = resolveMatchPercentDisplayedRow({
    rows,
    productCode: "HOME_LOAN",
    selectedVersionId: GOVERNED_ID,
  });
  assert.equal(matchPercentReviewIsReadOnly(displayed!.lifecycleStatus), true);
  assert.equal(
    matchPercentDraftIsEditable({
      row: displayed,
      selectedVersionId: GOVERNED_ID,
      productRows: rows,
    }),
    false,
  );
  const actions = matchPercentVisibleReviewActions({
    lifecycleStatus: displayed!.lifecycleStatus,
    editable: false,
  });
  assert.equal(actions.saveDraft, false);
  assert.equal(actions.addOrRemoveCriteria, false);
  assert.equal(actions.submitForChecker, false);
  assert.equal(actions.approve, false);
  assert.equal(actions.reject, false);
  assert.equal(actions.activate, true);
}

function ACTIVATE_ID_BINDING_TEST() {
  const payload = matchPercentTransitionRequest(GOVERNED_ID, "activate");
  assert.deepEqual(payload, {
    intent: "transition",
    kind: "weights",
    id: GOVERNED_ID,
    action: "activate",
  });
  const leftover = matchPercentTransitionRequest(LEFTOVER_DRAFT_ID, "activate");
  assert.notEqual(leftover.id, GOVERNED_ID);
}

function ACTIVE_READ_ONLY_TEST() {
  const rows = productionLikeRows("active");
  const displayed = resolveMatchPercentDisplayedRow({
    rows,
    productCode: "HOME_LOAN",
    selectedVersionId: null,
  });
  assert.equal(displayed?.id, GOVERNED_ID, "active row must not fall through to a leftover draft");
  assert.equal(displayed?.lifecycleStatus, "active");
  assert.equal(matchPercentReviewIsReadOnly(displayed!.lifecycleStatus), true);
  assert.equal(
    matchPercentDraftIsEditable({
      row: displayed,
      selectedVersionId: null,
      productRows: rows,
    }),
    false,
  );
  const actions = matchPercentVisibleReviewActions({
    lifecycleStatus: displayed!.lifecycleStatus,
    editable: false,
  });
  assert.equal(actions.saveDraft, false);
  assert.equal(actions.addOrRemoveCriteria, false);
  assert.equal(actions.submitForChecker, false);
  assert.equal(actions.approve, false);
  assert.equal(actions.reject, false);
  assert.equal(actions.activate, false);
}

export function runMatchPercentWeightReviewProof() {
  CHECKER_VERSION_IDENTITY_TEST();
  console.log("CHECKER_VERSION_IDENTITY_TEST: PASS");
  NO_EDITOR_FALLTHROUGH_TEST();
  console.log("NO_EDITOR_FALLTHROUGH_TEST: PASS");
  CHECKER_READ_ONLY_TEST();
  console.log("CHECKER_READ_ONLY_TEST: PASS");
  APPROVE_ID_BINDING_TEST();
  console.log("APPROVE_ID_BINDING_TEST: PASS");
  REJECT_ID_BINDING_TEST();
  console.log("REJECT_ID_BINDING_TEST: PASS");
  LEGACY_LABEL_SAFETY_TEST();
  console.log("LEGACY_LABEL_SAFETY_TEST: PASS");
  GOVERNED_ROW_DISPLAY_TEST();
  console.log("GOVERNED_ROW_DISPLAY_TEST: PASS");
  DRAFT_EDIT_IDENTITY_TEST();
  console.log("DRAFT_EDIT_IDENTITY_TEST: PASS");
  APPROVED_VERSION_IDENTITY_TEST();
  console.log("APPROVED_VERSION_IDENTITY_TEST: PASS");
  APPROVED_READ_ONLY_TEST();
  console.log("APPROVED_READ_ONLY_TEST: PASS");
  ACTIVATE_ID_BINDING_TEST();
  console.log("ACTIVATE_ID_BINDING_TEST: PASS");
  ACTIVE_READ_ONLY_TEST();
  console.log("ACTIVE_READ_ONLY_TEST: PASS");
  assert.ok(CANONICAL_RECOMMENDATION_FIELD_PROJECTION.length > 0);
}
