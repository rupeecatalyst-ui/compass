/**
 * Global internal placement for an approved custom field.
 * Field definitions stay global. This module does not store entity values
 * and does not change controlsRuntime or customerFacingActivation.
 */
import type { DesignNewFieldDomain } from "./custom-field-design";
import type { CustomFieldAuditEvent } from "./custom-field-audit";
import { isLaunchDomain, resolvePlacementScreen } from "./custom-field-placement-catalogue";
import { assertFieldControlAdministrator } from "./production-governance-read";

export class CustomFieldPlacementError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export type PlacementDefinitionRecord = {
  id: string;
  fieldId: string;
  lineageId: string;
  versionNumber: number;
  classification: string;
  owningDomain: string;
  lifecycleStatus: string;
  fieldType: string;
  controlsRuntime: boolean;
  customerFacingActivation: boolean;
  selectOptionKeysJson: unknown;
  currencyUnitsJson: unknown;
  applicabilityDeclared?: boolean;
  productApplicabilityJson?: unknown;
};

export type PlacementRow = {
  id: string;
  fieldLineageId: string;
  fieldId: string;
  owningDomain: DesignNewFieldDomain;
  screenId: string;
  sectionId: string;
  showOnCreate: boolean;
  showOnEdit: boolean;
  showOnView: boolean;
  requiredOnPlacement: boolean;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  updatedByUserId: string;
};

export type PlacementIdentity = {
  fieldLineageId: string;
  owningDomain: DesignNewFieldDomain;
  screenId: string;
  sectionId: string;
};

export type PlacementListFilter = {
  fieldLineageId?: string;
  owningDomain?: DesignNewFieldDomain;
  screenId?: string;
  sectionId?: string;
  active?: boolean;
};

export type PlacementStore = {
  findByIdentity: (identity: PlacementIdentity) => Promise<PlacementRow | null>;
  findById: (id: string) => Promise<PlacementRow | null>;
  insert: (row: PlacementRow) => Promise<void>;
  replace: (row: PlacementRow) => Promise<void>;
  remove: (id: string) => Promise<void>;
  list: (filter: PlacementListFilter) => Promise<PlacementRow[]>;
};

export type PlacementActor = { role: string; userId: string };

const CREATE_KEYS = new Set([
  "fieldLineageId",
  "screenId",
  "sectionId",
  "showOnCreate",
  "showOnEdit",
  "showOnView",
  "required",
  "displayOrder",
  "active",
]);

function fail(statusCode: number, code: string, message: string): never {
  throw new CustomFieldPlacementError(statusCode, code, message);
}

function assertActor(actor: PlacementActor): void {
  try {
    assertFieldControlAdministrator(actor.role);
  } catch {
    fail(403, "FORBIDDEN", "Only administrators can govern custom field placement.");
  }
  if (typeof actor.userId !== "string" || actor.userId.length === 0) {
    fail(400, "VALIDATION_ERROR", "An actor identity is required.");
  }
}

export function governingCustomDefinition(rows: PlacementDefinitionRecord[]): PlacementDefinitionRecord {
  const approved = rows.filter(
    (row) => row.lifecycleStatus === "approved" && row.classification === "custom_field",
  );
  if (approved.length === 0) {
    const statuses = new Set(rows.map((row) => row.lifecycleStatus));
    if (statuses.has("draft")) fail(409, "DEFINITION_NOT_APPROVED", "A draft field cannot be placed.");
    if (statuses.has("checker_review")) {
      fail(409, "DEFINITION_NOT_APPROVED", "A field in checker review cannot be placed.");
    }
    if (rows.some((row) => row.classification !== "custom_field")) {
      fail(409, "CLASSIFICATION_NOT_CUSTOM", "Only a custom field can be placed.");
    }
    fail(409, "DEFINITION_NOT_APPROVED", "Only an approved custom field can be placed.");
  }
  approved.sort((left, right) => right.versionNumber - left.versionNumber);
  const governing = approved[0]!;
  if (governing.controlsRuntime !== false || governing.customerFacingActivation !== false) {
    fail(409, "DEFINITION_FLAG_LOCKED", "Custom field runtime and customer-facing flags stay off.");
  }
  if (!isLaunchDomain(governing.owningDomain)) {
    fail(400, "DOMAIN_NOT_LAUNCH", "This owning domain is outside the placement launch set.");
  }
  return governing;
}

function booleanField(body: Record<string, unknown>, key: string): boolean {
  if (typeof body[key] !== "boolean") fail(400, "VALIDATION_ERROR", `${key} must be true or false.`);
  return body[key];
}

