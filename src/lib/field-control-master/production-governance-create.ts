/**
 * Create one Field Control draft from a reviewed allowlist entry.
 * This module does not update, delete, or read the inspection registry.
 */
import {
  findDraftSourceAllowlistEntry,
  type DraftSourceAllowlistEntry,
} from "./draft-source-allowlist";
import {
  assertFieldControlAdministrator,
  projectCertifiedFieldControlDefinition,
  type CertifiedFieldControlRecord,
  type FieldControlGovernanceDefinition,
} from "./production-governance-read";

export const DRAFT_CREATE_BODY_KEYS = [
  "mode",
  "allowlistEntryId",
  "friendlyLabel",
  "description",
  "helpText",
  "validationSummary",
  "presentationSummary",
] as const;

export const DRAFT_LABEL_MAX_LENGTH = 200;
export const DRAFT_TEXT_MAX_LENGTH = 4000;
export const DRAFT_ALLOWLIST_ID_MAX_LENGTH = 160;

const BODY_KEY_SET = new Set<string>(DRAFT_CREATE_BODY_KEYS);

export type FieldControlDraftInsert = {
  id: string;
  fieldId: string;
  lineageId: string;
  versionNumber: 1;
  previousVersionId: null;
  friendlyLabel: string;
  description: string;
  helpText: string;
  fieldType: CertifiedFieldControlRecord["fieldType"];
  classification: "raw_canonical" | "derived";
  owningDomain: CertifiedFieldControlRecord["owningDomain"];
  ownershipReview: "owner_requires_product_decision";
  sourceBindingJson: DraftSourceAllowlistEntry["sourceBinding"];
  aliasesJson: [];
  lifecycleStatus: "draft";
  productApplicabilityJson: [];
  customerCategoryApplicabilityJson: [];
  applicabilityDeclared: false;
  authorisedConsumersJson: [];
  validationSummary: string;
  presentationSummary: string;
  selectOptionSource: null;
  selectOptionKeysJson: [];
  currencyUnitsJson: [];
  candidateMirrorOf: null;
  controlsRuntime: false;
  customerFacingActivation: false;
  makerUserId: string;
  checkerUserId: null;
  effectiveFrom: null;
  effectiveUntil: null;
};

export type DraftConflictWhere = {
  OR?: Array<{ id?: string; fieldId?: string }>;
  sourceBindingJson?: { equals: DraftSourceAllowlistEntry["sourceBinding"] };
};

export type FieldControlDraftCreateDelegate = {
  findFirst: (args: { where: DraftConflictWhere }) => Promise<CertifiedFieldControlRecord | null>;
  create: (args: { data: FieldControlDraftInsert }) => Promise<CertifiedFieldControlRecord>;
};

export type FieldControlCreateActor = { role: string; userId: string };

export type FieldControlCreateSuccess = {
  ok: true;
  status: 201;
  data: { definition: FieldControlGovernanceDefinition };
};

export type FieldControlCreateFailure = {
  ok: false;
  status: number;
  code: string;
  message: string;
};

export type FieldControlCreateResult = FieldControlCreateSuccess | FieldControlCreateFailure;

type CreateDeps = {
  authenticate: (request: Request) => FieldControlCreateActor;
  findFirst: FieldControlDraftCreateDelegate["findFirst"];
  create: FieldControlDraftCreateDelegate["create"];
};

export class FieldControlCreateRequestError extends Error {
  readonly statusCode = 400;
  readonly code = "VALIDATION_ERROR";
}

export function fieldControlDefinitionCreateDelegate(db: object): FieldControlDraftCreateDelegate {
  const delegate = (db as { fieldControlDefinition?: FieldControlDraftCreateDelegate }).fieldControlDefinition;
  if (!delegate || typeof delegate.findFirst !== "function" || typeof delegate.create !== "function") {
    throw new Error("Certified Field Control definitions are not available from the database client.");
  }
  return {
    findFirst: (args) => delegate.findFirst(args),
    create: (args) => delegate.create(args),
  };
}

export function fieldControlDraftId(fieldId: string): string {
  return `fcm:${fieldId}:v1`;
}

function requiredText(record: Record<string, unknown>, key: string, maxLength: number): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new FieldControlCreateRequestError(`Invalid ${key}.`);
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) {
    throw new FieldControlCreateRequestError(`Invalid ${key}.`);
  }
  return trimmed;
}

