/**
 * CO-BIZ-005 — RM Workspace constants (labels only — no business formulas).
 */

import type { RmPriorityBand, RmQuickActionId } from "@/types/enterprise-rm-workspace";

export const RM_WORKSPACE_NAME = "RM Workspace" as const;

export const RM_PRIORITY_BANDS: readonly RmPriorityBand[] = [
  "critical",
  "high",
  "medium",
  "low",
] as const;

export const RM_PRIORITY_LABELS: Record<RmPriorityBand, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const RM_QUICK_ACTION_ORDER: readonly RmQuickActionId[] = [
  "call_customer",
  "open_opportunity",
  "open_deal",
  "upload_document",
  "assign_task",
  "create_note",
] as const;

/** Work types treated as customer follow-ups for Today's Work. */
export const RM_FOLLOW_UP_WORK_TYPES = [
  "Follow-up",
  "Customer Call",
  "Reminder",
] as const;

export const RM_DOCUMENT_WORK_TYPES = ["Document Collection"] as const;

export const RM_LENDER_WORK_TYPES = ["Lender Call"] as const;

export const RM_MEETING_HINTS = ["meeting", "customer meeting", "branch visit"] as const;
