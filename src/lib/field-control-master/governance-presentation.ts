/**
 * Read-only presentation for certified Field Control governance rows.
 * This module does not read the inspection registry and does not execute bindings.
 */
import {
  FIELD_CONTROL_CLASSIFICATIONS,
  FIELD_CONTROL_LIFECYCLE_STATUSES,
  FIELD_CONTROL_OWNING_DOMAINS,
  FIELD_CONTROL_OWNERSHIP_REVIEWS,
  type FieldControlClassification,
  type FieldControlFieldType,
  type FieldControlLifecycleStatus,
  type FieldControlOwningDomain,
  type FieldControlOwnershipReview,
} from "@/types/field-control-master";

import {
  FIELD_CONTROL_READ_QUERY_MAX_LENGTH,
  type FieldControlGovernanceDefinition,
  type FieldControlGovernanceSourceBinding,
} from "./production-governance-read";

export const CERTIFIED_FIELD_CONTROL_LIST_PATH = "/api/admin/field-control-definitions";

export const GOVERNANCE_MODE_BADGE = "Governance / Non-Operational";

export const GOVERNANCE_SAFETY_BANNER =
  "Existing application behaviour remains authoritative. This registry describes certified field identities. It does not change forms, calculators, Product Programme policy, COMPASS, CHANAKYA, or Sarathi.";

export const GOVERNANCE_EMPTY_MESSAGE = "No certified definitions match.";

export const GOVERNANCE_ERROR_MESSAGE = "Certified Field Control definitions could not be loaded.";

export const GOVERNANCE_LOADING_MESSAGE = "Loading certified Field Control definitions.";

export const RAW_CANONICAL_FACT_LABEL = "Customer / Transaction Fact";

export const DERIVED_RESULT_LABEL = "Derived Result";

export const RAW_CANONICAL_NOTE =
  "The domain table remains the value store. Field Control Master does not change the stored value or capture behaviour.";

export const DERIVED_RESULT_NOTE =
  "The existing calculator remains authoritative. This definition does not execute the calculation and is not a database value column.";

export const CUSTOM_FIELD_DEFINITION_NOTE =
  "Designing this field does not place it on a screen or store a value. Approval is governance only.";

export const PRODUCT_PROGRAMME_BOUNDARY_NOTE = "Product Programme policy is not registered here.";

export const APPLICABILITY_NOT_DECLARED_NOTE =
  "Descriptive metadata only — applicability is not declared.";

export const RUNTIME_NOT_CONTROLLING_LABEL = "Not controlling runtime";

export const UNRECOGNIZED_BINDING_LABEL = "Unrecognized binding";

export type GovernanceFilter = {
  q: string;
  owningDomain: FieldControlOwningDomain | "";
  classification: FieldControlClassification | "";
  lifecycleStatus: FieldControlLifecycleStatus | "";
  ownershipReview: FieldControlOwnershipReview | "";
};

export type GovernanceDetailRow = { label: string; value: string };

export type GovernanceDetailSection = { title: string; rows: GovernanceDetailRow[] };

export type GovernanceDetail = {
  factLabel: string | null;
  notes: string[];
  sections: GovernanceDetailSection[];
};

export type GovernanceSummary = {
  total: number;
  rawCanonical: number;
  derived: number;
  runtimeControlled: number;
};

const CLASSIFICATION_LABELS: Record<FieldControlClassification, string> = {
  raw_canonical: "Raw canonical",
  derived: "Derived",
  reference_mirror: "Reference mirror",
  alias: "Alias",
  system: "System",
  configuration: "Configuration",
  programme_constraint_reference: "Programme constraint reference",
  custom_field: "Custom Field",
};

const FIELD_TYPE_LABELS: Record<FieldControlFieldType, string> = {
  text: "Text",
  long_text: "Long text",
  number: "Number",
  currency: "Currency",
  percentage: "Percentage",
  date: "Date",
  yes_no: "Yes / no",
  single_select: "Single select",
  multi_select: "Multi select",
};

const LIFECYCLE_LABELS: Record<FieldControlLifecycleStatus, string> = {
  draft: "Draft",
  checker_review: "Checker review",
  approved: "Approved",
  active: "Active",
  superseded: "Superseded",
  inactive: "Inactive",
};

const OWNERSHIP_LABELS: Record<FieldControlOwnershipReview, string> = {
  certified_binding: "Certified binding",
  owner_requires_product_decision: "Owner requires product decision",
};

export function classificationLabel(value: FieldControlClassification): string {
  return CLASSIFICATION_LABELS[value];
}

