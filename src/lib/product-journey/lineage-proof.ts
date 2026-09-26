import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  assertProductJourneyTransitionAllowed,
  idsToSupersedeOnActivate,
  nextProductJourneyLifecycleStatus,
  planProductJourneyDraft,
  type ProductJourneyLineageRow,
  type ProductJourneyTransitionAction,
} from "@/lib/product-journey/lineage";

type StoredRow = ProductJourneyLineageRow & {
  fieldsJson: unknown;
  checkerUserId: string | null;
  previousVersionId: string | null;
  approvedAt?: string | null;
  activatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  auditJson: Array<Record<string, unknown>>;
};

function nowIso() {
  return new Date().toISOString();
}

function createMemoryProductJourneyStore() {
  const rows: StoredRow[] = [];

  function list(organizationId: string) {
    return rows.filter((row) => row.organizationId === organizationId && row.isDeleted !== true);
  }

  function ensure(input: { organizationId: string; productCode: string; makerUserId: string }) {
    const plan = planProductJourneyDraft(list(input.organizationId), input.productCode);
    if (plan.action === "reuse_draft") return plan.row as StoredRow;
    if (plan.action === "refuse_in_flight") throw new Error(plan.reason);
    const at = nowIso();
    const row: StoredRow = {
      id: randomUUID(),
      organizationId: input.organizationId,
      productCode: plan.productCode,
      lineageId: plan.action === "create_next" ? plan.lineageId : randomUUID(),
      versionNumber: plan.versionNumber,
      previousVersionId: plan.action === "create_next" ? plan.previousVersionId : null,
      lifecycleStatus: "draft",
      fieldsJson: plan.action === "create_next" ? plan.source.fieldsJson ?? [] : [{ fieldId: "seed", applicability: "all", capture: true, mandatoryForRecommendation: false, displayOrder: 10 }],
      makerUserId: input.makerUserId,
      checkerUserId: null,
      createdAt: at,
      updatedAt: at,
      isDeleted: false,
      auditJson: [{ event: "ensure_journey_draft", productCode: plan.productCode, versionNumber: plan.versionNumber, at }],
    };
    rows.push(row);
    return row;
  }

  function save(input: { organizationId: string; id: string; actorUserId: string; fieldsJson: unknown }) {
    const row = rows.find((item) => item.id === input.id && item.organizationId === input.organizationId);
    if (!row) throw new Error("Journey definition not found.");
    if (row.lifecycleStatus !== "draft") throw new Error("Only Draft versions can be edited.");
    row.fieldsJson = input.fieldsJson;
    row.updatedAt = nowIso();
    row.auditJson.push({ event: "save_journey_draft", actorUserId: input.actorUserId, at: row.updatedAt });
    return row;
  }

  function transition(input: {
    organizationId: string;
    id: string;
    action: ProductJourneyTransitionAction;
    actorUserId: string;
  }) {
    const row = rows.find((item) => item.id === input.id && item.organizationId === input.organizationId);
    if (!row) throw new Error("Journey definition not found.");
    assertProductJourneyTransitionAllowed(row, input.action, input.actorUserId);
    if (input.action === "activate") {
      for (const id of idsToSupersedeOnActivate(list(input.organizationId), row)) {
        const sibling = rows.find((item) => item.id === id);
        if (!sibling) continue;
        sibling.lifecycleStatus = "superseded";
        sibling.updatedAt = nowIso();
      }
      row.activatedAt = nowIso();
      row.checkerUserId = input.actorUserId;
    }
    if (input.action === "approve") {
      row.approvedAt = nowIso();
      row.checkerUserId = input.actorUserId;
    }
    if (input.action === "reject") row.checkerUserId = input.actorUserId;
    row.lifecycleStatus = nextProductJourneyLifecycleStatus(input.action);
    row.updatedAt = nowIso();
    row.auditJson.push({ event: input.action, actorUserId: input.actorUserId, at: row.updatedAt });
    return row;
  }

  return { rows, list, ensure, save, transition };
}

