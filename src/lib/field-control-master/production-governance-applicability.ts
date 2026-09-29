/**
 * Create the next Field Control version for a product-applicability proposal.
 * The source version is not updated. Runtime flags stay false.
 */
import { CANONICAL_PRODUCT_MASTER_SEED } from "@/constants/enterprise-product-master/canonical-catalog";
import {
  assertFieldControlAdministrator,
  projectCertifiedFieldControlDefinition,
  type CertifiedFieldControlRecord,
  type FieldControlGovernanceDefinition,
} from "./production-governance-read";
import { parseExpectedUpdatedAt } from "./production-governance-lifecycle";
import {
  isOpportunityFormEmploymentTypeCode,
  opportunityFormEmploymentTypeCodes,
} from "./opportunity-employment-applicability";

export const APPLICABILITY_VERSION_BODY_KEYS = ["productCodes", "expectedUpdatedAt"] as const;

const BODY_KEYS = new Set<string>(APPLICABILITY_VERSION_BODY_KEYS);

export function canonicalEnterpriseProductCodes(): readonly string[] {
  return CANONICAL_PRODUCT_MASTER_SEED.map((entry) => entry.code);
}

export function fieldControlApplicabilityVersionPath(id: string): string {
  return `/api/admin/field-control-definitions/${encodeURIComponent(id)}/applicability-version`;
}

export function fieldControlEmploymentApplicabilityVersionPath(id: string): string {
  return `/api/admin/field-control-definitions/${encodeURIComponent(id)}/employment-applicability-version`;
}

export const EMPLOYMENT_APPLICABILITY_VERSION_BODY_KEYS = [
  "declared",
  "employmentTypeCodes",
  "expectedUpdatedAt",
] as const;

export type FieldControlApplicabilityInsert = {
  id: string;
  fieldId: string;
  lineageId: string;
  versionNumber: number;
  previousVersionId: string;
  friendlyLabel: string;
  description: string;
  helpText: string;
  fieldType: string;
  classification: string;
  owningDomain: string;
  ownershipReview: "owner_requires_product_decision";
  sourceBindingJson: unknown;
  aliasesJson: string[];
  lifecycleStatus: "draft";
  productApplicabilityJson: string[];
  customerCategoryApplicabilityJson: string[];
  applicabilityDeclared: true;
  employmentTypeApplicabilityJson: string[];
  employmentApplicabilityDeclared: boolean;
  authorisedConsumersJson: string[];
  validationSummary: string;
  presentationSummary: string;
  selectOptionSource: string | null;
  selectOptionKeysJson: string[];
  currencyUnitsJson: string[];
  candidateMirrorOf: string | null;
  controlsRuntime: false;
  customerFacingActivation: false;
  makerUserId: string;
  checkerUserId: null;
  effectiveFrom: null;
  effectiveUntil: null;
};

export type FieldControlApplicabilityDelegate = {
  findUnique: (args: { where: { id: string } }) => Promise<CertifiedFieldControlRecord | null>;
  findMany: (args: { where: { fieldId: string } }) => Promise<CertifiedFieldControlRecord[]>;
  create: (args: { data: FieldControlApplicabilityInsert }) => Promise<CertifiedFieldControlRecord>;
};

export type FieldControlApplicabilityActor = { role: string; userId: string };

export type FieldControlApplicabilitySuccess = {
  ok: true;
  status: 201;
  data: { definition: FieldControlGovernanceDefinition };
};

export type FieldControlApplicabilityFailure = {
  ok: false;
  status: number;
  code: string;
  message: string;
};

export type FieldControlApplicabilityResult = FieldControlApplicabilitySuccess | FieldControlApplicabilityFailure;

type ApplicabilityDeps = {
  authenticate: (request: Request) => FieldControlApplicabilityActor;
  findUnique: FieldControlApplicabilityDelegate["findUnique"];
  findMany: FieldControlApplicabilityDelegate["findMany"];
  create: FieldControlApplicabilityDelegate["create"];
  knownProductCodes: readonly string[];
};

export class FieldControlApplicabilityRequestError extends Error {
  readonly statusCode = 400;
  readonly code = "VALIDATION_ERROR";
}

