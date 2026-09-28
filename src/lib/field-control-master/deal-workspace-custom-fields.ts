/**
 * Deal Workspace projection of active internal custom fields.
 * Placement stays global. Values stay organization-scoped.
 * This module does not write EnterpriseDeal and does not change definition flags.
 */
import { DEAL_WORKSPACE_CUSTOM_FIELDS } from "./custom-field-placement-catalogue";
import {
  governingCustomDefinition,
  type PlacementDefinitionRecord,
  type PlacementRow,
  type PlacementStore,
} from "./custom-field-placement";
import {
  clearCustomFieldValue,
  CustomFieldValueError,
  readCustomFieldValues,
  writeCustomFieldValue,
  type CustomFieldValueActor,
  type CustomFieldValueRow,
  type CustomFieldValueStore,
} from "./custom-field-value";
import type { CustomFieldAuditEvent } from "./custom-field-audit";
import { readSelectKeySets } from "./custom-field-value-contract";

export type DealWorkspaceFieldMode = "edit" | "view";

export type DealWorkspaceFieldDefinition = PlacementDefinitionRecord & {
  friendlyLabel: string;
};

export type DealCustomFieldOption = {
  key: string;
  label: string;
  retired: boolean;
  selectable: boolean;
};

export type DealCustomFieldView = {
  placementId: string;
  fieldLineageId: string;
  fieldId: string;
  friendlyLabel: string;
  fieldType: string;
  displayOrder: number;
  required: boolean;
  editable: boolean;
  value: unknown | null;
  displayLabel: string | null;
  options: DealCustomFieldOption[];
  controlsRuntime: false;
  customerFacingActivation: false;
};

const DEAL_SCREEN = DEAL_WORKSPACE_CUSTOM_FIELDS;

function fail(statusCode: number, code: string, message: string): never {
  throw new CustomFieldValueError(statusCode, code, message);
}

export function isEmptyCustomFieldValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
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
    if (typeof record.key !== "string" || typeof record.label !== "string" || typeof record.retired !== "boolean") continue;
    options.push({ key: record.key, label: record.label, retired: record.retired });
  }
  return options;
}

function currentKeys(value: unknown): string[] {
  if (typeof value === "string" && value.length > 0) return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return [];
}

export function projectDealWorkspaceCustomFields(input: {
  mode: DealWorkspaceFieldMode;
  placements: PlacementRow[];
  definitions: DealWorkspaceFieldDefinition[];
  values: CustomFieldValueRow[];
}): DealCustomFieldView[] {
  const views: DealCustomFieldView[] = [];
  for (const placement of input.placements) {
    if (!placement.active) continue;
    if (
      placement.owningDomain !== DEAL_SCREEN.owningDomain ||
      placement.screenId !== DEAL_SCREEN.screenId ||
      placement.sectionId !== DEAL_SCREEN.sectionId
    ) {
      continue;
    }
    const editable = input.mode === "edit" && placement.showOnEdit;
    const visible = input.mode === "view" ? placement.showOnView : placement.showOnEdit || placement.showOnView;
    if (!visible) continue;
    let governing: PlacementDefinitionRecord;
    try {
      governing = governingCustomDefinition(
        input.definitions.filter((row) => row.lineageId === placement.fieldLineageId),
      );
    } catch {
      continue;
    }
    if (governing.owningDomain !== "deal" || governing.controlsRuntime !== false || governing.customerFacingActivation !== false) {
      continue;
    }
    const label = input.definitions.find((row) => row.id === governing.id)?.friendlyLabel ?? governing.fieldId;
    const stored = input.values.find((row) => row.fieldLineageId === governing.lineageId) ?? null;
    const value = stored ? stored.valueJson : null;
    const selected = new Set(currentKeys(value));
    let sets: { active: Set<string>; retired: Set<string> } = { active: new Set(), retired: new Set() };
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
      editable,
      value,
      displayLabel,
      options,
      controlsRuntime: false,
      customerFacingActivation: false,
    });
  }
  views.sort((left, right) => left.displayOrder - right.displayOrder || left.fieldLineageId.localeCompare(right.fieldLineageId));
  return views;
}

async function authorizedDeal(input: {
  actor: CustomFieldValueActor;
  dealId: string;
  resolveOrganizationId: () => Promise<string>;
  dealInOrganization: (organizationId: string, entityId: string) => Promise<boolean>;
}): Promise<string> {
  if (typeof input.actor.userId !== "string" || input.actor.userId.length === 0) {
    fail(401, "UNAUTHORIZED", "Authentication is required.");
  }
  if (typeof input.dealId !== "string" || input.dealId.length === 0) {
    fail(400, "VALIDATION_ERROR", "Deal id is required.");
  }
  const organizationId = await input.resolveOrganizationId();
  if (!organizationId) fail(403, "ORGANIZATION_CONTEXT_REJECTED", "Organization context is not available.");
  const allowed = await input.dealInOrganization(organizationId, input.dealId);
  if (!allowed) fail(404, "ENTITY_NOT_IN_ORGANIZATION", "The entity is not available in the authorized organization.");
  return organizationId;
}