export async function runProductJourneyLineageProof() {
  const org = "org-lineage";
  const maker = "user-maker";
  const checker = "user-checker";
  const store = createMemoryProductJourneyStore();

  const v1 = store.ensure({ organizationId: org, productCode: "HOME_LOAN", makerUserId: maker });
  assert.equal(v1.versionNumber, 1);
  assert.equal(v1.lifecycleStatus, "draft");
  assert.equal(v1.productCode, "HOME_LOAN");
  assert.ok(v1.lineageId);
  console.log("V1_CREATION_TEST: PASS");

  const resave = store.ensure({ organizationId: org, productCode: "HOME_LOAN", makerUserId: maker });
  store.save({
    organizationId: org,
    id: resave.id,
    actorUserId: maker,
    fieldsJson: [{ fieldId: "assessment:incomeAndObligations.monthlyIncome", applicability: "salaried", capture: true, mandatoryForRecommendation: true, displayOrder: 10 }],
  });
  assert.equal(resave.id, v1.id);
  assert.equal(store.list(org).length, 1);
  console.log("DRAFT_RESAVE_TEST: PASS");

  store.transition({ organizationId: org, id: v1.id, action: "submit_review", actorUserId: maker });
  assert.equal(store.list(org)[0]?.lifecycleStatus, "checker_review");
  assert.throws(
    () => store.ensure({ organizationId: org, productCode: "HOME_LOAN", makerUserId: maker }),
    /awaiting checker review/,
  );
  assert.throws(
    () => store.ensure({ organizationId: org, productCode: "home-loan", makerUserId: maker }),
    /awaiting checker review/,
  );
  assert.equal(store.list(org).length, 1);
  console.log("CHECKER_REVIEW_RESAVE_TEST: PASS");
  console.log("ALIAS_TEST: PASS");

  assert.throws(
    () => store.transition({ organizationId: org, id: v1.id, action: "approve", actorUserId: maker }),
    /Maker and checker cannot be the same user/,
  );
  assert.equal(store.list(org)[0]?.lifecycleStatus, "checker_review");
  store.transition({ organizationId: org, id: v1.id, action: "approve", actorUserId: checker });
  assert.equal(store.list(org)[0]?.lifecycleStatus, "approved");
  assert.equal(store.list(org)[0]?.checkerUserId, checker);
  assert.throws(
    () => store.ensure({ organizationId: org, productCode: "HOME_LOAN", makerUserId: maker }),
    /awaiting activation/,
  );
  assert.equal(store.list(org).length, 1);
  console.log("APPROVED_TEST: PASS");
  console.log("MAKER_CHECKER_TEST: PASS");

  store.transition({ organizationId: org, id: v1.id, action: "activate", actorUserId: checker });
  assert.equal(store.list(org)[0]?.lifecycleStatus, "active");
  console.log("ACTIVE_TEST: PASS");

  const v2 = store.ensure({ organizationId: org, productCode: "HOME_LOAN", makerUserId: maker });
  assert.notEqual(v2.id, v1.id);
  assert.equal(v2.lineageId, v1.lineageId);
  assert.equal(v2.versionNumber, 2);
  assert.equal(v2.previousVersionId, v1.id);
  assert.equal(v2.lifecycleStatus, "draft");
  assert.equal(store.list(org).length, 2);
  console.log("V2_CREATION_TEST: PASS");

  store.transition({ organizationId: org, id: v2.id, action: "submit_review", actorUserId: maker });
  store.transition({ organizationId: org, id: v2.id, action: "approve", actorUserId: checker });
  store.transition({ organizationId: org, id: v2.id, action: "activate", actorUserId: checker });
  const afterActivate = store.list(org);
  const v1After = afterActivate.find((row) => row.id === v1.id);
  const v2After = afterActivate.find((row) => row.id === v2.id);
  assert.equal(v1After?.lifecycleStatus, "superseded");
  assert.equal(v2After?.lifecycleStatus, "active");
  assert.equal(v1After?.lineageId, v2After?.lineageId);
  console.log("V2_SUPERSESSION_TEST: PASS");

  assert.equal(afterActivate.length, 2);
  assert.equal(v1After?.versionNumber, 1);
  assert.ok(Array.isArray(v1After?.auditJson) && v1After.auditJson.length >= 1);
  console.log("HISTORY_PRESERVATION_TEST: PASS");

  const duplicateInFlight: ProductJourneyLineageRow[] = [
    { id: "a", organizationId: org, productCode: "HOME_LOAN", lineageId: "lin-a", versionNumber: 1, lifecycleStatus: "checker_review", makerUserId: maker },
    { id: "b", organizationId: org, productCode: "home-loan", lineageId: "lin-b", versionNumber: 1, lifecycleStatus: "checker_review", makerUserId: maker },
  ];
  const refused = planProductJourneyDraft(duplicateInFlight, "HOME_LOAN");
  assert.equal(refused.action, "refuse_in_flight");
  if (refused.action === "refuse_in_flight") {
    assert.match(refused.reason, /2 versions/);
  }
}