export function fieldControlDefinitionApplicabilityDelegate(db: object): FieldControlApplicabilityDelegate {
  const delegate = (db as { fieldControlDefinition?: FieldControlApplicabilityDelegate }).fieldControlDefinition;
  if (
    !delegate ||
    typeof delegate.findUnique !== "function" ||
    typeof delegate.findMany !== "function" ||
    typeof delegate.create !== "function"
  ) {
    throw new Error("Certified Field Control definitions are not available from the database client.");
  }
  return {
    findUnique: (args) => delegate.findUnique(args),
    findMany: (args) => delegate.findMany(args),
    create: (args) => delegate.create(args),
  };
}

function conflict(message: string): FieldControlApplicabilityFailure {
  return {
    ok: false,
    status: 409,
    code: "FIELD_CONTROL_APPLICABILITY_CONFLICT",
    message,
  };
}

export function parseApplicabilityVersionRequest(value: unknown): { productCodes: string[]; expectedUpdatedAt: Date } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new FieldControlApplicabilityRequestError("Invalid request.");
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!BODY_KEYS.has(key)) {
      throw new FieldControlApplicabilityRequestError(`Unknown property: ${key}.`);
    }
  }
  for (const key of APPLICABILITY_VERSION_BODY_KEYS) {
    if (!(key in record)) {
      throw new FieldControlApplicabilityRequestError(`Missing ${key}.`);
    }
  }
  return {
    productCodes: parseProductCodes(record.productCodes),
    expectedUpdatedAt: parseExpectedUpdatedAt(record.expectedUpdatedAt),
  };
}

export function parseProductCodes(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new FieldControlApplicabilityRequestError("At least one product is required.");
  }
  const codes: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item !== item.trim() || item.length === 0) {
      throw new FieldControlApplicabilityRequestError("Invalid product code.");
    }
    if (codes.includes(item)) {
      throw new FieldControlApplicabilityRequestError("Duplicate product code.");
    }
    codes.push(item);
  }
  return codes;
}

export function assertKnownProductCodes(codes: readonly string[], knownProductCodes: readonly string[]): string[] {
  const known = new Set(knownProductCodes);
  for (const code of codes) {
    if (!known.has(code)) {
      throw new FieldControlApplicabilityRequestError("Unknown product code.");
    }
  }
  return [...codes];
}

function copiedEmploymentApplicability(source: CertifiedFieldControlRecord): {
  employmentTypeApplicabilityJson: string[];
  employmentApplicabilityDeclared: boolean;
} | null {
  if (source.employmentTypeApplicabilityJson === undefined && source.employmentApplicabilityDeclared === undefined) {
    return { employmentTypeApplicabilityJson: [], employmentApplicabilityDeclared: false };
  }
  const list = preservedStringList(source.employmentTypeApplicabilityJson ?? []);
  if (!list) return null;
  return {
    employmentTypeApplicabilityJson: list,
    employmentApplicabilityDeclared: source.employmentApplicabilityDeclared === true,
  };
}

function preservedStringList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) return null;
  return [...value];
}

function isUniqueConflict(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === "P2002";
}

