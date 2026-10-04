/**
 * Pre-production blocker proofs for operational custom fields.
 * In-memory. No database.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createMemoryPlacementStore, CustomFieldPlacementError, type PlacementRow } from "./custom-field-placement";
import { createMemoryCustomFieldValueStore, CustomFieldValueError, writeCustomFieldValue } from "./custom-field-value";
import { projectDealWorkspaceCustomFields } from "./deal-workspace-custom-fields";
import {
  applyOperationalCustomValuePlan,
  prepareOperationalCustomValueWrites,
  projectOperationalCustomFields,
  resolveCompanyCreateCustomValueAction,
  type OperationalCustomFieldDefinition,
  type OperationalCustomFieldSubmission,
} from "./operational-custom-fields";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const checks: Array<[string, boolean]> = [];

function check(name: string, passed: boolean) {
  checks.push([name, passed]);
  if (!passed) console.error(`FAIL ${name}`);
}

function placement(
  overrides: Partial<PlacementRow> & Pick<PlacementRow, "fieldLineageId" | "owningDomain" | "screenId">,
): PlacementRow {
  return {
    id: overrides.id ?? `placement:${overrides.fieldLineageId}`,
    fieldId: overrides.fieldId ?? overrides.fieldLineageId,
    sectionId: "custom_fields",
    showOnCreate: true,
    showOnEdit: true,
    showOnView: true,
    requiredOnPlacement: false,
    displayOrder: 1,
    active: true,
    createdAt: "2026-09-29T00:00:00.000Z",
    updatedAt: "2026-09-29T00:00:00.000Z",
    createdByUserId: "maker",
    updatedByUserId: "maker",
    ...overrides,
  };
}

function definition(
  overrides: Partial<OperationalCustomFieldDefinition> &
    Pick<OperationalCustomFieldDefinition, "lineageId" | "owningDomain">,
): OperationalCustomFieldDefinition {
  return {
    id: overrides.id ?? `def:${overrides.lineageId}`,
    fieldId: overrides.fieldId ?? overrides.lineageId,
    versionNumber: 1,
    classification: "custom_field",
    lifecycleStatus: "approved",
    fieldType: "text",
    controlsRuntime: false,
    customerFacingActivation: false,
    selectOptionKeysJson: [],
    currencyUnitsJson: [],
    friendlyLabel: overrides.friendlyLabel ?? overrides.lineageId,
    applicabilityDeclared: false,
    productApplicabilityJson: [],
    ...overrides,
  };
}

const selectOptions = [
  { key: "open", label: "Open", retired: false },
  { key: "hold", label: "Hold", retired: false },
  { key: "legacy", label: "Legacy", retired: true },
];

function codeOf(error: unknown): string {
  if (error instanceof CustomFieldValueError || error instanceof CustomFieldPlacementError) return error.code;
  return "";
}

function opportunitySave(input: {
  submissions: OperationalCustomFieldSubmission[];
  placements: PlacementRow[];
  definitions: OperationalCustomFieldDefinition[];
  productCode?: string | null;
  required?: boolean;
}): { synced: boolean; code: string } {
  let synced = false;
  try {
    prepareOperationalCustomValueWrites({
      domain: "opportunity",
      mode: "create",
      productCode: input.productCode ?? null,
      placements: input.placements,
      definitions: input.definitions,
      submissions: input.submissions,
    });
    synced = true;
  } catch (error) {
    return { synced, code: codeOf(error) };
  }
  return { synced, code: "" };
}

async function main(): Promise<void> {
  const notePlacement = placement({
    fieldLineageId: "opportunity.channelNote",
    owningDomain: "opportunity",
    screenId: "opportunity_workspace",
    requiredOnPlacement: true,
  });
  const noteDefinition = definition({
    lineageId: "opportunity.channelNote",
    owningDomain: "opportunity",
    friendlyLabel: "Channel note",
  });
  const missing = opportunitySave({
    placements: [notePlacement],
    definitions: [noteDefinition],
    submissions: [{ fieldLineageId: "opportunity.channelNote", value: "" }],
  });
  check("missing_required_fails_before_identity_sync", missing.code === "REQUIRED_FIELD" && missing.synced === false);

  const selectPlacement = placement({
    fieldLineageId: "opportunity.statusNote",
    owningDomain: "opportunity",
    screenId: "opportunity_workspace",
  });
  const selectDefinition = definition({
    lineageId: "opportunity.statusNote",
    owningDomain: "opportunity",
    fieldType: "single_select",
    selectOptionKeysJson: selectOptions,
  });
  const unknown = opportunitySave({
    placements: [selectPlacement],
    definitions: [selectDefinition],
    submissions: [{ fieldLineageId: "opportunity.statusNote", value: "missing" }],
  });
  check("invalid_single_select_fails_before_identity_sync", unknown.code === "OPTION_UNKNOWN" && unknown.synced === false);

  const multiPlacement = placement({
    fieldLineageId: "opportunity.flags",
    owningDomain: "opportunity",
    screenId: "opportunity_workspace",
  });
  const multiDefinition = definition({
    lineageId: "opportunity.flags",
    owningDomain: "opportunity",
    fieldType: "multi_select",
    selectOptionKeysJson: selectOptions,
  });
  const badMulti = opportunitySave({
    placements: [multiPlacement],
    definitions: [multiDefinition],
    submissions: [{ fieldLineageId: "opportunity.flags", value: ["open", "not-a-key"] }],
  });
  check("invalid_multi_select_fails_before_identity_sync", badMulti.code === "OPTION_UNKNOWN" && badMulti.synced === false);

  const retired = opportunitySave({
    placements: [selectPlacement],
    definitions: [selectDefinition],
    submissions: [{ fieldLineageId: "opportunity.statusNote", value: "legacy" }],
  });
  check("retired_new_option_fails_before_identity_sync", retired.code === "OPTION_RETIRED" && retired.synced === false);

  const productDefinition = definition({
    lineageId: "opportunity.channelNote",
    owningDomain: "opportunity",
    applicabilityDeclared: true,
    productApplicabilityJson: ["HL"],
  });
  const excluded = opportunitySave({
    placements: [notePlacement],
    definitions: [productDefinition],
    productCode: "LAP",
    submissions: [{ fieldLineageId: "opportunity.channelNote", value: "Branch" }],
  });
  check("excluded_product_fails_before_identity_sync", excluded.code === "PRODUCT_NOT_APPLICABLE" && excluded.synced === false);

  const canonical = opportunitySave({
    placements: [
      placement({
        fieldLineageId: "opportunity.productCode",
        owningDomain: "opportunity",
        screenId: "opportunity_workspace",
      }),
    ],
    definitions: [
      definition({ lineageId: "opportunity.productCode", owningDomain: "opportunity" }),
    ],
    submissions: [{ fieldLineageId: "opportunity.productCode", value: "HL" }],
  });
  check("canonical_write_fails_before_identity_sync", canonical.code === "CANONICAL_FIELD_PROTECTED" && canonical.synced === false);

  const derived = opportunitySave({
    placements: [selectPlacement],
    definitions: [{ ...selectDefinition, classification: "derived" }],
    submissions: [{ fieldLineageId: "opportunity.statusNote", value: "open" }],
  });
  check("derived_write_fails_before_identity_sync", derived.code === "CLASSIFICATION_NOT_CUSTOM" && derived.synced === false);

  const badType = opportunitySave({
    placements: [
      placement({
        fieldLineageId: "opportunity.score",
        owningDomain: "opportunity",
        screenId: "opportunity_workspace",
      }),
    ],
    definitions: [
      definition({
        lineageId: "opportunity.score",
        owningDomain: "opportunity",
        fieldType: "number",
      }),
    ],
    submissions: [{ fieldLineageId: "opportunity.score", value: "twelve" }],
  });
  check("invalid_field_type_fails_before_identity_sync", badType.code === "VALUE_INVALID" && badType.synced === false);

  let validSynced = false;
  const validPlan = prepareOperationalCustomValueWrites({
    domain: "opportunity",
    mode: "create",
    placements: [placement({ fieldLineageId: "opportunity.channelNote", owningDomain: "opportunity", screenId: "opportunity_workspace" })],
    definitions: [definition({ lineageId: "opportunity.channelNote", owningDomain: "opportunity" })],
    submissions: [{ fieldLineageId: "opportunity.channelNote", value: "Branch desk" }],
  });
  validSynced = true;
  const validValues = createMemoryCustomFieldValueStore();
  await applyOperationalCustomValuePlan({
    plan: validPlan,
    actor: { userId: "rm-1" },
    entityId: "opp-1",
    resolveOrganizationId: async () => "org-a",
    entityInOrganization: async () => true,
    placements: createMemoryPlacementStore([
      placement({ fieldLineageId: "opportunity.channelNote", owningDomain: "opportunity", screenId: "opportunity_workspace" }),
    ]),
    definitions: [definition({ lineageId: "opportunity.channelNote", owningDomain: "opportunity" })],
    values: validValues,
    audit: () => undefined,
    now: "2026-09-29T05:00:00.000Z",
  });
  check(
    "valid_opportunity_custom_value_still_saves",
    validSynced && validPlan.writes.length === 1 && validValues.rows[0]?.valueJson === "Branch desk",
  );

  const opportunityService = readFileSync(
    path.join(repoRoot, "server/services/enterprise-opportunity/index.ts"),
    "utf8",
  );
  const updateStart = opportunityService.indexOf("async updateOpportunity");
  const updateEnd = opportunityService.indexOf("\n  async ", updateStart + 20);
  const updateBody = opportunityService.slice(updateStart, updateEnd === -1 ? undefined : updateEnd);
  const syncAt = updateBody.indexOf("await syncContactIdentityPatchToEcm");
  const rowAt = updateBody.indexOf("enterpriseOpportunityRepository.updateOpportunity");
  const afterAt = updateBody.indexOf("options?.afterRowUpdate");
  const lifecycleAt = updateBody.indexOf("emitOpportunityLifecycleToEarBestEffort", rowAt);
  check(
    "valid_city_state_propagation_still_wired",
    syncAt >= 0 &&
      syncAt < rowAt &&
      updateBody.includes("cityLabel") &&
      readFileSync(path.join(repoRoot, "server/services/ecm/contact-ssot-propagate.ts"), "utf8").includes("patch.city"),
  );
  check(
    "opportunity_lifecycle_unchanged",
    rowAt < afterAt && afterAt < lifecycleAt && lifecycleAt > 0,
  );

  const propagate = readFileSync(path.join(repoRoot, "server/services/ecm/contact-ssot-propagate.ts"), "utf8");
  const contactService = readFileSync(path.join(repoRoot, "server/services/ecm/contact.service.ts"), "utf8");
  check(
    "deal_contact_identity_propagation_preserved",
    propagate.includes("prisma.enterpriseOpportunity.updateMany") &&
      propagate.includes("prisma.enterpriseDeal.updateMany") &&
      contactService.includes("propagateContactIdentityToTransactions") &&
      updateBody.includes("syncContactIdentityPatchToEcm"),
  );

  const commitSource = readFileSync(
    path.join(repoRoot, "src/lib/field-control-master/operational-custom-field-commit.ts"),
    "utf8",
  );
  const opportunityCommit = commitSource.slice(
    commitSource.indexOf("export async function commitOpportunityWithCustomFields"),
    commitSource.indexOf("export async function saveOperationalCustomField"),
  );
  const prepareSource = readFileSync(
    path.join(repoRoot, "src/lib/field-control-master/operational-custom-fields.ts"),
    "utf8",
  );
  const prepareBody = prepareSource.slice(
    prepareSource.indexOf("export function prepareOperationalCustomValueWrites"),
    prepareSource.indexOf("export async function applyOperationalCustomValuePlan"),
  );
  check(
    "opportunity_validation_precedes_identity_sync",
    prepareBody.includes("validateCustomFieldValue") &&
      prepareBody.indexOf("validateCustomFieldValue") < prepareBody.lastIndexOf("return {") &&
      opportunityCommit.indexOf("contextFor") < opportunityCommit.indexOf("prisma.$transaction") &&
      opportunityCommit.indexOf("prisma.$transaction") < opportunityCommit.indexOf("updateOpportunity") &&
      !opportunityCommit.includes("syncContactIdentityPatchToEcm") &&
      syncAt < rowAt,
  );

  const companyField = placement({
    fieldLineageId: "company.tradeNote",
    owningDomain: "company",
    screenId: "company_workspace",
  });
  const companyDefinition = definition({
    lineageId: "company.tradeNote",
    owningDomain: "company",
    friendlyLabel: "Trade note",
  });
  const newPlan = prepareOperationalCustomValueWrites({
    domain: "company",
    mode: "create",
    placements: [companyField],
    definitions: [companyDefinition],
    submissions: [{ fieldLineageId: "company.tradeNote", value: "Exports" }],
  });
  const createdCompanies: string[] = [];
  const stored = new Map<string, unknown>();
  const newAction = resolveCompanyCreateCustomValueAction({
    created: true,
    writes: newPlan.writes,
    clears: newPlan.clears,
  });
  if (newAction === "apply") {
    createdCompanies.push("company-new");
    stored.set("company-new:company.tradeNote", newPlan.writes[0]?.value);
  }
  check(
    "new_company_custom_values_apply_together",
    newAction === "apply" && createdCompanies.length === 1 && stored.get("company-new:company.tradeNote") === "Exports",
  );

  let requiredCreated = false;
  let requiredCode = "";
  try {
    prepareOperationalCustomValueWrites({
      domain: "company",
      mode: "create",
      placements: [{ ...companyField, requiredOnPlacement: true }],
      definitions: [companyDefinition],
      submissions: [{ fieldLineageId: "company.tradeNote", value: "" }],
    });
    requiredCreated = true;
  } catch (error) {
    requiredCode = codeOf(error);
  }
  check("invalid_required_company_creates_nothing", requiredCode === "REQUIRED_FIELD" && requiredCreated === false);

  const existingValue = "Keep me";
  const overwrite = resolveCompanyCreateCustomValueAction({
    created: false,
    writes: [{ fieldLineageId: "company.tradeNote", value: "Changed" }],
    clears: [],
  });
  const blank = resolveCompanyCreateCustomValueAction({
    created: false,
    writes: [],
    clears: ["company.tradeNote"],
  });
  check("existing_company_not_mutated_by_create_values", overwrite === "reject" && existingValue === "Keep me");
  check("existing_company_not_cleared_by_blank_create", blank === "reject" && existingValue === "Keep me");
  check(
    "existing_name_does_not_create_duplicate",
    overwrite === "reject" && createdCompanies.filter((id) => id === "company-existing").length === 0,
  );

  const editPlan = prepareOperationalCustomValueWrites({
    domain: "company",
    mode: "edit",
    placements: [companyField],
    definitions: [companyDefinition],
    submissions: [{ fieldLineageId: "company.tradeNote", value: "Updated on purpose" }],
    existingValues: [
      {
        id: "value-existing",
        organizationId: "org-a",
        fieldLineageId: "company.tradeNote",
        fieldId: "company.tradeNote",
        definitionVersionIdCapturedUnder: companyDefinition.id,
        entityDomain: "company",
        entityId: "company-existing",
        valueJson: existingValue,
        createdAt: "2026-09-29T00:00:00.000Z",
        updatedAt: "2026-09-29T00:00:00.000Z",
        createdByUserId: "rm-1",
        updatedByUserId: "rm-1",
      },
    ],
  });
  const editValues = createMemoryCustomFieldValueStore([
    {
      id: "value-existing",
      organizationId: "org-a",
      fieldLineageId: "company.tradeNote",
      fieldId: "company.tradeNote",
      definitionVersionIdCapturedUnder: companyDefinition.id,
      entityDomain: "company",
      entityId: "company-existing",
      valueJson: existingValue,
      createdAt: "2026-09-29T00:00:00.000Z",
      updatedAt: "2026-09-29T00:00:00.000Z",
      createdByUserId: "rm-1",
      updatedByUserId: "rm-1",
    },
  ]);
  await applyOperationalCustomValuePlan({
    plan: editPlan,
    actor: { userId: "rm-1" },
    entityId: "company-existing",
    resolveOrganizationId: async () => "org-a",
    entityInOrganization: async () => true,
    placements: createMemoryPlacementStore([companyField]),
    definitions: [companyDefinition],
    values: editValues,
    audit: () => undefined,
    now: "2026-09-29T06:00:00.000Z",
  });
  check("company_workspace_edit_still_updates_custom_values", editValues.rows[0]?.valueJson === "Updated on purpose");

  let crossOrg = "";
  try {
    await writeCustomFieldValue({
      actor: { userId: "rm-1" },
      body: {
        fieldLineageId: "company.tradeNote",
        screenId: "company_workspace",
        sectionId: "custom_fields",
        entityDomain: "company",
        entityId: "company-other-org",
        value: "Nope",
      },
      definitions: [companyDefinition],
      resolveOrganizationId: async () => "org-a",
      entityInOrganization: async () => false,
      operation: "edit",
      placements: createMemoryPlacementStore([companyField]),
      store: createMemoryCustomFieldValueStore(),
      audit: () => undefined,
    });
  } catch (error) {
    crossOrg = codeOf(error);
  }
  const companyRepository = readFileSync(
    path.join(repoRoot, "server/repositories/ecm/company.repository.ts"),
    "utf8",
  );
  check(
    "cross_organization_company_protection_remains",
    crossOrg === "ENTITY_NOT_IN_ORGANIZATION" &&
      companyRepository.includes("organization_id = ${organizationId}"),
  );

  const contactView = projectOperationalCustomFields({
    domain: "contact",
    mode: "create",
    placements: [placement({ fieldLineageId: "contact.note", owningDomain: "contact", screenId: "contact_workspace" })],
    definitions: [definition({ lineageId: "contact.note", owningDomain: "contact", friendlyLabel: "Contact note" })],
    values: [],
  });
  const contactCommit = commitSource.slice(
    commitSource.indexOf("export async function commitContactWithCustomFields"),
    commitSource.indexOf("export async function commitCompanyWithCustomFields"),
  );
  check(
    "contact_fcm_create_still_wired",
    contactView.length === 1 &&
      contactCommit.indexOf("contextFor") < contactCommit.indexOf("prisma.$transaction") &&
      contactCommit.includes("ecmContactService.register"),
  );

  const opportunityView = projectOperationalCustomFields({
    domain: "opportunity",
    mode: "create",
    placements: [placement({ fieldLineageId: "opportunity.channelNote", owningDomain: "opportunity", screenId: "opportunity_workspace" })],
    definitions: [definition({ lineageId: "opportunity.channelNote", owningDomain: "opportunity", friendlyLabel: "Channel note" })],
    values: [],
  });
  check("opportunity_fcm_rendering_still_works", opportunityView[0]?.friendlyLabel === "Channel note");

  const companyView = projectOperationalCustomFields({
    domain: "company",
    mode: "create",
    placements: [companyField],
    definitions: [companyDefinition],
    values: [],
  });
  check("company_fcm_rendering_still_works", companyView[0]?.friendlyLabel === "Trade note");

  const dealVisible = projectDealWorkspaceCustomFields({
    mode: "edit",
    placements: [
      placement({
        fieldLineageId: "deal.declineReason",
        owningDomain: "deal",
        screenId: "deal_workspace",
        showOnCreate: false,
      }),
    ],
    definitions: [definition({ lineageId: "deal.declineReason", owningDomain: "deal", friendlyLabel: "Decline reason" })],
    values: [],
  });
  check("deal_fcm_renderer_still_lists_decline_reason", dealVisible[0]?.friendlyLabel === "Decline reason");

  const companyCommit = commitSource.slice(
    commitSource.indexOf("export async function commitCompanyWithCustomFields"),
    commitSource.indexOf("export async function commitOpportunityWithCustomFields"),
  );
  const companyService = readFileSync(path.join(repoRoot, "server/services/ecm/company.service.ts"), "utf8");
  check(
    "company_create_rejects_existing_before_custom_write",
    companyCommit.indexOf("contextFor") < companyCommit.indexOf("registerOutcome") &&
      companyCommit.indexOf("resolveCompanyCreateCustomValueAction") < companyCommit.indexOf("applyPlan") &&
      companyCommit.includes('action === "apply"') &&
      companyCommit.includes("COMPANY_ALREADY_EXISTS") &&
      companyService.includes("created: false") &&
      companyService.includes("if (existing) return { company: existing, created: false"),
  );

  const changed = spawnSync("git", ["diff", "--name-only", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).stdout;
  check(
    "fcm_lifecycle_unchanged",
    !changed.includes("src/lib/field-control-master/production-governance-lifecycle.ts"),
  );
  check(
    "product_programme_unchanged",
    !changed.includes("src/lib/product-programme") && !changed.includes("server/services/product-programme-operations/"),
  );
  check("recommendation_unchanged", !changed.includes("server/services/lender-recommendation/"));
  check(
    "compass_unchanged",
    !changed.includes("compass/") && !changed.includes("server/services/compass-customer-gateway/"),
  );
  check("chanakya_unchanged", !changed.includes("src/lib/chanakya"));
  check("sarathi_unchanged", !changed.includes("src/constants/enterprise-ai-platform/"));
  const dealService = readFileSync(
    path.join(repoRoot, "server/services/enterprise-deal/enterprise-deal.service.ts"),
    "utf8",
  );
  const dealSync = dealService.slice(
    dealService.indexOf("await syncContactIdentityPatchToEcm"),
    dealService.indexOf("await syncContactIdentityPatchToEcm") + 450,
  );
  const contactRoute = readFileSync(
    path.join(repoRoot, "src/app/api/ecm/contacts/[contactId]/route.ts"),
    "utf8",
  );
  const contactUpdateStart = contactRoute.indexOf("ecmContactService.update");
  const contactUpdate = contactRoute.slice(
    contactUpdateStart,
    contactRoute.indexOf("syncEcmPortsFromPrisma", contactUpdateStart),
  );
  check(
    "deal_and_contact_defaults_unchanged",
    !changed.includes("server/services/enterprise-deal/enterprise-deal.service.ts") &&
      !changed.includes("src/app/api/ecm/contacts/") &&
      dealSync.includes("actorUserId: input.actorUserId") &&
      !dealSync.includes("db:") &&
      contactUpdate.includes("tokenActor.userId") &&
      !contactUpdate.includes("db:"),
  );

  const failed = checks.filter(([, passed]) => !passed);
  console.log(`FCM_OPERATIONAL_FORM_SAFETY_BLOCKER_PROOF checks=${checks.length} failed=${failed.length}`);
  if (failed.length > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