export function parseFieldControlDraftRequest(value: unknown): {
  mode: DraftSourceAllowlistEntry["mode"];
  allowlistEntryId: string;
  friendlyLabel: string;
  description: string;
  helpText: string;
  validationSummary: string;
  presentationSummary: string;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new FieldControlCreateRequestError("Invalid request.");
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!BODY_KEY_SET.has(key)) {
      throw new FieldControlCreateRequestError(`Unknown property: ${key}.`);
    }
  }
  for (const key of DRAFT_CREATE_BODY_KEYS) {
    if (!(key in record)) {
      throw new FieldControlCreateRequestError(`Missing ${key}.`);
    }
  }
  const mode = record.mode;
  if (mode !== "raw_canonical" && mode !== "derived") {
    throw new FieldControlCreateRequestError("Invalid mode.");
  }
  return {
    mode,
    allowlistEntryId: requiredText(record, "allowlistEntryId", DRAFT_ALLOWLIST_ID_MAX_LENGTH),
    friendlyLabel: requiredText(record, "friendlyLabel", DRAFT_LABEL_MAX_LENGTH),
    description: requiredText(record, "description", DRAFT_TEXT_MAX_LENGTH),
    helpText: requiredText(record, "helpText", DRAFT_TEXT_MAX_LENGTH),
    validationSummary: requiredText(record, "validationSummary", DRAFT_TEXT_MAX_LENGTH),
    presentationSummary: requiredText(record, "presentationSummary", DRAFT_TEXT_MAX_LENGTH),
  };
}

export function buildFieldControlDraftInsert(
  entry: DraftSourceAllowlistEntry,
  copy: {
    friendlyLabel: string;
    description: string;
    helpText: string;
    validationSummary: string;
    presentationSummary: string;
  },
  makerUserId: string,
): FieldControlDraftInsert {
  return {
    id: fieldControlDraftId(entry.fieldId),
    fieldId: entry.fieldId,
    lineageId: entry.fieldId,
    versionNumber: 1,
    previousVersionId: null,
    friendlyLabel: copy.friendlyLabel,
    description: copy.description,
    helpText: copy.helpText,
    fieldType: entry.fieldType,
    classification: entry.classification,
    owningDomain: entry.owningDomain,
    ownershipReview: "owner_requires_product_decision",
    sourceBindingJson: entry.sourceBinding,
    aliasesJson: [],
    lifecycleStatus: "draft",
    productApplicabilityJson: [],
    customerCategoryApplicabilityJson: [],
    applicabilityDeclared: false,
    authorisedConsumersJson: [],
    validationSummary: copy.validationSummary,
    presentationSummary: copy.presentationSummary,
    selectOptionSource: null,
    selectOptionKeysJson: [],
    currencyUnitsJson: [],
    candidateMirrorOf: null,
    controlsRuntime: false,
    customerFacingActivation: false,
    makerUserId,
    checkerUserId: null,
    effectiveFrom: null,
    effectiveUntil: null,
  };
}

function isUniqueConflict(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === "P2002";
}

function conflict(): FieldControlCreateFailure {
  return {
    ok: false,
    status: 409,
    code: "FIELD_CONTROL_IDENTITY_CONFLICT",
    message: "A Field Control definition already uses this identity.",
  };
}

function toFailure(err: unknown): FieldControlCreateFailure {
  if (isUniqueConflict(err)) return conflict();
  if (err instanceof FieldControlCreateRequestError) {
    return { ok: false, status: err.statusCode, code: err.code, message: err.message };
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
  if (error.code === "FIELD_CONTROL_PROJECTION_FAILED") {
    return {
      ok: false,
      status: 500,
      code: "FIELD_CONTROL_PROJECTION_FAILED",
      message: "Field Control definition could not be projected.",
    };
  }
  return {
    ok: false,
    status: 500,
    code: "FIELD_CONTROL_CREATE_FAILED",
    message: "Field Control definition could not be created.",
  };
}

export async function createCertifiedFieldControlDraft(
  request: Request,
  deps: CreateDeps,
): Promise<FieldControlCreateResult> {
  try {
    const actor = deps.authenticate(request);
    assertFieldControlAdministrator(actor.role);
    const makerUserId = actor.userId.trim();
    if (!makerUserId) {
      return { ok: false, status: 401, code: "UNAUTHORIZED", message: "Authentication required" };
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      throw new FieldControlCreateRequestError("Invalid request.");
    }
    const body = parseFieldControlDraftRequest(payload);
    const entry = findDraftSourceAllowlistEntry(body.mode, body.allowlistEntryId);
    if (!entry) {
      throw new FieldControlCreateRequestError("Unknown allowlist entry.");
    }

    const data = buildFieldControlDraftInsert(entry, body, makerUserId);
    const identity = await deps.findFirst({
      where: { OR: [{ id: data.id }, { fieldId: data.fieldId }] },
    });
    if (identity) return conflict();
    const binding = await deps.findFirst({
      where: { sourceBindingJson: { equals: data.sourceBindingJson } },
    });
    if (binding) return conflict();

    let row: CertifiedFieldControlRecord;
    try {
      row = await deps.create({ data });
    } catch (err) {
      if (isUniqueConflict(err)) return conflict();
      throw err;
    }
    return {
      ok: true,
      status: 201,
      data: { definition: projectCertifiedFieldControlDefinition(row) },
    };
  } catch (err) {
    return toFailure(err);
  }
}
