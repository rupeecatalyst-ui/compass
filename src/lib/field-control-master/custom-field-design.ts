/**
 * Design a new governed custom field as a draft definition.
 * This module does not place the field or store entity values.
 */
import { FIELD_CONTROL_FIELD_TYPES, type FieldControlFieldType } from "@/types/field-control-master";

import { fieldControlDraftId } from "./production-governance-create";
import {
  assertFieldControlAdministrator,
  projectCertifiedFieldControlDefinition,
  type CertifiedFieldControlRecord,
  type FieldControlGovernanceDefinition,
  type FieldControlGovernedSelectOption,
} from "./production-governance-read";

export const DESIGN_NEW_FIELD_DOMAINS = ["contact", "company", "opportunity", "deal", "accounting"] as const;

export type DesignNewFieldDomain = (typeof DESIGN_NEW_FIELD_DOMAINS)[number];

export const CUSTOM_FIELD_DRAFT_BODY_KEYS = [
  "fieldId",
  "owningDomain",
  "fieldType",
  "friendlyLabel",
  "description",
  "helpText",
  "validationSummary",
  "presentationSummary",
] as const;

const LOGICAL_NAME = /^[A-Za-z][A-Za-z0-9]*$/;
const OPTION_KEY = /^[a-z][a-z0-9_]*$/;
const BODY_KEYS = new Set<string>([...CUSTOM_FIELD_DRAFT_BODY_KEYS, "options"]);
const DOMAIN_SET = new Set<string>(DESIGN_NEW_FIELD_DOMAINS);
const FIELD_TYPE_SET = new Set<string>(FIELD_CONTROL_FIELD_TYPES);

export class CustomFieldDesignRequestError extends Error {
  readonly statusCode = 400;
  readonly code = "VALIDATION_ERROR";
}

export type CustomFieldDraftCopy = {
  fieldId: string;
  owningDomain: DesignNewFieldDomain;
  fieldType: FieldControlFieldType;
  friendlyLabel: string;
  description: string;
  helpText: string;
  validationSummary: string;
  presentationSummary: string;
  options: FieldControlGovernedSelectOption[];
};

export type CustomFieldDraftInsert = {
  id: string;
  fieldId: string;
  lineageId: string;
  versionNumber: 1;
  previousVersionId: null;
  friendlyLabel: string;
  description: string;
  helpText: string;
  fieldType: FieldControlFieldType;
  classification: "custom_field";
  owningDomain: DesignNewFieldDomain;
  ownershipReview: "owner_requires_product_decision";
  sourceBindingJson: { kind: "custom_value_storage"; fieldId: string };
  aliasesJson: [];
  lifecycleStatus: "draft";
  productApplicabilityJson: [];
  customerCategoryApplicabilityJson: [];
  applicabilityDeclared: false;
  authorisedConsumersJson: [];
  validationSummary: string;
  presentationSummary: string;
  selectOptionSource: null;
  selectOptionKeysJson: FieldControlGovernedSelectOption[];
  currencyUnitsJson: ["rupees"] | [];
  candidateMirrorOf: null;
  controlsRuntime: false;
  customerFacingActivation: false;
  makerUserId: string;
  checkerUserId: null;
  effectiveFrom: null;
  effectiveUntil: null;
};

export type CustomFieldIdentityWhere = {
  OR: Array<{ id?: string; fieldId?: string; lineageId?: string }>;
};

export type CustomFieldDesignDelegate = {
  findFirst: (args: { where: CustomFieldIdentityWhere }) => Promise<CertifiedFieldControlRecord | null>;
  create: (args: { data: CustomFieldDraftInsert }) => Promise<CertifiedFieldControlRecord>;
};

export type CustomFieldDesignActor = { role: string; userId: string };

export type CustomFieldDesignSuccess = {
  ok: true;
  status: 201;
  data: { definition: FieldControlGovernanceDefinition };
};

export type CustomFieldDesignFailure = {
  ok: false;
  status: number;
  code: string;
  message: string;
};

export type CustomFieldDesignResult = CustomFieldDesignSuccess | CustomFieldDesignFailure;

type DesignDeps = {
  authenticate: (request: Request) => CustomFieldDesignActor;
  findFirst: CustomFieldDesignDelegate["findFirst"];
  create: CustomFieldDesignDelegate["create"];
};

function fail(message: string): never {
  throw new CustomFieldDesignRequestError(message);
}

function exactText(value: unknown, key: string, maxLength: number): string {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim() || value.length > maxLength) {
    fail(`Invalid ${key}.`);
  }
  return value;
}

export function isSelectFieldType(fieldType: FieldControlFieldType): boolean {
  return fieldType === "single_select" || fieldType === "multi_select";
}

export function parseCustomFieldOptions(value: unknown): FieldControlGovernedSelectOption[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    fail("Invalid options.");
  }
  const seen = new Set<string>();
  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) fail("Invalid options.");
    const record = item as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length !== 2 || !keys.includes("key") || !keys.includes("label")) fail("Invalid options.");
    const key = exactText(record.key, "option key", 80);
    const label = exactText(record.label, "option label", 200);
    if (!OPTION_KEY.test(key) || seen.has(key)) fail("Invalid options.");
    seen.add(key);
    return { key, label, sortOrder: index + 1, retired: false };
  });
}

