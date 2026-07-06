import {
  DEFAULT_REVIEW_CYCLE_MASTER,
  type ReviewCycleMasterEntry,
} from "@/data/catalyst-one/credit-risk-engine/review-cycle-master-seed";
import type { RuleReviewCycleId } from "@/types/rule-library";

export type { ReviewCycleMasterEntry };
export { DEFAULT_REVIEW_CYCLE_MASTER };

let reviewCycleMasterOverride: ReviewCycleMasterEntry[] | null = null;

export function setReviewCycleMaster(entries: ReviewCycleMasterEntry[]): void {
  reviewCycleMasterOverride = entries;
}

export function resetReviewCycleMaster(): void {
  reviewCycleMasterOverride = null;
}

export function getReviewCycleMaster(): ReviewCycleMasterEntry[] {
  return (reviewCycleMasterOverride ?? DEFAULT_REVIEW_CYCLE_MASTER)
    .filter((e) => e.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export const RULE_REVIEW_CYCLE_LABELS: Record<RuleReviewCycleId, string> = DEFAULT_REVIEW_CYCLE_MASTER.reduce(
  (acc, entry) => {
    acc[entry.id] = entry.label;
    return acc;
  },
  {} as Record<RuleReviewCycleId, string>,
);

