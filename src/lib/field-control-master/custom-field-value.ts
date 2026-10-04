/**
 * Organization-scoped custom field values.
 * Organization id comes from the server resolver. A client-supplied organization is rejected.
 * A normal write requires an active placement. Clear removes only that one value row.
 */
import type { DesignNewFieldDomain } from "./custom-field-design";
import type { CustomFieldAuditEvent } from "./custom-field-audit";
import {
  governingCustomDefinition,
  type PlacementDefinitionRecord,
  type PlacementListFilter,
  type PlacementRow,
  type PlacementStore,
} from "./custom-field-placement";
import { resolvePlacementScreen } from "./custom-field-placement-catalogue";
import { productApplicabilityPermits } from "./custom-field-product-applicability";
import { CustomFieldValueContractError, validateCustomFieldValue } from "./custom-field-value-contract";

export class CustomFieldValueError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export type CustomFieldValueRow = {
  id: string;
  organizationId: string;
  fieldLineageId: string;
  fieldId: string;
  definitionVersionIdCapturedUnder: string;
  entityDomain: DesignNewFieldDomain;
  entityId: string;
  valueJson: unknown;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  updatedByUserId: string;
};

export type CustomFieldValueKey = {
  organizationId: string;
  fieldLineageId: string;
  entityDomain: DesignNewFieldDomain;
  entityId: string;
};

export type CustomFieldValueStore = {
  findByKey: (key: CustomFieldValueKey) => Promise<CustomFieldValueRow | null>;
  insert: (row: CustomFieldValueRow) => Promise<void>;
  replace: (row: CustomFieldValueRow) => Promise<void>;
  removeByKey: (key: CustomFieldValueKey) => Promise<boolean>;
  listForEntity: (input: { organizationId: string; entityDomain: DesignNewFieldDomain; entityId: string }) => Promise<CustomFieldValueRow[]>;
};

export type CustomFieldValueActor = { userId: string; role?: string };

const WRITE_KEYS = new Set(["fieldLineageId", "screenId", "sectionId", "entityDomain", "entityId", "value"]);

function fail(statusCode: number, code: string, message: string): never {
  throw new CustomFieldValueError(statusCode, code, message);
}

function assertUser(actor: CustomFieldValueActor): void {
  if (typeof actor.userId !== "string" || actor.userId.length === 0) {
    fail(401, "UNAUTHORIZED", "Authentication is required.");
  }
}

function asRecord(raw: unknown, message: string): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) fail(400, "VALIDATION_ERROR", message);
  return raw as Record<string, unknown>;
}

function rejectClientOrganization(body: Record<string, unknown>): void {
  if ("organizationId" in body || "organisationId" in body) {
    fail(400, "ORGANIZATION_CONTEXT_REJECTED", "Organization is taken from the server context.");
  }
}

const VALIDATED_ENTITY_DOMAINS = new Set(["contact", "company", "opportunity", "deal"]);

async function authorizedEntity(input: {
  organizationId: string;
  entityDomain: string;
  entityId: string;
  dealInOrganization?: (organizationId: string, entityId: string) => Promise<boolean>;
  entityInOrganization?: (
    organizationId: string,
    entityDomain: string,
    entityId: string,
  ) => Promise<boolean>;
}): Promise<DesignNewFieldDomain> {
  if (!VALIDATED_ENTITY_DOMAINS.has(input.entityDomain)) {
    fail(409, "ENTITY_DOMAIN_NOT_VALIDATED", "This entity domain is not validated for custom field values.");
  }
  if (input.entityDomain === "deal") {
    if (!input.dealInOrganization) {
      fail(409, "ENTITY_DOMAIN_NOT_VALIDATED", "Deal membership validation is required.");
    }
    const allowed = await input.dealInOrganization(input.organizationId, input.entityId);
    if (!allowed) fail(404, "ENTITY_NOT_IN_ORGANIZATION", "The entity is not available in the authorized organization.");
    return "deal";
  }
  if (!input.entityInOrganization) {
    fail(409, "ENTITY_DOMAIN_NOT_VALIDATED", "Entity membership validation is required for this domain.");
  }
  const allowed = await input.entityInOrganization(
    input.organizationId,
    input.entityDomain,
    input.entityId,
  );
  if (!allowed) fail(404, "ENTITY_NOT_IN_ORGANIZATION", "The entity is not available in the authorized organization.");
  return input.entityDomain as DesignNewFieldDomain;
}

