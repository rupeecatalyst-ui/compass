export {
  identityFromProfileRecord,
  identityFromProfileSeed,
  resolveProfileCode,
} from "./resolve-profile";
export {
  appendCorporateEmailSignature,
  appendCorporateWhatsAppIdentity,
  buildCorporateEmailSignature,
  buildCorporateWhatsAppIdentity,
} from "./corporate-identity";
export {
  deriveDomainAuthStatuses,
  deriveProviderConnectionStatus,
  isOperationalProductionSendingEnabled,
  labelConfigStatus,
  type OperationalDeliveryConnectionStatus,
  type OperationalEmailConfigStatus,
} from "./delivery-status";
