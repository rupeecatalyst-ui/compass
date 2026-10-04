/**
 * Placement foundation proof. Does not connect to a database.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { recordCustomFieldAudit } from "./custom-field-audit";
import {
  CUSTOM_FIELD_LAUNCH_DOMAINS,
  CUSTOM_FIELD_PLACEMENT_SCREENS,
  DEAL_WORKSPACE_CUSTOM_FIELDS,
} from "./custom-field-placement-catalogue";
import {
  createCustomFieldPlacement,
  createMemoryPlacementStore,
  CustomFieldPlacementError,
  setCustomFieldPlacementActive,
  type PlacementDefinitionRecord,
} from "./custom-field-placement";
import { createMemoryCustomFieldValueStore, writeCustomFieldValue } from "./custom-field-value";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");
const checks: Array<[string, boolean]> = [];

function check(name: string, passed: boolean): void {
  checks.push([name, passed]);
  assert.equal(passed, true, name);
}

function source(path: string): string {
  return readFileSync(join(repoRoot, path), "utf8");
}

function definition(overrides: Partial<PlacementDefinitionRecord>): PlacementDefinitionRecord {
  return {
    id: "fcm:deal.declineReason:v1",
    fieldId: "deal.declineReason",
    lineageId: "deal.declineReason",
    versionNumber: 1,
    classification: "custom_field",
    owningDomain: "deal",
    lifecycleStatus: "approved",
    fieldType: "single_select",
    controlsRuntime: false,
    customerFacingActivation: false,
    selectOptionKeysJson: [{ key: "customer_withdrew", label: "Customer withdrew", sortOrder: 1, retired: false }],
    currencyUnitsJson: [],
    ...overrides,
  };
}

const body = {
  fieldLineageId: "deal.declineReason",
  screenId: DEAL_WORKSPACE_CUSTOM_FIELDS.screenId,
  sectionId: DEAL_WORKSPACE_CUSTOM_FIELDS.sectionId,
  showOnCreate: true,
  showOnEdit: true,
  showOnView: true,
  required: false,
  displayOrder: 10,
  active: true,
};

async function main(): Promise<void> {
  const audits: string[] = [];
  const audit = (event: { action: string; actorUserId: string }) => {
    audits.push(`${event.action}:${event.actorUserId}`);
  };
  const store = createMemoryPlacementStore();
  const approved = definition({});
  const before = JSON.stringify(approved);
  const placed = await createCustomFieldPlacement({
    body,
    actor: { role: "ADMIN", userId: "admin-1" },
    definitions: [approved],
    store,
    audit,
    now: "2026-09-28T00:00:00.000Z",
  });
  check("approved_custom_field_can_be_placed", placed.active && placed.fieldLineageId === "deal.declineReason");
  check("placement_has_no_organization", !("organizationId" in placed));
  check("admin_placement_governance", audits.includes("placement_activated:admin-1"));

  const superStore = createMemoryPlacementStore();
  const superPlaced = await createCustomFieldPlacement({
    body: { ...body, fieldLineageId: "deal.superProbe" },
    actor: { role: "SUPER_ADMIN", userId: "super-1" },
    definitions: [definition({ id: "fcm:deal.superProbe:v1", fieldId: "deal.superProbe", lineageId: "deal.superProbe" })],
    store: superStore,
    audit,
    now: "2026-09-28T00:00:00.000Z",
  });
  check("super_admin_placement_governance", superPlaced.createdByUserId === "super-1");

  for (const [name, status, code] of [
    ["draft_rejected", "draft", "DEFINITION_NOT_APPROVED"],
    ["checker_review_rejected", "checker_review", "DEFINITION_NOT_APPROVED"],
  ] as const) {
    try {
      await createCustomFieldPlacement({
        body,
        actor: { role: "ADMIN", userId: "admin-1" },
        definitions: [definition({ lifecycleStatus: status })],
        store: createMemoryPlacementStore(),
        audit,
      });
      check(name, false);
    } catch (error) {
      check(name, error instanceof CustomFieldPlacementError && error.code === code);
    }
  }

  try {
    await createCustomFieldPlacement({
      body,
      actor: { role: "ADMIN", userId: "admin-1" },
      definitions: [definition({ classification: "raw_canonical" })],
      store: createMemoryPlacementStore(),
      audit,
    });
    check("non_custom_classification_rejected", false);
  } catch (error) {
    check("non_custom_classification_rejected", error instanceof CustomFieldPlacementError && error.code === "CLASSIFICATION_NOT_CUSTOM");
  }

  try {
    await createCustomFieldPlacement({
      body,
      actor: { role: "USER", userId: "user-1" },
      definitions: [definition({})],
      store: createMemoryPlacementStore(),
      audit,
    });
    check("non_admin_rejected", false);
  } catch (error) {
    check("non_admin_rejected", error instanceof CustomFieldPlacementError && error.code === "FORBIDDEN");
  }

  check(
    "launch_domains_are_the_five",
    CUSTOM_FIELD_LAUNCH_DOMAINS.join(",") === "contact,company,opportunity,deal,accounting",
  );
  check(
    "launch_screens_match_domains",
    CUSTOM_FIELD_PLACEMENT_SCREENS.every((screen) => (CUSTOM_FIELD_LAUNCH_DOMAINS as readonly string[]).includes(screen.owningDomain)),
  );
  try {
    await createCustomFieldPlacement({
      body: { ...body, screenId: "assessment_workspace" },
      actor: { role: "ADMIN", userId: "admin-1" },
      definitions: [definition({ owningDomain: "assessment" })],
      store: createMemoryPlacementStore(),
      audit,
    });
    check("non_launch_domain_rejected", false);
  } catch (error) {
    check("non_launch_domain_rejected", error instanceof CustomFieldPlacementError && error.code === "UNKNOWN_SCREEN");
  }

  check(
    "controlled_screen_identifier",
    DEAL_WORKSPACE_CUSTOM_FIELDS.screenId === "deal_workspace" &&
      DEAL_WORKSPACE_CUSTOM_FIELDS.screenLabel === "Deal Workspace" &&
      DEAL_WORKSPACE_CUSTOM_FIELDS.sectionId === "custom_fields" &&
      DEAL_WORKSPACE_CUSTOM_FIELDS.sectionLabel === "Custom Fields",
  );
  try {
    await createCustomFieldPlacement({
      body: { ...body, screenId: "Deal Workspace" },
      actor: { role: "ADMIN", userId: "admin-1" },
      definitions: [definition({})],
      store: createMemoryPlacementStore(),
      audit,
    });
    check("free_text_screen_rejected", false);
  } catch (error) {
    check("free_text_screen_rejected", error instanceof CustomFieldPlacementError && error.code === "UNKNOWN_SCREEN");
  }

  check("requiredness_belongs_to_placement", placed.requiredOnPlacement === false && !before.includes("required"));
  check("definition_flags_unchanged_by_placement", before === JSON.stringify(approved));

  const inactiveStore = createMemoryPlacementStore();
  const values = createMemoryCustomFieldValueStore();
  const inactive = await createCustomFieldPlacement({
    body: { ...body, active: false },
    actor: { role: "ADMIN", userId: "admin-1" },
    definitions: [approved],
    store: inactiveStore,
    audit,
    now: "2026-09-28T00:00:00.000Z",
  });
  try {
    await writeCustomFieldValue({
      actor: { userId: "rm-1", role: "USER" },
      body: {
        fieldLineageId: "deal.declineReason",
        screenId: "deal_workspace",
        sectionId: "custom_fields",
        entityDomain: "deal",
        entityId: "deal-1",
        value: "customer_withdrew",
      },
      definitions: [approved],
      resolveOrganizationId: async () => "org-a",
      dealInOrganization: async () => true,
      placements: inactiveStore,
      store: values,
      audit,
    });
    check("inactive_placement_not_runtime_writable", false);
  } catch (error) {
    check("inactive_placement_not_runtime_writable", (error as { code?: string }).code === "PLACEMENT_NOT_ACTIVE" && values.rows.length === 0);
  }

  const live = await setCustomFieldPlacementActive({
    placementId: inactive.id,
    body: { active: true, expectedUpdatedAt: inactive.updatedAt },
    actor: { role: "SUPER_ADMIN", userId: "super-1" },
    definitions: [approved],
    store: inactiveStore,
    audit,
    now: "2026-09-28T01:00:00.000Z",
  });
  await writeCustomFieldValue({
    actor: { userId: "rm-1", role: "USER" },
    body: {
      fieldLineageId: "deal.declineReason",
      screenId: "deal_workspace",
      sectionId: "custom_fields",
      entityDomain: "deal",
      entityId: "deal-1",
      value: "customer_withdrew",
    },
    definitions: [approved],
    resolveOrganizationId: async () => "org-a",
    dealInOrganization: async () => true,
    placements: inactiveStore,
    store: values,
    audit,
    now: "2026-09-28T01:00:00.000Z",
  });
  const deactivated = await setCustomFieldPlacementActive({
    placementId: live.id,
    body: { active: false, expectedUpdatedAt: live.updatedAt },
    actor: { role: "ADMIN", userId: "admin-1" },
    definitions: [approved],
    store: inactiveStore,
    audit,
    now: "2026-09-28T02:00:00.000Z",
  });
  check(
    "deactivation_preserves_value_architecture",
    deactivated.active === false &&
      values.rows.length === 1 &&
      values.rows[0]?.valueJson === "customer_withdrew" &&
      approved.controlsRuntime === false &&
      approved.customerFacingActivation === false,
  );

  const placementSource = source("src/lib/field-control-master/custom-field-placement.ts");
  const migration = source("prisma/migrations/20260928140000_field_control_custom_placement_value/migration.sql");
  const executable = migration
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("--"))
    .join("\n");
  check("placement_does_not_set_controls_runtime", !placementSource.includes("controlsRuntime: true") && !executable.includes("controls_runtime"));
  check(
    "placement_does_not_set_customer_facing_activation",
    !placementSource.includes("customerFacingActivation: true") && !executable.includes("customer_facing"),
  );

  const statements = executable
    .split(";")
    .map((statement) => statement.replace(/\s+/g, " ").trim())
    .filter((statement) => statement.length > 0);
  check(
    "migration_statements_are_additive",
    statements.length === 8 &&
      statements.every((statement) =>
        statement.startsWith("CREATE TABLE") ||
        statement.startsWith("CREATE UNIQUE INDEX") ||
        statement.startsWith("CREATE INDEX") ||
        statement.startsWith('ALTER TABLE "field_control_placements" ENABLE ROW LEVEL SECURITY') ||
        statement.startsWith('ALTER TABLE "field_control_custom_values" ENABLE ROW LEVEL SECURITY'),
      ),
  );
  check("migration_creates_placement_table", executable.includes('CREATE TABLE "field_control_placements"'));
  check("migration_creates_value_table", executable.includes('CREATE TABLE "field_control_custom_values"'));
  check("migration_unique_value_key", executable.includes('"organization_id", "field_lineage_id", "entity_domain", "entity_id"'));
  check("migration_has_no_entity_foreign_key", !executable.includes("REFERENCES \"enterprise_deals\"") && !executable.includes("REFERENCES \"ecm_contacts\""));
  const placementSql = migration.split('CREATE TABLE "field_control_custom_values"')[0] ?? "";
  check("placement_sql_is_global", !placementSql.includes("organization_id"));
  check("migration_does_not_alter_foundation_table", !executable.includes('ALTER TABLE "field_control_definitions"'));
  check("migration_does_not_alter_enterprise_deal", !executable.includes("enterprise_deals"));

  const foundationDiff = execFileSync("git", ["diff", "--name-only", "HEAD", "--", "prisma/migrations/20260926180000_field_control_master_foundation_v1/migration.sql"], { cwd: repoRoot, encoding: "utf8" });
  const enumDiff = execFileSync("git", ["diff", "--name-only", "HEAD", "--", "prisma/migrations/20260927193000_field_control_classification_custom_field/migration.sql"], { cwd: repoRoot, encoding: "utf8" });
  check("foundation_migration_not_modified", foundationDiff.trim() === "");
  check("v18a_migration_not_modified", enumDiff.trim() === "");

  const route = source("src/app/api/admin/field-control-placements/route.ts");
  const valueRoute = source("src/app/api/internal/custom-field-values/route.ts");
  check("placement_route_is_admin_service", route.includes("createCustomFieldPlacement") && route.includes("listCustomFieldPlacements"));
  check("value_route_is_not_admin_governance", !valueRoute.includes("assertFieldControlAdministrator"));
  recordCustomFieldAudit({
    action: "placement_deactivated",
    actorUserId: "admin-1",
    organizationId: null,
    fieldLineageId: "deal.declineReason",
    entityId: null,
    previousValue: { active: true },
    newValue: { active: false },
  });
  check("placement_audit_uses_edl", source("src/lib/field-control-master/custom-field-audit.ts").includes("recordEnterpriseDecision"));

  const failed = checks.filter(([, passed]) => !passed);
  console.log(`FIELD_CONTROL_PLACEMENT_V2_PROOF PASS checks=${checks.length} failed=${failed.length}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
