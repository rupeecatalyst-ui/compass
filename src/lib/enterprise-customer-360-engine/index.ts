export {
  configureEc360Ports,
  getEc360Ports,
  resetEc360Composition,
} from "./composition";

export { createInMemoryEc360Ports } from "./repositories/in-memory";

export { recordEc360Audit } from "./audit-integration";

export {
  listEc360CommunicationPreferences,
  listEc360Consents,
  registerEc360Consent,
  setEc360CommunicationPreference,
  updateEc360ConsentStatus,
} from "./consent-registry";

export {
  addEc360CustomerToHousehold,
  listEc360HouseholdMembers,
  listEc360Households,
  registerEc360Household,
} from "./household-registry";

export {
  assignEc360CustomerSegment,
  createEc360CustomerOfType,
  enrichEc360CustomerEmployment,
  enrichEc360FinancialProfile,
  enrichEc360IncomeProfile,
  enrichEc360RiskProfile,
  getEc360CustomerByCode,
  listEc360Customers,
  onboardEc360Customer,
  registerEc360Customer,
  registerEc360CustomerAddress,
  registerEc360CustomerContact,
  registerEc360CustomerProfile,
  registerEc360IdentityReference,
  registerEc360Individual,
  registerEc360KycReference,
  registerEc360OrganizationCustomer,
  registerEc360Segment,
  searchEc360Customers,
  setEc360CustomerPreference,
  tagEc360Customer,
  transitionEc360CustomerLifecycle,
} from "./customer-registry";

export { runEc360FoundationValidation } from "./foundation-validation";

export {
  initializeEc360RelationshipTypes,
  listEc360Relationships,
  listEc360RelationshipTypes,
  registerEc360Relationship,
} from "./relationship-engine";

export { getEc360FrameworkVersion, getEc360RegistrySnapshot } from "./registry-snapshot";

export { appendEc360TimelineEntry, listEc360Timeline } from "./timeline-registry";

export {
  validateEc360CommunicationPreference,
  validateEc360Consent,
  validateEc360Customer,
  validateEc360CustomerCodeUniqueness,
  validateEc360CustomerLifecycleTransition,
  validateEc360Household,
  validateEc360IdentityReferenceUniqueness,
  validateEc360Relationship,
} from "./validation-engine";
