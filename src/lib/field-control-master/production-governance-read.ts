/**
 * Read-only projection of certified Field Control Master rows.
 * The database table is the source. This module does not read the inspection registry.
 */
import {
  FIELD_CONTROL_CLASSIFICATIONS,
  FIELD_CONTROL_FIELD_TYPES,
  FIELD_CONTROL_LIFECYCLE_STATUSES,
  FIELD_CONTROL_OWNING_DOMAINS,
  FIELD_CONTROL_OWNERSHIP_REVIEWS,
  type FieldControlClassification,
  type FieldControlFieldType,
  type FieldControlLifecycleStatus,
  type FieldControlOwningDomain,
  type FieldControlOwnershipReview,
} from "@/types/field-control-master";

export const FIELD_CONTROL_READ_LIMIT_MAX = 100;
export const FIELD_CONTROL_READ_QUERY_MAX_LENGTH = 200;

const LIST_QUERY_KEYS = new Set([
  "owningDomain",
  "classification",
  "lifecycleStatus",
  "ownershipReview",
  "q",
  "sort",
  "limit",
  "direction",
]);

const SORT_FIELDS = new Set([
  "fieldId",
  "friendlyLabel",
  "classification",
  "owningDomain",
  "lifecycleStatus",
]);

const GOVERNANCE_DEFINITION_KEYS = [
  "id",
  "fieldId",
  "lineageId",
  "versionNumber",
  "previousVersionId",
  "friendlyLabel",
  "description",
  "helpText",
  "fieldType",
  "currencyUnits",
  "classification",
  "owningDomain",
  "ownershipReview",
  "sourceBinding",
  "authorisedConsumers",
  "productApplicability",
  "customerCategoryApplicability",
  "aliases",
  "selectOptionKeys",
  "selectOptions",
  "selectOptionSource",
  "candidateMirrorOf",
  "validationSummary",
  "presentationSummary",
  "lifecycleStatus",
  "controlsRuntime",
  "customerFacingActivation",
  "applicabilityDeclared",
  "makerUserId",
  "checkerUserId",
  "effectiveFrom",
  "effectiveUntil",
  "createdAt",
  "updatedAt",
] as const;

export type FieldControlGovernanceSourceBinding =
  | { kind: "column"; model: string; field: string }
  | { kind: "derived_calculator"; calculatorId: string }
  | {
      kind: "assessment_fact";
      path: string;
      store: "EnterpriseOpportunityAssessment.draftFactsJson";
    }
  | { kind: "unresolved"; legacyProjectionId: string }
  | { kind: "custom_value_storage"; fieldId: string }
  | { kind: "unrecognized" };

export type FieldControlGovernedSelectOption = {
  key: string;
  label: string;
  sortOrder: number;
  retired: boolean;
};

