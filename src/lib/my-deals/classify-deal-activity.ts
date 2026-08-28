/**
 * CO-CATALYST-ONE-REFINEMENT-001 — My Deals Active / Inactive classification (SSOT).
 * Presentation-only — maps existing canonical LenderCaseStage + status overlays.
 */

import { resolveStatusOverlay } from "@/constants/enterprise-deal-journey-progress";
import {
  lenderCaseStageToPipelineStageProjection,
} from "@/lib/enterprise-deal/deal-lender-stage-map";
import { grossStageToLenderCaseStage } from "@/lib/enterprise-deal/deal-lender-stage-map";
import type { DealRegistryRow } from "@/types/deal-registry";
import type { LenderCaseStage } from "@/types/catalyst-one";

export type DealActivityClassification = "active" | "inactive";

export type DealActivityFilter = "active" | "inactive" | "all";

/** Canonical lender stages that remain in the operational working queue. */
export const MY_DEALS_ACTIVE_LENDER_STAGES = [
  "identified",
  "prelogin",
  "logged_in_wip",
  "soft_approved",
  "final_approved",
  "closure_wip",
  "disbursed",
] as const satisfies readonly LenderCaseStage[];

/** Canonical lender stages excluded from the default working queue. */
export const MY_DEALS_INACTIVE_LENDER_STAGES = [
  "hold",
  "lost",
  "post_disbursement_confirmation",
] as const satisfies readonly LenderCaseStage[];

const ACTIVE_STAGE_SET = new Set<LenderCaseStage>(MY_DEALS_ACTIVE_LENDER_STAGES);
const INACTIVE_STAGE_SET = new Set<LenderCaseStage>(MY_DEALS_INACTIVE_LENDER_STAGES);

function isCompletedOperationalStatus(status: string | null | undefined): boolean {
  const raw = String(status ?? "").trim().toLowerCase();
  return raw === "completed" || raw.includes("closed");
}

/**
 * Classify a Deal Registry row for My Deals activity filtering.
 * Hold and Lost are always inactive. Post-disbursement confirmation is inactive
 * (lifecycle complete). Disbursed remains active until PDC hand-off.
 */
export function classifyDealActivity(row: DealRegistryRow): DealActivityClassification {
  const stage = row.lenderCaseStage;

  if (INACTIVE_STAGE_SET.has(stage)) {
    return "inactive";
  }

  const overlay = resolveStatusOverlay(row.status, row.lenderCaseStage);
  if (overlay === "hold" || overlay === "lost") {
    return "inactive";
  }

  if (isCompletedOperationalStatus(row.status)) {
    return "inactive";
  }

  if (ACTIVE_STAGE_SET.has(stage)) {
    return "active";
  }

  // Unknown stage — prefer active working queue unless status says otherwise.
  return "active";
}

export function matchesDealActivityFilter(
  row: DealRegistryRow,
  activity: DealActivityFilter,
): boolean {
  if (activity === "all") return true;
  return classifyDealActivity(row) === activity;
}

/** Deal Stage filter composes with Activity — matches pipeline or lender canonical ids. */
export function matchesDealStageFilter(
  row: DealRegistryRow,
  grossStage: string,
): boolean {
  if (grossStage === "all") return true;
  if (row.grossStage === grossStage) return true;
  if (row.lenderCaseStage === grossStage) return true;
  if (lenderCaseStageToPipelineStageProjection(row.lenderCaseStage) === grossStage) {
    return true;
  }
  const fromFilter = grossStageToLenderCaseStage(grossStage);
  return row.lenderCaseStage === fromFilter;
}

export function countDealsByActivity(
  rows: DealRegistryRow[],
  activity: DealActivityClassification,
): number {
  let count = 0;
  for (const row of rows) {
    if (classifyDealActivity(row) === activity) count += 1;
  }
  return count;
}
