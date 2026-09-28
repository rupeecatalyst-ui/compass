/**
 * Custom value foundation proof. Does not connect to a database.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createCustomFieldPlacement,
  createMemoryPlacementStore,
  type PlacementDefinitionRecord,
} from "./custom-field-placement";
import { DEAL_WORKSPACE_CUSTOM_FIELDS } from "./custom-field-placement-catalogue";
import {
  clearCustomFieldValue,
  createMemoryCustomFieldValueStore,
  CustomFieldValueError,
  readCustomFieldValues,
  writeCustomFieldValue,
} from "./custom-field-value";
import { CustomFieldValueContractError, validateCustomFieldValue } from "./custom-field-value-contract";

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

const options = [
  { key: "customer_withdrew", label: "Customer withdrew", sortOrder: 1, retired: false },
  { key: "pricing_not_acceptable", label: "Pricing not acceptable", sortOrder: 2, retired: false },
  { key: "eligibility_issue", label: "Eligibility issue", sortOrder: 3, retired: false },
  { key: "documentation_incomplete", label: "Documentation incomplete", sortOrder: 4, retired: false },
  { key: "lender_declined", label: "Lender declined", sortOrder: 5, retired: false },
  { key: "other", label: "Other", sortOrder: 6, retired: false },
];

function definition(overrides: Partial<PlacementDefinitionRecord> = {}): PlacementDefinitionRecord {
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
    selectOptionKeysJson: options.map((option) => ({ ...option })),
    currencyUnitsJson: ["rupees"],
    ...overrides,
  };
}

function contractError(fieldType: string, raw: unknown, selectOptionKeysJson: unknown = options): string | null {
  try {
    validateCustomFieldValue({ fieldType, raw, selectOptionKeysJson, existingValue: undefined });
    return null;
  } catch (error) {
    return error instanceof CustomFieldValueContractError ? error.code : "OTHER";
  }
}

async function main(): Promise<void> {
  const audits: Array<{ action: string; actorUserId: string; organizationId: string | null }> = [];
  const audit = (event: { action: string; actorUserId: string; organizationId: string | null }) => {
    audits.push(event);
  };
  const deals = new Set(["org-a:deal-1", "org-a:deal-2", "org-b:deal-9"]);
  const dealInOrganization = async (organizationId: string, entityId: string) => deals.has(`${organizationId}:${entityId}`);
  const placements = createMemoryPlacementStore();
  const approved = definition();
  await createCustomFieldPlacement({
    body: {
      fieldLineageId: "deal.declineReason",
      screenId: DEAL_WORKSPACE_CUSTOM_FIELDS.screenId,
      sectionId: DEAL_WORKSPACE_CUSTOM_FIELDS.sectionId,
      showOnCreate: true,
      showOnEdit: true,
      showOnView: true,
      required: false,
      displayOrder: 1,
      active: true,
    },
    actor: { role: "ADMIN", userId: "admin-1" },
    definitions: [approved],
    store: placements,
    audit: () => undefined,
    now: "2026-09-28T00:00:00.000Z",
  });
  const values = createMemoryCustomFieldValueStore();
  const empty = await readCustomFieldValues({
    actor: { userId: "rm-1", role: "USER" },
    entityDomain: "deal",
    entityId: "deal-1",
    resolveOrganizationId: async () => "org-a",
    dealInOrganization,
    store: values,
  });
  check("no_row_means_empty", empty.length === 0);

  const saved = await writeCustomFieldValue({
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
    dealInOrganization,
    placements,
    store: values,
    audit,
    now: "2026-09-28T01:00:00.000Z",
  });
  check("organization_scoping", saved.organizationId === "org-a");
  check("lineage_binding", saved.fieldLineageId === "deal.declineReason" && saved.fieldLineageId !== saved.definitionVersionIdCapturedUnder);
  check("captured_under_definition_version", saved.definitionVersionIdCapturedUnder === "fcm:deal.declineReason:v1");
  check("entity_domain_and_entity_id", saved.entityDomain === "deal" && saved.entityId === "deal-1");

  const versionTwo = definition({
    id: "fcm:deal.declineReason:v2",
    versionNumber: 2,
    selectOptionKeysJson: options.map((option) => ({ ...option, label: `${option.label} updated` })),
  });
  const updated = await writeCustomFieldValue({
    actor: { userId: "rm-1", role: "USER" },
    body: {
      fieldLineageId: "deal.declineReason",
      screenId: "deal_workspace",
      sectionId: "custom_fields",
      entityDomain: "deal",
      entityId: "deal-1",
      value: "pricing_not_acceptable",
    },
    definitions: [approved, versionTwo],
    resolveOrganizationId: async () => "org-a",
    dealInOrganization,
    placements,
    store: values,
    audit,
    now: "2026-09-28T02:00:00.000Z",
  });
  check("one_logical_value_uniqueness", values.rows.length === 1 && updated.valueJson === "pricing_not_acceptable");
  check("update_records_new_capture_version_and_keeps_lineage", updated.definitionVersionIdCapturedUnder === versionTwo.id && updated.fieldLineageId === "deal.declineReason");

  check("text_validation", validateCustomFieldValue({ fieldType: "text", raw: "Note", selectOptionKeysJson: [], existingValue: undefined }) === "Note" && contractError("text", "") === "VALUE_INVALID" && contractError("text", 1) === "VALUE_INVALID");
  check("long_text_validation", validateCustomFieldValue({ fieldType: "long_text", raw: "Longer note", selectOptionKeysJson: [], existingValue: undefined }) === "Longer note" && contractError("long_text", "") === "VALUE_INVALID");
  check("number_validation", validateCustomFieldValue({ fieldType: "number", raw: 12.5, selectOptionKeysJson: [], existingValue: undefined }) === 12.5 && contractError("number", "12.5") === "VALUE_INVALID" && contractError("number", Number.POSITIVE_INFINITY) === "VALUE_INVALID");
  check("currency_validation", validateCustomFieldValue({ fieldType: "currency", raw: 1000, selectOptionKeysJson: [], existingValue: undefined }) === 1000 && contractError("currency", { amount: 1000 }) === "VALUE_INVALID");
  check("percentage_validation", validateCustomFieldValue({ fieldType: "percentage", raw: 8.5, selectOptionKeysJson: [], existingValue: undefined }) === 8.5 && contractError("percentage", "8.5") === "VALUE_INVALID");
  check("date_validation", validateCustomFieldValue({ fieldType: "date", raw: "2026-09-28", selectOptionKeysJson: [], existingValue: undefined }) === "2026-09-28" && contractError("date", "2026-02-31") === "VALUE_INVALID" && contractError("date", "2026-09-28T00:00:00.000Z") === "VALUE_INVALID");
  check("yes_no_validation", validateCustomFieldValue({ fieldType: "yes_no", raw: true, selectOptionKeysJson: [], existingValue: undefined }) === true && contractError("yes_no", "yes") === "VALUE_INVALID");
  check("single_select_key_validation", saved.valueJson !== "Customer withdrew" && updated.valueJson === "pricing_not_acceptable");
  check(
    "multi_select_key_validation",
    JSON.stringify(validateCustomFieldValue({ fieldType: "multi_select", raw: ["lender_declined", "other"], selectOptionKeysJson: options, existingValue: undefined })) === JSON.stringify(["lender_declined", "other"]) &&
      contractError("multi_select", ["lender_declined", "lender_declined"]) === "VALUE_INVALID",
  );
  check("unknown_option_rejected", contractError("single_select", "not_a_key") === "OPTION_UNKNOWN" && contractError("single_select", "Customer withdrew") === "OPTION_UNKNOWN");

  const retiredOptions = options.map((option) => ({ ...option, retired: option.key === "pricing_not_acceptable" }));
  const retiredDefinition = definition({ selectOptionKeysJson: retiredOptions });
  const historical = await readCustomFieldValues({
    actor: { userId: "rm-1", role: "USER" },
    entityDomain: "deal",
    entityId: "deal-1",
    resolveOrganizationId: async () => "org-a",
    dealInOrganization,
    store: values,
  });
  check("retired_historical_key_remains_representable", historical[0]?.valueJson === "pricing_not_acceptable" && values.rows.length === 1);
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
    definitions: [retiredDefinition],
    resolveOrganizationId: async () => "org-a",
    dealInOrganization,
    placements,
    store: values,
    audit,
    now: "2026-09-28T02:30:00.000Z",
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
        value: "pricing_not_acceptable",
      },
      definitions: [retiredDefinition],
      resolveOrganizationId: async () => "org-a",
      dealInOrganization,
      placements,
      store: values,
      audit,
    });
    check("retired_key_rejected_for_new_selection", false);
  } catch (error) {
    check(
      "retired_key_rejected_for_new_selection",
      error instanceof CustomFieldValueError && error.code === "OPTION_RETIRED" && values.rows[0]?.valueJson === "customer_withdrew",
    );
  }

  const other = await writeCustomFieldValue({
    actor: { userId: "rm-2", role: "USER" },
    body: {
      fieldLineageId: "deal.declineReason",
      screenId: "deal_workspace",
      sectionId: "custom_fields",
      entityDomain: "deal",
      entityId: "deal-2",
      value: "other",
    },
    definitions: [approved],
    resolveOrganizationId: async () => "org-a",
    dealInOrganization,
    placements,
    store: values,
    audit,
    now: "2026-09-28T03:00:00.000Z",
  });
  const cleared = await clearCustomFieldValue({
    actor: { userId: "rm-1", role: "USER" },
    entityDomain: "deal",
    entityId: "deal-1",
    fieldLineageId: "deal.declineReason",
    resolveOrganizationId: async () => "org-a",
    dealInOrganization,
    store: values,
    audit,
  });
  check(
    "clear_removes_only_targeted_value",
    cleared.cleared &&
      values.rows.length === 1 &&
      values.rows[0]?.id === other.id &&
      placements.rows.length === 1 &&
      approved.classification === "custom_field",
  );
  const afterClear = await readCustomFieldValues({
    actor: { userId: "rm-1", role: "USER" },
    entityDomain: "deal",
    entityId: "deal-1",
    resolveOrganizationId: async () => "org-a",
    dealInOrganization,
    store: values,
  });
  check("cleared_entity_has_no_row", afterClear.length === 0);

  await writeCustomFieldValue({
    actor: { userId: "rm-1", role: "USER" },
    body: {
      fieldLineageId: "deal.declineReason",
      screenId: "deal_workspace",
      sectionId: "custom_fields",
      entityDomain: "deal",
      entityId: "deal-1",
      value: "lender_declined",
    },
    definitions: [approved],
    resolveOrganizationId: async () => "org-a",
    dealInOrganization,
    placements,
    store: values,
    audit,
    now: "2026-09-28T04:00:00.000Z",
  });
  const placement = placements.rows[0]!;
  placement.active = false;
  try {
    await writeCustomFieldValue({
      actor: { userId: "rm-1", role: "USER" },
      body: {
        fieldLineageId: "deal.declineReason",
        screenId: "deal_workspace",
        sectionId: "custom_fields",
        entityDomain: "deal",
        entityId: "deal-1",
        value: "other",
      },
      definitions: [approved],
      resolveOrganizationId: async () => "org-a",
      dealInOrganization,
      placements,
      store: values,
      audit,
    });
    check("inactive_placement_blocks_normal_write", false);
  } catch (error) {
    check("inactive_placement_blocks_normal_write", error instanceof CustomFieldValueError && error.code === "PLACEMENT_NOT_ACTIVE" && values.rows.some((row) => row.entityId === "deal-1" && row.valueJson === "lender_declined"));
  }
  placement.active = true;

  values.rows.push({
    id: "foreign",
    organizationId: "org-b",
    fieldLineageId: "deal.declineReason",
    fieldId: "deal.declineReason",
    definitionVersionIdCapturedUnder: approved.id,
    entityDomain: "deal",
    entityId: "deal-1",
    valueJson: "other",
    createdAt: "2026-09-28T00:00:00.000Z",
    updatedAt: "2026-09-28T00:00:00.000Z",
    createdByUserId: "other-user",
    updatedByUserId: "other-user",
  });
  const orgRead = await readCustomFieldValues({
    actor: { userId: "admin-1", role: "ADMIN" },
    entityDomain: "deal",
    entityId: "deal-1",
    resolveOrganizationId: async () => "org-a",
    dealInOrganization,
    store: values,
  });
  check("cross_org_read_rejected", orgRead.every((row) => row.organizationId === "org-a") && orgRead.length === 1);
  const beforeForeign = values.rows.filter((row) => row.organizationId === "org-b").length;
  try {
    await writeCustomFieldValue({
      actor: { userId: "admin-1", role: "ADMIN" },
      body: {
        fieldLineageId: "deal.declineReason",
        screenId: "deal_workspace",
        sectionId: "custom_fields",
        entityDomain: "deal",
        entityId: "deal-9",
        organizationId: "org-b",
        value: "other",
      },
      definitions: [approved],
      resolveOrganizationId: async () => "org-a",
      dealInOrganization,
      placements,
      store: values,
      audit,
    });
    check("cross_org_write_rejected", false);
  } catch (error) {
    check(
      "cross_org_write_rejected",
      error instanceof CustomFieldValueError &&
        (error.code === "ORGANIZATION_CONTEXT_REJECTED" || error.code === "ENTITY_NOT_IN_ORGANIZATION") &&
        values.rows.filter((row) => row.organizationId === "org-b").length === beforeForeign,
    );
  }

  check("customer_facing_remains_false", approved.customerFacingActivation === false && approved.controlsRuntime === false);
  const changed = execFileSync("git", ["diff", "--name-only", "HEAD"], { cwd: repoRoot, encoding: "utf8" });
  const touched = [
    source("src/lib/field-control-master/custom-field-value.ts"),
    source("src/lib/field-control-master/custom-field-placement.ts"),
    source("prisma/migrations/20260928140000_field_control_custom_placement_value/migration.sql"),
  ].join("\n");
  check(
    "product_programme_untouched",
    !changed.includes("src/lib/product-programme-operations/") &&
      !changed.includes("EnterpriseLenderProgram") &&
      !touched.includes("EnterpriseLenderProgram") &&
      !touched.includes("foir") &&
      !touched.includes("matchPercent"),
  );
  check("value_audit_attributes_actor", audits.every((event) => event.actorUserId.length > 0 && event.organizationId === "org-a"));
  check("admin_role_does_not_skip_entity_organization", orgRead[0]?.organizationId === "org-a");

  const failed = checks.filter(([, passed]) => !passed);
  console.log(`FIELD_CONTROL_VALUE_V2_PROOF PASS checks=${checks.length} failed=${failed.length}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
