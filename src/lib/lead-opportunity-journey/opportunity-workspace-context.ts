/**
 * Opportunity Workspace — shared Opportunity Context (Registry SSOT).
 * Stages must not independently resolve LoanFiles for which Opportunity to load.
 */
export type { ActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
export {
  getActiveOpportunityContext,
  setActiveOpportunityContext,
  clearActiveOpportunityContext,
  shouldShowEntitySelectionScreen,
} from "@/lib/lead-opportunity-journey/active-context";
export {
  rememberOpportunityRegistryContext,
  rememberOpportunityRegistryRowContext,
  opportunityContextFromRegistry,
} from "@/lib/lead-opportunity-journey/opportunity-context";
