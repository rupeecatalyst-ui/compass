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
  getEcmContactAssignedRoles,
  listEcmContacts,
  normalizeEcmAssignedRoles,
  promptEcmMissingEmail,
  queryEcmContacts,
  registerEcmContact,
  resolveOrCreateEcmContact,
  touchEcmContactActivity,
  updateEcmContact,
  updateEcmContactEmails,
} from "./contact-registry";
export { runEcmFoundationValidation } from "./foundation-validation";
export { getEcmFrameworkVersion, getEcmRegistrySnapshot } from "./registry-snapshot";
export { validateEcmContact } from "./validation-engine";
export { buildEcmWorkspaceTabs } from "./workspace-tabs";
export type { EcmWorkspaceTab } from "./workspace-tabs";
