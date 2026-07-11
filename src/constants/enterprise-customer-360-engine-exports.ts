export {
  getEc360FrameworkVersion,
  getEc360RegistrySnapshot,
  initializeEc360RelationshipTypes,
  onboardEc360Customer,
  registerEc360Consent,
  registerEc360Relationship,
  resetEc360Composition,
  runEc360FoundationValidation,
  searchEc360Customers,
  transitionEc360CustomerLifecycle,
  validateEc360Customer,
} from "@/lib/enterprise-customer-360-engine";

export {
  EC360_CUSTOMER_LIFECYCLE_STATUS,
  EC360_CUSTOMER_TYPES,
  EC360_FRAMEWORK_VERSION,
  EC360_RELATIONSHIP_TYPE_CODES,
} from "@/constants/enterprise-customer-360-engine";

export type {
  Ec360Customer,
  Ec360CustomerConsent,
  Ec360CustomerProfile,
  Ec360CustomerRelationship,
  Ec360CustomerTimelineEntry,
  Ec360Household,
  Ec360Individual,
  Ec360OrganizationCustomer,
  Ec360RegistrySnapshot,
  Ec360RelationshipType,
  Ec360ValidationResult,
} from "@/types/enterprise-customer-360-engine";