export function parsePlacementCreateBody(raw: unknown): {
  fieldLineageId: string;
  screenId: string;
  sectionId: string;
  showOnCreate: boolean;
  showOnEdit: boolean;
  showOnView: boolean;
  requiredOnPlacement: boolean;
  displayOrder: number;
  active: boolean;
} {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    fail(400, "VALIDATION_ERROR", "Placement body must be an object.");
  }
  const body = raw as Record<string, unknown>;
  for (const key of Object.keys(body)) {
    if (!CREATE_KEYS.has(key)) fail(400, "VALIDATION_ERROR", `Unexpected placement field: ${key}.`);
  }
  if (typeof body.fieldLineageId !== "string" || body.fieldLineageId.length === 0) {
    fail(400, "VALIDATION_ERROR", "fieldLineageId is required.");
  }
  if (typeof body.screenId !== "string" || typeof body.sectionId !== "string") {
    fail(400, "VALIDATION_ERROR", "screenId and sectionId are required.");
  }
  if (typeof body.displayOrder !== "number" || !Number.isInteger(body.displayOrder) || body.displayOrder < 0) {
    fail(400, "VALIDATION_ERROR", "displayOrder must be a non-negative integer.");
  }
  return {
    fieldLineageId: body.fieldLineageId,
    screenId: body.screenId,
    sectionId: body.sectionId,
    showOnCreate: booleanField(body, "showOnCreate"),
    showOnEdit: booleanField(body, "showOnEdit"),
    showOnView: booleanField(body, "showOnView"),
    requiredOnPlacement: booleanField(body, "required"),
    displayOrder: body.displayOrder,
    active: booleanField(body, "active"),
  };
}

export function parsePlacementActiveBody(raw: unknown): { active: boolean; expectedUpdatedAt: string } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    fail(400, "VALIDATION_ERROR", "Placement update body must be an object.");
  }
  const body = raw as Record<string, unknown>;
  const keys = Object.keys(body);
  if (keys.some((key) => key !== "active" && key !== "expectedUpdatedAt")) {
    fail(400, "VALIDATION_ERROR", "Placement update accepts only active and expectedUpdatedAt.");
  }
  if (typeof body.active !== "boolean") fail(400, "VALIDATION_ERROR", "active must be true or false.");
  if (typeof body.expectedUpdatedAt !== "string" || body.expectedUpdatedAt.length === 0) {
    fail(400, "VALIDATION_ERROR", "expectedUpdatedAt is required.");
  }
  return { active: body.active, expectedUpdatedAt: body.expectedUpdatedAt };
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
    fail(500, "AUDIT_FAILED", "The placement change was reversed because audit recording failed.");
  }
}

export async function createCustomFieldPlacement(input: {
  body: unknown;
  actor: PlacementActor;
  definitions: PlacementDefinitionRecord[];
  store: PlacementStore;
  audit: (event: CustomFieldAuditEvent) => void;
  now?: string;
}): Promise<PlacementRow> {
  assertActor(input.actor);
  const parsed = parsePlacementCreateBody(input.body);
  const screen = resolvePlacementScreen(parsed.screenId, parsed.sectionId);
  if (!screen) fail(400, "UNKNOWN_SCREEN", "The screen and section are not an authorized placement target.");
  const governing = governingCustomDefinition(
    input.definitions.filter((row) => row.lineageId === parsed.fieldLineageId || row.fieldId === parsed.fieldLineageId),
  );
  if (governing.lineageId !== parsed.fieldLineageId) {
    fail(400, "VALIDATION_ERROR", "Placement uses the field lineage, not a single version id.");
  }
  if (governing.owningDomain !== screen.owningDomain) {
    fail(409, "DOMAIN_MISMATCH", "The field domain does not match the placement screen.");
  }
  const identity: PlacementIdentity = {
    fieldLineageId: governing.lineageId,
    owningDomain: screen.owningDomain,
    screenId: screen.screenId,
    sectionId: screen.sectionId,
  };
  if (await input.store.findByIdentity(identity)) {
    fail(409, "PLACEMENT_CONFLICT", "A placement already exists for this field and screen.");
  }
  const now = input.now ?? new Date().toISOString();
  const row: PlacementRow = {
    id: `fcm-placement:${identity.fieldLineageId}:${identity.screenId}:${identity.sectionId}`,
    fieldLineageId: identity.fieldLineageId,
    fieldId: governing.fieldId,
    owningDomain: identity.owningDomain,
    screenId: identity.screenId,
    sectionId: identity.sectionId,
    showOnCreate: parsed.showOnCreate,
    showOnEdit: parsed.showOnEdit,
    showOnView: parsed.showOnView,
    requiredOnPlacement: parsed.requiredOnPlacement,
    displayOrder: parsed.displayOrder,
    active: parsed.active,
    createdAt: now,
    updatedAt: now,
    createdByUserId: input.actor.userId,
    updatedByUserId: input.actor.userId,
  };
  await audited(
    async () => {
      await input.store.insert(row);
    },
    async () => {
      await input.store.remove(row.id);
    },
    input.audit,
    {
      action: row.active ? "placement_activated" : "placement_created",
      actorUserId: input.actor.userId,
      organizationId: null,
      fieldLineageId: row.fieldLineageId,
      entityId: null,
      previousValue: null,
      newValue: { active: row.active, requiredOnPlacement: row.requiredOnPlacement, screenId: row.screenId },
    },
  );
  return row;
}

