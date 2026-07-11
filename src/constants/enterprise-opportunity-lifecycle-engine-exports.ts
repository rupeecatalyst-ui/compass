/**
 * EOLE curated public exports for external consumers.
 */

export { EOLE_FRAMEWORK_VERSION } from "./enterprise-opportunity-lifecycle-engine";
export {
  EOLE_ACTIVE_LIFECYCLE_STATUSES,
  EOLE_BUSINESS_MODELS,
  EOLE_DEFAULT_MAX_HOLD_PERIOD_DAYS,
  EOLE_EXECUTOR_ROLES,
  EOLE_HOLD_STATUS,
  EOLE_LENDER_PIPELINE_OUTCOME,
  EOLE_OPPORTUNITY_LIFECYCLE_ACTION_MAP,
  EOLE_OPPORTUNITY_LIFECYCLE_STATUS,
  EOLE_OPPORTUNITY_LIFECYCLE_TRANSITIONS,
  EOLE_OWNER_TYPES,
  EOLE_PIPELINE_STATUS,
  EOLE_TERMINAL_LIFECYCLE_STATUSES,
  EOLE_DEFAULT_AGING_POLICIES,
  EOLE_DEFAULT_STAGES,
  EOLE_DEFAULT_SUB_STAGES,
} from "./enterprise-opportunity-lifecycle-engine";

export {
  configureEolePorts,
  getEolePorts,
  resetEoleComposition,
  runEoleFoundationValidation,
  getEoleFrameworkVersion,
  getEoleRegistrySnapshot,
} from "@/lib/enterprise-opportunity-lifecycle-engine";

export type {
  EoleOpportunity,
  EoleOpportunityLifecycleStatus,
  EoleBusinessModel,
  EoleRegistrySnapshot,
  EoleValidationResult,
} from "@/types/enterprise-opportunity-lifecycle-engine";
