/**
 * CO-ARCH-003 Phase 2A — Opportunity validation errors.
 */
export class OpportunityValidationError extends Error {
  readonly code = "OPPORTUNITY_VALIDATION";
  constructor(message: string) {
    super(message);
    this.name = "OpportunityValidationError";
  }
}

export class OpportunityNotFoundError extends Error {
  readonly code = "OPPORTUNITY_NOT_FOUND";
  constructor(message = "Opportunity not found") {
    super(message);
    this.name = "OpportunityNotFoundError";
  }
}

export class OpportunityConflictError extends Error {
  readonly code: string = "OPPORTUNITY_CONFLICT";
  constructor(message: string, code = "OPPORTUNITY_CONFLICT") {
    super(message);
    this.name = "OpportunityConflictError";
    this.code = code;
  }
}

/** Contact + Product + Active uniqueness violation (constitutional). */
export class OpportunityActiveDuplicateError extends OpportunityConflictError {
  readonly existingOpportunityId: string;
  readonly existingOpportunityNumber: string;
  readonly productLabel: string;
  readonly existing: Record<string, unknown>;

  constructor(args: {
    message: string;
    existingOpportunityId: string;
    existingOpportunityNumber: string;
    productLabel: string;
    existing: Record<string, unknown>;
  }) {
    super(args.message, "ACTIVE_OPPORTUNITY_EXISTS");
    this.name = "OpportunityActiveDuplicateError";
    this.existingOpportunityId = args.existingOpportunityId;
    this.existingOpportunityNumber = args.existingOpportunityNumber;
    this.productLabel = args.productLabel;
    this.existing = args.existing;
  }
}

export function assertNonEmpty(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new OpportunityValidationError(`${field} is required`);
  }
  return value.trim();
}

const PRODUCT_FAMILIES = [
  "lending",
  "mutual_fund",
  "insurance",
  "bonds",
  "pms",
  "other",
] as const;

export function assertProductFamily(value: unknown) {
  const v = assertNonEmpty(value, "productFamily");
  if (!(PRODUCT_FAMILIES as readonly string[]).includes(v)) {
    throw new OpportunityValidationError(`Invalid productFamily: ${v}`);
  }
  return v as (typeof PRODUCT_FAMILIES)[number];
}

const PRIORITIES = ["urgent", "high", "medium", "low"] as const;

export function assertPriority(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const v = String(value);
  if (!(PRIORITIES as readonly string[]).includes(v)) {
    throw new OpportunityValidationError(`Invalid priority: ${v}`);
  }
  return v as (typeof PRIORITIES)[number];
}

const LIFECYCLES = [
  "draft",
  "requirement_captured",
  "active",
  "on_hold",
  "won",
  "lost",
  "cancelled",
  "archived",
] as const;

export function assertOpportunityLifecycle(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const v = String(value).trim().toLowerCase();
  if (!(LIFECYCLES as readonly string[]).includes(v)) {
    throw new OpportunityValidationError(`Invalid lifecycleStatus: ${v}`);
  }
  return v as (typeof LIFECYCLES)[number];
}

export function parseOptionalAmount(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || Number.isNaN(n)) {
    throw new OpportunityValidationError("requestedAmount must be a valid number");
  }
  return n;
}
