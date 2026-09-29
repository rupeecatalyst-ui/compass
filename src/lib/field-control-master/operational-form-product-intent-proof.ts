/**
 * FCM operational form product-intent proofs.
 * In-memory. No database.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { CustomFieldValueError, type CustomFieldValueRow } from "./custom-field-value";
import type { PlacementRow } from "./custom-field-placement";
import {
  prepareOperationalCustomValueWrites,
  projectOperationalCustomFields,
  type OperationalCustomFieldDefinition,
} from "./operational-custom-fields";
import {
  planApplicabilityVersion,
  planEmploymentApplicabilityVersion,
  parseEmploymentApplicabilityVersionRequest,
} from "./production-governance-applicability";
import type { CertifiedFieldControlRecord } from "./production-governance-read";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const checks: Array<[string, boolean]> = [];
function check(name: string, passed: boolean) {
  checks.push([name, passed]);
  if (!passed) console.error(`FAIL ${name}`);
}

function placement(overrides: Partial<PlacementRow> = {}): PlacementRow {
  return {
    id: "placement:salary",
    fieldLineageId: "opportunity.salarySpecificQuestion",
    fieldId: "opportunity.salarySpecificQuestion",
    owningDomain: "opportunity",
    screenId: "opportunity_workspace",
    sectionId: "custom_fields",
    showOnCreate: true,
    showOnEdit: true,
    showOnView: true,
    requiredOnPlacement: false,
    displayOrder: 4,
    active: true,
    createdAt: "2026-09-29T00:00:00.000Z",
    updatedAt: "2026-09-29T00:00:00.000Z",
    createdByUserId: "maker",
    updatedByUserId: "maker",
    ...overrides,
  };
}

function definition(
  overrides: Partial<OperationalCustomFieldDefinition> = {},
): OperationalCustomFieldDefinition {
  return {
    id: "def:salary",
    fieldId: "opportunity.salarySpecificQuestion",
    lineageId: "opportunity.salarySpecificQuestion",
    versionNumber: 1,
    classification: "custom_field",
    owningDomain: "opportunity",
    lifecycleStatus: "approved",
    fieldType: "text",
    controlsRuntime: false,
    customerFacingActivation: false,
    selectOptionKeysJson: [],
    currencyUnitsJson: [],
    friendlyLabel: "Salary specific question",
    applicabilityDeclared: true,
    productApplicabilityJson: ["HOME_LOAN"],
    employmentApplicabilityDeclared: false,
    employmentTypeApplicabilityJson: [],
    ...overrides,
  };
}

function storedValue(value: unknown): CustomFieldValueRow {
  return {
    id: "value:salary",
    organizationId: "org",
    fieldLineageId: "opportunity.salarySpecificQuestion",
    fieldId: "opportunity.salarySpecificQuestion",
    definitionVersionIdCapturedUnder: "def:salary",
    entityDomain: "opportunity",
    entityId: "opp-1",
    valueJson: value,
    createdAt: "2026-09-29T00:00:00.000Z",
    updatedAt: "2026-09-29T00:00:00.000Z",
    createdByUserId: "maker",
    updatedByUserId: "maker",
  };
}

function sourceRecord(overrides: Partial<CertifiedFieldControlRecord> = {}): CertifiedFieldControlRecord {
  return {
    id: "fcm:opportunity.salarySpecificQuestion:v1",
    fieldId: "opportunity.salarySpecificQuestion",
    lineageId: "opportunity.salarySpecificQuestion",
    versionNumber: 1,
    previousVersionId: null,
    friendlyLabel: "Salary specific question",
    description: "A salary question.",
    helpText: "Form only.",
    fieldType: "text",
    classification: "custom_field",
    owningDomain: "opportunity",
    ownershipReview: "owner_requires_product_decision",
    sourceBindingJson: { kind: "custom_value_storage", fieldId: "opportunity.salarySpecificQuestion" },
    aliasesJson: [],
    lifecycleStatus: "approved",
    productApplicabilityJson: ["HOME_LOAN"],
    customerCategoryApplicabilityJson: ["salaried-category"],
    applicabilityDeclared: true,
    employmentTypeApplicabilityJson: [],
    employmentApplicabilityDeclared: false,
    authorisedConsumersJson: [],
    validationSummary: "Text.",
    presentationSummary: "Text.",
    selectOptionSource: null,
    selectOptionKeysJson: [],
    currencyUnitsJson: [],
    candidateMirrorOf: null,
    controlsRuntime: false,
    customerFacingActivation: false,
    makerUserId: "maker",
    checkerUserId: "checker",
    effectiveFrom: null,
    effectiveUntil: null,
    createdAt: new Date("2026-09-29T00:00:00.000Z"),
    updatedAt: new Date("2026-09-29T00:00:00.000Z"),
    ...overrides,
  };
}

function visible(employmentTypeCode: string | null, productCode = "HOME_LOAN", extra?: Partial<OperationalCustomFieldDefinition>) {
  return projectOperationalCustomFields({
    domain: "opportunity",
    mode: "create",
    productCode,
    employmentTypeCode,
    placements: [placement()],
    definitions: [definition(extra)],
    values: [],
  });
}

function main(): void {
  check(
    "undeclared_employment_preserves_visibility",
    visible("self-employed-business").length === 1 && visible(null).length === 1 && visible("SALARIED").length === 1,
  );

  const declared = {
    employmentApplicabilityDeclared: true,
    employmentTypeApplicabilityJson: ["salaried"],
  };
  check("declared_salaried_visible", visible("salaried", "HOME_LOAN", declared).length === 1);
  check("declared_self_employed_hidden", visible("self-employed-business", "HOME_LOAN", declared).length === 0);
  check("declared_self_employed_professional_hidden", visible("self-employed-professional", "HOME_LOAN", declared).length === 0);
  check("unknown_employment_code_hidden", visible("SALARIED", "HOME_LOAN", declared).length === 0);
  check("missing_employment_code_hidden_when_declared", visible(null, "HOME_LOAN", declared).length === 0);
  check(
    "product_and_employment_intersection",
    visible("salaried", "HOME_LOAN", declared).length === 1 &&
      visible("salaried", "PERSONAL_LOAN", declared).length === 0 &&
      visible("self-employed-business", "HOME_LOAN", declared).length === 0,
  );

  const beforeProductChange = visible("salaried", "HOME_LOAN", declared);
  const afterProductChange = visible("salaried", "PERSONAL_LOAN", declared);
  const restoredProduct = visible("salaried", "HOME_LOAN", declared);
  check(
    "product_change_removes_and_restores_field",
    beforeProductChange.length === 1 && afterProductChange.length === 0 && restoredProduct.length === 1,
  );
  const beforeEmploymentChange = visible("salaried", "HOME_LOAN", declared);
  const afterEmploymentChange = visible("self-employed-business", "HOME_LOAN", declared);
  const restoredEmployment = visible("salaried", "HOME_LOAN", declared);
  check(
    "employment_change_removes_and_restores_field",
    beforeEmploymentChange.length === 1 && afterEmploymentChange.length === 0 && restoredEmployment.length === 1,
  );

  const requiredPlacement = placement({ requiredOnPlacement: true });
  let hiddenRequired = "threw";
  try {
    const hiddenPlan = prepareOperationalCustomValueWrites({
      domain: "opportunity",
      mode: "create",
      productCode: "HOME_LOAN",
      employmentTypeCode: "self-employed-business",
      placements: [requiredPlacement],
      definitions: [definition(declared)],
      submissions: [],
      existingValues: [storedValue("historical")],
    });
    hiddenRequired = hiddenPlan.clears.length === 0 && hiddenPlan.writes.length === 0 ? "allowed" : "cleared";
  } catch {
    hiddenRequired = "blocked";
  }
  check("hidden_required_field_does_not_block_save", hiddenRequired === "allowed");

  let visibleRequired = "";
  try {
    prepareOperationalCustomValueWrites({
      domain: "opportunity",
      mode: "create",
      productCode: "HOME_LOAN",
      employmentTypeCode: "salaried",
      placements: [requiredPlacement],
      definitions: [definition(declared)],
      submissions: [{ fieldLineageId: "opportunity.salarySpecificQuestion", value: "" }],
      existingValues: [],
    });
    visibleRequired = "allowed";
  } catch (error) {
    visibleRequired = error instanceof CustomFieldValueError ? error.code : "other";
  }
  check("visible_required_field_blocks_empty_save", visibleRequired === "REQUIRED_FIELD");

  const preserved = prepareOperationalCustomValueWrites({
    domain: "opportunity",
    mode: "create",
    productCode: "PERSONAL_LOAN",
    employmentTypeCode: "salaried",
    placements: [placement()],
    definitions: [definition(declared)],
    submissions: [],
    existingValues: [storedValue("historical")],
  });
  check(
    "hidden_field_omission_does_not_clear_value",
    preserved.clears.length === 0 && preserved.writes.length === 0,
  );
  let emptyHiddenSubmit = "";
  try {
    prepareOperationalCustomValueWrites({
      domain: "opportunity",
      mode: "create",
      productCode: "HOME_LOAN",
      employmentTypeCode: "self-employed-business",
      placements: [placement()],
      definitions: [definition(declared)],
      submissions: [{ fieldLineageId: "opportunity.salarySpecificQuestion", value: "" }],
      existingValues: [storedValue("historical")],
    });
  } catch (error) {
    emptyHiddenSubmit = error instanceof CustomFieldValueError ? error.code : "other";
  }
  check("hidden_empty_submission_is_rejected_not_cleared", emptyHiddenSubmit === "EMPLOYMENT_NOT_APPLICABLE");

  const restoredValue = projectOperationalCustomFields({
    domain: "opportunity",
    mode: "create",
    productCode: "HOME_LOAN",
    employmentTypeCode: "salaried",
    placements: [placement()],
    definitions: [definition(declared)],
    values: [storedValue("historical")],
  });
  check("revisible_field_restores_stored_value", restoredValue.length === 1 && restoredValue[0]?.value === "historical");

  const deactivated = projectOperationalCustomFields({
    domain: "opportunity",
    mode: "create",
    productCode: "HOME_LOAN",
    employmentTypeCode: "salaried",
    placements: [placement({ active: false })],
    definitions: [definition(declared)],
    values: [storedValue("historical")],
  });
  check("deactivated_placement_hides_without_deleting_value", deactivated.length === 0 && storedValue("historical").valueJson === "historical");

  const lead = readFileSync(path.join(repoRoot, "src/components/catalyst-one/lead-information/lead-information-workspace.tsx"), "utf8");
  check("lead_information_has_no_custom_fields_island", !lead.includes(">Custom Fields<") && !lead.includes("Custom Fields"));
  check(
    "opportunity_field_renders_in_normal_form",
    lead.includes("OperationalCustomFieldsCollector") &&
      lead.includes("employmentTypeCode={form.employmentTypeCode || null}") &&
      lead.includes("entityId={opportunityId}") &&
      lead.includes("productCode={form.productCode || null}") &&
      lead.includes(">Customer Profile<") &&
      lead.includes("Employment Type") &&
      lead.includes("Required Amount") &&
      lead.includes("Lending Type") &&
      lead.includes("Business Source"),
  );

  const section = readFileSync(
    path.join(repoRoot, "src/components/catalyst-one/field-control-master/operational-custom-fields-section.tsx"),
    "utf8",
  );
  check("shared_operational_renderer_has_no_custom_fields_title", !section.includes(">Custom Fields<") && !section.includes("Custom Fields"));

  const commit = readFileSync(path.join(repoRoot, "src/lib/field-control-master/operational-custom-field-commit.ts"), "utf8");
  const contactFn = commit.slice(
    commit.indexOf("export async function commitContactWithCustomFields"),
    commit.indexOf("export async function commitCompanyWithCustomFields"),
  );
  const companyFn = commit.slice(
    commit.indexOf("export async function commitCompanyWithCustomFields"),
    commit.indexOf("export async function commitOpportunityWithCustomFields"),
  );
  check("contact_save_behavior_unchanged", contactFn.includes("ecmContactService.register") && !contactFn.includes("employmentTypeCode"));
  check(
    "company_existing_entity_guard_unchanged",
    companyFn.includes("COMPANY_ALREADY_EXISTS") && companyFn.includes("resolveCompanyCreateCustomValueAction") && !companyFn.includes("employmentTypeCode"),
  );

  const dealSection = readFileSync(
    path.join(repoRoot, "src/components/catalyst-one/deal-workspace/deal-custom-fields-section.tsx"),
    "utf8",
  );
  check(
    "deal_custom_field_save_reopen_unchanged",
    dealSection.includes("/api/internal/deals/") &&
      dealSection.includes("CustomFieldInput") &&
      !dealSection.includes("employmentTypeCode") &&
      !dealSection.includes(">Custom Fields<"),
  );

  const changed = spawnSync("git", ["diff", "--name-only", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).stdout;
  check("product_programme_unchanged", !changed.includes("src/lib/product-programme") && !changed.includes("server/services/product-programme-operations/"));
  check("recommendation_engine_unchanged", !changed.includes("server/services/lender-recommendation/") && !changed.includes("src/lib/product-recommendation/"));
  check("compass_unchanged", !changed.includes("compass/") && !changed.includes("server/services/compass-customer-gateway/"));
  check("chanakya_unchanged", !changed.includes("src/lib/chanakya"));
  check("sarathi_unchanged", !changed.includes("src/constants/enterprise-ai-platform/"));

  const migration = readFileSync(
    path.join(repoRoot, "prisma/migrations/20260929180000_field_control_employment_applicability/migration.sql"),
    "utf8",
  );
  const migrationSql = migration
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  check(
    "migration_is_additive",
    migrationSql.includes("ADD COLUMN") &&
      migrationSql.includes("employment_type_applicability_json") &&
      migrationSql.includes("employment_applicability_declared") &&
      !/\bDROP\b/i.test(migrationSql) &&
      !/\bDELETE\b/i.test(migrationSql) &&
      !/\bUPDATE\b/i.test(migrationSql) &&
      !/ALTER COLUMN/i.test(migrationSql) &&
      !migrationSql.includes("customer_category_applicability_json"),
  );
  const foundationDiff = spawnSync(
    "git",
    ["diff", "--numstat", "HEAD", "--", "prisma/migrations/20260926180000_field_control_master_foundation_v1/migration.sql"],
    { cwd: repoRoot, encoding: "utf8" },
  ).stdout.trim();
  const placementDiff = spawnSync(
    "git",
    ["diff", "--numstat", "HEAD", "--", "prisma/migrations/20260928140000_field_control_custom_placement_value/migration.sql"],
    { cwd: repoRoot, encoding: "utf8" },
  ).stdout.trim();
  check("frozen_migrations_unmodified", foundationDiff.length === 0 && placementDiff.length === 0);

  const source = sourceRecord();
  const snapshot = JSON.stringify(source);
  const employmentPlan = planEmploymentApplicabilityVersion({
    actorUserId: "maker-2",
    source,
    versions: [source],
    declared: true,
    employmentTypeCodes: ["salaried"],
    expectedUpdatedAt: source.updatedAt,
  });
  check("employment_proposal_does_not_edit_approved", !("ok" in employmentPlan) && snapshot === JSON.stringify(source));
  check(
    "employment_proposal_is_new_draft",
    !("ok" in employmentPlan) &&
      employmentPlan.data.lifecycleStatus === "draft" &&
      employmentPlan.data.versionNumber === 2 &&
      employmentPlan.data.employmentApplicabilityDeclared === true &&
      employmentPlan.data.customerCategoryApplicabilityJson[0] === "salaried-category" &&
      employmentPlan.data.applicabilityDeclared === true &&
      employmentPlan.data.controlsRuntime === false,
  );
  const contactPlan = planEmploymentApplicabilityVersion({
    actorUserId: "maker-2",
    source: sourceRecord({ owningDomain: "contact", fieldId: "contact.note", lineageId: "contact.note", id: "fcm:contact.note:v1" }),
    versions: [sourceRecord({ owningDomain: "contact", fieldId: "contact.note", lineageId: "contact.note", id: "fcm:contact.note:v1" })],
    declared: true,
    employmentTypeCodes: ["salaried"],
    expectedUpdatedAt: source.updatedAt,
  });
  check("employment_applicability_rejected_outside_opportunity", "ok" in contactPlan && contactPlan.ok === false);

  let unknownCode = "";
  try {
    parseEmploymentApplicabilityVersionRequest({
      declared: true,
      employmentTypeCodes: ["SALARIED"],
      expectedUpdatedAt: source.updatedAt.toISOString(),
    });
  } catch (error) {
    unknownCode = error instanceof Error ? error.message : "";
  }
  check("governance_rejects_invented_employment_code", unknownCode.includes("Unknown employment type code"));

  const productPlan = planApplicabilityVersion({
    actorUserId: "maker-2",
    source: sourceRecord({ employmentApplicabilityDeclared: true, employmentTypeApplicabilityJson: ["salaried"] }),
    versions: [source],
    productCodes: ["HOME_LOAN"],
    expectedUpdatedAt: source.updatedAt,
  });
  check(
    "product_version_preserves_employment_applicability",
    !("ok" in productPlan) &&
      productPlan.data.employmentApplicabilityDeclared === true &&
      productPlan.data.employmentTypeApplicabilityJson[0] === "salaried" &&
      productPlan.data.customerCategoryApplicabilityJson[0] === "salaried-category",
  );

  const failed = checks.filter(([, passed]) => !passed);
  console.log(`FCM_OPERATIONAL_FORM_PRODUCT_INTENT_PROOF checks=${checks.length} failed=${failed.length}`);
  if (failed.length > 0) process.exit(1);
}

main();
