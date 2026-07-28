/**
 * CO-ARCH-002 — Strategy Workbench lender shortlist (Opportunity phase).
 * Strategy is planning only: Primary + Secondary choice.
 * Deal Workspace remains unlimited for additional lenders after Move to Deal.
 */

/** Maximum lenders in Strategy Execution Queue / shortlist before Move to Deal. */
export const STRATEGY_SHORTLIST_MAX_LENDERS = 2 as const;

export const STRATEGY_SHORTLIST_LIMIT_GUIDANCE =
  "Only two lenders can be shortlisted during Strategy. Additional lenders can be added after Deal creation from the Deal Workspace.";

export const STRATEGY_SHORTLIST_PRIMARY_LABEL = "Primary Choice";
export const STRATEGY_SHORTLIST_SECONDARY_LABEL = "Secondary Choice";

export function strategyShortlistChoiceLabel(index: number): string {
  if (index === 0) return STRATEGY_SHORTLIST_PRIMARY_LABEL;
  if (index === 1) return STRATEGY_SHORTLIST_SECONDARY_LABEL;
  return `Choice ${index + 1}`;
}