async function audited(
  apply: () => Promise<void>,
  rollback: () => Promise<void>,
  audit: (event: CustomFieldAuditEvent) => void,
  event: CustomFieldAuditEvent,
): Promise<void> {
  await apply();
  try {
    audit(event);
  } catch {
    await rollback();
    fail(500, "AUDIT_FAILED", "The value change was reversed because audit recording failed.");
  }
}

async function activePlacement(input: {
  store: PlacementStore;
  lineageId: string;
  entityDomain: DesignNewFieldDomain;
  screenId: string;
  sectionId: string;
}): Promise<PlacementRow> {
  const filter: PlacementListFilter = {
    fieldLineageId: input.lineageId,
    owningDomain: input.entityDomain,
    screenId: input.screenId,
    sectionId: input.sectionId,
    active: true,
  };
  const rows = await input.store.list(filter);
  const placement = rows[0];
  if (!placement) fail(409, "PLACEMENT_NOT_ACTIVE", "An active placement is required before a value can be saved.");
  return placement;
}

export async function readCustomFieldValues(input: {
  actor: CustomFieldValueActor;
  entityDomain: string;
  entityId: string;
  resolveOrganizationId: () => Promise<string>;
  dealInOrganization?: (organizationId: string, entityId: string) => Promise<boolean>;
  entityInOrganization?: (
    organizationId: string,
    entityDomain: string,
    entityId: string,
  ) => Promise<boolean>;
  store: CustomFieldValueStore;
}): Promise<CustomFieldValueRow[]> {
  assertUser(input.actor);
  if (typeof input.entityId !== "string" || input.entityId.length === 0) {
    fail(400, "VALIDATION_ERROR", "entityId is required.");
  }
  const organizationId = await input.resolveOrganizationId();
  if (typeof organizationId !== "string" || organizationId.length === 0) {
    fail(403, "ORGANIZATION_CONTEXT_REJECTED", "Organization context is not available.");
  }
  const entityDomain = await authorizedEntity({
    organizationId,
    entityDomain: input.entityDomain,
    entityId: input.entityId,
    dealInOrganization: input.dealInOrganization,
    entityInOrganization: input.entityInOrganization,
  });
  return input.store.listForEntity({ organizationId, entityDomain, entityId: input.entityId });
}

