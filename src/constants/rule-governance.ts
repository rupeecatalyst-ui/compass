/**
 * CRC-10.3A.4A — Rule Governance SSOT.
 * Labels, status derivation and badge styling — reusable across Catalyst One.
 */
import type { RuleReviewStatus } from "@/types/rule-library";

export {
  DEFAULT_RULE_OWNER_MASTER,
  RULE_OWNER_LABELS,
  getRuleOwnerMaster,
  resetRuleOwnerMaster,
  setRuleOwnerMaster,
} from "@/constants/rule-owner-master";
export type { RuleOwnerMasterEntry } from "@/constants/rule-owner-master";

export {
  DEFAULT_REVIEW_CYCLE_MASTER,
  RULE_REVIEW_CYCLE_LABELS,
  getReviewCycleMaster,
  resetReviewCycleMaster,
  setReviewCycleMaster,
} from "@/constants/review-cycle-master";
export type { ReviewCycleMasterEntry } from "@/constants/review-cycle-master";

/** Days before nextReviewDate when status becomes due_soon (and 2-day admin notifications fire). */
export const GOVERNANCE_DUE_SOON_DAYS = 2;

export const RULE_REVIEW_STATUS_LABELS: Record<RuleReviewStatus, string> = {
  upcoming: "Upcoming",
  due_soon: "Due Soon",
  due_today: "Due Today",
  overdue: "Overdue",
  reviewed: "Reviewed",
};

export const RULE_REVIEW_STATUS_BADGE_CLASS: Record<RuleReviewStatus, string> = {
  upcoming: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  due_soon: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  due_today: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  overdue: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  reviewed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export interface RuleGovernanceReviewInput {
  nextReviewDate: string;
  lastReviewedOn?: string;
}

const MS_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Derives governance review status — never persisted on RuleLibraryVersion.
 * Rules remain active regardless of status (governance reminders only).
 */
export function computeReviewStatus(
  input: RuleGovernanceReviewInput,
  now = new Date(),
): RuleReviewStatus {
  const due = startOfDay(new Date(input.nextReviewDate));
  const today = startOfDay(now);
  const lastReviewed = input.lastReviewedOn ? startOfDay(new Date(input.lastReviewedOn)) : null;
  const daysUntil = Math.round((due.getTime() - today.getTime()) / MS_DAY);

  if (daysUntil < 0) return "overdue";
  if (daysUntil === 0) return "due_today";
  if (daysUntil <= GOVERNANCE_DUE_SOON_DAYS) return "due_soon";
  if (lastReviewed && lastReviewed.getTime() <= today.getTime() && due.getTime() > today.getTime()) {
    return "reviewed";
  }
  return "upcoming";
}