export async function setCustomFieldPlacementActive(input: {
  placementId: string;
  body: unknown;
  actor: PlacementActor;
  definitions: PlacementDefinitionRecord[];
  store: PlacementStore;
  audit: (event: CustomFieldAuditEvent) => void;
  now?: string;
}): Promise<PlacementRow> {
  assertActor(input.actor);
  const parsed = parsePlacementActiveBody(input.body);
  const current = await input.store.findById(input.placementId);
  if (!current) fail(404, "PLACEMENT_NOT_FOUND", "Placement was not found.");
  if (current.updatedAt !== parsed.expectedUpdatedAt) {
    fail(409, "STALE_PLACEMENT", "The placement changed before this update.");
  }
  if (parsed.active) {
    const governing = governingCustomDefinition(
      input.definitions.filter((row) => row.lineageId === current.fieldLineageId),
    );
    if (governing.owningDomain !== current.owningDomain) {
      fail(409, "DOMAIN_MISMATCH", "The field domain does not match the placement.");
    }
  }
  if (current.active === parsed.active) return current;
  const now = input.now ?? new Date().toISOString();
  const next: PlacementRow = { ...current, active: parsed.active, updatedAt: now, updatedByUserId: input.actor.userId };
  await audited(
    async () => {
      await input.store.replace(next);
    },
    async () => {
      await input.store.replace(current);
    },
    input.audit,
    {
      action: next.active ? "placement_activated" : "placement_deactivated",
      actorUserId: input.actor.userId,
      organizationId: null,
      fieldLineageId: current.fieldLineageId,
      entityId: null,
      previousValue: { active: current.active },
      newValue: { active: next.active },
    },
  );
  return next;
}

export async function listCustomFieldPlacements(input: {
  actor: PlacementActor;
  filter: PlacementListFilter;
  store: PlacementStore;
}): Promise<PlacementRow[]> {
  assertActor(input.actor);
  return input.store.list(input.filter);
}

export function createMemoryPlacementStore(seed: PlacementRow[] = []): PlacementStore & {
  rows: PlacementRow[];
} {
  const rows = seed.map((row) => ({ ...row }));
  return {
    rows,
    async findByIdentity(identity) {
      const found = rows.find(
        (row) =>
          row.fieldLineageId === identity.fieldLineageId &&
          row.owningDomain === identity.owningDomain &&
          row.screenId === identity.screenId &&
          row.sectionId === identity.sectionId,
      );
      return found ? { ...found } : null;
    },
    async findById(id) {
      const found = rows.find((row) => row.id === id);
      return found ? { ...found } : null;
    },
    async insert(row) {
      if (rows.some((item) => item.id === row.id)) fail(409, "PLACEMENT_CONFLICT", "Placement identity already exists.");
      rows.push({ ...row });
    },
    async replace(row) {
      const index = rows.findIndex((item) => item.id === row.id);
      if (index < 0) fail(404, "PLACEMENT_NOT_FOUND", "Placement was not found.");
      rows[index] = { ...row };
    },
    async remove(id) {
      const index = rows.findIndex((item) => item.id === id);
      if (index >= 0) rows.splice(index, 1);
    },
    async list(filter) {
      return rows
        .filter((row) => (filter.fieldLineageId ? row.fieldLineageId === filter.fieldLineageId : true))
        .filter((row) => (filter.owningDomain ? row.owningDomain === filter.owningDomain : true))
        .filter((row) => (filter.screenId ? row.screenId === filter.screenId : true))
        .filter((row) => (filter.sectionId ? row.sectionId === filter.sectionId : true))
        .filter((row) => (typeof filter.active === "boolean" ? row.active === filter.active : true))
        .map((row) => ({ ...row }));
    },
  };
}
