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
export {
  isSmtpSecretConfigured,
  resolveSmtpSecret,
} from "./smtp-secret-resolver";
export {
  CUSTOMER_FACING_RECIPIENT_EVENTS,
  canonicalizeEmail,
  dedupeRecipients,
  isCustomerFacingRecipientEvent,
  isValidEmailAddress,
  normalizeEmailForCompare,
  resolveCustomerFacingRecipients,
  resolveCustomerToEmail,
  resolveManagerUserId,
  resolveWealthPartnerEmail,
  type CustomerFacingRecipientEvent,
  type RecipientContactSnapshot,
  type RecipientDealSnapshot,
  type RecipientOpportunitySnapshot,
  type RecipientPartyRef,
  type RecipientRouterFailure,
  type RecipientRouterFailureCode,
  type RecipientRouterResolveInput,
  type RecipientRouterResult,
  type RecipientRouterSuccess,
  type RecipientUserSnapshot,
  type RecipientWealthPartnerSnapshot,
} from "./recipient-router";