export async function writeCustomFieldValue(input: {
  actor: CustomFieldValueActor;
  body: unknown;
  definitions: PlacementDefinitionRecord[];
  resolveOrganizationId: () => Promise<string>;
  dealInOrganization?: (organizationId: string, entityId: string) => Promise<boolean>;
  entityInOrganization?: (
    organizationId: string,
    entityDomain: string,
    entityId: string,
  ) => Promise<boolean>;
  enforceProductApplicability?: boolean;
  productCode?: string | null;
  operation?: "create" | "edit";
  placements: PlacementStore;
  store: CustomFieldValueStore;
  audit: (event: CustomFieldAuditEvent) => void;
  now?: string;
}): Promise<CustomFieldValueRow> {
  assertUser(input.actor);
  const body = asRecord(input.body, "Value body must be an object.");
  rejectClientOrganization(body);
  for (const key of Object.keys(body)) {
    if (!WRITE_KEYS.has(key)) fail(400, "VALIDATION_ERROR", `Unexpected value field: ${key}.`);
  }
  if (typeof body.fieldLineageId !== "string" || typeof body.screenId !== "string" || typeof body.sectionId !== "string") {
    fail(400, "VALIDATION_ERROR", "fieldLineageId, screenId, and sectionId are required.");
  }
  if (typeof body.entityDomain !== "string" || typeof body.entityId !== "string" || body.entityId.length === 0) {
    fail(400, "VALIDATION_ERROR", "entityDomain and entityId are required.");
  }
  const screen = resolvePlacementScreen(body.screenId, body.sectionId);
  if (!screen) fail(400, "UNKNOWN_SCREEN", "The screen and section are not an authorized placement target.");
  const organizationId = await input.resolveOrganizationId();
  if (!organizationId) fail(403, "ORGANIZATION_CONTEXT_REJECTED", "Organization context is not available.");
  const entityDomain = await authorizedEntity({
    organizationId,
    entityDomain: body.entityDomain,
    entityId: body.entityId,
    dealInOrganization: input.dealInOrganization,
    entityInOrganization: input.entityInOrganization,
  });
  if (entityDomain !== screen.owningDomain) {
    fail(409, "DOMAIN_MISMATCH", "The entity domain does not match the placement screen.");
  }
  const governing = governingCustomDefinition(
    input.definitions.filter((row) => row.lineageId === body.fieldLineageId),
  );
  if (governing.owningDomain !== entityDomain) {
    fail(409, "DOMAIN_MISMATCH", "The field domain does not match the entity.");
  }
  const placement = await activePlacement({
    store: input.placements,
    lineageId: governing.lineageId,
    entityDomain,
    screenId: screen.screenId,
    sectionId: screen.sectionId,
  });
  if (input.operation === "create" && !placement.showOnCreate) {
    fail(409, "PLACEMENT_NOT_VISIBLE", "This placement is not open for create.");
  }
  if (input.operation === "edit" && !placement.showOnEdit) {
    fail(409, "PLACEMENT_NOT_EDITABLE", "This placement is not open for editing.");
  }
  if (
    input.enforceProductApplicability &&
    !productApplicabilityPermits(governing, entityDomain, input.productCode ?? null)
  ) {
    fail(409, "PRODUCT_NOT_APPLICABLE", "This custom field does not apply to the current product.");
  }
  const key: CustomFieldValueKey = {
    organizationId,
    fieldLineageId: governing.lineageId,
    entityDomain,
    entityId: body.entityId,
  };
  const existing = await input.store.findByKey(key);
  let valueJson: unknown;
  try {
    valueJson = validateCustomFieldValue({
      fieldType: governing.fieldType,
      raw: body.value,
      selectOptionKeysJson: governing.selectOptionKeysJson,
      existingValue: existing ? existing.valueJson : undefined,
    });
  } catch (error) {
    if (error instanceof CustomFieldValueContractError) fail(error.statusCode, error.code, error.message);
    throw error;
  }
  const now = input.now ?? new Date().toISOString();
  const next: CustomFieldValueRow = existing
    ? {
        ...existing,
        fieldId: governing.fieldId,
        definitionVersionIdCapturedUnder: governing.id,
        valueJson,
        updatedAt: now,
        updatedByUserId: input.actor.userId,
      }
    : {
        id: `fcm-value:${organizationId}:${governing.lineageId}:${entityDomain}:${body.entityId}`,
        organizationId,
        fieldLineageId: governing.lineageId,
        fieldId: governing.fieldId,
        definitionVersionIdCapturedUnder: governing.id,
        entityDomain,
        entityId: body.entityId,
        valueJson,
        createdAt: now,
        updatedAt: now,
        createdByUserId: input.actor.userId,
        updatedByUserId: input.actor.userId,
      };
  await audited(
    async () => {
      if (existing) await input.store.replace(next);
      else await input.store.insert(next);
    },
    async () => {
      if (existing) await input.store.replace(existing);
      else await input.store.removeByKey(key);
    },
    input.audit,
    {
      action: existing ? "value_updated" : "value_created",
      actorUserId: input.actor.userId,
      organizationId,
      fieldLineageId: governing.lineageId,
      entityId: body.entityId,
      previousValue: existing ? existing.valueJson : null,
      newValue: valueJson,
    },
  );
  return next;
}