export type FieldControlGovernanceDefinition = {
  id: string;
  fieldId: string;
  lineageId: string;
  versionNumber: number;
  previousVersionId: string | null;
  friendlyLabel: string;
  description: string;
  helpText: string;
  fieldType: FieldControlFieldType;
  currencyUnits: string[];
  classification: FieldControlClassification;
  owningDomain: FieldControlOwningDomain;
  ownershipReview: FieldControlOwnershipReview;
  sourceBinding: FieldControlGovernanceSourceBinding;
  authorisedConsumers: string[];
  productApplicability: string[];
  customerCategoryApplicability: string[];
  aliases: string[];
  selectOptionKeys: string[];
  selectOptions: FieldControlGovernedSelectOption[];
  selectOptionSource: string | null;
  candidateMirrorOf: string | null;
  validationSummary: string;
  presentationSummary: string;
  lifecycleStatus: FieldControlLifecycleStatus;
  controlsRuntime: boolean;
  customerFacingActivation: boolean;
  applicabilityDeclared: boolean;
  makerUserId: string | null;
  checkerUserId: string | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CertifiedFieldControlRecord = {
  id: string;
  fieldId: string;
  lineageId: string;
  versionNumber: number;
  previousVersionId: string | null;
  friendlyLabel: string;
  description: string;
  helpText: string;
  fieldType: string;
  classification: string;
  owningDomain: string;
  ownershipReview: string;
  sourceBindingJson: unknown;
  aliasesJson: unknown;
  lifecycleStatus: string;
  productApplicabilityJson: unknown;
  customerCategoryApplicabilityJson: unknown;
  applicabilityDeclared: boolean;
  authorisedConsumersJson: unknown;
  validationSummary: string;
  presentationSummary: string;
  selectOptionSource: string | null;
  selectOptionKeysJson: unknown;
  currencyUnitsJson: unknown;
  candidateMirrorOf: string | null;
  controlsRuntime: boolean;
  customerFacingActivation: boolean;
  makerUserId: string | null;
  checkerUserId: string | null;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type FieldControlTextFilter = { contains: string; mode: "insensitive" };

export type FieldControlListWhere = {
  AND?: FieldControlListWhere[];
  OR?: FieldControlListWhere[];
  owningDomain?: string;
  classification?: string;
  lifecycleStatus?: string;
  ownershipReview?: string;
  fieldId?: FieldControlTextFilter;
  friendlyLabel?: FieldControlTextFilter;
};

export type FieldControlListOrder = {
  fieldId?: "asc" | "desc";
  friendlyLabel?: "asc" | "desc";
  classification?: "asc" | "desc";
  owningDomain?: "asc" | "desc";
  lifecycleStatus?: "asc" | "desc";
  id?: "asc" | "desc";
};

export type FieldControlListReadArgs = {
  where: FieldControlListWhere;
  orderBy: FieldControlListOrder[];
  take?: number;
};

export type FieldControlDefinitionReadDelegate = {
  findMany: (args: FieldControlListReadArgs) => Promise<CertifiedFieldControlRecord[]>;
  findUnique: (args: { where: { id: string } }) => Promise<CertifiedFieldControlRecord | null>;
};

export type FieldControlReadActor = { role: string };

export type FieldControlReadSuccess<T> = { ok: true; status: 200; data: T };
export type FieldControlReadFailure = {
  ok: false;
  status: number;
  code: string;
  message: string;
};
export type FieldControlReadResult<T> = FieldControlReadSuccess<T> | FieldControlReadFailure;

export class FieldControlReadQueryError extends Error {
  readonly statusCode = 400;
  readonly code = "VALIDATION_ERROR";
}

export class FieldControlProjectionError extends Error {
  readonly statusCode = 500;
  readonly code = "FIELD_CONTROL_PROJECTION_FAILED";
}

type ListDeps = {
  authenticate: (request: Request) => FieldControlReadActor;
  findMany: (args: FieldControlListReadArgs) => Promise<CertifiedFieldControlRecord[]>;
};

type DetailDeps = {
  authenticate: (request: Request) => FieldControlReadActor;
  findUnique: (args: { where: { id: string } }) => Promise<CertifiedFieldControlRecord | null>;
};

function one(params: URLSearchParams, key: string): string | undefined {
  const values = params.getAll(key);
  if (values.length > 1) {
    throw new FieldControlReadQueryError(`Query parameter ${key} was repeated.`);
  }
  return values[0];
}

function enumValue<T extends string>(key: string, value: string | undefined, allowed: readonly T[]): T | undefined {
  if (value === undefined) return undefined;
  if (!allowed.includes(value as T)) {
    throw new FieldControlReadQueryError(`Invalid ${key}.`);
  }
  return value as T;
}

export function buildFieldControlListRead(params: URLSearchParams): FieldControlListReadArgs {
  for (const key of params.keys()) {
    if (!LIST_QUERY_KEYS.has(key)) {
      throw new FieldControlReadQueryError(`Unknown query parameter: ${key}.`);
    }
  }

  const owningDomain = enumValue("owningDomain", one(params, "owningDomain"), FIELD_CONTROL_OWNING_DOMAINS);
  const classification = enumValue("classification", one(params, "classification"), FIELD_CONTROL_CLASSIFICATIONS);
  const lifecycleStatus = enumValue(
    "lifecycleStatus",
    one(params, "lifecycleStatus"),
    FIELD_CONTROL_LIFECYCLE_STATUSES,
  );
  const ownershipReview = enumValue(
    "ownershipReview",
    one(params, "ownershipReview"),
    FIELD_CONTROL_OWNERSHIP_REVIEWS,
  );

  const rawQuery = one(params, "q");
  const q = rawQuery?.trim();
  if (q && q.length > FIELD_CONTROL_READ_QUERY_MAX_LENGTH) {
    throw new FieldControlReadQueryError("Query parameter q is too long.");
  }

  const sort = one(params, "sort") ?? "fieldId";
  if (!SORT_FIELDS.has(sort)) {
    throw new FieldControlReadQueryError("Invalid sort.");
  }
  const directionValue = one(params, "direction") ?? "asc";
  if (directionValue !== "asc" && directionValue !== "desc") {
    throw new FieldControlReadQueryError("Invalid direction.");
  }
  const direction = directionValue;

  const rawLimit = one(params, "limit");
  let take: number | undefined;
  if (rawLimit !== undefined) {
    if (!/^[1-9]\d*$/.test(rawLimit)) {
      throw new FieldControlReadQueryError("Invalid limit.");
    }
    take = Number(rawLimit);
    if (take > FIELD_CONTROL_READ_LIMIT_MAX) {
      throw new FieldControlReadQueryError("Invalid limit.");
    }
  }

  const and: FieldControlListWhere[] = [];
  if (owningDomain) and.push({ owningDomain });
  if (classification) and.push({ classification });
  if (lifecycleStatus) and.push({ lifecycleStatus });
  if (ownershipReview) and.push({ ownershipReview });
  if (q) {
    and.push({
      OR: [
        { fieldId: { contains: q, mode: "insensitive" } },
        { friendlyLabel: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  return {
    where: and.length > 0 ? { AND: and } : {},
    orderBy: [sortOrder(sort, direction), { id: "asc" }],
    ...(take === undefined ? {} : { take }),
  };
}

function sortOrder(sort: string, direction: "asc" | "desc"): FieldControlListOrder {
  switch (sort) {
    case "friendlyLabel":
      return { friendlyLabel: direction };
    case "classification":
      return { classification: direction };
    case "owningDomain":
      return { owningDomain: direction };
    case "lifecycleStatus":
      return { lifecycleStatus: direction };
    case "fieldId":
      return { fieldId: direction };
    default:
      throw new FieldControlReadQueryError("Invalid sort.");
  }
}

function textArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new FieldControlProjectionError(`Field Control ${field} is not a string array.`);
  }
  return [...value];
}

function timestamp(value: Date | null, field: string): string | null {
  if (value === null) return null;
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new FieldControlProjectionError(`Field Control ${field} is not a timestamp.`);
  }
  return value.toISOString();
}

function requiredTimestamp(value: Date, field: string): string {
  const projected = timestamp(value, field);
  if (projected === null) {
    throw new FieldControlProjectionError(`Field Control ${field} is not a timestamp.`);
  }
  return projected;
}

export function projectFieldControlSourceBinding(value: unknown): FieldControlGovernanceSourceBinding {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { kind: "unrecognized" };
  }
  const record = value as Record<string, unknown>;
  if (record.kind === "column" && nonEmpty(record.model) && nonEmpty(record.field)) {
    return { kind: "column", model: record.model, field: record.field };
  }
  if (record.kind === "derived_calculator" && nonEmpty(record.calculatorId)) {
    return { kind: "derived_calculator", calculatorId: record.calculatorId };
  }
  if (
    record.kind === "assessment_fact" &&
    nonEmpty(record.path) &&
    record.store === "EnterpriseOpportunityAssessment.draftFactsJson"
  ) {
    return {
      kind: "assessment_fact",
      path: record.path,
      store: "EnterpriseOpportunityAssessment.draftFactsJson",
    };
  }
  if (record.kind === "unresolved" && nonEmpty(record.legacyProjectionId)) {
    return { kind: "unresolved", legacyProjectionId: record.legacyProjectionId };
  }
  if (record.kind === "custom_value_storage" && nonEmpty(record.fieldId)) {
    return { kind: "custom_value_storage", fieldId: record.fieldId };
  }
  return { kind: "unrecognized" };
}

function projectSelectOptions(value: unknown): {
  selectOptionKeys: string[];
  selectOptions: FieldControlGovernedSelectOption[];
} {
  if (!Array.isArray(value)) {
    throw new FieldControlProjectionError("Field Control selectOptionKeys is not a string array.");
  }
  if (value.every((item) => typeof item === "string")) {
    return { selectOptionKeys: [...value], selectOptions: [] };
  }
  const options: FieldControlGovernedSelectOption[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new FieldControlProjectionError("Field Control selectOptionKeys is not a string array.");
    }
    const record = item as Record<string, unknown>;
    if (
      typeof record.key !== "string" ||
      typeof record.label !== "string" ||
      typeof record.sortOrder !== "number" ||
      !Number.isInteger(record.sortOrder) ||
      typeof record.retired !== "boolean"
    ) {
      throw new FieldControlProjectionError("Field Control selectOptionKeys is not a string array.");
    }
    options.push({
      key: record.key,
      label: record.label,
      sortOrder: record.sortOrder,
      retired: record.retired,
    });
  }
  return {
    selectOptionKeys: [...options]
      .sort((left, right) => left.sortOrder - right.sortOrder || left.key.localeCompare(right.key))
      .map((option) => option.key),
    selectOptions: options,
  };
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function closedEnum<T extends string>(value: string, allowed: readonly T[], field: string): T {
  if (!allowed.includes(value as T)) {
    throw new FieldControlProjectionError(`Field Control ${field} is not a known value.`);
  }
  return value as T;
}

export function projectCertifiedFieldControlDefinition(
  row: CertifiedFieldControlRecord,
): FieldControlGovernanceDefinition {
  const definition: FieldControlGovernanceDefinition = {
    id: row.id,
    fieldId: row.fieldId,
    lineageId: row.lineageId,
    versionNumber: row.versionNumber,
    previousVersionId: row.previousVersionId,
    friendlyLabel: row.friendlyLabel,
    description: row.description,
    helpText: row.helpText,
    fieldType: closedEnum(row.fieldType, FIELD_CONTROL_FIELD_TYPES, "fieldType"),
    currencyUnits: textArray(row.currencyUnitsJson, "currencyUnits"),
    classification: closedEnum(row.classification, FIELD_CONTROL_CLASSIFICATIONS, "classification"),
    owningDomain: closedEnum(row.owningDomain, FIELD_CONTROL_OWNING_DOMAINS, "owningDomain"),
    ownershipReview: closedEnum(row.ownershipReview, FIELD_CONTROL_OWNERSHIP_REVIEWS, "ownershipReview"),
    sourceBinding: projectFieldControlSourceBinding(row.sourceBindingJson),
    authorisedConsumers: textArray(row.authorisedConsumersJson, "authorisedConsumers"),
    productApplicability: textArray(row.productApplicabilityJson, "productApplicability"),
    customerCategoryApplicability: textArray(
      row.customerCategoryApplicabilityJson,
      "customerCategoryApplicability",
    ),
    aliases: textArray(row.aliasesJson, "aliases"),
    ...projectSelectOptions(row.selectOptionKeysJson),
    selectOptionSource: row.selectOptionSource,
    candidateMirrorOf: row.candidateMirrorOf,
    validationSummary: row.validationSummary,
    presentationSummary: row.presentationSummary,
    lifecycleStatus: closedEnum(row.lifecycleStatus, FIELD_CONTROL_LIFECYCLE_STATUSES, "lifecycleStatus"),
    controlsRuntime: row.controlsRuntime,
    customerFacingActivation: row.customerFacingActivation,
    applicabilityDeclared: row.applicabilityDeclared,
    makerUserId: row.makerUserId,
    checkerUserId: row.checkerUserId,
    effectiveFrom: timestamp(row.effectiveFrom, "effectiveFrom"),
    effectiveUntil: timestamp(row.effectiveUntil, "effectiveUntil"),
    createdAt: requiredTimestamp(row.createdAt, "createdAt"),
    updatedAt: requiredTimestamp(row.updatedAt, "updatedAt"),
  };
  return definition;
}

export function governanceDefinitionKeys(): readonly string[] {
  return GOVERNANCE_DEFINITION_KEYS;
}

export function fieldControlDefinitionReader(db: object): FieldControlDefinitionReadDelegate {
  const delegate = (db as { fieldControlDefinition?: FieldControlDefinitionReadDelegate }).fieldControlDefinition;
  if (!delegate || typeof delegate.findMany !== "function" || typeof delegate.findUnique !== "function") {
    throw new Error("Certified Field Control definitions are not available from the database client.");
  }
  return delegate;
}

export function assertFieldControlAdministrator(role: string): void {
  if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can view Field Control definitions"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

function toFailure(err: unknown): FieldControlReadFailure {
  if (err instanceof FieldControlReadQueryError) {
    return { ok: false, status: err.statusCode, code: err.code, message: err.message };
  }
  if (err instanceof FieldControlProjectionError) {
    return {
      ok: false,
      status: err.statusCode,
      code: err.code,
      message: "Field Control definition could not be projected.",
    };
  }
  if (typeof err === "object" && err !== null && "status" in err && "body" in err) {
    const auth = err as { status: number; body: { error?: { code?: string; message?: string } } };
    return {
      ok: false,
      status: auth.status,
      code: auth.body.error?.code ?? "UNAUTHORIZED",
      message: auth.body.error?.message ?? "Authentication required",
    };
  }
  const error = err as { statusCode?: number; code?: string; message?: string };
  if (error.statusCode === 403) {
    return {
      ok: false,
      status: 403,
      code: error.code ?? "FORBIDDEN",
      message: error.message || "Forbidden",
    };
  }
  return {
    ok: false,
    status: 500,
    code: "FIELD_CONTROL_READ_FAILED",
    message: "Field Control definitions could not be read.",
  };
}

export async function readCertifiedFieldControlList(
  request: Request,
  deps: ListDeps,
): Promise<FieldControlReadResult<{ definitions: FieldControlGovernanceDefinition[] }>> {
  try {
    const actor = deps.authenticate(request);
    assertFieldControlAdministrator(actor.role);
    const args = buildFieldControlListRead(new URL(request.url).searchParams);
    const rows = await deps.findMany(args);
    return { ok: true, status: 200, data: { definitions: rows.map(projectCertifiedFieldControlDefinition) } };
  } catch (err) {
    return toFailure(err);
  }
}

export async function readCertifiedFieldControlDetail(
  request: Request,
  id: string,
  deps: DetailDeps,
): Promise<FieldControlReadResult<{ definition: FieldControlGovernanceDefinition }>> {
  try {
    const actor = deps.authenticate(request);
    assertFieldControlAdministrator(actor.role);
    const trimmed = id.trim();
    if (!trimmed) {
      return { ok: false, status: 404, code: "NOT_FOUND", message: "Field Control definition not found" };
    }
    const row = await deps.findUnique({ where: { id: trimmed } });
    if (!row) {
      return { ok: false, status: 404, code: "NOT_FOUND", message: "Field Control definition not found" };
    }
    return { ok: true, status: 200, data: { definition: projectCertifiedFieldControlDefinition(row) } };
  } catch (err) {
    return toFailure(err);
  }
}