export function fieldTypeLabel(value: FieldControlFieldType): string {
  return FIELD_TYPE_LABELS[value];
}

export function lifecycleLabel(value: FieldControlLifecycleStatus): string {
  return LIFECYCLE_LABELS[value];
}

export function ownershipReviewLabel(value: FieldControlOwnershipReview): string {
  return OWNERSHIP_LABELS[value];
}

export function owningDomainLabel(value: FieldControlOwningDomain): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function runtimeStatusLabel(controlsRuntime: boolean): string {
  return controlsRuntime ? "Controlling runtime" : RUNTIME_NOT_CONTROLLING_LABEL;
}

export function customerFacingLabel(enabled: boolean): string {
  return enabled ? "Enabled for customers" : "Not enabled for customers";
}

export function applicabilityDeclaredLabel(declared: boolean): string {
  return declared ? "Declared" : "Not declared";
}

export function noneText(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : "None";
}

export function notSetText(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : "Not set";
}

export function listText(values: readonly string[]): string {
  return values.length > 0 ? values.join(", ") : "None";
}

export function sourceTableLabel(binding: FieldControlGovernanceSourceBinding): string {
  switch (binding.kind) {
    case "column":
      return `${binding.model}.${binding.field}`;
    case "derived_calculator":
      return binding.calculatorId;
    case "assessment_fact":
      return `Assessment fact ${binding.path}`;
    case "unresolved":
      return `Unresolved ${binding.legacyProjectionId}`;
    case "custom_value_storage":
      return "Custom value storage";
    case "unrecognized":
      return UNRECOGNIZED_BINDING_LABEL;
  }
}

export function bindingKindLabel(binding: FieldControlGovernanceSourceBinding): string {
  switch (binding.kind) {
    case "column":
      return "Column";
    case "derived_calculator":
      return "Derived calculator";
    case "assessment_fact":
      return "Assessment fact";
    case "unresolved":
      return "Unresolved";
    case "custom_value_storage":
      return "Custom value storage";
    case "unrecognized":
      return UNRECOGNIZED_BINDING_LABEL;
  }
}

export function sourceDetailRows(binding: FieldControlGovernanceSourceBinding): GovernanceDetailRow[] {
  const kind = { label: "Binding kind", value: bindingKindLabel(binding) };
  switch (binding.kind) {
    case "column":
      return [kind, { label: "Model", value: binding.model }, { label: "Field", value: binding.field }];
    case "derived_calculator":
      return [kind, { label: "Calculator", value: binding.calculatorId }];
    case "assessment_fact":
      return [kind, { label: "Path", value: binding.path }, { label: "Store", value: binding.store }];
    case "unresolved":
      return [kind, { label: "Legacy projection", value: binding.legacyProjectionId }];
    case "custom_value_storage":
      return [kind, { label: "Storage", value: "Custom value storage" }];
    case "unrecognized":
      return [kind];
  }
}

export function factLabel(classification: FieldControlClassification): string | null {
  if (classification === "raw_canonical") return RAW_CANONICAL_FACT_LABEL;
  if (classification === "derived") return DERIVED_RESULT_LABEL;
  return null;
}

export function governanceSummary(rows: readonly FieldControlGovernanceDefinition[]): GovernanceSummary {
  return {
    total: rows.length,
    rawCanonical: rows.filter((row) => row.classification === "raw_canonical").length,
    derived: rows.filter((row) => row.classification === "derived").length,
    runtimeControlled: rows.filter((row) => row.controlsRuntime).length,
  };
}

export function filterGovernanceDefinitions(
  rows: readonly FieldControlGovernanceDefinition[],
  filter: GovernanceFilter,
): FieldControlGovernanceDefinition[] {
  const needle = filter.q.trim().toLowerCase().slice(0, FIELD_CONTROL_READ_QUERY_MAX_LENGTH);
  return rows.filter((row) => {
    if (filter.owningDomain && row.owningDomain !== filter.owningDomain) return false;
    if (filter.classification && row.classification !== filter.classification) return false;
    if (filter.lifecycleStatus && row.lifecycleStatus !== filter.lifecycleStatus) return false;
    if (filter.ownershipReview && row.ownershipReview !== filter.ownershipReview) return false;
    if (!needle) return true;
    return (
      row.fieldId.toLowerCase().includes(needle) || row.friendlyLabel.toLowerCase().includes(needle)
    );
  });
}

