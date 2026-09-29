/**
 * Shared operational custom-field projection for contact, company, opportunity, and deal.
 * Deal Workspace edit/view rendering stays in deal-workspace-custom-fields.ts.
 * Physical columns are never copied into custom-value storage.
 */
import { CUSTOM_FIELD_PLACEMENT_SCREENS } from "./custom-field-placement-catalogue";
import type { DesignNewFieldDomain } from "./custom-field-design";
import {
  governingCustomDefinition,
  type PlacementDefinitionRecord,
  type PlacementRow,
  type PlacementStore,
} from "./custom-field-placement";
import { productApplicabilityPermits } from "./custom-field-product-applicability";
import type { CustomFieldAuditEvent } from "./custom-field-audit";
import {
  clearCustomFieldValue,
  CustomFieldValueError,
  writeCustomFieldValue,
  type CustomFieldValueActor,
  type CustomFieldValueRow,
  type CustomFieldValueStore,
} from "./custom-field-value";
import {
  CustomFieldValueContractError,
  readSelectKeySets,
  validateCustomFieldValue,
} from "./custom-field-value-contract";
import {
  isEmptyCustomFieldValue,
  type DealCustomFieldView,
} from "./deal-workspace-custom-fields";

export type OperationalCustomFieldDomain = "contact" | "company" | "opportunity" | "deal";
export type OperationalCustomFieldMode = "create" | "edit" | "view";
export type OperationalCustomFieldSubmission = { fieldLineageId: string; value: unknown };

export function readCustomFieldSubmissions(raw: unknown): OperationalCustomFieldSubmission[] {
  if (!Array.isArray(raw)) {
    throw new CustomFieldValueError(400, "VALIDATION_ERROR", "customFieldValues must be an array.");
  }
  return raw.map((item) => {
    if (typeof item !== "object" || item === null) {
      throw new CustomFieldValueError(400, "VALIDATION_ERROR", "Each custom field value must be an object.");
    }
    const record = item as Record<string, unknown>;
    if (typeof record.fieldLineageId !== "string" || record.fieldLineageId.length === 0) {
      throw new CustomFieldValueError(400, "VALIDATION_ERROR", "fieldLineageId is required.");
    }
    if ("organizationId" in record || "organisationId" in record) {
      throw new CustomFieldValueError(400, "ORGANIZATION_CONTEXT_REJECTED", "Organization is taken from the server context.");
    }
    return { fieldLineageId: record.fieldLineageId, value: record.value };
  });
}

export type OperationalCustomFieldDefinition = PlacementDefinitionRecord & {
  friendlyLabel: string;
};

const PROTECTED_CANONICAL_LINEAGE = new Set([
  "contact.name",
  "contact.mobilePrimary",
  "opportunity.productCode",
  "opportunity.requestedAmount",
  "company.companyName",
]);

export function operationalCustomFieldTarget(domain: OperationalCustomFieldDomain) {
  const screen = CUSTOM_FIELD_PLACEMENT_SCREENS.find(
    (item) => item.owningDomain === domain && item.sectionId === "custom_fields",
  );
  if (!screen || screen.owningDomain === "accounting") {
    throw new CustomFieldValueError(
      409,
      "ENTITY_DOMAIN_NOT_VALIDATED",
      "This entity domain is not validated for custom field values.",
    );
  }
  return screen;
}

function fail(statusCode: number, code: string, message: string): never {
  throw new CustomFieldValueError(statusCode, code, message);
}

function optionCatalog(raw: unknown): Array<{ key: string; label: string; retired: boolean }> {
  if (!Array.isArray(raw)) return [];
  if (raw.every((item) => typeof item === "string")) {
    return raw.map((key) => ({ key, label: key, retired: false }));
  }
  const options: Array<{ key: string; label: string; retired: boolean }> = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    if (typeof record.key !== "string" || typeof record.label !== "string" || typeof record.retired !== "boolean") {
      continue;
    }
    options.push({ key: record.key, label: record.label, retired: record.retired });
  }
  return options;
}

function currentKeys(value: unknown): string[] {
  if (typeof value === "string" && value.length > 0) return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return [];
}

function placementVisible(placement: PlacementRow, mode: OperationalCustomFieldMode): boolean {
  if (mode === "create") return placement.showOnCreate;
  if (mode === "view") return placement.showOnView;
  return placement.showOnEdit || placement.showOnView;
}

function placementEditable(placement: PlacementRow, mode: OperationalCustomFieldMode): boolean {
  if (mode === "view") return false;
  if (mode === "create") return placement.showOnCreate;
  return placement.showOnEdit;
}