export async function clearCustomFieldValue(input: {
  actor: CustomFieldValueActor;
  entityDomain: string;
  entityId: string;
  fieldLineageId: string;
  clientOrganizationId?: string | null;
  resolveOrganizationId: () => Promise<string>;
  dealInOrganization?: (organizationId: string, entityId: string) => Promise<boolean>;
  entityInOrganization?: (
    organizationId: string,
    entityDomain: string,
    entityId: string,
  ) => Promise<boolean>;
  store: CustomFieldValueStore;
  audit: (event: CustomFieldAuditEvent) => void;
}): Promise<{ cleared: boolean }> {
  assertUser(input.actor);
  if (input.clientOrganizationId) {
    fail(400, "ORGANIZATION_CONTEXT_REJECTED", "Organization is taken from the server context.");
  }
  if (typeof input.fieldLineageId !== "string" || input.fieldLineageId.length === 0) {
    fail(400, "VALIDATION_ERROR", "fieldLineageId is required.");
  }
  const organizationId = await input.resolveOrganizationId();
  if (!organizationId) fail(403, "ORGANIZATION_CONTEXT_REJECTED", "Organization context is not available.");
  const entityDomain = await authorizedEntity({
    organizationId,
    entityDomain: input.entityDomain,
    entityId: input.entityId,
    dealInOrganization: input.dealInOrganization,
    entityInOrganization: input.entityInOrganization,
  });
  const key: CustomFieldValueKey = {
    organizationId,
    fieldLineageId: input.fieldLineageId,
    entityDomain,
    entityId: input.entityId,
  };
  const existing = await input.store.findByKey(key);
  if (!existing) return { cleared: false };
  await audited(
    async () => {
      await input.store.removeByKey(key);
    },
    async () => {
      await input.store.insert(existing);
    },
    input.audit,
    {
      action: "value_cleared",
      actorUserId: input.actor.userId,
      organizationId,
      fieldLineageId: input.fieldLineageId,
      entityId: input.entityId,
      previousValue: existing.valueJson,
      newValue: null,
    },
  );
  return { cleared: true };
}

export function createMemoryCustomFieldValueStore(seed: CustomFieldValueRow[] = []): CustomFieldValueStore & {
  rows: CustomFieldValueRow[];
} {
  const rows = seed.map((row) => ({ ...row, valueJson: structuredClone(row.valueJson) }));
  function matches(row: CustomFieldValueRow, key: CustomFieldValueKey): boolean {
    return (
      row.organizationId === key.organizationId &&
      row.fieldLineageId === key.fieldLineageId &&
      row.entityDomain === key.entityDomain &&
      row.entityId === key.entityId
    );
  }
  return {
    rows,
    async findByKey(key) {
      const found = rows.find((row) => matches(row, key));
      return found ? { ...found, valueJson: structuredClone(found.valueJson) } : null;
    },
    async insert(row) {
      if (rows.some((item) => item.id === row.id || matches(item, row))) {
        fail(409, "VALUE_CONFLICT", "A current value already exists for this organization, field, and entity.");
      }
      rows.push({ ...row, valueJson: structuredClone(row.valueJson) });
    },
    async replace(row) {
      const index = rows.findIndex((item) => item.id === row.id);
      if (index < 0) fail(404, "VALUE_NOT_FOUND", "Custom field value was not found.");
      rows[index] = { ...row, valueJson: structuredClone(row.valueJson) };
    },
    async removeByKey(key) {
      const index = rows.findIndex((row) => matches(row, key));
      if (index < 0) return false;
      rows.splice(index, 1);
      return true;
    },
    async listForEntity(query) {
      return rows
        .filter(
          (row) =>
            row.organizationId === query.organizationId &&
            row.entityDomain === query.entityDomain &&
            row.entityId === query.entityId,
        )
        .map((row) => ({ ...row, valueJson: structuredClone(row.valueJson) }));
    },
  };
}
