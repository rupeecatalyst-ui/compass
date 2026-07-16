export {
  configureEcmPorts,
  getEcmPorts,
  resetEcmComposition,
} from "./composition";
export { createInMemoryEcmPorts } from "./repositories/in-memory";
export { recordEcmAudit } from "./audit-integration";
export { computeEcmContactScore } from "./contact-score";
export {
  archiveEcmContact,
  findEcmContactByMobile,
  getEcmContactAssignedRoles,
  listEcmContacts,
  normalizeEcmAssignedRoles,
  normalizeEcmMobile,
  promptEcmMissingEmail,
  queryEcmContacts,
  registerEcmContact,
  registerProgressiveLoanContact,
  resolveOrCreateEcmContact,
  touchEcmContactActivity,
  updateEcmContact,
  updateEcmContactEmails,
} from "./contact-registry";
export { normalizePersonName } from "./name-normalize";
export {
  deriveContactStatusAfterSave,
  isEcmContactUsable,
  listProvisionalContactGaps,
  progressiveRequiresMobile,
  toEcmContactLifecycleLabel,
  ECM_CONTACT_LIFECYCLE_LABELS,
  type ProgressiveParticipantKind,
} from "./progressive-contact";
export {
  buildEcmRelationshipChain,
  clearEcmContactRelationship,
  ECM_RELATIONSHIP_TYPE_LABELS,
  ECM_RELATIONSHIP_TYPES,
  getEcmRelatedContactId,
  listEcmContactRelationships,
  listEcmRelationshipsFrom,
  listEcmRelationshipsTo,
  upsertEcmContactRelationship,
} from "./contact-relationships";
export {
  buildEcmBankerReportingChain,
  formatEcmBankerOrgPath,
  getEcmBankerOrgPlacement,
  getEcmBankerProfile,
  getEcmBankerReportingManagerId,
  listEcmBankerDirectReports,
  searchEcmContactsForReportingManager,
  setBankerReportingManager,
  ECM_BANKER_ORG_KEYS,
  ECM_BANKER_PROFILE_KEYS,
  ECM_BANKER_REPORTING_CACHE_KEYS,
} from "./banker-hierarchy";
export type {
  EcmBankerOrgPlacement,
  EcmBankerReportingNode,
} from "./banker-hierarchy";
export { runEcmFoundationValidation } from "./foundation-validation";
export { getEcmFrameworkVersion, getEcmRegistrySnapshot } from "./registry-snapshot";
export { validateEcmContact } from "./validation-engine";
export { buildEcmWorkspaceTabs } from "./workspace-tabs";
export type { EcmWorkspaceTab } from "./workspace-tabs";
