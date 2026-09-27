/**
 * Focused proof for the narrow V1.6 governance lifecycle.
 * Does not connect to a database and does not modify a production row.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { listFieldInventoryEntries } from "./field-inventory-catalogue";
import {
  decideCertifiedFieldControlReview,
  submitCertifiedFieldControlReview,
  type FieldControlLifecyclePatch,
  type FieldControlLifecycleWhere,
} from "./production-governance-lifecycle";
import {
  projectCertifiedFieldControlDefinition,
  type CertifiedFieldControlRecord,
} from "./production-governance-read";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");
const checks: Array<[string, boolean]> = [];
const STAMP = "2026-09-27T12:00:00.000Z";

function check(name: string, passed: boolean): void {
  checks.push([name, passed]);
  assert.equal(passed, true, name);
}

function unauthorized(): never {
  throw {
    status: 401,
    body: { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
  };
}

function request(url: string, body?: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function row(overrides: Partial<CertifiedFieldControlRecord> = {}): CertifiedFieldControlRecord {
  return {
    id: "fcm:contact.pan:v1",
    fieldId: "contact.pan",
    lineageId: "contact.pan",
    versionNumber: 1,
    previousVersionId: null,
    friendlyLabel: "PAN",
    description: "Governance description.",
    helpText: "Help text.",
    fieldType: "text",
    classification: "raw_canonical",
    owningDomain: "contact",
    ownershipReview: "owner_requires_product_decision",
    sourceBindingJson: { kind: "column", model: "EcmContact", field: "pan" },
    aliasesJson: [],
    lifecycleStatus: "draft",
    productApplicabilityJson: [],
    customerCategoryApplicabilityJson: [],
    applicabilityDeclared: false,
    authorisedConsumersJson: [],
    validationSummary: "Validation note.",
    presentationSummary: "Presentation note.",
    selectOptionSource: null,
    selectOptionKeysJson: [],
    currencyUnitsJson: [],
    candidateMirrorOf: null,
    controlsRuntime: false,
    customerFacingActivation: false,
    makerUserId: "maker-1",
    checkerUserId: null,
    effectiveFrom: null,
    effectiveUntil: null,
    createdAt: new Date(STAMP),
    updatedAt: new Date(STAMP),
    ...overrides,
  };
}

function memory(initial: CertifiedFieldControlRecord[], options?: { failNextUpdate?: boolean }) {
  const rows = initial.map((item) => ({ ...item, updatedAt: new Date(item.updatedAt), createdAt: new Date(item.createdAt) }));
  const writes: FieldControlLifecyclePatch[] = [];
  const wheres: FieldControlLifecycleWhere[] = [];
  return {
    rows,
    writes,
    wheres,
    delegate: {
      findUnique: async ({ where }: { where: { id: string } }) => rows.find((item) => item.id === where.id) ?? null,
      updateMany: async ({ where, data }: { where: FieldControlLifecycleWhere; data: FieldControlLifecyclePatch }) => {
        wheres.push(where);
        if (options?.failNextUpdate) return { count: 0 };
        const index = rows.findIndex(
          (item) =>
            item.id === where.id &&
            item.lifecycleStatus === where.lifecycleStatus &&
            item.ownershipReview === where.ownershipReview &&
            item.versionNumber === where.versionNumber &&
            item.updatedAt.getTime() === where.updatedAt.getTime(),
        );
        if (index < 0) return { count: 0 };
        const current = rows[index]!;
        rows[index] = {
          ...current,
          lifecycleStatus: data.lifecycleStatus,
          checkerUserId: data.checkerUserId,
          updatedAt: new Date(current.updatedAt.getTime() + 1000),
        };
        writes.push(data);
        return { count: 1 };
      },
    },
  };
}

async function submit(role: string, userId: string, body: unknown, store = memory([row()])) {
  const result = await submitCertifiedFieldControlReview(
    request("https://catalyst.local/api/admin/field-control-definitions/fcm:contact.pan:v1/submit-review", body),
    "fcm:contact.pan:v1",
    { authenticate: () => ({ role, userId }), ...store.delegate },
  );
  return { result, store };
}

async function review(role: string, userId: string, body: unknown, store: ReturnType<typeof memory>) {
  const result = await decideCertifiedFieldControlReview(
    request("https://catalyst.local/api/admin/field-control-definitions/fcm:contact.pan:v1/review", body),
    "fcm:contact.pan:v1",
    { authenticate: () => ({ role, userId }), ...store.delegate },
  );
  return { result, store };
}

function unchangedIdentity(before: CertifiedFieldControlRecord, after: CertifiedFieldControlRecord): boolean {
  return (
    after.id === before.id &&
    after.fieldId === before.fieldId &&
    after.lineageId === before.lineageId &&
    after.versionNumber === before.versionNumber &&
    after.previousVersionId === before.previousVersionId &&
    JSON.stringify(after.sourceBindingJson) === JSON.stringify(before.sourceBindingJson) &&
    after.classification === before.classification &&
    after.owningDomain === before.owningDomain &&
    after.fieldType === before.fieldType &&
    after.controlsRuntime === false &&
    after.customerFacingActivation === false &&
    after.applicabilityDeclared === false &&
    JSON.stringify(after.productApplicabilityJson) === JSON.stringify(before.productApplicabilityJson) &&
    JSON.stringify(after.customerCategoryApplicabilityJson) === JSON.stringify(before.customerCategoryApplicabilityJson) &&
    JSON.stringify(after.authorisedConsumersJson) === JSON.stringify(before.authorisedConsumersJson) &&
    after.effectiveFrom === before.effectiveFrom &&
    after.effectiveUntil === before.effectiveUntil &&
    after.ownershipReview === before.ownershipReview &&
    after.friendlyLabel === before.friendlyLabel &&
    after.description === before.description &&
    after.helpText === before.helpText &&
    after.validationSummary === before.validationSummary &&
    after.presentationSummary === before.presentationSummary &&
    after.makerUserId === before.makerUserId
  );
}

async function main(): Promise<void> {
  const missingAuth = await submitCertifiedFieldControlReview(request("https://catalyst.local/submit", { expectedUpdatedAt: STAMP }), "fcm:contact.pan:v1", {
    authenticate: () => unauthorized(),
    findUnique: async () => {
      throw new Error("findUnique must not run");
    },
    updateMany: async () => {
      throw new Error("updateMany must not run");
    },
  });
  check("missing_auth_is_401", missingAuth.ok === false && missingAuth.status === 401 && missingAuth.code === "UNAUTHORIZED");

  const outsider = await submit("RM", "user-2", { expectedUpdatedAt: STAMP });
  check("non_admin_is_403", outsider.result.ok === false && outsider.result.status === 403 && outsider.store.writes.length === 0);

  const blankActor = await submit("ADMIN", "  ", { expectedUpdatedAt: STAMP });
  check("blank_actor_is_401", blankActor.result.ok === false && blankActor.result.status === 401 && blankActor.store.writes.length === 0);

  const noted = await submit("ADMIN", "maker-1", { expectedUpdatedAt: STAMP, note: "please review" });
  check("submit_note_is_400", noted.result.ok === false && noted.result.status === 400 && noted.store.writes.length === 0);

  const clientMaker = await submit("ADMIN", "maker-1", { expectedUpdatedAt: STAMP, makerUserId: "other" });
  check("client_maker_is_400", clientMaker.result.ok === false && clientMaker.result.status === 400 && clientMaker.store.writes.length === 0);

  const clientChecker = await review("SUPER_ADMIN", "checker-1", { decision: "approve", expectedUpdatedAt: STAMP, checkerUserId: "checker-1" }, memory([row({ lifecycleStatus: "checker_review" })]));
  check("client_checker_is_400", clientChecker.result.ok === false && clientChecker.result.status === 400 && clientChecker.store.writes.length === 0);

  const submitted = await submit("ADMIN", "maker-1", { expectedUpdatedAt: STAMP });
  check("submit_is_200", submitted.result.ok === true && submitted.result.status === 200);
  if (submitted.result.ok) {
    const definition = submitted.result.data.definition;
    const stored = submitted.store.rows[0]!;
    check("submit_moves_to_checker_review", definition.lifecycleStatus === "checker_review" && definition.checkerUserId === null);
    check("submit_keeps_identity", unchangedIdentity(row(), stored));
    check("submit_does_not_activate", definition.lifecycleStatus !== "active" && definition.controlsRuntime === false && definition.customerFacingActivation === false && definition.applicabilityDeclared === false);
    check("submit_write_is_lifecycle_only", JSON.stringify(submitted.store.writes[0]) === JSON.stringify({ lifecycleStatus: "checker_review", checkerUserId: null }));
    check("submit_where_keeps_version", submitted.store.wheres[0]?.versionNumber === 1 && submitted.store.wheres[0]?.ownershipReview === "owner_requires_product_decision");
  }

  const again = await submit("SUPER_ADMIN", "checker-1", { expectedUpdatedAt: new Date(new Date(STAMP).getTime() + 1000).toISOString() }, submitted.store);
  check("repeat_submit_is_409", again.result.ok === false && again.result.status === 409 && again.store.writes.length === 1);

  const certified = await submit("ADMIN", "maker-1", { expectedUpdatedAt: STAMP }, memory([row({ ownershipReview: "certified_binding", makerUserId: "foundation-v1-baseline" })]));
  check("certified_binding_submit_is_409", certified.result.ok === false && certified.result.status === 409 && certified.store.writes.length === 0 && certified.store.rows[0]?.lifecycleStatus === "draft");

  const blankMaker = await submit("ADMIN", "maker-1", { expectedUpdatedAt: STAMP }, memory([row({ makerUserId: " " })]));
  check("blank_maker_submit_is_409", blankMaker.result.ok === false && blankMaker.result.status === 409 && blankMaker.store.writes.length === 0);

  const stale = await submit("ADMIN", "maker-1", { expectedUpdatedAt: "2026-09-27T11:00:00.000Z" });
  check("stale_submit_is_409", stale.result.ok === false && stale.result.status === 409 && stale.store.writes.length === 0);

  const fromReview = await submit("ADMIN", "maker-1", { expectedUpdatedAt: STAMP }, memory([row({ lifecycleStatus: "checker_review" })]));
  check("submit_from_review_is_409", fromReview.result.ok === false && fromReview.result.status === 409 && fromReview.store.writes.length === 0);

  const pending = memory([row({ lifecycleStatus: "checker_review" })]);
  const approved = await review("SUPER_ADMIN", "checker-2", { decision: "approve", expectedUpdatedAt: STAMP }, pending);
  check("approve_is_200", approved.result.ok === true && approved.result.status === 200);
  if (approved.result.ok) {
    const definition = approved.result.data.definition;
    check("approve_sets_session_checker", definition.lifecycleStatus === "approved" && definition.checkerUserId === "checker-2");
    check("approve_is_not_active", definition.lifecycleStatus !== "active");
    check("approve_keeps_identity", unchangedIdentity(row({ lifecycleStatus: "checker_review" }), approved.store.rows[0]!));
    check("approve_keeps_runtime_off", definition.controlsRuntime === false && definition.customerFacingActivation === false && definition.applicabilityDeclared === false && definition.effectiveFrom === null && definition.effectiveUntil === null && definition.ownershipReview === "owner_requires_product_decision");
    check("projected_checker_matches_session", projectCertifiedFieldControlDefinition(approved.store.rows[0]!).checkerUserId === "checker-2");
  }

  const second = await review("ADMIN", "checker-3", { decision: "approve", expectedUpdatedAt: new Date(new Date(STAMP).getTime() + 1000).toISOString() }, approved.store);
  check("double_approve_is_409", second.result.ok === false && second.result.status === 409 && second.store.writes.length === 1 && second.store.rows[0]?.lifecycleStatus === "approved");

  const selfApprove = await review("ADMIN", "maker-1", { decision: "approve", expectedUpdatedAt: STAMP }, memory([row({ lifecycleStatus: "checker_review" })]));
  check("maker_self_approve_is_409", selfApprove.result.ok === false && selfApprove.result.status === 409 && selfApprove.store.writes.length === 0 && selfApprove.store.rows[0]?.checkerUserId === null);

  const selfReturn = await review("SUPER_ADMIN", "maker-1", { decision: "return", expectedUpdatedAt: STAMP }, memory([row({ lifecycleStatus: "checker_review" })]));
  check("maker_self_return_is_409", selfReturn.result.ok === false && selfReturn.result.status === 409 && selfReturn.store.writes.length === 0);

  const returned = await review("ADMIN", "checker-9", { decision: "return", expectedUpdatedAt: STAMP }, memory([row({ lifecycleStatus: "checker_review", checkerUserId: "someone" })]));
  check("return_is_200", returned.result.ok === true && returned.result.status === 200);
  if (returned.result.ok) {
    check("return_restores_draft_and_clears_checker", returned.result.data.definition.lifecycleStatus === "draft" && returned.result.data.definition.checkerUserId === null);
    check("return_keeps_identity", unchangedIdentity(row({ lifecycleStatus: "checker_review", checkerUserId: "someone" }), returned.store.rows[0]!));
  }

  const approveDraft = await review("ADMIN", "checker-2", { decision: "approve", expectedUpdatedAt: STAMP }, memory([row()]));
  check("approve_from_draft_is_409", approveDraft.result.ok === false && approveDraft.result.status === 409 && approveDraft.store.writes.length === 0);

  const returnDraft = await review("ADMIN", "checker-2", { decision: "return", expectedUpdatedAt: STAMP }, memory([row()]));
  check("return_from_draft_is_409", returnDraft.result.ok === false && returnDraft.result.status === 409 && returnDraft.store.writes.length === 0);

  const returnApproved = await review("ADMIN", "checker-2", { decision: "return", expectedUpdatedAt: STAMP }, memory([row({ lifecycleStatus: "approved", checkerUserId: "checker-2" })]));
  check("return_after_approval_is_409", returnApproved.result.ok === false && returnApproved.result.status === 409 && returnApproved.store.writes.length === 0 && returnApproved.store.rows[0]?.lifecycleStatus === "approved");

  const raced = await review("ADMIN", "checker-2", { decision: "approve", expectedUpdatedAt: STAMP }, memory([row({ lifecycleStatus: "checker_review" })], { failNextUpdate: true }));
  check("concurrent_review_is_409", raced.result.ok === false && raced.result.status === 409 && raced.store.writes.length === 0 && raced.store.rows[0]?.lifecycleStatus === "checker_review");

  const missing = await submit("ADMIN", "maker-1", { expectedUpdatedAt: STAMP }, memory([]));
  check("missing_definition_is_404", missing.result.ok === false && missing.result.status === 404 && missing.store.writes.length === 0);

  const active = await submit("ADMIN", "maker-1", { expectedUpdatedAt: STAMP }, memory([row({ lifecycleStatus: "active" })]));
  check("submit_from_active_is_409", active.result.ok === false && active.result.status === 409 && active.store.writes.length === 0);

  const inventoryBefore = listFieldInventoryEntries().length;
  check("inventory_count_unchanged", inventoryBefore === 165);
  const lifecycleSource = readFileSync(join(here, "production-governance-lifecycle.ts"), "utf8");
  const routes = [
    readFileSync(join(repoRoot, "src/app/api/admin/field-control-definitions/[id]/submit-review/route.ts"), "utf8"),
    readFileSync(join(repoRoot, "src/app/api/admin/field-control-definitions/[id]/review/route.ts"), "utf8"),
  ].join("\n");
  const actions = readFileSync(join(repoRoot, "src/components/catalyst-one/field-control-master/governed-field-lifecycle-actions.tsx"), "utf8");
  const inventoryPanel = readFileSync(join(repoRoot, "src/components/catalyst-one/field-control-master/field-inventory-panel.tsx"), "utf8");
  check("routes_are_post_only", routes.includes("export async function POST") && !routes.includes("export async function PATCH") && !routes.includes("export async function PUT") && !routes.includes("export async function DELETE"));
  check("no_generic_patch_route", !routes.includes("PATCH"));
  check("lifecycle_does_not_touch_programme", !lifecycleSource.toLowerCase().includes("product-programme") && !lifecycleSource.toLowerCase().includes("product programme"));
  check("lifecycle_does_not_touch_channels", !lifecycleSource.toLowerCase().includes("compass") && !lifecycleSource.toLowerCase().includes("chanakya") && !lifecycleSource.toLowerCase().includes("sarathi"));
  check("lifecycle_does_not_set_runtime_flags", !lifecycleSource.includes("controlsRuntime:") && !lifecycleSource.includes("customerFacingActivation:") && !lifecycleSource.includes("applicabilityDeclared:"));
  check("inventory_panel_has_no_lifecycle_post", !inventoryPanel.includes("submit-review") && !inventoryPanel.includes(">Approve<") && !inventoryPanel.includes("Return to Maker"));
  check("actions_send_no_identity", !actions.includes("makerUserId") && !actions.includes("checkerUserId") && !actions.includes("note"));
  check("actions_have_no_editor", !actions.includes("<input") && !actions.includes("<textarea") && !actions.includes("<select") && !actions.includes("Activate") && !actions.includes("Reject"));
  const foundationDiff = execFileSync("git", ["diff", "--name-only", "HEAD", "--", "prisma/migrations/20260926180000_field_control_master_foundation_v1/migration.sql"], { cwd: repoRoot, encoding: "utf8" });
  check("foundation_migration_unchanged", foundationDiff.trim() === "");
  const classificationSequence = [
    "raw_canonical",
    "derived",
    "reference_mirror",
    "alias",
    "system",
    "configuration",
    "programme_constraint_reference",
    "custom_field",
  ];
  const schemaSource = readFileSync(join(repoRoot, "prisma/schema.prisma"), "utf8");
  const enumStart = schemaSource.indexOf("enum FieldControlClassification {");
  const enumEnd = schemaSource.indexOf("}", enumStart);
  const enumValues = schemaSource
    .slice(enumStart, enumEnd)
    .split("\n")
    .map((line) => line.trim().replace(/\r/g, ""))
    .filter((line) => line.length > 0 && !line.startsWith("enum") && line !== "{");
  check(
    "classification_prior_values_unchanged",
    classificationSequence.slice(0, 7).every((value, index) => enumValues[index] === value),
  );
  check("classification_appends_only_custom_field", enumValues.length === 8 && enumValues[7] === "custom_field");
  const preservedPatch = execFileSync(
    "git",
    ["diff", "-U0", "3accbb6fc8d0f3affda69084b20587d23ac656dc", "295ae054e7022a00928961474d32179d96906862", "--", "prisma/schema.prisma"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const preservedAdded = preservedPatch.split("\n").filter((line) => line.startsWith("+") && !line.startsWith("+++"));
  const preservedRemoved = preservedPatch.split("\n").filter((line) => line.startsWith("-") && !line.startsWith("---"));
  check(
    "preserved_v18a_commit_adds_only_custom_field",
    preservedAdded.length === 1 && preservedAdded[0]?.trim() === "+  custom_field" && preservedRemoved.length === 0,
  );

  const failed = checks.filter(([, passed]) => !passed);
  console.log(`FIELD_CONTROL_LIFECYCLE_V16_PROOF PASS checks=${checks.length} failed=${failed.length}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
