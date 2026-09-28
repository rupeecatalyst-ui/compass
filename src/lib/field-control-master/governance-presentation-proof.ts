/**
 * Focused proof for the read-only Field Control governance screen.
 * Does not connect to a database and does not read the inspection registry.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  APPLICABILITY_NOT_DECLARED_NOTE,
  CERTIFIED_FIELD_CONTROL_LIST_PATH,
  DERIVED_RESULT_LABEL,
  DERIVED_RESULT_NOTE,
  GOVERNANCE_EMPTY_MESSAGE,
  GOVERNANCE_ERROR_MESSAGE,
  GOVERNANCE_LOADING_MESSAGE,
  GOVERNANCE_MODE_BADGE,
  PRODUCT_PROGRAMME_BOUNDARY_NOTE,
  RAW_CANONICAL_FACT_LABEL,
  RAW_CANONICAL_NOTE,
  RUNTIME_NOT_CONTROLLING_LABEL,
  UNRECOGNIZED_BINDING_LABEL,
  classificationLabel,
  filterGovernanceDefinitions,
  governanceDetail,
  governanceSummary,
  runtimeStatusLabel,
  sourceTableLabel,
} from "./governance-presentation";
import type { FieldControlGovernanceDefinition } from "./production-governance-read";

const here = dirname(fileURLToPath(import.meta.url));
const checks: Array<[string, boolean]> = [];

function check(name: string, passed: boolean): void {
  checks.push([name, passed]);
  assert.equal(passed, true, name);
}

function row(overrides: Partial<FieldControlGovernanceDefinition> = {}): FieldControlGovernanceDefinition {
  return {
    id: "fcm:contact.name:v1",
    fieldId: "contact.name",
    lineageId: "contact.name",
    versionNumber: 1,
    previousVersionId: null,
    friendlyLabel: "Name",
    description: "Applicant name.",
    helpText: "Identity fact.",
    fieldType: "text",
    currencyUnits: [],
    classification: "raw_canonical",
    owningDomain: "contact",
    ownershipReview: "certified_binding",
    sourceBinding: { kind: "column", model: "EcmContact", field: "name" },
    authorisedConsumers: [],
    productApplicability: [],
    customerCategoryApplicability: [],
    aliases: [],
    selectOptionKeys: [],
    selectOptions: [],
    selectOptionSource: null,
    candidateMirrorOf: null,
    validationSummary: "Required identity.",
    presentationSummary: "Plain text.",
    lifecycleStatus: "draft",
    controlsRuntime: false,
    customerFacingActivation: false,
    applicabilityDeclared: false,
    makerUserId: "foundation-v1-baseline",
    checkerUserId: null,
    effectiveFrom: null,
    effectiveUntil: null,
    createdAt: "2026-09-26T00:00:00.000Z",
    updatedAt: "2026-09-26T00:00:00.000Z",
    ...overrides,
  };
}

const raw = row();
const derived = row({
  id: "fcm:derived:proposedEmiRupees:v1",
  fieldId: "derived:proposedEmiRupees",
  lineageId: "derived:proposedEmiRupees",
  friendlyLabel: "Proposed EMI",
  description: "Monthly instalment.",
  classification: "derived",
  owningDomain: "derived_engine",
  fieldType: "currency",
  currencyUnits: ["rupees"],
  sourceBinding: { kind: "derived_calculator", calculatorId: "calculateReducingBalanceEmi" },
  authorisedConsumers: ["home_loan_recommendation_engine"],
  productApplicability: ["HOME_LOAN", "HOME_LOAN_BT"],
});
const unknown = row({
  id: "fcm:unknown:v1",
  fieldId: "unknown.binding",
  friendlyLabel: "Unknown",
  classification: "system",
  sourceBinding: { kind: "unrecognized" },
});

const summary = governanceSummary([raw, derived, unknown]);
check("summary_derives_from_rows", summary.total === 3 && summary.rawCanonical === 1 && summary.derived === 1 && summary.runtimeControlled === 0);
check("summary_is_not_hardcoded_certified_counts", summary.total !== 12 && summary.rawCanonical !== 8);

check("raw_classification_label", classificationLabel(raw.classification) === "Raw canonical");
const rawDetail = governanceDetail(raw);
check("raw_fact_label", rawDetail.factLabel === RAW_CANONICAL_FACT_LABEL);
check("raw_note_is_non_operative", rawDetail.notes.includes(RAW_CANONICAL_NOTE));
check("column_source_formats_model_field", sourceTableLabel(raw.sourceBinding) === "EcmContact.name");

const derivedDetail = governanceDetail(derived);
check("derived_classification_label", classificationLabel(derived.classification) === "Derived");
check("derived_fact_label", derivedDetail.factLabel === DERIVED_RESULT_LABEL);
check("derived_note_does_not_execute", derivedDetail.notes.includes(DERIVED_RESULT_NOTE));
check(
  "derived_source_is_calculator_name",
  sourceTableLabel(derived.sourceBinding) === "calculateReducingBalanceEmi",
);
const sourceSection = derivedDetail.sections.find((section) => section.title === "Source");
check(
  "derived_drawer_shows_calculator",
  Boolean(sourceSection?.rows.some((item) => item.label === "Calculator" && item.value === "calculateReducingBalanceEmi")),
);

check("unrecognized_binding_is_safe", sourceTableLabel(unknown.sourceBinding) === UNRECOGNIZED_BINDING_LABEL);
check("runtime_false_label", runtimeStatusLabel(false) === RUNTIME_NOT_CONTROLLING_LABEL);
check("applicability_false_note", rawDetail.notes.includes(APPLICABILITY_NOT_DECLARED_NOTE));
check("programme_boundary_note", rawDetail.notes.includes(PRODUCT_PROGRAMME_BOUNDARY_NOTE));

const audit = rawDetail.sections.find((section) => section.title === "Governance and audit");
check("null_previous_version_is_none", rawDetail.sections[0]?.rows.find((item) => item.label === "Previous version")?.value === "None");
check("null_checker_is_none", audit?.rows.find((item) => item.label === "Checker")?.value === "None");
check("null_effective_from_is_not_set", audit?.rows.find((item) => item.label === "Effective from")?.value === "Not set");
check("null_effective_until_is_not_set", audit?.rows.find((item) => item.label === "Effective until")?.value === "Not set");
check("recorded_at_keeps_timestamp", audit?.rows.find((item) => item.label === "Recorded at")?.value === raw.createdAt);

const filtered = filterGovernanceDefinitions([raw, derived], {
  q: "instalment",
  owningDomain: "",
  classification: "",
  lifecycleStatus: "",
  ownershipReview: "",
});
check("search_does_not_use_description", filtered.length === 0);
const byLabel = filterGovernanceDefinitions([raw, derived], {
  q: "proposed",
  owningDomain: "",
  classification: "",
  lifecycleStatus: "",
  ownershipReview: "",
});
check("search_uses_field_id_or_label", byLabel.length === 1 && byLabel[0]?.fieldId === derived.fieldId);

const viewPath = join(here, "../../components/catalyst-one/field-control-master/field-control-master-view.tsx");
const view = readFileSync(viewPath, "utf8");
const actions = readFileSync(join(here, "../../components/catalyst-one/field-control-master/governed-field-lifecycle-actions.tsx"), "utf8");
const presentation = readFileSync(join(here, "governance-presentation.ts"), "utf8");
const screen = `${view}\n${presentation}`;
check("screen_does_not_call_inspection_list", !view.includes("listFieldControlDefinitions"));
check("screen_does_not_import_registry", !view.includes("registry.ts") && !view.includes('from "@/lib/field-control-master"') && !view.includes('from "./registry"'));
check("screen_uses_certified_api", view.includes("CERTIFIED_FIELD_CONTROL_LIST_PATH") && CERTIFIED_FIELD_CONTROL_LIST_PATH === "/api/admin/field-control-definitions");
check("list_request_stays_get", view.includes('method: "GET"') && !view.includes('method: "POST"') && !view.includes('method: "PUT"') && !view.includes('method: "PATCH"') && !view.includes('method: "DELETE"'));
check("error_state_exists", view.includes("GOVERNANCE_ERROR_MESSAGE") && GOVERNANCE_ERROR_MESSAGE === "Certified Field Control definitions could not be loaded.");
check("empty_state_exists", view.includes("GOVERNANCE_EMPTY_MESSAGE") && GOVERNANCE_EMPTY_MESSAGE === "No certified definitions match.");
check("loading_state_exists", view.includes("GOVERNANCE_LOADING_MESSAGE") && view.includes("Skeleton") && GOVERNANCE_LOADING_MESSAGE.length > 0);
check("mode_badge_exists", view.includes("GOVERNANCE_MODE_BADGE") && GOVERNANCE_MODE_BADGE === "Governance / Non-Operational");
check("field_definition_remains_read_only", view.includes('data-field-definition="read-only"') && !view.includes("Switch") && !view.includes('role="switch"') && !view.includes('type="checkbox"') && !view.includes("<textarea"));
check("failure_clears_rows", view.includes("setDefinitions([])") && view.includes('setPhase("error")'));
check("lifecycle_actions_are_isolated", view.includes("GovernedFieldLifecycleActions") && actions.includes('data-governance-lifecycle="bounded"'));
check("lifecycle_posts_are_only_review_actions", actions.includes("fieldControlSubmitReviewPath") && actions.includes("fieldControlReviewPath") && actions.includes('method: "POST"') && !actions.includes('method: "PATCH"') && !actions.includes('method: "PUT"') && !actions.includes('method: "DELETE"'));
check("lifecycle_component_owns_approve", actions.includes(">Approve<") && actions.includes(">Submit for Review<") && actions.includes(">Return to Maker<") && actions.includes("Review Definition") && !view.includes(">Approve<") && !presentation.includes(">Approve<"));
check("lifecycle_component_has_no_editor", !actions.includes("<input") && !actions.includes("<textarea") && !actions.includes("<select") && !actions.includes("controlsRuntime") && !actions.includes("customerFacingActivation") && !actions.includes("applicabilityDeclared"));

for (const action of [
  "Add Field Definition",
  "Create Version",
  "Manage Alias",
  "Run Calculator",
  "Change Applicability",
  "Change Runtime Control",
  ">Edit<",
  ">Save<",
  ">Delete<",
  ">Reject<",
  ">Publish<",
  ">Activate<",
  ">Deactivate<",
]) {
  check(`no_action_${action.replace(/[^a-z]+/gi, "_")}`, !screen.includes(action) && !actions.includes(action));
}

const imports = screen
  .split("\n")
  .filter((line) => line.includes("import ") || line.includes("from "))
  .join("\n");
check("no_product_programme_fetch", !imports.includes("product-programme") && !imports.includes("productProgramme") && !view.includes("/api/admin/product"));
check("no_compass_import", !imports.toLowerCase().includes("compass"));
check("no_chanakya_import", !imports.toLowerCase().includes("chanakya"));
check("no_sarathi_import", !imports.toLowerCase().includes("sarathi"));
check("presentation_does_not_import_registry", !presentation.includes("registry.ts") && !presentation.includes("listFieldControlDefinitions"));

const executable = screen
  .split("\n")
  .filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*"))
  .join("\n")
  .replace(/"(?:\\"|[^"])*"/g, '""')
  .replace(/'(?:\\'|[^'])*'/g, "''");
for (const forbidden of ["create(", "createMany(", "update(", "updateMany(", "upsert(", "delete(", "deleteMany(", "$executeRaw"]) {
  check(`no_${forbidden.replace(/[^a-z]/gi, "_")}`, !executable.includes(forbidden));
}

const failed = checks.filter(([, passed]) => !passed);
console.log(`FIELD_CONTROL_GOVERNANCE_UI_PROOF PASS checks=${checks.length} failed=${failed.length}`);
