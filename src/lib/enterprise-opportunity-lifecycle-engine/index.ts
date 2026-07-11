/**
 * EOLE public exports.
 */

export {
  configureEolePorts,
  getEolePorts,
  resetEoleComposition,
} from "./composition";
export { createInMemoryEolePorts } from "./repositories/in-memory";
export { recordEoleAudit } from "./audit-integration";

export {
  createEoleOpportunityFromLead,
  listEoleOpportunitiesByCustomer,
  registerEoleCustomerReference,
  registerEoleFinancialRequirement,
  registerEoleOpportunity,
  registerEoleOpportunityProfile,
  registerEoleOpportunityRequirement,
  registerEoleOpportunityStrategy,
  registerEoleOrganizationReference,
  registerEolePartnerReference,
  registerEoleProductReference,
} from "./opportunity-registry";

export {
  assignEoleSourceOwner,
  getEoleSourceOwner,
  registerEoleOpportunityAssignment,
  registerEoleOpportunityOwner,
} from "./ownership-registry";

export {
  assignEoleExecutor,
  listEoleActiveExecutors,
  listEoleExecutorHistory,
  unassignEoleExecutor,
} from "./executor-registry";

export {
  changeEoleOpportunityStage,
  closeEoleOpportunity,
  placeEoleOpportunityOnHold,
  resumeEoleOpportunityFromHold,
  syncEoleOpportunityDisbursement,
  transitionEoleOpportunityLifecycle,
} from "./lifecycle-registry";

export {
  captureEolePipelineSnapshot,
  completeEolePipeline,
  initializeEoleAgingPolicies,
  initializeEoleStages,
  initializeEoleSubStages,
  listEoleLenderPipelines,
  registerEoleLenderReference,
  registerEolePipeline,
  updateEoleLenderPipelineOutcome,
} from "./pipeline-registry";

export {
  computeEoleOpportunityAging,
  evaluateEoleOpportunitySla,
  listEoleOpportunityAgings,
  registerEoleOpportunitySla,
} from "./aging-registry";

export { appendEoleTimelineEntry, listEoleTimeline } from "./timeline-registry";
export { runEoleFoundationValidation } from "./foundation-validation";
export { getEoleFrameworkVersion, getEoleRegistrySnapshot } from "./registry-snapshot";

export {
  computeEoleAgingSeverity,
  isEoleTerminalStatus,
  syncEoleDisbursementStatus,
  validateEoleAssignment,
  validateEoleExecutor,
  validateEoleHold,
  validateEoleLifecycleTransition,
  validateEoleOpportunity,
  validateEoleOwner,
  validateEolePipelineAging,
  validateEoleStage,
} from "./validation-engine";
