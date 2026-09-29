/**
 * Deal Workspace custom-field integration proof and local acceptance simulation.
 * Does not connect to a database and is not a production BAT.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCustomFieldDraft, type CustomFieldDraftInsert } from "./custom-field-design";
import {
  inspectDealCustomFieldValue,
  isEmptyCustomFieldValue,
  loadDealWorkspaceCustomFields,
  projectDealWorkspaceCustomFields,
  saveDealWorkspaceCustomField,
  type DealWorkspaceFieldDefinition,
} from "./deal-workspace-custom-fields";
import {
  createCustomFieldPlacement,
  createMemoryPlacementStore,
  CustomFieldPlacementError,
  setCustomFieldPlacementActive,
  type PlacementDefinitionRecord,
} from "./custom-field-placement";
import { createMemoryCustomFieldValueStore, CustomFieldValueError } from "./custom-field-value";
import { planFieldControlLifecycle } from "./production-governance-lifecycle";
import type { CertifiedFieldControlRecord } from "./production-governance-read";

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

function blob(path: string): { bytes: number; sha256: string } {
  const result = spawnSync("git", ["cat-file", "blob", `HEAD:${path}`], { cwd: repoRoot, encoding: "buffer" });
  const body = result.stdout;
  return { bytes: body.length, sha256: createHash("sha256").update(body).digest("hex").toUpperCase() };
}

function storedRow(data: CustomFieldDraftInsert): CertifiedFieldControlRecord {
  return { ...data, createdAt: new Date("2026-09-28T08:00:00.000Z"), updatedAt: new Date("2026-09-28T08:00:00.000Z") };
}

function asDefinition(row: CertifiedFieldControlRecord): DealWorkspaceFieldDefinition {
  return {
    id: row.id,
    fieldId: row.fieldId,
    lineageId: row.lineageId,
    versionNumber: row.versionNumber,
    classification: row.classification,
    owningDomain: row.owningDomain,
    lifecycleStatus: row.lifecycleStatus,
    fieldType: row.fieldType,
    controlsRuntime: row.controlsRuntime,
    customerFacingActivation: row.customerFacingActivation,
    selectOptionKeysJson: row.selectOptionKeysJson,
    currencyUnitsJson: row.currencyUnitsJson,
    friendlyLabel: row.friendlyLabel,
  };
}

function asPlacementDefinition(row: DealWorkspaceFieldDefinition): PlacementDefinitionRecord {
  return row;
}

const declineOptions = [
  { key: "customer_withdrew", label: "Customer withdrew" },
  { key: "pricing_not_acceptable", label: "Pricing not acceptable" },
  { key: "eligibility_issue", label: "Eligibility issue" },
  { key: "documentation_incomplete", label: "Documentation incomplete" },
  { key: "lender_declined", label: "Lender declined" },
  { key: "other", label: "Other" },
];

async function main(): Promise<void> {
  const host = source("src/components/catalyst-one/deal-workspace/deal-workspace-host.tsx");
  const section = source("src/components/catalyst-one/deal-workspace/deal-custom-fields-section.tsx");
  const input = source("src/components/catalyst-one/deal-workspace/custom-field-input.tsx");
  const panel = source("src/components/catalyst-one/field-control-master/custom-field-placement-panel.tsx");
  const route = source("src/app/api/internal/deals/[dealId]/custom-fields/route.ts");
  const lifecycle = source("src/lib/field-control-master/production-governance-lifecycle.ts");
  const renderer = `${host}\n${section}\n${input}`;
  check(
    "deal_workspace_contains_custom_fields",
    host.includes("DealCustomFieldsSection") &&
      !section.includes(">Custom Fields<") &&
      section.includes('data-custom-fields-screen="deal_workspace"') &&
      section.includes('data-custom-fields-section="custom_fields"'),
  );
  check("no_hardcoded_decline_reason_renderer", !renderer.includes("deal.declineReason"));
  check("single_select_displays_labels_and_stores_keys", input.includes("{option.label}") && input.includes("value={option.key}"));
  check("placement_admin_uses_controlled_screens", panel.includes("CUSTOM_FIELD_PLACEMENT_SCREENS") && panel.includes("Place Field") && panel.includes("Deactivate") && panel.includes("Activate") && !panel.includes('type="text"'));
  check("placement_admin_does_not_auto_place_on_approval", lifecycle.includes("lifecycleStatus") && !lifecycle.includes("createCustomFieldPlacement") && !lifecycle.includes("field-control-placements"));
  check("edl_remains_server_audit_authority", route.includes("recordCustomFieldAudit") && !renderer.includes("recordEnterpriseDecision") && !panel.includes("recordEnterpriseDecision"));
  check("deal_route_follows_deal_authorization", route.includes("dealBelongsToOrganization") && route.includes("resolveCustomFieldOrganizationId") && !route.includes("assertFieldControlAdministrator"));

  const changed = spawnSync("git", ["diff", "--name-only", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).stdout;
  const touched = [source("src/lib/field-control-master/deal-workspace-custom-fields.ts"), route, section, input, panel].join("\n");
  check("product_programme_untouched", !changed.includes("src/lib/product-programme-operations/") && !touched.includes("EnterpriseLenderProgram") && !touched.includes("matchPercent"));
  check("compass_untouched", !changed.includes("server/services/compass-customer-gateway/") && !touched.toLowerCase().includes("compass-customer"));
  check("chanakya_untouched", !changed.includes("src/lib/chanakya") && !touched.toLowerCase().includes("chanakya"));
  check("sarathi_untouched", !changed.includes("src/constants/enterprise-ai-platform/") && !touched.toLowerCase().includes("sarathi"));

  const v20 = blob("prisma/migrations/20260928140000_field_control_custom_placement_value/migration.sql");
  const v18a = blob("prisma/migrations/20260927193000_field_control_classification_custom_field/migration.sql");
  const foundation = blob("prisma/migrations/20260926180000_field_control_master_foundation_v1/migration.sql");
  check("v20_migration_identity", v20.bytes === 3719 && v20.sha256 === "D307D40FB3491528368DC9AA54202379EBC2C07A689FC66A4A71A47FE6E2AB89");
  check("v18a_migration_identity", v18a.bytes === 249 && v18a.sha256 === "5217EF2882C679C42F2AB5A7042FAD07408B81DFD904B57D98E979CC288ACD32");
  check("foundation_migration_identity", foundation.bytes === 3660 && foundation.sha256 === "1B05A9EAE8A0AD7A0227BF2847D51A2E39DEA1F96AACCE1C11CD2F6CBB8B3E5D");

  const created: CustomFieldDraftInsert[] = [];
  const draft = await createCustomFieldDraft(
    new Request("http://catalyst.local/custom-field-drafts", {
      method: "POST",
      body: JSON.stringify({
        fieldId: "deal.declineReason",
        owningDomain: "deal",
        fieldType: "single_select",
        friendlyLabel: "Deal Decline Reason",
        description: "Why the deal was declined.",
        helpText: "Choose one reason.",
        validationSummary: "Optional at launch.",
        presentationSummary: "Shown only after placement.",
        options: declineOptions,
      }),
    }),
    {
      authenticate: () => ({ role: "ADMIN", userId: "maker-1" }),
      findFirst: async () => null,
      create: async ({ data }) => {
        created.push(data);
        return storedRow(data);
      },
    },
  );
  check("simulation_draft_created", draft.ok && created[0]?.lifecycleStatus === "draft" && created[0]?.controlsRuntime === false);
  let row = storedRow(created[0]!);
  const submitted = planFieldControlLifecycle({ action: "submit", actorUserId: "maker-1", row, expectedUpdatedAt: row.updatedAt });
  check("simulation_submitted", "data" in submitted && submitted.data.lifecycleStatus === "checker_review");
  if ("data" in submitted) row = { ...row, ...submitted.data };
  const approved = planFieldControlLifecycle({ action: "approve", actorUserId: "checker-2", row, expectedUpdatedAt: row.updatedAt });
  check("simulation_approved_by_different_checker", "data" in approved && approved.data.lifecycleStatus === "approved" && !("controlsRuntime" in approved.data));
  if ("data" in approved) row = { ...row, ...approved.data };
  const definition = asDefinition(row);
  check("controls_runtime_remains_false", definition.controlsRuntime === false && definition.customerFacingActivation === false);

  const audits: string[] = [];
  const audit = (event: { action: string }) => {
    audits.push(event.action);
  };
  const deals = new Set(["org-a:deal-1"]);
  const dealInOrganization = async (organizationId: string, entityId: string) => deals.has(`${organizationId}:${entityId}`);
  const resolveOrganizationId = async () => "org-a";
  const placements = createMemoryPlacementStore();
  const values = createMemoryCustomFieldValueStore();
  const definitionsForLineage = async () => [definition];
  const beforePlacement = await loadDealWorkspaceCustomFields({
    actor: { userId: "rm-1", role: "USER" },
    dealId: "deal-1",
    mode: "edit",
    resolveOrganizationId,
    dealInOrganization,
    placements,
    definitionsForLineage,
    values,
  });
  check("simulation_hidden_before_placement", beforePlacement.length === 0 && placements.rows.length === 0);

  const inactive = await createCustomFieldPlacement({
    body: {
      fieldLineageId: "deal.declineReason",
      screenId: "deal_workspace",
      sectionId: "custom_fields",
      showOnCreate: true,
      showOnEdit: true,
      showOnView: true,
      required: false,
      displayOrder: 10,
      active: false,
    },
    actor: { role: "ADMIN", userId: "admin-1" },
    definitions: [asPlacementDefinition(definition)],
    store: placements,
    audit,
    now: "2026-09-28T09:00:00.000Z",
  });
  const whileInactive = projectDealWorkspaceCustomFields({
    mode: "edit",
    placements: placements.rows,
    definitions: [definition],
    values: values.rows,
  });
  check("inactive_placement_does_not_render", whileInactive.length === 0);
  const active = await setCustomFieldPlacementActive({
    placementId: inactive.id,
    body: { active: true, expectedUpdatedAt: inactive.updatedAt },
    actor: { role: "SUPER_ADMIN", userId: "super-1" },
    definitions: [asPlacementDefinition(definition)],
    store: placements,
    audit,
    now: "2026-09-28T09:30:00.000Z",
  });
  const visible = await loadDealWorkspaceCustomFields({
    actor: { userId: "rm-1", role: "USER" },
    dealId: "deal-1",
    mode: "edit",
    resolveOrganizationId,
    dealInOrganization,
    placements,
    definitionsForLineage,
    values,
  });
  check("active_deal_placement_renders", visible.length === 1 && visible[0]?.friendlyLabel === "Deal Decline Reason" && visible[0]?.editable && visible[0]?.required === false);
  check("approved_custom_field_required", visible[0]?.fieldType === "single_select" && definition.classification === "custom_field" && definition.lifecycleStatus === "approved");

  const draftView = projectDealWorkspaceCustomFields({
    mode: "edit",
    placements: placements.rows,
    definitions: [{ ...definition, lifecycleStatus: "draft" }],
    values: [],
  });
  const rawView = projectDealWorkspaceCustomFields({
    mode: "edit",
    placements: placements.rows,
    definitions: [{ ...definition, classification: "raw_canonical" }],
    values: [],
  });
  check("draft_does_not_render", draftView.length === 0);
  check("non_custom_does_not_render", rawView.length === 0);

  const second = { ...definition, id: "fcm:deal.followUp:v1", fieldId: "deal.followUp", lineageId: "deal.followUp", friendlyLabel: "Follow up", fieldType: "text" as const, selectOptionKeysJson: [] };
  const ordered = projectDealWorkspaceCustomFields({
    mode: "edit",
    placements: [
      { ...placements.rows[0]!, displayOrder: 20 },
      { ...placements.rows[0]!, id: "later", fieldLineageId: "deal.followUp", fieldId: "deal.followUp", displayOrder: 5 },
    ],
    definitions: [definition, second],
    values: [],
  });
  check("display_order_respected", ordered.map((field) => field.fieldLineageId).join(",") === "deal.followUp,deal.declineReason");
  const viewOnly = projectDealWorkspaceCustomFields({
    mode: "view",
    placements: [{ ...placements.rows[0]!, showOnView: true, showOnEdit: false }],
    definitions: [definition],
    values: [],
  });
  const hiddenView = projectDealWorkspaceCustomFields({
    mode: "view",
    placements: [{ ...placements.rows[0]!, showOnView: false, showOnEdit: true }],
    definitions: [definition],
    values: [],
  });
  check("show_on_view_respected", viewOnly.length === 1 && viewOnly[0]?.editable === false && hiddenView.length === 0);
  const editHidden = projectDealWorkspaceCustomFields({
    mode: "edit",
    placements: [{ ...placements.rows[0]!, showOnEdit: false, showOnView: false, showOnCreate: true }],
    definitions: [definition],
    values: [],
  });
  check("show_on_edit_respected", editHidden.length === 0 && visible[0]?.editable === true);

  try {
    await createCustomFieldPlacement({
      body: {
        fieldLineageId: "deal.followUp",
        screenId: "deal_workspace",
        sectionId: "custom_fields",
        showOnCreate: false,
        showOnEdit: false,
        showOnView: false,
        required: false,
        displayOrder: 1,
        active: false,
      },
      actor: { role: "USER", userId: "rm-1" },
      definitions: [asPlacementDefinition(second)],
      store: createMemoryPlacementStore(),
      audit,
    });
    check("placement_admin_restricted", false);
  } catch (error) {
    check("placement_admin_restricted", error instanceof CustomFieldPlacementError && error.code === "FORBIDDEN");
  }

  const saved = await saveDealWorkspaceCustomField({
    actor: { userId: "rm-1", role: "USER" },
    dealId: "deal-1",
    fieldLineageId: "deal.declineReason",
    value: "lender_declined",
    resolveOrganizationId,
    dealInOrganization,
    placements,
    definitions: [asPlacementDefinition(definition)],
    values,
    audit,
    now: "2026-09-28T10:00:00.000Z",
  });
  const loaded = await loadDealWorkspaceCustomFields({
    actor: { userId: "rm-1", role: "USER" },
    dealId: "deal-1",
    mode: "edit",
    resolveOrganizationId,
    dealInOrganization,
    placements,
    definitionsForLineage,
    values,
  });
  check("simulation_stores_option_key", saved.value === "lender_declined" && loaded[0]?.value === "lender_declined");
  check("simulation_reopen_shows_label", loaded[0]?.displayLabel === "Lender declined");
  check("existing_stored_value_loads", loaded[0]?.value === values.rows[0]?.valueJson);

  const updated = await saveDealWorkspaceCustomField({
    actor: { userId: "rm-1", role: "USER" },
    dealId: "deal-1",
    fieldLineageId: "deal.declineReason",
    value: "customer_withdrew",
    resolveOrganizationId,
    dealInOrganization,
    placements,
    definitions: [asPlacementDefinition(definition)],
    values,
    audit,
    now: "2026-09-28T11:00:00.000Z",
  });
  const reloaded = await loadDealWorkspaceCustomFields({
    actor: { userId: "rm-1", role: "USER" },
    dealId: "deal-1",
    mode: "edit",
    resolveOrganizationId,
    dealInOrganization,
    placements,
    definitionsForLineage,
    values,
  });
  check("update_persists", updated.value === "customer_withdrew" && reloaded[0]?.displayLabel === "Customer withdrew" && values.rows.length === 1);

  const retiredDefinition = {
    ...definition,
    selectOptionKeysJson: declineOptions.map((option) => ({
      ...option,
      sortOrder: 1,
      retired: option.key === "customer_withdrew",
    })),
  };
  const historical = projectDealWorkspaceCustomFields({
    mode: "edit",
    placements: placements.rows,
    definitions: [retiredDefinition],
    values: values.rows,
  });
  check(
    "historical_retired_key_remains_displayable",
    historical[0]?.value === "customer_withdrew" &&
      historical[0]?.displayLabel === "Customer withdrew" &&
      historical[0]?.options.some((option) => option.key === "customer_withdrew" && option.selectable === false),
  );
  check("retired_option_not_newly_selectable", historical[0]?.options.every((option) => option.selectable || option.key === "customer_withdrew"));
  try {
    await saveDealWorkspaceCustomField({
      actor: { userId: "rm-1", role: "USER" },
      dealId: "deal-1",
      fieldLineageId: "deal.declineReason",
      value: "other",
      resolveOrganizationId,
      dealInOrganization,
      placements,
      definitions: [asPlacementDefinition({ ...retiredDefinition, selectOptionKeysJson: retiredDefinition.selectOptionKeysJson.map((option) => option.key === "other" ? { ...option, retired: true } : option) })],
      values,
      audit,
    });
    check("retired_new_option_rejected", false);
  } catch (error) {
    check("retired_new_option_rejected", error instanceof CustomFieldValueError && error.code === "OPTION_RETIRED" && values.rows[0]?.valueJson === "customer_withdrew");
  }

  placements.rows[0] = { ...active, requiredOnPlacement: true, active: true };
  try {
    await saveDealWorkspaceCustomField({
      actor: { userId: "rm-1", role: "USER" },
      dealId: "deal-1",
      fieldLineageId: "deal.declineReason",
      value: "",
      resolveOrganizationId,
      dealInOrganization,
      placements,
      definitions: [asPlacementDefinition(definition)],
      values,
      audit,
    });
    check("required_on_placement_respected", false);
  } catch (error) {
    check("required_on_placement_respected", error instanceof CustomFieldValueError && error.code === "REQUIRED_FIELD" && values.rows.length === 1);
  }
  placements.rows[0] = { ...placements.rows[0]!, requiredOnPlacement: false };
  const cleared = await saveDealWorkspaceCustomField({
    actor: { userId: "rm-1", role: "USER" },
    dealId: "deal-1",
    fieldLineageId: "deal.declineReason",
    value: "",
    resolveOrganizationId,
    dealInOrganization,
    placements,
    definitions: [asPlacementDefinition(definition)],
    values,
    audit,
  });
  check("clear_removes_value", cleared.value === null && values.rows.length === 0 && isEmptyCustomFieldValue("") && !isEmptyCustomFieldValue(false) && !isEmptyCustomFieldValue(0));

  await saveDealWorkspaceCustomField({
    actor: { userId: "rm-1", role: "USER" },
    dealId: "deal-1",
    fieldLineageId: "deal.declineReason",
    value: "customer_withdrew",
    resolveOrganizationId,
    dealInOrganization,
    placements,
    definitions: [asPlacementDefinition(definition)],
    values,
    audit,
    now: "2026-09-28T12:00:00.000Z",
  });
  const currentPlacement = placements.rows[0]!;
  await setCustomFieldPlacementActive({
    placementId: currentPlacement.id,
    body: { active: false, expectedUpdatedAt: currentPlacement.updatedAt },
    actor: { role: "ADMIN", userId: "admin-1" },
    definitions: [asPlacementDefinition(definition)],
    store: placements,
    audit,
    now: "2026-09-28T13:00:00.000Z",
  });
  const afterDeactivate = await loadDealWorkspaceCustomFields({
    actor: { userId: "rm-1", role: "USER" },
    dealId: "deal-1",
    mode: "edit",
    resolveOrganizationId,
    dealInOrganization,
    placements,
    definitionsForLineage,
    values,
  });
  const historicalRows = await inspectDealCustomFieldValue({
    actor: { userId: "rm-1", role: "USER" },
    dealId: "deal-1",
    resolveOrganizationId,
    dealInOrganization,
    values,
  });
  check("simulation_deactivated_field_absent", afterDeactivate.length === 0);
  check("deactivation_does_not_delete_stored_value", historicalRows.length === 1 && historicalRows[0]?.valueJson === "customer_withdrew" && definition.classification === "custom_field");
  check("customer_facing_activation_remains_false", visible.every((field) => field.customerFacingActivation === false && field.controlsRuntime === false));

  values.rows.push({
    ...values.rows[0]!,
    id: "foreign",
    organizationId: "org-b",
    entityId: "deal-1",
    valueJson: "other",
  });
  const isolated = await loadDealWorkspaceCustomFields({
    actor: { userId: "admin-1", role: "ADMIN" },
    dealId: "deal-1",
    mode: "edit",
    resolveOrganizationId,
    dealInOrganization,
    placements: createMemoryPlacementStore([placements.rows[0]!].map((placement) => ({ ...placement, active: true }))),
    definitionsForLineage,
    values,
  });
  check("organization_isolation_preserved", isolated[0]?.value === "customer_withdrew");
  try {
    await loadDealWorkspaceCustomFields({
      actor: { userId: "admin-1", role: "ADMIN" },
      dealId: "deal-9",
      mode: "edit",
      resolveOrganizationId,
      dealInOrganization,
      placements,
      definitionsForLineage,
      values,
    });
    check("deal_membership_validation_preserved", false);
  } catch (error) {
    check("deal_membership_validation_preserved", error instanceof CustomFieldValueError && error.code === "ENTITY_NOT_IN_ORGANIZATION");
  }
  check("server_audit_events_recorded", audits.includes("placement_activated") && audits.includes("placement_deactivated") && audits.includes("value_created") && audits.includes("value_updated") && audits.includes("value_cleared"));

  const failed = checks.filter(([, passed]) => !passed);
  console.log(`FIELD_CONTROL_DEAL_WORKSPACE_V21_PROOF PASS checks=${checks.length} failed=${failed.length}`);
  console.log("FIELD_CONTROL_DEAL_WORKSPACE_V21_ACCEPTANCE_SIMULATION PASS");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