export function planApplicabilityVersion(input: {
  actorUserId: string;
  source: CertifiedFieldControlRecord;
  versions: readonly CertifiedFieldControlRecord[];
  productCodes: readonly string[];
  expectedUpdatedAt: Date;
}): FieldControlApplicabilityFailure | { data: FieldControlApplicabilityInsert } {
  if (input.source.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
    return conflict("The definition changed before this proposal was saved.");
  }
  if (input.source.lifecycleStatus !== "approved" || input.source.ownershipReview !== "owner_requires_product_decision") {
    return conflict("Only an approved definition awaiting a product decision can propose applicability.");
  }
  const highest = input.versions.reduce((max, row) => Math.max(max, row.versionNumber), 0);
  if (highest !== input.source.versionNumber) {
    return conflict("A newer version already exists for this field.");
  }
  const nextVersion = input.source.versionNumber + 1;
  const nextId = `fcm:${input.source.fieldId}:v${nextVersion}`;
  if (input.versions.some((row) => row.versionNumber === nextVersion || row.id === nextId)) {
    return conflict("A newer version already exists for this field.");
  }
  const customerCategoryApplicabilityJson = preservedStringList(input.source.customerCategoryApplicabilityJson);
  const employmentApplicability = copiedEmploymentApplicability(input.source);
  const authorisedConsumersJson = preservedStringList(input.source.authorisedConsumersJson);
  const aliasesJson = preservedStringList(input.source.aliasesJson);
  const selectOptionKeysJson = preservedStringList(input.source.selectOptionKeysJson);
  const currencyUnitsJson = preservedStringList(input.source.currencyUnitsJson);
  if (
    !customerCategoryApplicabilityJson ||
    !employmentApplicability ||
    !authorisedConsumersJson ||
    !aliasesJson ||
    !selectOptionKeysJson ||
    !currencyUnitsJson
  ) {
    return conflict("The source definition cannot be versioned.");
  }
  return {
    data: {
      id: nextId,
      fieldId: input.source.fieldId,
      lineageId: input.source.lineageId,
      versionNumber: nextVersion,
      previousVersionId: input.source.id,
      friendlyLabel: input.source.friendlyLabel,
      description: input.source.description,
      helpText: input.source.helpText,
      fieldType: input.source.fieldType,
      classification: input.source.classification,
      owningDomain: input.source.owningDomain,
      ownershipReview: "owner_requires_product_decision",
      sourceBindingJson: input.source.sourceBindingJson,
      aliasesJson,
      lifecycleStatus: "draft",
      productApplicabilityJson: [...input.productCodes],
      customerCategoryApplicabilityJson,
      applicabilityDeclared: true,
      employmentTypeApplicabilityJson: employmentApplicability.employmentTypeApplicabilityJson,
      employmentApplicabilityDeclared: employmentApplicability.employmentApplicabilityDeclared,
      authorisedConsumersJson,
      validationSummary: input.source.validationSummary,
      presentationSummary: input.source.presentationSummary,
      selectOptionSource: input.source.selectOptionSource,
      selectOptionKeysJson,
      currencyUnitsJson,
      candidateMirrorOf: input.source.candidateMirrorOf,
      controlsRuntime: false,
      customerFacingActivation: false,
      makerUserId: input.actorUserId,
      checkerUserId: null,
      effectiveFrom: null,
      effectiveUntil: null,
    },
  };
}

