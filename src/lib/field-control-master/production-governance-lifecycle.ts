/**
 * Narrow V1.6 governance lifecycle.
 * Approval changes lifecycle only. It does not activate runtime behaviour.
 */
import {
  assertFieldControlAdministrator,
  projectCertifiedFieldControlDefinition,
  type CertifiedFieldControlRecord,
  type FieldControlGovernanceDefinition,
} from "./production-governance-read";

export const SUBMIT_REVIEW_BODY_KEYS = ["expectedUpdatedAt"] as const;
export const REVIEW_BODY_KEYS = ["decision", "expectedUpdatedAt"] as const;

export function fieldControlSubmitReviewPath(id: string): string {
  return `/api/admin/field-control-definitions/${encodeURIComponent(id)}/submit-review`;
}

export function fieldControlReviewPath(id: string): string {
  return `/api/admin/field-control-definitions/${encodeURIComponent(id)}/review`;
}

export type FieldControlLifecycleActor = { role: string; userId: string };

export type FieldControlLifecycleWhere = {
  id: string;
  lifecycleStatus: "draft" | "checker_review";
  ownershipReview: "owner_requires_product_decision";
  versionNumber: number;
  updatedAt: Date;
};

export type FieldControlLifecyclePatch = {
  lifecycleStatus: "draft" | "checker_review" | "approved";
  checkerUserId: string | null;
};

export type FieldControlLifecycleDelegate = {
  findUnique: (args: { where: { id: string } }) => Promise<CertifiedFieldControlRecord | null>;
  updateMany: (args: {
    where: FieldControlLifecycleWhere;
    data: FieldControlLifecyclePatch;
  }) => Promise<{ count: number }>;
};

export type FieldControlLifecycleSuccess = {
  ok: true;
  status: 200;
  data: { definition: FieldControlGovernanceDefinition };
};

export type FieldControlLifecycleFailure = {
  ok: false;
  status: number;
  code: string;
  message: string;
};

export type FieldControlLifecycleResult = FieldControlLifecycleSuccess | FieldControlLifecycleFailure;

type LifecycleDeps = {
  authenticate: (request: Request) => FieldControlLifecycleActor;
  findUnique: FieldControlLifecycleDelegate["findUnique"];
  updateMany: FieldControlLifecycleDelegate["updateMany"];
};

const SUBMIT_KEYS = new Set<string>(SUBMIT_REVIEW_BODY_KEYS);
const REVIEW_KEYS = new Set<string>(REVIEW_BODY_KEYS);

export class FieldControlLifecycleRequestError extends Error {
  readonly statusCode = 400;
  readonly code = "VALIDATION_ERROR";
}

export function fieldControlDefinitionLifecycleDelegate(db: object): FieldControlLifecycleDelegate {
  const delegate = (db as { fieldControlDefinition?: FieldControlLifecycleDelegate }).fieldControlDefinition;
  if (!delegate || typeof delegate.findUnique !== "function" || typeof delegate.updateMany !== "function") {
    throw new Error("Certified Field Control definitions are not available from the database client.");
  }
  return {
    findUnique: (args) => delegate.findUnique(args),
    updateMany: (args) => delegate.updateMany(args),
  };
}

function conflict(message: string): FieldControlLifecycleFailure {
  return {
    ok: false,
    status: 409,
    code: "FIELD_CONTROL_LIFECYCLE_CONFLICT",
    message,
  };
}

function objectRecord(value: unknown, allowed: ReadonlySet<string>): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new FieldControlLifecycleRequestError("Invalid request.");
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      throw new FieldControlLifecycleRequestError(`Unknown property: ${key}.`);
    }
  }
  for (const key of allowed) {
    if (!(key in record)) {
      throw new FieldControlLifecycleRequestError(`Missing ${key}.`);
    }
  }
  return record;
}

export function parseExpectedUpdatedAt(value: unknown): Date {
  if (typeof value !== "string" || value !== value.trim() || value.length === 0) {
    throw new FieldControlLifecycleRequestError("Invalid expectedUpdatedAt.");
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new FieldControlLifecycleRequestError("Invalid expectedUpdatedAt.");
  }
  return parsed;
}

export function parseSubmitReviewRequest(value: unknown): { expectedUpdatedAt: Date } {
  const record = objectRecord(value, SUBMIT_KEYS);
  return { expectedUpdatedAt: parseExpectedUpdatedAt(record.expectedUpdatedAt) };
}

export function parseReviewRequest(value: unknown): { decision: "approve" | "return"; expectedUpdatedAt: Date } {
  const record = objectRecord(value, REVIEW_KEYS);
  if (record.decision !== "approve" && record.decision !== "return") {
    throw new FieldControlLifecycleRequestError("Invalid decision.");
  }
  return {
    decision: record.decision,
    expectedUpdatedAt: parseExpectedUpdatedAt(record.expectedUpdatedAt),
  };
}