export async function loadDealWorkspaceCustomFields(input: {
  actor: CustomFieldValueActor;
  dealId: string;
  mode: DealWorkspaceFieldMode;
  resolveOrganizationId: () => Promise<string>;
  dealInOrganization: (organizationId: string, entityId: string) => Promise<boolean>;
  placements: PlacementStore;
  definitionsForLineage: (lineageId: string) => Promise<DealWorkspaceFieldDefinition[]>;
  values: CustomFieldValueStore;
}): Promise<DealCustomFieldView[]> {
  const organizationId = await authorizedDeal(input);
  const placements = await input.placements.list({
    owningDomain: "deal",
    screenId: DEAL_SCREEN.screenId,
    sectionId: DEAL_SCREEN.sectionId,
    active: true,
  });
  const definitions: DealWorkspaceFieldDefinition[] = [];
  for (const placement of placements) {
    definitions.push(...(await input.definitionsForLineage(placement.fieldLineageId)));
  }
  const values = await input.values.listForEntity({
    organizationId,
    entityDomain: "deal",
    entityId: input.dealId,
  });
  return projectDealWorkspaceCustomFields({
    mode: input.mode,
    placements,
    definitions,
    values,
  });
}

export async function saveDealWorkspaceCustomField(input: {
  actor: CustomFieldValueActor;
  dealId: string;
  fieldLineageId: string;
  value: unknown;
  clientOrganizationId?: string | null;
  resolveOrganizationId: () => Promise<string>;
  dealInOrganization: (organizationId: string, entityId: string) => Promise<boolean>;
  placements: PlacementStore;
  definitions: PlacementDefinitionRecord[];
  values: CustomFieldValueStore;
  audit: (event: CustomFieldAuditEvent) => void;
  now?: string;
}): Promise<{ value: unknown | null }> {
  if (input.clientOrganizationId) {
    fail(400, "ORGANIZATION_CONTEXT_REJECTED", "Organization is taken from the server context.");
  }
  await authorizedDeal(input);
  const placements = await input.placements.list({
    fieldLineageId: input.fieldLineageId,
    owningDomain: "deal",
    screenId: DEAL_SCREEN.screenId,
    sectionId: DEAL_SCREEN.sectionId,
    active: true,
  });
  const placement = placements[0];
  if (!placement) fail(409, "PLACEMENT_NOT_ACTIVE", "An active placement is required before a value can be saved.");
  if (!placement.showOnEdit) fail(409, "PLACEMENT_NOT_EDITABLE", "This placement is not open for editing.");
  if (isEmptyCustomFieldValue(input.value)) {
    if (placement.requiredOnPlacement) {
      fail(400, "REQUIRED_FIELD", "This custom field is required on the Deal Workspace placement.");
    }
    await clearCustomFieldValue({
      actor: input.actor,
      entityDomain: "deal",
      entityId: input.dealId,
      fieldLineageId: input.fieldLineageId,
      resolveOrganizationId: input.resolveOrganizationId,
      dealInOrganization: input.dealInOrganization,
      store: input.values,
      audit: input.audit,
    });
    return { value: null };
  }
  const saved = await writeCustomFieldValue({
    actor: input.actor,
    body: {
      fieldLineageId: input.fieldLineageId,
      screenId: DEAL_SCREEN.screenId,
      sectionId: DEAL_SCREEN.sectionId,
      entityDomain: "deal",
      entityId: input.dealId,
      value: input.value,
    },
    definitions: input.definitions,
    resolveOrganizationId: input.resolveOrganizationId,
    dealInOrganization: input.dealInOrganization,
    placements: input.placements,
    store: input.values,
    audit: input.audit,
    now: input.now,
  });
  return { value: saved.valueJson };
}

export async function inspectDealCustomFieldValue(input: {
  actor: CustomFieldValueActor;
  dealId: string;
  resolveOrganizationId: () => Promise<string>;
  dealInOrganization: (organizationId: string, entityId: string) => Promise<boolean>;
  values: CustomFieldValueStore;
}): Promise<CustomFieldValueRow[]> {
  await authorizedDeal(input);
  return readCustomFieldValues({
    actor: input.actor,
    entityDomain: "deal",
    entityId: input.dealId,
    resolveOrganizationId: input.resolveOrganizationId,
    dealInOrganization: input.dealInOrganization,
    store: input.values,
  });
}