function toFailure(err: unknown): FieldControlApplicabilityFailure {
  if (err instanceof FieldControlApplicabilityRequestError) {
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
  if (error.statusCode === 400) {
    return { ok: false, status: 400, code: error.code ?? "VALIDATION_ERROR", message: error.message || "Invalid request." };
  }
  if (error.statusCode === 403) {
    return { ok: false, status: 403, code: error.code ?? "FORBIDDEN", message: error.message || "Forbidden" };
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
    code: "FIELD_CONTROL_APPLICABILITY_FAILED",
    message: "Field Control applicability version could not be created.",
  };
}

export async function createCertifiedFieldApplicabilityVersion(
  request: Request,
  id: string,
  deps: ApplicabilityDeps,
): Promise<FieldControlApplicabilityResult> {
  try {
    const actor = deps.authenticate(request);
    assertFieldControlAdministrator(actor.role);
    const actorUserId = actor.userId.trim();
    if (!actorUserId) {
      return { ok: false, status: 401, code: "UNAUTHORIZED", message: "Authentication required" };
    }
    const definitionId = id.trim();
    if (!definitionId) {
      throw new FieldControlApplicabilityRequestError("Invalid definition.");
    }
    const body = await request.json().catch(() => {
      throw new FieldControlApplicabilityRequestError("Invalid request.");
    });
    const parsed = parseApplicabilityVersionRequest(body);
    const productCodes = assertKnownProductCodes(parsed.productCodes, deps.knownProductCodes);
    const source = await deps.findUnique({ where: { id: definitionId } });
    if (!source) {
      return { ok: false, status: 404, code: "FIELD_CONTROL_NOT_FOUND", message: "Field Control definition was not found." };
    }
    const versions = await deps.findMany({ where: { fieldId: source.fieldId } });
    const plan = planApplicabilityVersion({
      actorUserId,
      source,
      versions,
      productCodes,
      expectedUpdatedAt: parsed.expectedUpdatedAt,
    });
    if ("ok" in plan) return plan;
    let created: CertifiedFieldControlRecord;
    try {
      created = await deps.create({ data: plan.data });
    } catch (err) {
      if (isUniqueConflict(err)) {
        return conflict("A newer version already exists for this field.");
      }
      throw err;
    }
    return { ok: true, status: 201, data: { definition: projectCertifiedFieldControlDefinition(created) } };
  } catch (err) {
    return toFailure(err);
  }
}

export type FieldControlEmploymentApplicabilityInsert = Omit<
  FieldControlApplicabilityInsert,
  "applicabilityDeclared" | "selectOptionKeysJson"
> & {
  applicabilityDeclared: boolean;
  selectOptionKeysJson: unknown;
};

export function parseEmploymentApplicabilityVersionRequest(value: unknown): {
  declared: boolean;
  employmentTypeCodes: string[];
  expectedUpdatedAt: Date;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new FieldControlApplicabilityRequestError("Invalid request.");
  }
  const record = value as Record<string, unknown>;
  const allowed = new Set<string>(EMPLOYMENT_APPLICABILITY_VERSION_BODY_KEYS);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      throw new FieldControlApplicabilityRequestError(`Unknown property: ${key}.`);
    }
  }
  for (const key of EMPLOYMENT_APPLICABILITY_VERSION_BODY_KEYS) {
    if (!(key in record)) {
      throw new FieldControlApplicabilityRequestError(`Missing ${key}.`);
    }
  }
  if (typeof record.declared !== "boolean") {
    throw new FieldControlApplicabilityRequestError("Invalid declared.");
  }
  if (!Array.isArray(record.employmentTypeCodes)) {
    throw new FieldControlApplicabilityRequestError("Invalid employment type codes.");
  }
  const codes: string[] = [];
  for (const item of record.employmentTypeCodes) {
    if (typeof item !== "string" || item !== item.trim() || item.length === 0) {
      throw new FieldControlApplicabilityRequestError("Invalid employment type code.");
    }
    if (!isOpportunityFormEmploymentTypeCode(item)) {
      throw new FieldControlApplicabilityRequestError("Unknown employment type code.");
    }
    if (codes.includes(item)) {
      throw new FieldControlApplicabilityRequestError("Duplicate employment type code.");
    }
    codes.push(item);
  }
  if (record.declared && codes.length === 0) {
    throw new FieldControlApplicabilityRequestError("At least one employment type is required.");
  }
  if (!record.declared && codes.length > 0) {
    throw new FieldControlApplicabilityRequestError("Employment type codes must be empty when applicability is not declared.");
  }
  return {
    declared: record.declared,
    employmentTypeCodes: codes,
    expectedUpdatedAt: parseExpectedUpdatedAt(record.expectedUpdatedAt),
  };
}

