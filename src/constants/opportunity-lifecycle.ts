/**
 * ADR-018 — Opportunity lifecycle + Requirement Capture helpers (persistence SSOT).
 * Draft → Requirement Captured → Active Opportunity
 */

import {
  resolveProductUniquenessKey,
  type OpportunityProductIdentity,
} from "@/constants/opportunity-active-uniqueness";

/** Business lifecycle states introduced by ADR-018 (plus existing operational states). */
export const OPPORTUNITY_LIFECYCLE = {
  DRAFT: "draft",
  REQUIREMENT_CAPTURED: "requirement_captured",
  ACTIVE: "active",
  ON_HOLD: "on_hold",
  WON: "won",
  LOST: "lost",
  CANCELLED: "cancelled",
  ARCHIVED: "archived",
} as const;

export type OpportunityLifecycleValue =
  (typeof OPPORTUNITY_LIFECYCLE)[keyof typeof OPPORTUNITY_LIFECYCLE];

/**
 * Uniqueness (Contact + Product) applies from Requirement Captured onward.
 * Draft never participates.
 */
export const UNIQUENESS_LIFECYCLE_STATUSES = [
  OPPORTUNITY_LIFECYCLE.REQUIREMENT_CAPTURED,
  OPPORTUNITY_LIFECYCLE.ACTIVE,
  OPPORTUNITY_LIFECYCLE.ON_HOLD,
] as const;

export type UniquenessLifecycleStatus = (typeof UNIQUENESS_LIFECYCLE_STATUSES)[number];

/** ADR-018 definition gate: Product + Required Amount. */
export function hasRequirementCaptureFields(input: {
  productId?: string | null;
  productCode?: string | null;
  productLabel?: string | null;
  productUniquenessKey?: string | null;
  requestedAmount?: number | null;
}): boolean {
  const key =
    input.productUniquenessKey?.trim() ||
    resolveProductUniquenessKey({
      productId: input.productId,
      productCode: input.productCode,
      productLabel: input.productLabel,
    });
  if (!key) return false;
  const amount = input.requestedAmount;
  return typeof amount === "number" && Number.isFinite(amount) && !Number.isNaN(amount);
}

export function isDraftLifecycle(status?: string | null): boolean {
  return (status || "").toLowerCase() === OPPORTUNITY_LIFECYCLE.DRAFT;
}

export function isUniquenessLifecycle(status?: string | null): boolean {
  const s = (status || "").toLowerCase();
  return (UNIQUENESS_LIFECYCLE_STATUSES as readonly string[]).includes(s);
}

export function assertLifecycleTransitionAllowed(
  from: string,
  to: string,
): { ok: true } | { ok: false; message: string } {
  const f = from.toLowerCase();
  const t = to.toLowerCase();
  if (f === t) return { ok: true };

  // Terminal / closed-ish
  if (["won", "lost", "cancelled", "archived"].includes(f) && t !== f) {
    return { ok: false, message: `Cannot change lifecycle from ${f} to ${t}.` };
  }

  // ADR-018 forward path
  if (f === "draft" && (t === "requirement_captured" || t === "active")) return { ok: true };
  if (f === "requirement_captured" && (t === "active" || t === "on_hold" || t === "draft")) {
    // draft rollback only if fields cleared by service (service enforces)
    if (t === "draft") return { ok: true };
    return { ok: true };
  }
  if (f === "active" && (t === "on_hold" || t === "requirement_captured" || t === "won" || t === "lost" || t === "cancelled" || t === "archived")) {
    return { ok: true };
  }
  if (f === "on_hold" && (t === "active" || t === "requirement_captured" || t === "won" || t === "lost" || t === "cancelled" || t === "archived")) {
    return { ok: true };
  }

  return { ok: false, message: `Lifecycle transition ${f} → ${t} is not allowed.` };
}

export function productIdentityFromFields(fields: OpportunityProductIdentity): OpportunityProductIdentity {
  return {
    productId: fields.productId ?? null,
    productCode: fields.productCode ?? null,
    productLabel: fields.productLabel ?? null,
  };
}