export function governanceFilterOptions() {
  return {
    owningDomain: FIELD_CONTROL_OWNING_DOMAINS.map((value) => ({ value, label: owningDomainLabel(value) })),
    classification: FIELD_CONTROL_CLASSIFICATIONS.map((value) => ({
      value,
      label: classificationLabel(value),
    })),
    lifecycleStatus: FIELD_CONTROL_LIFECYCLE_STATUSES.map((value) => ({
      value,
      label: lifecycleLabel(value),
    })),
    ownershipReview: FIELD_CONTROL_OWNERSHIP_REVIEWS.map((value) => ({
      value,
      label: ownershipReviewLabel(value),
    })),
  };
}

export function governanceDetail(row: FieldControlGovernanceDefinition): GovernanceDetail {
  const notes = [PRODUCT_PROGRAMME_BOUNDARY_NOTE];
  if (row.classification === "raw_canonical") notes.unshift(RAW_CANONICAL_NOTE);
  if (row.classification === "derived") notes.unshift(DERIVED_RESULT_NOTE);
  if (row.classification === "custom_field") notes.unshift(CUSTOM_FIELD_DEFINITION_NOTE);
  if (!row.applicabilityDeclared) notes.push(APPLICABILITY_NOT_DECLARED_NOTE);

  return {
    factLabel: factLabel(row.classification),
    notes,
    sections: [
      {
        title: "Identity",
        rows: [
          { label: "Definition ID", value: row.id },
          { label: "Field ID", value: row.fieldId },
          { label: "Lineage", value: row.lineageId },
          { label: "Version", value: String(row.versionNumber) },
          { label: "Previous version", value: noneText(row.previousVersionId) },
        ],
      },
      {
        title: "Description",
        rows: [
          { label: "Friendly label", value: row.friendlyLabel },
          { label: "Description", value: noneText(row.description) },
          { label: "Governance note", value: noneText(row.helpText) },
        ],
      },
      { title: "Source", rows: sourceDetailRows(row.sourceBinding) },
      {
        title: "Classification and ownership",
        rows: [
          { label: "Field type", value: fieldTypeLabel(row.fieldType) },
          { label: "Classification", value: classificationLabel(row.classification) },
          { label: "Owning domain", value: owningDomainLabel(row.owningDomain) },
          { label: "Ownership review", value: ownershipReviewLabel(row.ownershipReview) },
        ],
      },
      {
        title: "Units and options",
        rows: [
          { label: "Currency units", value: listText(row.currencyUnits) },
          { label: "Option keys", value: listText(row.selectOptionKeys) },
          {
            label: "Options",
            value:
              row.selectOptions.length > 0
                ? row.selectOptions.map((option) => `${option.key} — ${option.label}`).join(", ")
                : "None",
          },
          { label: "Option source", value: noneText(row.selectOptionSource) },
        ],
      },
      {
        title: "Consumers",
        rows: [{ label: "Recorded consumers", value: listText(row.authorisedConsumers) }],
      },
      {
        title: "Applicability",
        rows: [
          { label: "Product metadata", value: listText(row.productApplicability) },
          { label: "Customer categories", value: listText(row.customerCategoryApplicability) },
          { label: "Applicability declared", value: applicabilityDeclaredLabel(row.applicabilityDeclared) },
        ],
      },
      {
        title: "Aliases and mirror",
        rows: [
          { label: "Aliases", value: listText(row.aliases) },
          { label: "Candidate mirror", value: noneText(row.candidateMirrorOf) },
        ],
      },
      {
        title: "Validation and presentation",
        rows: [
          { label: "Validation note", value: noneText(row.validationSummary) },
          { label: "Presentation note", value: noneText(row.presentationSummary) },
        ],
      },
      {
        title: "Operational status",
        rows: [
          { label: "Lifecycle", value: lifecycleLabel(row.lifecycleStatus) },
          { label: "Runtime control", value: runtimeStatusLabel(row.controlsRuntime) },
          { label: "Customer-facing activation", value: customerFacingLabel(row.customerFacingActivation) },
          { label: "Applicability declared", value: applicabilityDeclaredLabel(row.applicabilityDeclared) },
        ],
      },
      {
        title: "Governance and audit",
        rows: [
          { label: "Maker", value: noneText(row.makerUserId) },
          { label: "Checker", value: noneText(row.checkerUserId) },
          { label: "Effective from", value: notSetText(row.effectiveFrom) },
          { label: "Effective until", value: notSetText(row.effectiveUntil) },
          { label: "Recorded at", value: row.createdAt },
          { label: "Last recorded at", value: row.updatedAt },
        ],
      },
    ],
  };
}