export function planFieldControlLifecycle(input: {
  action: "submit" | "approve" | "return";
  actorUserId: string;
  row: CertifiedFieldControlRecord;
  expectedUpdatedAt: Date;
}): FieldControlLifecycleFailure | { where: FieldControlLifecycleWhere; data: FieldControlLifecyclePatch } {
  const makerUserId = input.row.makerUserId?.trim() ?? "";
  if (!makerUserId) {
    return conflict("This definition has no maker and cannot change lifecycle.");
  }
  if (input.row.ownershipReview !== "owner_requires_product_decision") {
    return conflict("This definition is not eligible for governance review.");
  }
  if (input.row.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
    return conflict("The definition changed before this review was saved.");
  }
  if (input.action !== "submit" && input.actorUserId === makerUserId) {
    return conflict("Maker and checker must be different people.");
  }
  if (input.action === "submit" && input.row.lifecycleStatus !== "draft") {
    return conflict("Only a draft can be submitted for review.");
  }
  if (input.action !== "submit" && input.row.lifecycleStatus !== "checker_review") {
    return conflict("Only a definition in checker review can be decided.");
  }
  const sourceStatus = input.action === "submit" ? "draft" : "checker_review";

  const data: FieldControlLifecyclePatch =
    input.action === "submit"
      ? { lifecycleStatus: "checker_review", checkerUserId: null }
      : input.action === "approve"
        ? { lifecycleStatus: "approved", checkerUserId: input.actorUserId }
        : { lifecycleStatus: "draft", checkerUserId: null };

  return {
    where: {
      id: input.row.id,
      lifecycleStatus: sourceStatus,
      ownershipReview: "owner_requires_product_decision",
      versionNumber: input.row.versionNumber,
      updatedAt: input.row.updatedAt,
    },
    data,
  };
}

function toFailure(err: unknown): FieldControlLifecycleFailure {
  if (err instanceof FieldControlLifecycleRequestError) {
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
    code: "FIELD_CONTROL_LIFECYCLE_FAILED",
    message: "Field Control lifecycle could not be updated.",
  };
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new FieldControlLifecycleRequestError("Invalid request.");
  }
}

async function applyLifecycle(
  request: Request,
  id: string,
  deps: LifecycleDeps,
  actionFor: (body: unknown) => "submit" | "approve" | "return",
  parse: (body: unknown) => { expectedUpdatedAt: Date },
): Promise<FieldControlLifecycleResult> {
  try {
    const actor = deps.authenticate(request);
    assertFieldControlAdministrator(actor.role);
    const actorUserId = actor.userId.trim();
    if (!actorUserId) {
      return { ok: false, status: 401, code: "UNAUTHORIZED", message: "Authentication required" };
    }
    const definitionId = id.trim();
    if (!definitionId) {
      throw new FieldControlLifecycleRequestError("Invalid definition.");
    }
    const body = await readJson(request);
    const action = actionFor(body);
    const expectedUpdatedAt = parse(body).expectedUpdatedAt;
    const row = await deps.findUnique({ where: { id: definitionId } });
    if (!row) {
      return { ok: false, status: 404, code: "FIELD_CONTROL_NOT_FOUND", message: "Field Control definition was not found." };
    }
    const plan = planFieldControlLifecycle({ action, actorUserId, row, expectedUpdatedAt });
    if ("ok" in plan) return plan;
    const updated = await deps.updateMany({ where: plan.where, data: plan.data });
    if (updated.count !== 1) {
      return conflict("The definition changed before this review was saved.");
    }
    const next = await deps.findUnique({ where: { id: definitionId } });
    if (!next) {
      return { ok: false, status: 500, code: "FIELD_CONTROL_LIFECYCLE_FAILED", message: "Field Control lifecycle could not be updated." };
    }
    return { ok: true, status: 200, data: { definition: projectCertifiedFieldControlDefinition(next) } };
  } catch (err) {
    return toFailure(err);
  }
}

export async function submitCertifiedFieldControlReview(
  request: Request,
  id: string,
  deps: LifecycleDeps,
): Promise<FieldControlLifecycleResult> {
  return applyLifecycle(
    request,
    id,
    deps,
    (body) => {
      parseSubmitReviewRequest(body);
      return "submit";
    },
    (body) => parseSubmitReviewRequest(body),
  );
}

export async function decideCertifiedFieldControlReview(
  request: Request,
  id: string,
  deps: LifecycleDeps,
): Promise<FieldControlLifecycleResult> {
  return applyLifecycle(
    request,
    id,
    deps,
    (body) => parseReviewRequest(body).decision,
    (body) => parseReviewRequest(body),
  );
}
