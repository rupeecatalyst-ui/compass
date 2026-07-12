export {
  configureEcmPorts,
  getEcmPorts,
  resetEcmComposition,
} from "./composition";
export { createInMemoryEcmPorts } from "./repositories/in-memory";
export { recordEcmAudit } from "./audit-integration";
export {
  listEcmContacts,
  promptEcmMissingEmail,
  registerEcmContact,
  updateEcmContactEmails,
} from "./contact-registry";
export { runEcmFoundationValidation } from "./foundation-validation";
export { getEcmFrameworkVersion, getEcmRegistrySnapshot } from "./registry-snapshot";
export { validateEcmContact } from "./validation-engine";
