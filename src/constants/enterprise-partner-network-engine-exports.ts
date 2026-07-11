export {
  assignEpneCapabilityToPartner,
  getEpneFrameworkVersion,
  getEpneRegistrySnapshot,
  initializeEpneRelationshipTypes,
  onboardEpnePartner,
  registerEpneAgreement,
  registerEpneRelationship,
  resetEpneComposition,
  runEpneFoundationValidation,
  searchEpnePartners,
  transitionEpnePartnerLifecycle,
  validateEpnePartner,
  validateEpneRelationship,
} from "@/lib/enterprise-partner-network-engine";

export {
  EPNE_AGREEMENT_LIFECYCLE_STATUS,
  EPNE_FRAMEWORK_VERSION,
  EPNE_PARTNER_CATEGORIES,
  EPNE_PARTNER_LIFECYCLE_STATUS,
  EPNE_PARTNER_TYPES,
  EPNE_RELATIONSHIP_TYPE_CODES,
} from "@/constants/enterprise-partner-network-engine";

export type {
  EpneAgreementVersion,
  EpneCapability,
  EpnePartner,
  EpnePartnerAgreement,
  EpnePartnerHierarchyNode,
  EpnePartnerPerformanceSummary,
  EpnePartnerProfile,
  EpneReferralMapping,
  EpneReferralNetwork,
  EpneRegistrySnapshot,
  EpneRelationship,
  EpneRelationshipType,
  EpneServiceArea,
  EpneTerritory,
  EpneValidationResult,
} from "@/types/enterprise-partner-network-engine";
