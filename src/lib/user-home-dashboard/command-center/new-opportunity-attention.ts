/**
 * CO-C1-DASH-001 — Derive New Opportunity attention from Opportunity lifecycle SSOT.
 * Does not invent a parallel status field or lifecycle.
 */

import type { NewOpportunityAttentionStatus } from "@/types/dashboard-command-center";

const ACTIONED_LIFECYCLES = new Set([
  "in_progress",
  "active",
  "converted_to_deal",
  "completed",
  "won",
  "lost",
  "cancelled",
  "archived",
]);

const PENDING_LIFECYCLES = new Set(["requirement_captured", "on_hold"]);

const UNATTENDED_LIFECYCLES = new Set(["dialogue", "draft", ""]);

/**
 * Attention from existing Opportunity lifecycle / stage progression.
 * - Unattended: still Dialogue/Draft with no progressed requirement stage
 * - Pending: Requirement Captured / On Hold (initial capture done; work expected)
 * - Actioned: In Progress / Converted / terminal outcomes (initial action recorded)
 */
export function deriveNewOpportunityAttention(input: {
  lifecycleStatus?: string | null;
  requirementStage?: string | null;
}): NewOpportunityAttentionStatus {
  const life = (input.lifecycleStatus || "").toLowerCase().trim();
  const stage = (input.requirementStage || "").toLowerCase().trim();

  if (ACTIONED_LIFECYCLES.has(life)) return "actioned";
  if (PENDING_LIFECYCLES.has(life)) return "pending";

  if (UNATTENDED_LIFECYCLES.has(life)) {
    if (
      stage &&
      !["dialogue", "draft", "lead_creation", "lead", "planning"].includes(stage)
    ) {
      return "pending";
    }
    return "unattended";
  }

  return "pending";
}

export function summarizeAttention(
  rows: Array<{ attention: NewOpportunityAttentionStatus }>,
): { total: number; unattended: number; actioned: number; pending: number } {
  let unattended = 0;
  let actioned = 0;
  let pending = 0;
  for (const row of rows) {
    if (row.attention === "unattended") unattended += 1;
    else if (row.attention === "actioned") actioned += 1;
    else pending += 1;
  }
  return { total: rows.length, unattended, actioned, pending };
}
