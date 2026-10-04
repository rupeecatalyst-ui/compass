import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  listProjectedRecommendationFields,
  resolveProjectedField,
  validateWeightPublish,
} from "@/lib/product-recommendation";
import { RECOMMENDATION_EVALUATOR_TYPES } from "@/lib/product-recommendation/evaluator-types";
import {
  assertMatchPercentTransitionAllowed,
  idsToSupersedeOnMatchPercentActivate,
  nextMatchPercentLifecycleStatus,
  planMatchPercentDraft,
  planMatchPercentUnapprovedBootstrap,
  type MatchPercentLineageRow,
  type MatchPercentTransitionAction,
} from "@/lib/product-recommendation/weight-lineage";

type StoredRow = MatchPercentLineageRow & {
  weightsJson: Record<string, number>;
  weightsTotal: number;
  labelledUnapproved: boolean;
  simulationOnly: boolean;
  checkerUserId: string | null;
  previousVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  auditJson: Array<Record<string, unknown>>;
};

const INTENDED_V1_WEIGHTS = {
  "derived:applicableRoiPercent": 35,
  "derived:assessedOfferRupees": 20,
  "derived:foirPercent": 15,
  "derived:ltvPercent": 15,
  "derived:effectiveTenureMonths": 15,
} as const;

function nowIso() {
  return new Date().toISOString();
}

function createMemoryMatchPercentStore() {
  const rows: StoredRow[] = [];

  function list(organizationId: string) {
    return rows.filter((row) => row.organizationId === organizationId && row.isDeleted !== true);
  }

  function ensure(input: { organizationId: string; productCode: string; makerUserId: string }) {
    const plan = planMatchPercentDraft(list(input.organizationId), input.productCode);
    if (plan.action === "reuse_draft") return plan.row as StoredRow;
    if (plan.action === "refuse_in_flight") throw new Error(plan.reason);
    const at = nowIso();
    const weightsJson =
      plan.action === "create_next" ? { ...(plan.source.weightsJson as Record<string, number> | undefined) } : {};
    const row: StoredRow = {
      id: randomUUID(),
      organizationId: input.organizationId,
      productCode: plan.productCode,
      lineageId: plan.action === "create_next" ? plan.lineageId : randomUUID(),
      versionNumber: plan.versionNumber,
      previousVersionId: plan.action === "create_next" ? plan.previousVersionId : null,
      lifecycleStatus: "draft",
      weightsJson,
      weightsTotal: Object.values(weightsJson).reduce((sum, value) => sum + value, 0),
      labelledUnapproved: false,
      simulationOnly: false,
      makerUserId: input.makerUserId,
      checkerUserId: null,
      createdAt: at,
      updatedAt: at,
      isDeleted: false,
      auditJson: [{ event: "ensure_weight_draft", productCode: plan.productCode, versionNumber: plan.versionNumber, at }],
    };
    rows.push(row);
    return row;
  }

  function bootstrapUnapproved(input: { organizationId: string; productCode: string; makerUserId: string }) {
    const plan = planMatchPercentUnapprovedBootstrap(list(input.organizationId), input.productCode);
    if (plan.action === "reuse_draft") return plan.row as StoredRow;
    if (plan.action === "refuse_in_flight") return plan.rows[0] as StoredRow;
    if (plan.action === "create_next") return plan.source as StoredRow;
    const at = nowIso();
    const row: StoredRow = {
      id: randomUUID(),
      organizationId: input.organizationId,
      productCode: plan.productCode,
      lineageId: randomUUID(),
      versionNumber: 1,
      previousVersionId: null,
      lifecycleStatus: "draft",
      weightsJson: {},
      weightsTotal: 0,
      labelledUnapproved: true,
      simulationOnly: true,
      makerUserId: input.makerUserId,
      checkerUserId: null,
      createdAt: at,
      updatedAt: at,
      isDeleted: false,
      auditJson: [{ event: "created_unapproved_draft", at }],
    };
    rows.push(row);
    return row;
  }

  function save(input: {
    organizationId: string;
    id: string;
    actorUserId: string;
    weightsJson: Record<string, number>;
  }) {
    const row = rows.find((item) => item.id === input.id && item.organizationId === input.organizationId);
    if (!row) throw new Error("Master version not found.");
    if (row.lifecycleStatus !== "draft") throw new Error("Only Draft versions can be edited.");
    row.weightsJson = { ...input.weightsJson };
    row.weightsTotal = Object.values(input.weightsJson).reduce((sum, value) => sum + value, 0);
    row.updatedAt = nowIso();
    row.auditJson.push({ event: "save_weight_draft", actorUserId: input.actorUserId, total: row.weightsTotal, at: row.updatedAt });
    return row;
  }

  function transition(input: {
    organizationId: string;
    id: string;
    action: MatchPercentTransitionAction;
    actorUserId: string;
  }) {
    const row = rows.find((item) => item.id === input.id && item.organizationId === input.organizationId);
    if (!row) throw new Error("Master version not found.");
    assertMatchPercentTransitionAllowed(row, input.action, input.actorUserId);
    if (input.action === "activate") {
      for (const id of idsToSupersedeOnMatchPercentActivate(list(input.organizationId), row)) {
        const sibling = rows.find((item) => item.id === id);
        if (!sibling) continue;
        sibling.lifecycleStatus = "superseded";
        sibling.updatedAt = nowIso();
      }
      row.simulationOnly = false;
      row.labelledUnapproved = false;
      row.checkerUserId = input.actorUserId;
    }
    if (input.action === "approve" || input.action === "reject") {
      row.checkerUserId = input.actorUserId;
    }
    row.lifecycleStatus = nextMatchPercentLifecycleStatus(input.action);
    row.updatedAt = nowIso();
    row.auditJson.push({ event: input.action, actorUserId: input.actorUserId, at: row.updatedAt });
    return row;
  }

  return { rows, list, ensure, bootstrapUnapproved, save, transition };
}

