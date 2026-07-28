/**
 * CO-OPP-002 — Enterprise Opportunity Status Lifecycle (business journey SSOT).
 *
 * Dialogue → Requirement Captured → In Progress → Converted to Deal → Completed
 * (+ Lost · On Hold · Cancelled)
 *
 * Draft is retired from the application. Historical DB rows may still store `draft`
 * (and legacy `active` / `won` / `archived`); display helpers map those labels —
 * never migrate or rewrite historical production rows.
 */

import {
  resolveProductUniquenessKey,
  type OpportunityProductIdentity,
} from "@/constants/opportunity-active-uniqueness";

/** Canonical business lifecycle values written going forward. */
export const OPPORTUNITY_LIFECYCLE = {
  DIALOGUE: "dialogue",
  REQUIREMENT_CAPTURED: "requirement_captured",
  IN_PROGRESS: "in_progress",
  CONVERTED_TO_DEAL: "converted_to_deal",
  COMPLETED: "completed",
  LOST: "lost",
  ON_HOLD: "on_hold",
  CANCELLED: "cancelled",
  /**
   * @deprecated Historical DB values only — never write for new Opportunities.
   * Kept so Prisma/DB reads of legacy rows remain valid without migration.
   */
  DRAFT: "draft",
  ACTIVE: "active",
  WON: "won",
  ARCHIVED: "archived",
} as const;

export type OpportunityLifecycleValue =
  (typeof OPPORTUNITY_LIFECYCLE)[keyof typeof OPPORTUNITY_LIFECYCLE];

/** Statuses shown in filters / badges for the business journey. */
export const OPPORTUNITY_LIFECYCLE_FILTER_OPTIONS = [
  { value: OPPORTUNITY_LIFECYCLE.DIALOGUE, label: "Dialogue" },
  { value: OPPORTUNITY_LIFECYCLE.REQUIREMENT_CAPTURED, label: "Requirement Captured" },
  { value: OPPORTUNITY_LIFECYCLE.IN_PROGRESS, label: "In Progress" },
  { value: OPPORTUNITY_LIFECYCLE.CONVERTED_TO_DEAL, label: "Converted to Deal" },
  { value: OPPORTUNITY_LIFECYCLE.COMPLETED, label: "Completed" },
  { value: OPPORTUNITY_LIFECYCLE.LOST, label: "Lost" },
  { value: OPPORTUNITY_LIFECYCLE.ON_HOLD, label: "On Hold" },
  { value: OPPORTUNITY_LIFECYCLE.CANCELLED, label: "Cancelled" },
] as const;

/**
 * Human labels. Maps legacy stored values without rewriting rows:
 * draft → Dialogue · active → In Progress · won → Completed
 */
export const OPPORTUNITY_LIFECYCLE_LABELS: Record<string, string> = {
  dialogue: "Dialogue",
  draft: "Dialogue",
  requirement_captured: "Requirement Captured",
  in_progress: "In Progress",
  active: "In Progress",
  converted_to_deal: "Converted to Deal",
  completed: "Completed",
  won: "Completed",
  lost: "Lost",
  on_hold: "On Hold",
  cancelled: "Cancelled",
  archived: "Cancelled",
};

export function opportunityLifecycleLabel(status?: string | null): string {
  const key = (status || "").toLowerCase().trim();
  if (!key) return "Dialogue";
  return (
    OPPORTUNITY_LIFECYCLE_LABELS[key] ||
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/**
 * Uniqueness (Contact/Company + Product) from Requirement Captured onward
 * through active pipeline statuses. Dialogue does not participate.
 */
export const UNIQUENESS_LIFECYCLE_STATUSES = [
  OPPORTUNITY_LIFECYCLE.REQUIREMENT_CAPTURED,
  OPPORTUNITY_LIFECYCLE.IN_PROGRESS,
  OPPORTUNITY_LIFECYCLE.CONVERTED_TO_DEAL,
  OPPORTUNITY_LIFECYCLE.ON_HOLD,
  /** legacy synonym of In Progress */
  OPPORTUNITY_LIFECYCLE.ACTIVE,
] as const;

export type UniquenessLifecycleStatus = (typeof UNIQUENESS_LIFECYCLE_STATUSES)[number];

/** Open discussion / identity stage — Dialogue or legacy Draft. */
export function isDialogueLifecycle(status?: string | null): boolean {
  const s = (status || "").toLowerCase();
  return s === OPPORTUNITY_LIFECYCLE.DIALOGUE || s === OPPORTUNITY_LIFECYCLE.DRAFT;
}

/** @deprecated Use isDialogueLifecycle — Draft is retired. */
export function isDraftLifecycle(status?: string | null): boolean {
  return isDialogueLifecycle(status);
}

export function isTerminalLifecycle(status?: string | null): boolean {
  const s = (status || "").toLowerCase();
  return (
    s === OPPORTUNITY_LIFECYCLE.COMPLETED ||
    s === OPPORTUNITY_LIFECYCLE.WON ||
    s === OPPORTUNITY_LIFECYCLE.LOST ||
    s === OPPORTUNITY_LIFECYCLE.CANCELLED ||
    s === OPPORTUNITY_LIFECYCLE.ARCHIVED
  );
}

export function isUniquenessLifecycle(status?: string | null): boolean {
  const s = (status || "").toLowerCase();
  return (UNIQUENESS_LIFECYCLE_STATUSES as readonly string[]).includes(s);
}

/** ADR-018 / CO-OPP-002 gate: Product + Required Amount → Requirement Captured. */
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

export function assertLifecycleTransitionAllowed(
  from: string,
  to: string,
): { ok: true } | { ok: false; message: string } {
  const f = from.toLowerCase();
  const t = to.toLowerCase();
  if (f === t) return { ok: true };

  // Treat legacy synonyms as canonical for transition checks
  const norm = (s: string) => {
    if (s === "draft") return "dialogue";
    if (s === "active") return "in_progress";
    if (s === "won") return "completed";
    if (s === "archived") return "cancelled";
    return s;
  };
  const nf = norm(f);
  const nt = norm(t);

  if (
    ["completed", "lost", "cancelled"].includes(nf) &&
    nt !== nf
  ) {
    return { ok: false, message: `Cannot change lifecycle from ${f} to ${t}.` };
  }

  const allowed: Record<string, string[]> = {
    dialogue: [
      "requirement_captured",
      "in_progress",
      "on_hold",
      "cancelled",
      "lost",
    ],
    requirement_captured: [
      "in_progress",
      "converted_to_deal",
      "on_hold",
      "cancelled",
      "lost",
      "dialogue",
    ],
    in_progress: [
      "converted_to_deal",
      "completed",
      "on_hold",
      "cancelled",
      "lost",
      "requirement_captured",
    ],
    converted_to_deal: [
      "completed",
      "lost",
      "on_hold",
      "cancelled",
      "in_progress",
    ],
    on_hold: [
      "dialogue",
      "requirement_captured",
      "in_progress",
      "converted_to_deal",
      "completed",
      "lost",
      "cancelled",
    ],
    completed: [],
    lost: [],
    cancelled: [],
  };

  const next = allowed[nf];
  if (next && next.includes(nt)) return { ok: true };

  return { ok: false, message: `Lifecycle transition ${f} → ${t} is not allowed.` };
}

export function productIdentityFromFields(
  fields: OpportunityProductIdentity,
): OpportunityProductIdentity {
  return {
    productId: fields.productId ?? null,
    productCode: fields.productCode ?? null,
    productLabel: fields.productLabel ?? null,
  };
}
