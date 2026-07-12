export {
  configureEncePorts,
  getEncePorts,
  resetEnceComposition,
} from "./composition";
export { createInMemoryEncePorts } from "./repositories/in-memory";
export { recordEnceAudit } from "./audit-integration";
export {
  listEnceSimulations,
  registerEncePolicy,
  registerEnceTemplate,
  simulateEnceCommunication,
} from "./communication-registry";
export { runEnceFoundationValidation } from "./foundation-validation";
export { getEnceFrameworkVersion, getEnceRegistrySnapshot } from "./registry-snapshot";

export { ENCE_EXTERNAL_DELIVERY_ENABLED } from "@/constants/enterprise-notification-communication-engine";
