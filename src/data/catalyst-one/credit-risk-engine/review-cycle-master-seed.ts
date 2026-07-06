import type { RuleReviewCycleId } from "@/types/rule-library";

/**
 * CRC-10.3A.4 — Review Cycle master seed (Admin Console will manage overrides at runtime).
 */
export interface ReviewCycleMasterEntry {
  id: RuleReviewCycleId;
  label: string;
  enabled: boolean;
  sortOrder: number;
}

export const DEFAULT_REVIEW_CYCLE_MASTER: ReviewCycleMasterEntry[] = [
  { id: "monthly", label: "Monthly", enabled: true, sortOrder: 1 },
  { id: "quarterly", label: "Quarterly", enabled: true, sortOrder: 2 },
  { id: "half_yearly", label: "Half Yearly", enabled: true, sortOrder: 3 },
  { id: "annually", label: "Annually", enabled: true, sortOrder: 4 },
  { id: "on_regulatory_change", label: "On Regulatory Change", enabled: true, sortOrder: 5 },
  { id: "manual", label: "Manual", enabled: true, sortOrder: 6 },
];