export async function runMatchPercentWeightLineageProof() {
  const org = "org-match-percent-lineage";
  const maker = "user-maker";
  const checker = "user-checker";
  const store = createMemoryMatchPercentStore();

  const v1 = store.ensure({ organizationId: org, productCode: "HOME_LOAN", makerUserId: maker });
  assert.equal(v1.versionNumber, 1);
  assert.equal(v1.lifecycleStatus, "draft");
  assert.equal(v1.productCode, "HOME_LOAN");
  assert.ok(v1.lineageId);
  console.log("V1_CREATION_TEST: PASS");

  const secondBootstrap = store.bootstrapUnapproved({
    organizationId: org,
    productCode: "HOME_LOAN",
    makerUserId: maker,
  });
  assert.equal(secondBootstrap.id, v1.id);
  assert.equal(store.list(org).length, 1);
  const aliasBootstrap = store.bootstrapUnapproved({
    organizationId: org,
    productCode: "home-loan",
    makerUserId: maker,
  });
  assert.equal(aliasBootstrap.id, v1.id);
  assert.equal(store.list(org).length, 1);
  console.log("DUPLICATE_V1_PREVENTION_TEST: PASS");

  const resave = store.ensure({ organizationId: org, productCode: "HOME_LOAN", makerUserId: maker });
  store.save({
    organizationId: org,
    id: resave.id,
    actorUserId: maker,
    weightsJson: { ...INTENDED_V1_WEIGHTS },
  });
  assert.equal(resave.id, v1.id);
  assert.equal(store.list(org).length, 1);
  assert.equal(store.list(org)[0]?.weightsJson["derived:effectiveTenureMonths"], 15);
  console.log("DRAFT_RESAVE_TEST: PASS");

  store.transition({ organizationId: org, id: v1.id, action: "submit_review", actorUserId: maker });
  assert.equal(store.list(org)[0]?.lifecycleStatus, "checker_review");
  assert.throws(
    () => store.ensure({ organizationId: org, productCode: "HOME_LOAN", makerUserId: maker }),
    /awaiting checker review/,
  );
  assert.equal(store.bootstrapUnapproved({ organizationId: org, productCode: "HOME_LOAN", makerUserId: maker }).id, v1.id);
  assert.equal(store.list(org).length, 1);
  console.log("CHECKER_REVIEW_TEST: PASS");

  assert.throws(
    () => store.transition({ organizationId: org, id: v1.id, action: "approve", actorUserId: maker }),
    /Maker and checker cannot be the same user/,
  );
  assert.throws(
    () => store.transition({ organizationId: org, id: v1.id, action: "reject", actorUserId: maker }),
    /Maker and checker cannot be the same user/,
  );
  store.transition({ organizationId: org, id: v1.id, action: "approve", actorUserId: checker });
  assert.equal(store.list(org)[0]?.lifecycleStatus, "approved");
  assert.throws(
    () => store.ensure({ organizationId: org, productCode: "HOME_LOAN", makerUserId: maker }),
    /awaiting activation/,
  );
  assert.equal(store.list(org).length, 1);
  console.log("APPROVED_TEST: PASS");
  console.log("MAKER_CHECKER_TEST: PASS");

  store.transition({ organizationId: org, id: v1.id, action: "activate", actorUserId: checker });
  assert.equal(store.list(org)[0]?.lifecycleStatus, "active");

  const v2 = store.ensure({ organizationId: org, productCode: "home-loan", makerUserId: maker });
  assert.notEqual(v2.id, v1.id);
  assert.equal(v2.lineageId, v1.lineageId);
  assert.equal(v2.versionNumber, 2);
  assert.equal(v2.previousVersionId, v1.id);
  assert.equal(v2.lifecycleStatus, "draft");
  assert.equal(v2.weightsJson["derived:effectiveTenureMonths"], 15);
  assert.equal(store.list(org).length, 2);
  console.log("V2_TEST: PASS");
  console.log("ALIAS_TEST: PASS");

  store.transition({ organizationId: org, id: v2.id, action: "submit_review", actorUserId: maker });
  store.transition({ organizationId: org, id: v2.id, action: "approve", actorUserId: checker });
  store.transition({ organizationId: org, id: v2.id, action: "activate", actorUserId: checker });
  const afterActivate = store.list(org);
  const v1After = afterActivate.find((row) => row.id === v1.id);
  const v2After = afterActivate.find((row) => row.id === v2.id);
  assert.equal(v1After?.lifecycleStatus, "superseded");
  assert.equal(v2After?.lifecycleStatus, "active");
  assert.equal(v1After?.lineageId, v2After?.lineageId);
  console.log("SUPERSESSION_TEST: PASS");

  assert.equal(afterActivate.length, 2);
  assert.equal(v1After?.versionNumber, 1);
  assert.ok(Array.isArray(v1After?.auditJson) && v1After.auditJson.length >= 1);
  assert.equal(v1After?.id, v1.id);
  console.log("HISTORY_TEST: PASS");

  const productionShaped: MatchPercentLineageRow[] = [
    {
      id: "cmudxss71005354auhux3br6i",
      organizationId: org,
      productCode: "home-loan",
      lineageId: "e170cd6d-dcd5-4154-8f5b-cd1387122230",
      versionNumber: 1,
      lifecycleStatus: "draft",
      makerUserId: maker,
      updatedAt: "2026-09-25T09:29:40.052Z",
    },
    {
      id: "cmudxh05s004r54auxkve7jq5",
      organizationId: org,
      productCode: "home-loan",
      lineageId: "7f304425-7132-4f18-907b-1c91bbc85b1f",
      versionNumber: 1,
      lifecycleStatus: "draft",
      makerUserId: maker,
      updatedAt: "2026-09-23T09:56:01.091Z",
    },
    {
      id: "cmudxg3zz004h54au8i2lr7yi",
      organizationId: org,
      productCode: "home-loan",
      lineageId: "f5e8c8db-a4aa-4a64-a0f8-dc52614b14ab",
      versionNumber: 1,
      lifecycleStatus: "draft",
      makerUserId: maker,
      updatedAt: "2026-09-23T09:55:19.432Z",
    },
    {
      id: "cmtxwzkwd0009548qkg29sips",
      organizationId: org,
      productCode: "home-loan",
      lineageId: "9f7ca7e8-ed43-421d-9623-2af24161b4b8",
      versionNumber: 1,
      lifecycleStatus: "draft",
      makerUserId: maker,
      updatedAt: "2026-09-12T04:58:09.421Z",
    },
  ];
  const existingPlan = planMatchPercentDraft(productionShaped, "HOME_LOAN");
  assert.equal(existingPlan.action, "reuse_draft");
  if (existingPlan.action === "reuse_draft") {
    assert.equal(existingPlan.row.id, "cmudxss71005354auhux3br6i");
    assert.equal(existingPlan.row.lineageId, "e170cd6d-dcd5-4154-8f5b-cd1387122230");
  }
  assert.equal(productionShaped.length, 4);
  const unapprovedPlan = planMatchPercentUnapprovedBootstrap(productionShaped, "HOME_LOAN");
  assert.equal(unapprovedPlan.action, "reuse_draft");

  const tenure = resolveProjectedField("derived:effectiveTenureMonths");
  const ppoTenure = resolveProjectedField("ppo:maxTenureMonths");
  assert.ok(tenure);
  assert.equal(tenure?.id, "derived:effectiveTenureMonths");
  assert.equal(tenure?.label, "Max Tenure Months");
  assert.equal(tenure?.scoreability, "fully_scorable");
  assert.equal(tenure?.evaluatorType, RECOMMENDATION_EVALUATOR_TYPES.RELATIVE_TO_ELIGIBLE_MAX);
  assert.ok(tenure?.aliases.includes("tenureAvailability"));
  assert.notEqual(ppoTenure?.id, tenure?.id);
  assert.notEqual(ppoTenure?.label, tenure?.label);
  assert.notEqual(ppoTenure?.evaluatorType, RECOMMENDATION_EVALUATOR_TYPES.RELATIVE_TO_ELIGIBLE_MAX);
  assert.notEqual(ppoTenure?.scoreability, "fully_scorable");
  const picker = listProjectedRecommendationFields({ productCode: "HOME_LOAN" });
  assert.equal(picker.some((row) => row.id === "derived:effectiveTenureMonths"), true);
  assert.equal(picker.some((row) => row.id === "ppo:maxTenureMonths"), false);
  const hiddenPpo = listProjectedRecommendationFields({
    productCode: "HOME_LOAN",
    includeNonSelectable: true,
  });
  assert.equal(hiddenPpo.some((row) => row.id === "ppo:maxTenureMonths"), true);
  console.log("TENURE_SELECTOR_TEST: PASS");
  console.log("TENURE_SCOREABILITY_TEST: PASS");

  assert.equal(validateWeightPublish({ ...INTENDED_V1_WEIGHTS }), null);
  assert.equal(
    validateWeightPublish({
      "derived:applicableRoiPercent": 35,
      "derived:assessedOfferRupees": 20,
      "derived:foirPercent": 15,
      "derived:ltvPercent": 15,
      "ppo:maxTenureMonths": 15,
    }),
    "SCORING_CONTRACT_PENDING",
  );
  console.log("35/20/15/15/15 PUBLISH GATE TEST: PASS");
}