export function parseCustomFieldDraftRequest(value: unknown): CustomFieldDraftCopy {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("Invalid request.");
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!BODY_KEYS.has(key)) fail(`Unknown property: ${key}.`);
  }
  for (const key of CUSTOM_FIELD_DRAFT_BODY_KEYS) {
    if (!(key in record)) fail(`Missing ${key}.`);
  }
  const owningDomain = record.owningDomain;
  if (typeof owningDomain !== "string" || !DOMAIN_SET.has(owningDomain)) fail("Invalid owningDomain.");
  const fieldType = record.fieldType;
  if (typeof fieldType !== "string" || !FIELD_TYPE_SET.has(fieldType)) fail("Invalid fieldType.");
  const fieldId = exactText(record.fieldId, "fieldId", 160);
  const logicalName = fieldId.slice(owningDomain.length + 1);
  if (fieldId !== `${owningDomain}.${logicalName}` || !LOGICAL_NAME.test(logicalName)) fail("Invalid fieldId.");
  const select = isSelectFieldType(fieldType as FieldControlFieldType);
  if (select && !("options" in record)) fail("Missing options.");
  if (!select && "options" in record) fail("Invalid options.");
  return {
    fieldId,
    owningDomain: owningDomain as DesignNewFieldDomain,
    fieldType: fieldType as FieldControlFieldType,
    friendlyLabel: exactText(record.friendlyLabel, "friendlyLabel", 200),
    description: exactText(record.description, "description", 4000),
    helpText: exactText(record.helpText, "helpText", 4000),
    validationSummary: exactText(record.validationSummary, "validationSummary", 4000),
    presentationSummary: exactText(record.presentationSummary, "presentationSummary", 4000),
    options: select ? parseCustomFieldOptions(record.options) : [],
  };
}

export function buildCustomFieldDraftInsert(copy: CustomFieldDraftCopy, makerUserId: string): CustomFieldDraftInsert {
  const maker = makerUserId.trim();
  if (!maker || maker !== makerUserId) fail("Invalid maker.");
  return {
    id: fieldControlDraftId(copy.fieldId),
    fieldId: copy.fieldId,
    lineageId: copy.fieldId,
    versionNumber: 1,
    previousVersionId: null,
    friendlyLabel: copy.friendlyLabel,
    description: copy.description,
    helpText: copy.helpText,
    fieldType: copy.fieldType,
    classification: "custom_field",
    owningDomain: copy.owningDomain,
    ownershipReview: "owner_requires_product_decision",
    sourceBindingJson: { kind: "custom_value_storage", fieldId: copy.fieldId },
    aliasesJson: [],
    lifecycleStatus: "draft",
    productApplicabilityJson: [],
    customerCategoryApplicabilityJson: [],
    applicabilityDeclared: false,
    authorisedConsumersJson: [],
    validationSummary: copy.validationSummary,
    presentationSummary: copy.presentationSummary,
    selectOptionSource: null,
    selectOptionKeysJson: copy.options,
    currencyUnitsJson: copy.fieldType === "currency" ? ["rupees"] : [],
    candidateMirrorOf: null,
    controlsRuntime: false,
    customerFacingActivation: false,
    makerUserId: maker,
    checkerUserId: null,
    effectiveFrom: null,
    effectiveUntil: null,
  };
}

function isUniqueConflict(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === "P2002";
}

function conflict(): CustomFieldDesignFailure {
  return {
    ok: false,
    status: 409,
    code: "FIELD_CONTROL_IDENTITY_CONFLICT",
    message: "A Field Control definition already uses this identity.",
  };
}

function toFailure(err: unknown): CustomFieldDesignFailure {
  if (isUniqueConflict(err)) return conflict();
  if (err instanceof CustomFieldDesignRequestError) {
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
  return {
    ok: false,
    status: 500,
    code: "FIELD_CONTROL_CREATE_FAILED",
    message: "Field Control definition could not be created.",
  };
}

export async function createCustomFieldDraft(request: Request, deps: DesignDeps): Promise<CustomFieldDesignResult> {
  try {
    const actor = deps.authenticate(request);
    assertFieldControlAdministrator(actor.role);
    const makerUserId = actor.userId.trim();
    if (!makerUserId || makerUserId !== actor.userId) {
      return { ok: false, status: 401, code: "UNAUTHORIZED", message: "Authentication required" };
    }
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      fail("Invalid request.");
    }
    const copy = parseCustomFieldDraftRequest(payload);
    const data = buildCustomFieldDraftInsert(copy, makerUserId);
    const existing = await deps.findFirst({
      where: { OR: [{ id: data.id }, { fieldId: data.fieldId }, { lineageId: data.lineageId }] },
    });
    if (existing) return conflict();
    try {
      const row = await deps.create({ data });
      return { ok: true, status: 201, data: { definition: projectCertifiedFieldControlDefinition(row) } };
    } catch (err) {
      if (isUniqueConflict(err)) return conflict();
      throw err;
    }
  } catch (err) {
    return toFailure(err);
  }
}
