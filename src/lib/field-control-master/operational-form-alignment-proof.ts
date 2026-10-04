/**
 * FCM operational form alignment proofs.
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
  assertCanonicalValueNotShadowed,
  prepareOperationalCustomValueWrites,
  projectOperationalCustomFields,
  runOperationalCommit,
  type OperationalCustomFieldDefinition,
} from "./operational-custom-fields";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const checks: Array<[string, boolean]> = [];
function check(name: string, passed: boolean) {
  checks.push([name, passed]);
  if (!passed) console.error(`FAIL ${name}`);
}

function placement(overrides: Partial<PlacementRow> & Pick<PlacementRow, "fieldLineageId" | "owningDomain" | "screenId">): PlacementRow {
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

function definition(overrides: Partial<OperationalCustomFieldDefinition> & Pick<OperationalCustomFieldDefinition, "lineageId" | "owningDomain">): OperationalCustomFieldDefinition {
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

const options = [
  { key: "open", label: "Open", retired: false },
  { key: "legacy", label: "Legacy", retired: true },
];

async function main(): Promise<void> {
  const oppPlacement = placement({ fieldLineageId: "opportunity.channelNote", owningDomain: "opportunity", screenId: "opportunity_workspace" });
  const oppDefinition = definition({ lineageId: "opportunity.channelNote", owningDomain: "opportunity", friendlyLabel: "Channel note" });
  const createView = projectOperationalCustomFields({
    domain: "opportunity",
    mode: "create",
    placements: [oppPlacement],
    definitions: [oppDefinition],
    values: [],
  });
  check("approved_active_opportunity_show_on_create_renders", createView.length === 1 && createView[0]?.editable === true);

  check(
    "inactive_opportunity_placement_does_not_render",
    projectOperationalCustomFields({
      domain: "opportunity",
      mode: "create",
      placements: [{ ...oppPlacement, active: false }],
      definitions: [oppDefinition],
      values: [],
    }).length === 0,
  );
  check(
    "unapproved_definition_does_not_render",
    projectOperationalCustomFields({
      domain: "opportunity",
      mode: "create",
      placements: [oppPlacement],
      definitions: [{ ...oppDefinition, lifecycleStatus: "draft" }],
      values: [],
    }).length === 0,
  );
  check(
    "wrong_domain_does_not_render",
    projectOperationalCustomFields({
      domain: "opportunity",
      mode: "create",
      placements: [placement({ fieldLineageId: "contact.note", owningDomain: "contact", screenId: "contact_workspace" })],
      definitions: [definition({ lineageId: "contact.note", owningDomain: "contact" })],
      values: [],
    }).length === 0,
  );

  const productDefinition = definition({
    lineageId: "opportunity.schemeNote",
    owningDomain: "opportunity",
    applicabilityDeclared: true,
    productApplicabilityJson: ["HOME_LOAN"],
  });
  const productPlacement = placement({ fieldLineageId: "opportunity.schemeNote", owningDomain: "opportunity", screenId: "opportunity_workspace" });
  check(
    "included_product_renders",
    projectOperationalCustomFields({
      domain: "opportunity",
      mode: "create",
      productCode: "HOME_LOAN",
      placements: [productPlacement],
      definitions: [productDefinition],
      values: [],
    }).length === 1,
  );
  check(
    "excluded_product_does_not_render",
    projectOperationalCustomFields({
      domain: "opportunity",
      mode: "create",
      productCode: "HOME_LOAN_BT",
      placements: [productPlacement],
      definitions: [productDefinition],
      values: [],
    }).length === 0,
  );
  check(
    "undeclared_applicability_still_renders",
    projectOperationalCustomFields({
      domain: "opportunity",
      mode: "create",
      productCode: "HOME_LOAN_BT",
      placements: [oppPlacement],
      definitions: [oppDefinition],
      values: [],
    }).length === 1,
  );

  let excludedWrite = "";
  try {
    prepareOperationalCustomValueWrites({
      domain: "opportunity",
      mode: "create",
      productCode: "HOME_LOAN_BT",
      placements: [productPlacement],
      definitions: [productDefinition],
      submissions: [{ fieldLineageId: "opportunity.schemeNote", value: "no" }],
    });
  } catch (error) {
    excludedWrite = error instanceof CustomFieldValueError ? error.code : "";
  }
  check("excluded_product_direct_write_rejected", excludedWrite === "PRODUCT_NOT_APPLICABLE");

  const requiredPlacement = { ...oppPlacement, requiredOnPlacement: true };
  const journal: string[] = [];
  const rollback = async <T>(work: () => Promise<T>): Promise<T> => {
    const snapshot = journal.slice();
    try {
      return await work();
    } catch (error) {
      journal.splice(0, journal.length, ...snapshot);
      throw error;
    }
  };
  let requiredCode = "";
  try {
    await runOperationalCommit({
      prepare: () => {
        prepareOperationalCustomValueWrites({
          domain: "opportunity",
          mode: "create",
          placements: [requiredPlacement],
          definitions: [oppDefinition],
          submissions: [{ fieldLineageId: "opportunity.channelNote", value: "" }],
        });
      },
      transaction: rollback,
      business: async () => {
        journal.push("opportunity");
        return { id: "opp-1", requestedAmount: 2500000 };
      },
      values: async () => {
        journal.push("value");
      },
    });
  } catch (error) {
    requiredCode = error instanceof CustomFieldValueError ? error.code : "";
  }
  check("required_opportunity_custom_field_blocks_save", requiredCode === "REQUIRED_FIELD" && journal.length === 0);

  journal.splice(0, journal.length);
  const saved = await runOperationalCommit({
    prepare: () => {
      prepareOperationalCustomValueWrites({
        domain: "opportunity",
        mode: "create",
        placements: [requiredPlacement],
        definitions: [oppDefinition],
        submissions: [{ fieldLineageId: "opportunity.channelNote", value: "branch" }],
      });
    },
    transaction: rollback,
    business: async () => {
      journal.push("opportunity");
      return { id: "opp-1", requestedAmount: 2500000, productCode: "HOME_LOAN" };
    },
    values: async () => {
      journal.push("value");
    },
  });
  check("opportunity_canonical_update_and_custom_value_commit_together", journal.join(",") === "opportunity,value" && saved.requestedAmount === 2500000);

  journal.splice(0, journal.length);
  let rolled = false;
  try {
    await runOperationalCommit({
      prepare: () => undefined,
      transaction: rollback,
      business: async () => {
        journal.push("opportunity");
        return { id: "opp-1" };
      },
      values: async () => {
        throw new CustomFieldValueError(409, "VALUE_WRITE_FAILED", "Custom value write failed.");
      },
    });
  } catch {
    rolled = journal.length === 0;
  }
  check("failed_custom_write_does_not_leave_opportunity_update", rolled);

  const contactPlacement = placement({ fieldLineageId: "contact.preference", owningDomain: "contact", screenId: "contact_workspace", fieldId: "contact.preference" });
  const contactDefinition = definition({ lineageId: "contact.preference", owningDomain: "contact", friendlyLabel: "Preference" });
  check(
    "contact_show_on_create_renders",
    projectOperationalCustomFields({
      domain: "contact",
      mode: "create",
      placements: [contactPlacement],
      definitions: [contactDefinition],
      values: [],
    }).length === 1,
  );
  const contactSource = readFileSync(path.join(repoRoot, "src/components/catalyst-one/contacts/progressive-contact-create-modal.tsx"), "utf8");
  check(
    "contact_protected_identity_fields_preserved",
    contactSource.includes("Full Name") && contactSource.includes("Mobile Number") && contactSource.includes("registerProgressiveLoanContact"),
  );

  const contactJournal: string[] = [];
  const contactRollback = async <T>(work: () => Promise<T>): Promise<T> => {
    const snapshot = contactJournal.slice();
    try {
      return await work();
    } catch (error) {
      contactJournal.splice(0, contactJournal.length, ...snapshot);
      throw error;
    }
  };
  await runOperationalCommit({
    prepare: () => {
      prepareOperationalCustomValueWrites({
        domain: "contact",
        mode: "create",
        placements: [{ ...contactPlacement, requiredOnPlacement: true }],
        definitions: [contactDefinition],
        submissions: [{ fieldLineageId: "contact.preference", value: "morning" }],
      });
    },
    transaction: contactRollback,
    business: async () => {
      contactJournal.push("contact");
      return { id: "contact-1", name: "Asha Rao", mobilePrimary: "9811111111" };
    },
    values: async () => {
      contactJournal.push("value");
    },
  });
  check("contact_create_and_custom_values_atomic", contactJournal.join(",") === "contact,value");

  contactJournal.splice(0, contactJournal.length);
  let contactLeft = true;
  try {
    await runOperationalCommit({
      prepare: () => {
        prepareOperationalCustomValueWrites({
          domain: "contact",
          mode: "create",
          placements: [{ ...contactPlacement, requiredOnPlacement: true }],
          definitions: [contactDefinition],
          submissions: [{ fieldLineageId: "contact.preference", value: "" }],
        });
      },
      transaction: contactRollback,
      business: async () => {
        contactJournal.push("contact");
        return { id: "contact-2" };
      },
      values: async () => {
        contactJournal.push("value");
      },
    });
  } catch {
    contactLeft = contactJournal.length > 0;
  }
  check("failed_required_contact_custom_value_leaves_no_contact", contactLeft === false);

  const editView = projectOperationalCustomFields({
    domain: "contact",
    mode: "edit",
    placements: [{ ...contactPlacement, showOnEdit: true, showOnView: false }],
    definitions: [contactDefinition],
    values: [],
  });
  const viewOnly = projectOperationalCustomFields({
    domain: "contact",
    mode: "view",
    placements: [{ ...contactPlacement, showOnEdit: false, showOnView: true }],
    definitions: [contactDefinition],
    values: [],
  });
  const hiddenEdit = projectOperationalCustomFields({
    domain: "contact",
    mode: "edit",
    placements: [{ ...contactPlacement, showOnEdit: false, showOnView: false, showOnCreate: true }],
    definitions: [contactDefinition],
    values: [],
  });
  check("contact_edit_view_flags_honored", editView[0]?.editable === true && viewOnly[0]?.editable === false && hiddenEdit.length === 0);

  const companyPlacement = placement({ fieldLineageId: "company.segment", owningDomain: "company", screenId: "company_workspace" });
  const companyDefinition = definition({ lineageId: "company.segment", owningDomain: "company" });
  check(
    "company_show_on_create_renders",
    projectOperationalCustomFields({
      domain: "company",
      mode: "create",
      placements: [companyPlacement],
      definitions: [companyDefinition],
      values: [],
    }).length === 1,
  );
  const companySource = readFileSync(path.join(repoRoot, "src/components/catalyst-one/companies/progressive-company-create-modal.tsx"), "utf8");
  check("company_name_preserved_as_canonical", companySource.includes("Company Name") && companySource.includes("companyName: name"));

  const companyJournal: string[] = [];
  await runOperationalCommit({
    prepare: () => {
      prepareOperationalCustomValueWrites({
        domain: "company",
        mode: "create",
        placements: [{ ...companyPlacement, requiredOnPlacement: true }],
        definitions: [companyDefinition],
        submissions: [{ fieldLineageId: "company.segment", value: "sme" }],
      });
    },
    transaction: async (work) => {
      const snapshot = companyJournal.slice();
      try {
        return await work();
      } catch (error) {
        companyJournal.splice(0, companyJournal.length, ...snapshot);
        throw error;
      }
    },
    business: async () => {
      companyJournal.push("company");
      return { id: "company-1", companyName: "Northwind Traders" };
    },
    values: async () => {
      companyJournal.push("value");
    },
  });
  check("company_create_and_custom_values_atomic", companyJournal.join(",") === "company,value");
  const companyEdit = projectOperationalCustomFields({
    domain: "company",
    mode: "edit",
    placements: [{ ...companyPlacement, showOnEdit: true, showOnView: false }],
    definitions: [companyDefinition],
    values: [],
  });
  const companyView = projectOperationalCustomFields({
    domain: "company",
    mode: "view",
    placements: [{ ...companyPlacement, showOnEdit: true, showOnView: false }],
    definitions: [companyDefinition],
    values: [],
  });
  check("company_edit_view_flags_honored", companyEdit.length === 1 && companyView.length === 0);

  const operationalRoute = readFileSync(
    path.join(repoRoot, "src/app/api/internal/field-control/operational-fields/route.ts"),
    "utf8",
  );
  check(
    "operational_user_does_not_require_fcm_admin",
    operationalRoute.includes("requireAccessToken") && !operationalRoute.includes("assertFieldControlAdministrator"),
  );

  const members = new Set(["org-a:contact:contact-1"]);
  const values = createMemoryCustomFieldValueStore();
  const placements = createMemoryPlacementStore([contactPlacement]);
  let crossOrg = "";
  try {
    await writeCustomFieldValue({
      actor: { userId: "rm-1", role: "USER" },
      body: {
        fieldLineageId: "contact.preference",
        screenId: "contact_workspace",
        sectionId: "custom_fields",
        entityDomain: "contact",
        entityId: "contact-9",
        value: "evening",
      },
      definitions: [contactDefinition],
      resolveOrganizationId: async () => "org-a",
      entityInOrganization: async (organizationId, domain, entityId) => members.has(`${organizationId}:${domain}:${entityId}`),
      operation: "edit",
      placements,
      store: values,
      audit: () => undefined,
      now: "2026-09-29T01:00:00.000Z",
    });
  } catch (error) {
    crossOrg = error instanceof CustomFieldValueError ? error.code : "";
  }
  check("cross_organization_value_access_rejected", crossOrg === "ENTITY_NOT_IN_ORGANIZATION");

  const selectPlacement = placement({
    fieldLineageId: "opportunity.statusNote",
    owningDomain: "opportunity",
    screenId: "opportunity_workspace",
    showOnCreate: false,
    showOnEdit: true,
  });
  const selectDefinition = definition({
    lineageId: "opportunity.statusNote",
    owningDomain: "opportunity",
    fieldType: "single_select",
    selectOptionKeysJson: options,
  });
  const selectPlacements = createMemoryPlacementStore([selectPlacement]);
  const selectValues = createMemoryCustomFieldValueStore();
  const audits: string[] = [];
  await applyOperationalCustomValuePlan({
    plan: prepareOperationalCustomValueWrites({
      domain: "opportunity",
      mode: "edit",
      placements: [selectPlacement],
      definitions: [selectDefinition],
      submissions: [{ fieldLineageId: "opportunity.statusNote", value: "open" }],
    }),
    actor: { userId: "rm-1" },
    entityId: "opp-1",
    resolveOrganizationId: async () => "org-a",
    entityInOrganization: async () => true,
    placements: selectPlacements,
    definitions: [selectDefinition],
    values: selectValues,
    audit: (event) => audits.push(event.action),
    now: "2026-09-29T02:00:00.000Z",
  });
  check("select_durable_key_stored", selectValues.rows[0]?.valueJson === "open" && audits.includes("value_created"));

  const retiredView = projectOperationalCustomFields({
    domain: "opportunity",
    mode: "view",
    placements: [{ ...selectPlacement, showOnView: true }],
    definitions: [selectDefinition],
    values: [
      {
        id: "value-1",
        organizationId: "org-a",
        fieldLineageId: "opportunity.statusNote",
        fieldId: "opportunity.statusNote",
        definitionVersionIdCapturedUnder: selectDefinition.id,
        entityDomain: "opportunity",
        entityId: "opp-1",
        valueJson: "legacy",
        createdAt: "2026-09-29T02:00:00.000Z",
        updatedAt: "2026-09-29T02:00:00.000Z",
        createdByUserId: "rm-1",
        updatedByUserId: "rm-1",
      },
    ],
  });
  const retiredOption = retiredView[0]?.options.find((option) => option.key === "legacy");
  check("retired_key_readable", retiredView[0]?.displayLabel === "Legacy" && retiredOption?.selectable === false);

  let retiredCode = "";
  try {
    prepareOperationalCustomValueWrites({
      domain: "opportunity",
      mode: "edit",
      placements: [selectPlacement],
      definitions: [selectDefinition],
      submissions: [{ fieldLineageId: "opportunity.statusNote", value: "legacy" }],
    });
    await writeCustomFieldValue({
      actor: { userId: "rm-1" },
      body: {
        fieldLineageId: "opportunity.statusNote",
        screenId: "opportunity_workspace",
        sectionId: "custom_fields",
        entityDomain: "opportunity",
        entityId: "opp-1",
        value: "legacy",
      },
      definitions: [selectDefinition],
      resolveOrganizationId: async () => "org-a",
      entityInOrganization: async () => true,
      operation: "edit",
      placements: selectPlacements,
      store: selectValues,
      audit: () => undefined,
      now: "2026-09-29T03:00:00.000Z",
    });
  } catch (error) {
    retiredCode = error instanceof CustomFieldValueError ? error.code : "";
  }
  check("retired_key_not_newly_selectable", retiredCode === "OPTION_RETIRED");

  let unknownCode = "";
  try {
    await writeCustomFieldValue({
      actor: { userId: "rm-1" },
      body: {
        fieldLineageId: "opportunity.statusNote",
        screenId: "opportunity_workspace",
        sectionId: "custom_fields",
        entityDomain: "opportunity",
        entityId: "opp-1",
        value: "missing",
      },
      definitions: [selectDefinition],
      resolveOrganizationId: async () => "org-a",
      entityInOrganization: async () => true,
      operation: "edit",
      placements: selectPlacements,
      store: selectValues,
      audit: () => undefined,
    });
  } catch (error) {
    unknownCode = error instanceof CustomFieldValueError ? error.code : "";
  }
  check("unknown_option_rejected", unknownCode === "OPTION_UNKNOWN");

  let derivedCode = "";
  try {
    prepareOperationalCustomValueWrites({
      domain: "opportunity",
      mode: "edit",
      placements: [selectPlacement],
      definitions: [{ ...selectDefinition, classification: "derived" }],
      submissions: [{ fieldLineageId: "opportunity.statusNote", value: "open" }],
    });
  } catch (error) {
    derivedCode =
      error instanceof CustomFieldValueError || error instanceof CustomFieldPlacementError ? error.code : "";
  }
  check("derived_field_write_rejected", derivedCode === "CLASSIFICATION_NOT_CUSTOM");

  let canonicalCode = "";
  try {
    prepareOperationalCustomValueWrites({
      domain: "contact",
      mode: "create",
      placements: [placement({ fieldLineageId: "contact.name", owningDomain: "contact", screenId: "contact_workspace" })],
      definitions: [definition({ lineageId: "contact.name", owningDomain: "contact", classification: "custom_field" })],
      submissions: [{ fieldLineageId: "contact.name", value: "Asha Rao" }],
    });
  } catch (error) {
    canonicalCode = error instanceof CustomFieldValueError ? error.code : "";
  }
  assertCanonicalValueNotShadowed(selectValues.rows);
  check("physical_canonical_field_not_written_to_custom_values", canonicalCode === "CANONICAL_FIELD_PROTECTED" && selectValues.rows.every((row) => row.fieldLineageId !== "contact.name"));

  const dealVisible = projectDealWorkspaceCustomFields({
    mode: "edit",
    placements: [placement({ fieldLineageId: "deal.declineReason", owningDomain: "deal", screenId: "deal_workspace", showOnCreate: false })],
    definitions: [definition({ lineageId: "deal.declineReason", owningDomain: "deal", friendlyLabel: "Decline reason", fieldType: "text" })],
    values: [],
  });
  check("deal_existing_renderer_still_works", dealVisible.length === 1 && dealVisible[0]?.friendlyLabel === "Decline reason");
  const dealValues = createMemoryCustomFieldValueStore();
  const dealPlacements = createMemoryPlacementStore([
    placement({ fieldLineageId: "deal.declineReason", owningDomain: "deal", screenId: "deal_workspace" }),
  ]);
  await writeCustomFieldValue({
    actor: { userId: "rm-1" },
    body: {
      fieldLineageId: "deal.declineReason",
      screenId: "deal_workspace",
      sectionId: "custom_fields",
      entityDomain: "deal",
      entityId: "deal-1",
      value: "pricing",
    },
    definitions: [definition({ lineageId: "deal.declineReason", owningDomain: "deal" })],
    resolveOrganizationId: async () => "org-a",
    dealInOrganization: async () => true,
    placements: dealPlacements,
    store: dealValues,
    audit: () => undefined,
    now: "2026-09-29T04:00:00.000Z",
  });
  const hiddenAfterDeactivation = projectDealWorkspaceCustomFields({
    mode: "edit",
    placements: [{ ...dealPlacements.rows[0]!, active: false }],
    definitions: [definition({ lineageId: "deal.declineReason", owningDomain: "deal" })],
    values: dealValues.rows,
  });
  check("deal_existing_persistence_still_works", dealValues.rows[0]?.valueJson === "pricing");
  check("deal_deactivation_preserves_historical_value", hiddenAfterDeactivation.length === 0 && dealValues.rows[0]?.valueJson === "pricing");

  const changed = spawnSync("git", ["diff", "--name-only", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).stdout;
  const lifecycle = readFileSync(path.join(repoRoot, "src/lib/field-control-master/production-governance-lifecycle.ts"), "utf8");
  check("fcm_governance_lifecycle_unchanged", !changed.includes("src/lib/field-control-master/production-governance-lifecycle.ts") && !lifecycle.includes("createCustomFieldPlacement"));
  check("product_programme_unchanged", !changed.includes("src/lib/product-programme") && !changed.includes("server/services/product-programme-operations/"));
  check("recommendation_engine_unchanged", !changed.includes("server/services/lender-recommendation/"));
  check("compass_unchanged", !changed.includes("compass/") && !changed.includes("server/services/compass-customer-gateway/"));
  check("chanakya_unchanged", !changed.includes("src/lib/chanakya"));
  check("sarathi_unchanged", !changed.includes("src/constants/enterprise-ai-platform/"));

  const commitSource = readFileSync(path.join(repoRoot, "src/lib/field-control-master/operational-custom-field-commit.ts"), "utf8");
  check(
    "server_commit_uses_one_transaction",
    commitSource.includes("prisma.$transaction") &&
      commitSource.includes("afterRowUpdate") &&
      commitSource.indexOf("contextFor") < commitSource.indexOf("prisma.$transaction") &&
      !commitSource.includes("deleteMany"),
  );

  const failed = checks.filter(([, passed]) => !passed);
  console.log(`FCM_OPERATIONAL_FORM_ALIGNMENT_PROOF checks=${checks.length} failed=${failed.length}`);
  if (failed.length > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