export function projectOperationalCustomFields(input: {
  domain: OperationalCustomFieldDomain;
  mode: OperationalCustomFieldMode;
  productCode?: string | null;
  placements: PlacementRow[];
  definitions: OperationalCustomFieldDefinition[];
  values: CustomFieldValueRow[];
}): DealCustomFieldView[] {
  const screen = operationalCustomFieldTarget(input.domain);
  const views: DealCustomFieldView[] = [];
  for (const placement of input.placements) {
    if (!placement.active) continue;
    if (
      placement.owningDomain !== screen.owningDomain ||
      placement.screenId !== screen.screenId ||
      placement.sectionId !== screen.sectionId
    ) {
      continue;
    }
    if (!placementVisible(placement, input.mode)) continue;
    let governing: PlacementDefinitionRecord;
    try {
      governing = governingCustomDefinition(
        input.definitions.filter((row) => row.lineageId === placement.fieldLineageId),
      );
    } catch {
      continue;
    }
    if (governing.owningDomain !== input.domain) continue;
    if (!productApplicabilityPermits(governing, input.domain, input.productCode ?? null)) continue;
    const label =
      input.definitions.find((row) => row.id === governing.id)?.friendlyLabel ?? governing.fieldId;
    const stored = input.values.find((row) => row.fieldLineageId === governing.lineageId) ?? null;
    const value = stored ? stored.valueJson : null;
    const selected = new Set(currentKeys(value));
    let sets = { active: new Set<string>(), retired: new Set<string>() };
    try {
      sets = readSelectKeySets(governing.selectOptionKeysJson);
    } catch {
      sets = { active: new Set(), retired: new Set() };
    }
    const options = optionCatalog(governing.selectOptionKeysJson)
      .filter((option) => sets.active.has(option.key) || selected.has(option.key))
      .map((option) => ({
        ...option,
        selectable: sets.active.has(option.key) && !option.retired,
      }));
    const displayLabel =
      typeof value === "string" ? (options.find((option) => option.key === value)?.label ?? value) : null;
    views.push({
      placementId: placement.id,
      fieldLineageId: governing.lineageId,
      fieldId: governing.fieldId,
      friendlyLabel: label,
      fieldType: governing.fieldType,
      displayOrder: placement.displayOrder,
      required: placement.requiredOnPlacement,
      editable: placementEditable(placement, input.mode),
      value,
      displayLabel,
      options,
      controlsRuntime: false,
      customerFacingActivation: false,
    });
  }
  views.sort(
    (left, right) => left.displayOrder - right.displayOrder || left.fieldLineageId.localeCompare(right.fieldLineageId),
  );
  return views;
}

export type OperationalCustomValuePlan = {
  domain: OperationalCustomFieldDomain;
  mode: "create" | "edit";
  productCode: string | null;
  writes: OperationalCustomFieldSubmission[];
  clears: string[];
};

export function prepareOperationalCustomValueWrites(input: {
  domain: OperationalCustomFieldDomain;
  mode: "create" | "edit";
  productCode?: string | null;
  placements: PlacementRow[];
  definitions: OperationalCustomFieldDefinition[];
  submissions: OperationalCustomFieldSubmission[];
  existingValues?: CustomFieldValueRow[];
}): OperationalCustomValuePlan {
  if (input.mode !== "create" && input.mode !== "edit") {
    fail(409, "PLACEMENT_NOT_EDITABLE", "Custom field values cannot be written in view mode.");
  }
  const productCode = input.productCode ?? null;
  const visible = projectOperationalCustomFields({
    domain: input.domain,
    mode: input.mode,
    productCode,
    placements: input.placements,
    definitions: input.definitions,
    values: input.existingValues ?? [],
  });
  const visibleIds = new Set(visible.map((field) => field.fieldLineageId));
  for (const submission of input.submissions) {
    if (PROTECTED_CANONICAL_LINEAGE.has(submission.fieldLineageId)) {
      fail(409, "CANONICAL_FIELD_PROTECTED", "A physical field stays on its entity column.");
    }
    if (!visibleIds.has(submission.fieldLineageId)) {
      const governing = governingCustomDefinition(
        input.definitions.filter((row) => row.lineageId === submission.fieldLineageId),
      );
      if (!productApplicabilityPermits(governing, input.domain, productCode)) {
        fail(409, "PRODUCT_NOT_APPLICABLE", "This custom field does not apply to the current product.");
      }
      fail(409, "PLACEMENT_NOT_ACTIVE", "An active placement for this operation is required.");
    }
    const field = visible.find((row) => row.fieldLineageId === submission.fieldLineageId);
    if (field && !field.editable) {
      fail(409, "PLACEMENT_NOT_EDITABLE", "This placement is not open for this operation.");
    }
  }
  for (const field of visible) {
    if (!field.required) continue;
    const submission = input.submissions.find((row) => row.fieldLineageId === field.fieldLineageId);
    const value = submission ? submission.value : field.value;
    if (isEmptyCustomFieldValue(value)) {
      fail(400, "REQUIRED_FIELD", "A required custom field is missing.");
    }
  }
  const writes: OperationalCustomFieldSubmission[] = [];
  const clears: string[] = [];
  for (const submission of input.submissions) {
    if (isEmptyCustomFieldValue(submission.value)) clears.push(submission.fieldLineageId);
    else writes.push(submission);
  }
  for (const write of writes) {
    const governing = governingCustomDefinition(
      input.definitions.filter((row) => row.lineageId === write.fieldLineageId),
    );
    const existing = input.existingValues?.find((row) => row.fieldLineageId === write.fieldLineageId);
    try {
      validateCustomFieldValue({
        fieldType: governing.fieldType,
        raw: write.value,
        selectOptionKeysJson: governing.selectOptionKeysJson,
        existingValue: existing ? existing.valueJson : undefined,
      });
    } catch (error) {
      if (error instanceof CustomFieldValueContractError) fail(error.statusCode, error.code, error.message);
      throw error;
    }
  }
  return { domain: input.domain, mode: input.mode, productCode, writes, clears };
}

