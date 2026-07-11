/**
 * Enterprise Partner Network Engine (EPNE) — Sprint 9 Foundation.
 *
 * Business-agnostic partner ecosystem platform. No loan-specific logic.
 */

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export type EpnePartnerLifecycleStatus =
  | "draft"
  | "pending_verification"
  | "active"
  | "suspended"
  | "inactive"
  | "archived";

export type EpnePartnerLifecycleAction =
  | "submit"
  | "verify"
  | "activate"
  | "suspend"
  | "deactivate"
  | "archive";

export type EpneAgreementLifecycleStatus =
  | "draft"
  | "approved"
  | "effective"
  | "expired"
  | "archived";

export type EpneAgreementLifecycleAction =
  | "approve"
  | "activate"
  | "expire"
  | "archive";

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

export type EpnePartnerCategory =
  | "referral"
  | "distribution"
  | "technology"
  | "service"
  | "channel"
  | "strategic"
  | "general";

export type EpnePartnerType =
  | "individual"
  | "organization"
  | "aggregator"
  | "franchise"
  | "affiliate";

export type EpneReferralRelationshipType = "direct" | "indirect" | "co_referral";

export type EpneContactType = "primary" | "billing" | "operations" | "general";

export type EpneAddressType = "registered" | "operating" | "billing" | "mailing";

export type EpneAuditEntityType =
  | "partner"
  | "partner_profile"
  | "partner_version"
  | "agreement"
  | "agreement_version"
  | "network"
  | "membership"
  | "referral_network"
  | "referral_mapping"
  | "relationship"
  | "relationship_type"
  | "capability"
  | "territory"
  | "performance";

// ---------------------------------------------------------------------------
// Partner
// ---------------------------------------------------------------------------

export interface EpnePartnerTag {
  id: string;
  tagCode: string;
  label: string;
}

export interface EpnePartnerCapability {
  id: string;
  capabilityCode: string;
  capabilityName: string;
  description: string;
  enabled: boolean;
}