export function planEmploymentApplicabilityVersion(input: {
  actorUserId: string;
  source: CertifiedFieldControlRecord;
  versions: readonly CertifiedFieldControlRecord[];
  declared: boolean;
  employmentTypeCodes: readonly string[];
  expectedUpdatedAt: Date;
}): FieldControlApplicabilityFailure | { data: FieldControlEmploymentApplicabilityInsert } {
  if (input.source.owningDomain !== "opportunity") {
    return conflict("Employment type applicability is only available for Opportunity fields.");
  }
  if (input.source.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
    return conflict("The definition changed before this proposal was saved.");
  }
  if (input.source.lifecycleStatus !== "approved" || input.source.ownershipReview !== "owner_requires_product_decision") {
    return conflict("Only an approved definition awaiting a product decision can propose applicability.");
  }
  const highest = input.versions.reduce((max, row) => Math.max(max, row.versionNumber), 0);
  if (highest !== input.source.versionNumber) {
    return conflict("A newer version already exists for this field.");
  }
  const nextVersion = input.source.versionNumber + 1;
  const nextId = `fcm:${input.source.fieldId}:v${nextVersion}`;
  if (input.versions.some((row) => row.versionNumber === nextVersion || row.id === nextId)) {
    return conflict("A newer version already exists for this field.");
  }
  const productApplicabilityJson = preservedStringList(input.source.productApplicabilityJson);
  const customerCategoryApplicabilityJson = preservedStringList(input.source.customerCategoryApplicabilityJson);
  const authorisedConsumersJson = preservedStringList(input.source.authorisedConsumersJson);
  const aliasesJson = preservedStringList(input.source.aliasesJson);
  const currencyUnitsJson = preservedStringList(input.source.currencyUnitsJson);
  const selectOptionKeysJson = input.source.selectOptionKeysJson;
  if (
    !productApplicabilityJson ||
    !customerCategoryApplicabilityJson ||
    !authorisedConsumersJson ||
    !aliasesJson ||
    !currencyUnitsJson ||
    !Array.isArray(selectOptionKeysJson)
  ) {
    return conflict("The source definition cannot be versioned.");
  }
  for (const code of input.employmentTypeCodes) {
    if (!isOpportunityFormEmploymentTypeCode(code)) {
      return conflict("Unknown employment type code.");
    }
  }
  return {
    data: {
      id: nextId,
      fieldId: input.source.fieldId,
      lineageId: input.source.lineageId,
      versionNumber: nextVersion,
      previousVersionId: input.source.id,
      friendlyLabel: input.source.friendlyLabel,
      description: input.source.description,
      helpText: input.source.helpText,
      fieldType: input.source.fieldType,
      classification: input.source.classification,
      owningDomain: input.source.owningDomain,
      ownershipReview: "owner_requires_product_decision",
      sourceBindingJson: input.source.sourceBindingJson,
      aliasesJson,
      lifecycleStatus: "draft",
      productApplicabilityJson,
      customerCategoryApplicabilityJson,
      applicabilityDeclared: input.source.applicabilityDeclared === true,
      employmentTypeApplicabilityJson: [...input.employmentTypeCodes],
      employmentApplicabilityDeclared: input.declared,
      authorisedConsumersJson,
      validationSummary: input.source.validationSummary,
      presentationSummary: input.source.presentationSummary,
      selectOptionSource: input.source.selectOptionSource,
      selectOptionKeysJson,
      currencyUnitsJson,
      candidateMirrorOf: input.source.candidateMirrorOf,
      controlsRuntime: false,
      customerFacingActivation: false,
      makerUserId: input.actorUserId,
      checkerUserId: null,
      effectiveFrom: null,
      effectiveUntil: null,
    },
  };
}

export async function createCertifiedFieldEmploymentApplicabilityVersion(
  request: Request,
  id: string,
  deps: {
    authenticate: ApplicabilityDeps["authenticate"];
    findUnique: ApplicabilityDeps["findUnique"];
    findMany: ApplicabilityDeps["findMany"];
    create: (args: { data: FieldControlEmploymentApplicabilityInsert }) => Promise<CertifiedFieldControlRecord>;
  },
): Promise<FieldControlApplicabilityResult> {
  try {
    const actor = deps.authenticate(request);
    assertFieldControlAdministrator(actor.role);
    const actorUserId = actor.userId.trim();
    if (!actorUserId) {
      return { ok: false, status: 401, code: "UNAUTHORIZED", message: "Authentication required" };
    }
    const definitionId = id.trim();
    if (!definitionId) {
      throw new FieldControlApplicabilityRequestError("Invalid definition.");
    }
    const body = await request.json().catch(() => {
      throw new FieldControlApplicabilityRequestError("Invalid request.");
    });
    const parsed = parseEmploymentApplicabilityVersionRequest(body);
    for (const code of parsed.employmentTypeCodes) {
      if (!opportunityFormEmploymentTypeCodes().includes(code)) {
        throw new FieldControlApplicabilityRequestError("Unknown employment type code.");
      }
    }
    const source = await deps.findUnique({ where: { id: definitionId } });
    if (!source) {
      return { ok: false, status: 404, code: "FIELD_CONTROL_NOT_FOUND", message: "Field Control definition was not found." };
    }
    const versions = await deps.findMany({ where: { fieldId: source.fieldId } });
    const plan = planEmploymentApplicabilityVersion({
      actorUserId,
      source,
      versions,
      declared: parsed.declared,
      employmentTypeCodes: parsed.employmentTypeCodes,
      expectedUpdatedAt: parsed.expectedUpdatedAt,
    });
    if ("ok" in plan) return plan;
    let created: CertifiedFieldControlRecord;
    try {
      created = await deps.create({ data: plan.data });
    } catch (err) {
      if (isUniqueConflict(err)) {
        return conflict("A newer version already exists for this field.");
      }
      throw err;
    }
    return { ok: true, status: 201, data: { definition: projectCertifiedFieldControlDefinition(created) } };
  } catch (err) {
    return toFailure(err);
  }
}