/**
 * Create that resolves to an existing company must not apply submitted custom values.
 * A brand-new company applies them. A name match with no custom writes or clears
 * reuses the company and leaves its custom values untouched.
 */
export function resolveCompanyCreateCustomValueAction(input: {
  created: boolean;
  writes: readonly unknown[];
  clears: readonly unknown[];
}): "apply" | "reuse" | "reject" {
  if (input.created) return "apply";
  if (input.writes.length > 0 || input.clears.length > 0) return "reject";
  return "reuse";
}

export async function applyOperationalCustomValuePlan(input: {
  plan: OperationalCustomValuePlan;
  actor: CustomFieldValueActor;
  entityId: string;
  resolveOrganizationId: () => Promise<string>;
  dealInOrganization?: (organizationId: string, entityId: string) => Promise<boolean>;
  entityInOrganization?: (
    organizationId: string,
    entityDomain: string,
    entityId: string,
  ) => Promise<boolean>;
  placements: PlacementStore;
  definitions: OperationalCustomFieldDefinition[];
  values: CustomFieldValueStore;
  audit: (event: CustomFieldAuditEvent) => void;
  now?: string;
}): Promise<void> {
  const screen = operationalCustomFieldTarget(input.plan.domain);
  for (const clearLineage of input.plan.clears) {
    await clearCustomFieldValue({
      actor: input.actor,
      entityDomain: input.plan.domain,
      entityId: input.entityId,
      fieldLineageId: clearLineage,
      resolveOrganizationId: input.resolveOrganizationId,
      dealInOrganization: input.dealInOrganization,
      entityInOrganization: input.entityInOrganization,
      store: input.values,
      audit: input.audit,
    });
  }
  for (const write of input.plan.writes) {
    await writeCustomFieldValue({
      actor: input.actor,
      body: {
        fieldLineageId: write.fieldLineageId,
        screenId: screen.screenId,
        sectionId: screen.sectionId,
        entityDomain: input.plan.domain,
        entityId: input.entityId,
        value: write.value,
      },
      definitions: input.definitions.filter((row) => row.lineageId === write.fieldLineageId),
      resolveOrganizationId: input.resolveOrganizationId,
      dealInOrganization: input.dealInOrganization,
      entityInOrganization: input.entityInOrganization,
      enforceProductApplicability: input.plan.domain === "opportunity" || input.plan.domain === "deal",
      productCode: input.plan.productCode,
      operation: input.plan.mode,
      placements: input.placements,
      store: input.values,
      audit: input.audit,
      now: input.now,
    });
  }
}

export async function runOperationalCommit<T>(input: {
  prepare: () => void | Promise<void>;
  transaction: <R>(work: () => Promise<R>) => Promise<R>;
  business: () => Promise<T>;
  values: () => Promise<void>;
}): Promise<T> {
  await input.prepare();
  return input.transaction(async () => {
    const entity = await input.business();
    await input.values();
    return entity;
  });
}

export function assertCanonicalValueNotShadowed(rows: CustomFieldValueRow[]): void {
  for (const row of rows) {
    if (PROTECTED_CANONICAL_LINEAGE.has(row.fieldLineageId)) {
      fail(409, "CANONICAL_FIELD_PROTECTED", "A physical field was written to custom-value storage.");
    }
  }
}

export type { DesignNewFieldDomain };