export interface EpnePartner {
  id: string;
  tenantId?: string;
  partnerCode: string;
  partnerName: string;
  description: string;
  category: EpnePartnerCategory;
  partnerType: EpnePartnerType;
  lifecycleStatus: EpnePartnerLifecycleStatus;
  parentPartnerId?: string;
  categories: EpnePartnerCategory[];
  capabilities: EpnePartnerCapability[];
  tags: EpnePartnerTag[];
  /** Conceptual IAAE identity reference — not duplicated here. */
  identityRef?: string;
  /** Conceptual EOWE organization reference. */
  organizationRef?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

export interface EpnePartnerVersion {
  id: string;
  partnerId: string;
  partnerCode: string;
  versionMajor: number;
  versionMinor: number;
  snapshot: Record<string, unknown>;
  createdBy: string;
  createdOn: string;
}

export interface EpnePartnerRating {
  id: string;
  partnerId: string;
  score: number;
  maxScore: number;
  ratedOn: string;
  ratedBy: string;
  comments?: string;
}

export interface EpnePartnerProfile {
  id: string;
  partnerId: string;
  displayName: string;
  summary: string;
  logoRef?: string;
  website?: string;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

export interface EpnePartnerOrganization {
  id: string;
  partnerId: string;
  organizationName: string;
  registrationNumber?: string;
  /** Conceptual EOWE organization reference — not duplicated here. */
  organizationRef?: string;
  createdBy: string;
  createdOn: string;
}

export interface EpnePartnerLegalEntity {
  id: string;
  partnerId: string;
  legalName: string;
  entityType: string;
  jurisdiction: string;
  registrationRef?: string;
  createdBy: string;
  createdOn: string;
}

export interface EpnePartnerContact {
  id: string;
  partnerId: string;
  contactType: EpneContactType;
  fullName: string;
  email?: string;
  phone?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EpnePartnerAddress {
  id: string;
  partnerId: string;
  addressType: EpneAddressType;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Relationship types (configuration-driven)
// ---------------------------------------------------------------------------

export interface EpneRelationshipType {
  id: string;
  typeCode: string;
  typeName: string;
  description: string;
  bidirectional: boolean;
  hierarchyImplied: boolean;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EpneRelationship {
  id: string;
  sourcePartnerId: string;
  targetPartnerId: string;
  relationshipTypeCode: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// Capability catalog
// ---------------------------------------------------------------------------

export interface EpneCapability {
  id: string;
  capabilityCode: string;
  capabilityName: string;
  description: string;
  category: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EpnePartnerCapabilityAssignment {
  id: string;
  partnerId: string;
  capabilityId: string;
  capabilityCode: string;
  enabled: boolean;
  assignedBy: string;
  assignedOn: string;
}

// ---------------------------------------------------------------------------
// Hierarchy & referral
// ---------------------------------------------------------------------------

export interface EpnePartnerHierarchyNode {
  partnerId: string;
  partnerCode: string;
  parentPartnerId?: string;
  depth: number;
  childPartnerIds: string[];
}

export interface EpneReferralRelationship {
  id: string;
  referrerPartnerId: string;
  referredPartnerId: string;
  relationshipType: EpneReferralRelationshipType;
  effectiveFrom?: string;
  effectiveTo?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

export interface EpnePartnerNetwork {
  id: string;
  networkCode: string;
  networkName: string;
  description: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EpneNetworkMembership {
  id: string;
  networkId: string;
  partnerId: string;
  membershipRole: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EpneReferralNetwork {
  id: string;
  networkCode: string;
  networkName: string;
  description: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EpneReferralMapping {
  id: string;
  networkId: string;
  partnerId: string;
  mappingRole: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// Territory & service area
// ---------------------------------------------------------------------------

export interface EpneTerritory {
  id: string;
  territoryCode: string;
  territoryName: string;
  description: string;
  regionRef: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EpneServiceArea {
  id: string;
  territoryId: string;
  partnerId: string;
  areaCode: string;
  areaName: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Agreement
// ---------------------------------------------------------------------------

export interface EpnePartnerAgreement {
  id: string;
  partnerId: string;
  agreementCode: string;
  agreementName: string;
  description: string;
  lifecycleStatus: EpneAgreementLifecycleStatus;
  effectiveFrom?: string;
  effectiveTo?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

export interface EpneAgreementVersion {
  id: string;
  agreementId: string;
  agreementCode: string;
  versionMajor: number;
  versionMinor: number;
  termsRef: string;
  lifecycleStatus: EpneAgreementLifecycleStatus;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdBy: string;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// References (external engine pointers — not duplicated)
// ---------------------------------------------------------------------------

export interface EpnePartnerKycReference {
  id: string;
  partnerId: string;
  kycRef: string;
  verifiedOn?: string;
  status: "pending" | "verified" | "rejected";
}

export interface EpnePartnerBankingReference {
  id: string;
  partnerId: string;
  bankingRef: string;
  verifiedOn?: string;
}

export interface EpnePartnerComplianceReference {
  id: string;
  partnerId: string;
  complianceRef: string;
  status: "pending" | "compliant" | "non_compliant";
  checkedOn?: string;
}

export interface EpnePartnerAuditReference {
  id: string;
  entityId: string;
  entityType: EpneAuditEntityType;
  eafAuditEntryId: string;
  recordedOn: string;
}

// ---------------------------------------------------------------------------
// Performance
// ---------------------------------------------------------------------------

export interface EpnePartnerPerformanceSummary {
  id: string;
  partnerId: string;
  periodCode: string;
  metrics: Record<string, number>;
  computedOn: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type EpneValidationSeverity = "error" | "warning";

export interface EpneValidationIssue {
  code: string;
  severity: EpneValidationSeverity;
  message: string;
  entityRef?: string;
}

export interface EpneValidationResult {
  valid: boolean;
  issues: EpneValidationIssue[];
}

// ---------------------------------------------------------------------------
// Registry snapshot
// ---------------------------------------------------------------------------

export interface EpneRegistrySnapshot {
  partners: EpnePartner[];
  partnerProfiles: EpnePartnerProfile[];
  partnerOrganizations: EpnePartnerOrganization[];
  partnerLegalEntities: EpnePartnerLegalEntity[];
  partnerContacts: EpnePartnerContact[];
  partnerAddresses: EpnePartnerAddress[];
  partnerVersions: EpnePartnerVersion[];
  relationshipTypes: EpneRelationshipType[];
  relationships: EpneRelationship[];
  capabilities: EpneCapability[];
  capabilityAssignments: EpnePartnerCapabilityAssignment[];
  agreements: EpnePartnerAgreement[];
  agreementVersions: EpneAgreementVersion[];
  networks: EpnePartnerNetwork[];
  memberships: EpneNetworkMembership[];
  referralNetworks: EpneReferralNetwork[];
  referralMappings: EpneReferralMapping[];
  territories: EpneTerritory[];
  serviceAreas: EpneServiceArea[];
  referrals: EpneReferralRelationship[];
  ratings: EpnePartnerRating[];
  performanceSummaries: EpnePartnerPerformanceSummary[];
  kycReferences: EpnePartnerKycReference[];
  bankingReferences: EpnePartnerBankingReference[];
  complianceReferences: EpnePartnerComplianceReference[];
  auditReferences: EpnePartnerAuditReference[];
}
