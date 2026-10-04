/**
 * CO-ARCH-002-W2 — Deal API validation helpers (centralized business rules).
 */
import type { DealProductFamily } from "@prisma/client";
import {
  DEAL_COUNTERPARTY_TYPES,
  DEAL_DOCUMENT_LINK_STATUSES,
  DEAL_LIFECYCLE_STATUSES,
  DEAL_OPERATIONAL_STATUSES,
  DEAL_PRIORITIES,
  DEAL_PRODUCT_FAMILIES,
} from "@/types/enterprise-deal";
import { assertLenderPipelineStageTransition } from "@server/services/enterprise-deal/deal-stage-rules";

export class DealValidationError extends Error {
  status = 400;
  code = "DEAL_VALIDATION_ERROR";
  constructor(message: string, code = "DEAL_VALIDATION_ERROR") {
    super(message);
    this.code = code;
  }
}

export class DealConflictError extends Error {
  status = 409;
  code = "DEAL_VERSION_CONFLICT";
  constructor(message = "Deal rowVersion conflict — reload and retry") {
    super(message);
  }
}

export class DealNotFoundError extends Error {
  status = 404;
  code = "DEAL_NOT_FOUND";
  constructor(message = "Deal not found") {
    super(message);
  }
}

export class DealForbiddenError extends Error {
  status = 403;
  code = "DEAL_FORBIDDEN";
  constructor(message = "You are not authorised to change the Rupee Catalyst Employee assignment") {
    super(message);
  }
}

export function assertNonEmpty(value: unknown, field: string): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) throw new DealValidationError(`${field} is required`);
  return s;
}

export function assertProductFamily(value: unknown): DealProductFamily {
  const s = String(value ?? "");
  if (!(DEAL_PRODUCT_FAMILIES as readonly string[]).includes(s)) {
    throw new DealValidationError(
      `productFamily must be one of: ${DEAL_PRODUCT_FAMILIES.join(", ")}`,
    );
  }
  return s as DealProductFamily;
}

export function assertOptionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const s = String(value);
  if (!(allowed as readonly string[]).includes(s)) {
    throw new DealValidationError(`${field} must be one of: ${allowed.join(", ")}`);
  }
  return s as T;
}

export function assertLifecycleStatus(value: unknown) {
  return assertOptionalEnum(value, DEAL_LIFECYCLE_STATUSES, "lifecycleStatus");
}

export function assertOperationalStatus(value: unknown) {
  return assertOptionalEnum(value, DEAL_OPERATIONAL_STATUSES, "operationalStatus");
}

export function assertPriority(value: unknown) {
  return assertOptionalEnum(value, DEAL_PRIORITIES, "priority");
}

export function assertCounterpartyType(value: unknown) {
  const v = assertOptionalEnum(value, DEAL_COUNTERPARTY_TYPES, "counterpartyType");
  if (!v) throw new DealValidationError("counterpartyType is required");
  return v;
}

export function assertDocumentStatus(value: unknown) {
  return assertOptionalEnum(value, DEAL_DOCUMENT_LINK_STATUSES, "status");
}

export function assertRowVersion(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new DealValidationError("rowVersion is required and must be a positive integer");
  }
  return n;
}

/** Family-aware transition rules — lending uses lender pipeline matrix (Phase 2B S1). */
export function validateStageTransition(input: {
  fromGrossStage: string;
  toGrossStage: string;
  fromLifecycleStatus: string;
  toLifecycleStatus?: string;
  productFamily?: string;
  allowSkip?: boolean;
}) {
  const to = assertNonEmpty(input.toGrossStage, "toGrossStage");
  if (["won", "lost", "cancelled"].includes(input.fromLifecycleStatus)) {
    if (to !== input.fromGrossStage && !input.toLifecycleStatus) {
      throw new DealValidationError(
        `Closed Deal (${input.fromLifecycleStatus}) cannot change stage without an explicit lifecycle status`,
      );
    }
  }

  if ((input.productFamily ?? "lending") === "lending") {
    return assertLenderPipelineStageTransition({
      fromGrossStage: input.fromGrossStage,
      toGrossStage: to,
      allowSkip: input.allowSkip,
    });
  }

  return { toGrossStage: to };
}
