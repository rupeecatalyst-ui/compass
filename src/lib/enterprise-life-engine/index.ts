export {
  configureLifePorts,
  getLifePorts,
  resetLifeComposition,
} from "./composition";
export { createInMemoryLifePorts } from "./repositories/in-memory";
export { recordLifeAudit } from "./audit-integration";
export {
  listLifeLenderExecutors,
  registerLifeLenderContact,
  registerLifeRecommendationHint,
} from "./contact-registry";
export { runLifeFoundationValidation } from "./foundation-validation";
export { getLifeFrameworkVersion, getLifeRegistrySnapshot } from "./registry-snapshot";
export {
  isLifeEligibleLenderExecutor,
  resolveLifeLenderSelection,
  selectLifeLenderExecutors,
  validateLifeLenderContact,
} from "./validation-engine";
export {
  deriveLifeBusinessMappingRef,
  evaluateLifeContextBlockers,
  mapLifeProductLabelToRef,
  resolveLifeCaseContext,
  toLifeSelectionCriteria,
} from "./case-context";
export {
  getLifeRecommendationContext,
  recommendLifeLenderExecutives,
  toLifeBusinessRecommendations,
} from "./business-recommendations";
export { seedLifeContactsIfEmpty } from "./demo-seed";
