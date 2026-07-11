/**
 * EPNE Ports — repository contracts.
 */

import type {
  EpneAgreementVersion,
  EpneCapability,
  EpneNetworkMembership,
  EpnePartner,
  EpnePartnerAddress,
  EpnePartnerAgreement,
  EpnePartnerAuditReference,
  EpnePartnerBankingReference,
  EpnePartnerCapabilityAssignment,
  EpnePartnerComplianceReference,
  EpnePartnerContact,
  EpnePartnerKycReference,
  EpnePartnerLegalEntity,
  EpnePartnerNetwork,
  EpnePartnerOrganization,
  EpnePartnerPerformanceSummary,
  EpnePartnerProfile,
  EpnePartnerRating,
  EpnePartnerVersion,
  EpneReferralMapping,
  EpneReferralNetwork,
  EpneReferralRelationship,
  EpneRegistrySnapshot,
  EpneRelationship,
  EpneRelationshipType,
  EpneServiceArea,
  EpneTerritory,
} from "./enterprise-partner-network-engine";

export interface EpnePartnerRepositoryPort {
  list(): EpnePartner[];
  findById(id: string): EpnePartner | undefined;
  findByCode(partnerCode: string, tenantId?: string): EpnePartner | undefined;
  listByParent(parentPartnerId: string): EpnePartner[];
  search(query: string): EpnePartner[];
  save(partner: EpnePartner): void;
  replaceAll(partners: EpnePartner[]): void;
}

export interface EpnePartnerProfileRepositoryPort {
  list(): EpnePartnerProfile[];
  findById(id: string): EpnePartnerProfile | undefined;
  findByPartner(partnerId: string): EpnePartnerProfile | undefined;
  save(profile: EpnePartnerProfile): void;
  replaceAll(profiles: EpnePartnerProfile[]): void;
}

export interface EpnePartnerOrganizationRepositoryPort {
  list(): EpnePartnerOrganization[];
  findById(id: string): EpnePartnerOrganization | undefined;
  listByPartner(partnerId: string): EpnePartnerOrganization[];
  save(organization: EpnePartnerOrganization): void;
  replaceAll(organizations: EpnePartnerOrganization[]): void;
}

export interface EpnePartnerLegalEntityRepositoryPort {
  list(): EpnePartnerLegalEntity[];
  findById(id: string): EpnePartnerLegalEntity | undefined;
  listByPartner(partnerId: string): EpnePartnerLegalEntity[];
  save(entity: EpnePartnerLegalEntity): void;
  replaceAll(entities: EpnePartnerLegalEntity[]): void;
}

export interface EpnePartnerContactRepositoryPort {
  list(): EpnePartnerContact[];
  findById(id: string): EpnePartnerContact | undefined;
  listByPartner(partnerId: string): EpnePartnerContact[];
  save(contact: EpnePartnerContact): void;
  replaceAll(contacts: EpnePartnerContact[]): void;
}

export interface EpnePartnerAddressRepositoryPort {
  list(): EpnePartnerAddress[];
  findById(id: string): EpnePartnerAddress | undefined;
  listByPartner(partnerId: string): EpnePartnerAddress[];
  save(address: EpnePartnerAddress): void;
  replaceAll(addresses: EpnePartnerAddress[]): void;
}

export interface EpneRelationshipTypeRepositoryPort {
  list(): EpneRelationshipType[];
  findById(id: string): EpneRelationshipType | undefined;
  findByCode(typeCode: string): EpneRelationshipType | undefined;
  save(type: EpneRelationshipType): void;
  replaceAll(types: EpneRelationshipType[]): void;
}

export interface EpneRelationshipRepositoryPort {
  list(): EpneRelationship[];
  findById(id: string): EpneRelationship | undefined;
  listBySource(sourcePartnerId: string): EpneRelationship[];
  listByTarget(targetPartnerId: string): EpneRelationship[];
  save(relationship: EpneRelationship): void;
  replaceAll(relationships: EpneRelationship[]): void;
}

export interface EpneCapabilityRepositoryPort {
  list(): EpneCapability[];
  findById(id: string): EpneCapability | undefined;
  findByCode(capabilityCode: string): EpneCapability | undefined;
  save(capability: EpneCapability): void;
  replaceAll(capabilities: EpneCapability[]): void;
}

export interface EpneCapabilityAssignmentRepositoryPort {
  list(): EpnePartnerCapabilityAssignment[];
  findById(id: string): EpnePartnerCapabilityAssignment | undefined;
  listByPartner(partnerId: string): EpnePartnerCapabilityAssignment[];
  save(assignment: EpnePartnerCapabilityAssignment): void;
  replaceAll(assignments: EpnePartnerCapabilityAssignment[]): void;
}

export interface EpnePartnerVersionRepositoryPort {
  list(): EpnePartnerVersion[];
  findById(id: string): EpnePartnerVersion | undefined;
  listByPartner(partnerId: string): EpnePartnerVersion[];
  save(version: EpnePartnerVersion): void;
  replaceAll(versions: EpnePartnerVersion[]): void;
}

export interface EpneAgreementRepositoryPort {
  list(): EpnePartnerAgreement[];
  findById(id: string): EpnePartnerAgreement | undefined;
  listByPartner(partnerId: string): EpnePartnerAgreement[];
  findByCode(agreementCode: string): EpnePartnerAgreement | undefined;
  findByPartnerAndCode(partnerId: string, agreementCode: string): EpnePartnerAgreement | undefined;
  save(agreement: EpnePartnerAgreement): void;
  replaceAll(agreements: EpnePartnerAgreement[]): void;
}

export interface EpneAgreementVersionRepositoryPort {
  list(): EpneAgreementVersion[];
  findById(id: string): EpneAgreementVersion | undefined;
  listByAgreement(agreementId: string): EpneAgreementVersion[];
  findByAgreementAndVersion(agreementId: string, major: number, minor: number): EpneAgreementVersion | undefined;
  save(version: EpneAgreementVersion): void;
  replaceAll(versions: EpneAgreementVersion[]): void;
}

export interface EpneNetworkRepositoryPort {
  list(): EpnePartnerNetwork[];
  findById(id: string): EpnePartnerNetwork | undefined;
  findByCode(networkCode: string): EpnePartnerNetwork | undefined;
  save(network: EpnePartnerNetwork): void;
  replaceAll(networks: EpnePartnerNetwork[]): void;
}

export interface EpneMembershipRepositoryPort {
  list(): EpneNetworkMembership[];
  findById(id: string): EpneNetworkMembership | undefined;
  listByNetwork(networkId: string): EpneNetworkMembership[];
  listByPartner(partnerId: string): EpneNetworkMembership[];
  save(membership: EpneNetworkMembership): void;
  replaceAll(memberships: EpneNetworkMembership[]): void;
}

export interface EpneReferralNetworkRepositoryPort {
  list(): EpneReferralNetwork[];
  findById(id: string): EpneReferralNetwork | undefined;
  findByCode(networkCode: string): EpneReferralNetwork | undefined;
  save(network: EpneReferralNetwork): void;
  replaceAll(networks: EpneReferralNetwork[]): void;
}

export interface EpneReferralMappingRepositoryPort {
  list(): EpneReferralMapping[];
  findById(id: string): EpneReferralMapping | undefined;
  listByNetwork(networkId: string): EpneReferralMapping[];
  listByPartner(partnerId: string): EpneReferralMapping[];
  save(mapping: EpneReferralMapping): void;
  replaceAll(mappings: EpneReferralMapping[]): void;
}

export interface EpneTerritoryRepositoryPort {
  list(): EpneTerritory[];
  findById(id: string): EpneTerritory | undefined;
  findByCode(territoryCode: string): EpneTerritory | undefined;
  save(territory: EpneTerritory): void;
  replaceAll(territories: EpneTerritory[]): void;
}

export interface EpneServiceAreaRepositoryPort {
  list(): EpneServiceArea[];
  listByPartner(partnerId: string): EpneServiceArea[];
  listByTerritory(territoryId: string): EpneServiceArea[];
  save(area: EpneServiceArea): void;
  replaceAll(areas: EpneServiceArea[]): void;
}

export interface EpneReferralRepositoryPort {
  list(): EpneReferralRelationship[];
  listByReferrer(referrerPartnerId: string): EpneReferralRelationship[];
  save(referral: EpneReferralRelationship): void;
  replaceAll(referrals: EpneReferralRelationship[]): void;
}

export interface EpneRatingRepositoryPort {
  list(): EpnePartnerRating[];
  listByPartner(partnerId: string): EpnePartnerRating[];
  save(rating: EpnePartnerRating): void;
  replaceAll(ratings: EpnePartnerRating[]): void;
}

export interface EpnePerformanceRepositoryPort {
  list(): EpnePartnerPerformanceSummary[];
  listByPartner(partnerId: string): EpnePartnerPerformanceSummary[];
  save(summary: EpnePartnerPerformanceSummary): void;
  replaceAll(summaries: EpnePartnerPerformanceSummary[]): void;
}

export interface EpneKycReferenceRepositoryPort {
  list(): EpnePartnerKycReference[];
  listByPartner(partnerId: string): EpnePartnerKycReference[];
  save(reference: EpnePartnerKycReference): void;
  replaceAll(references: EpnePartnerKycReference[]): void;
}

export interface EpneBankingReferenceRepositoryPort {
  list(): EpnePartnerBankingReference[];
  listByPartner(partnerId: string): EpnePartnerBankingReference[];
  save(reference: EpnePartnerBankingReference): void;
  replaceAll(references: EpnePartnerBankingReference[]): void;
}

export interface EpneComplianceReferenceRepositoryPort {
  list(): EpnePartnerComplianceReference[];
  listByPartner(partnerId: string): EpnePartnerComplianceReference[];
  save(reference: EpnePartnerComplianceReference): void;
  replaceAll(references: EpnePartnerComplianceReference[]): void;
}

export interface EpneAuditReferenceRepositoryPort {
  list(): EpnePartnerAuditReference[];
  listByEntity(entityId: string): EpnePartnerAuditReference[];
  save(reference: EpnePartnerAuditReference): void;
  replaceAll(references: EpnePartnerAuditReference[]): void;
}

export interface EpnePorts {
  partners: EpnePartnerRepositoryPort;
  partnerProfiles: EpnePartnerProfileRepositoryPort;
  partnerOrganizations: EpnePartnerOrganizationRepositoryPort;
  partnerLegalEntities: EpnePartnerLegalEntityRepositoryPort;
  partnerContacts: EpnePartnerContactRepositoryPort;
  partnerAddresses: EpnePartnerAddressRepositoryPort;
  relationshipTypes: EpneRelationshipTypeRepositoryPort;
  relationships: EpneRelationshipRepositoryPort;
  capabilities: EpneCapabilityRepositoryPort;
  capabilityAssignments: EpneCapabilityAssignmentRepositoryPort;
  partnerVersions: EpnePartnerVersionRepositoryPort;
  agreements: EpneAgreementRepositoryPort;
  agreementVersions: EpneAgreementVersionRepositoryPort;
  networks: EpneNetworkRepositoryPort;
  memberships: EpneMembershipRepositoryPort;
  referralNetworks: EpneReferralNetworkRepositoryPort;
  referralMappings: EpneReferralMappingRepositoryPort;
  territories: EpneTerritoryRepositoryPort;
  serviceAreas: EpneServiceAreaRepositoryPort;
  referrals: EpneReferralRepositoryPort;
  ratings: EpneRatingRepositoryPort;
  performance: EpnePerformanceRepositoryPort;
  kycReferences: EpneKycReferenceRepositoryPort;
  bankingReferences: EpneBankingReferenceRepositoryPort;
  complianceReferences: EpneComplianceReferenceRepositoryPort;
  auditReferences: EpneAuditReferenceRepositoryPort;
}

export type PartialEpnePorts = Partial<EpnePorts>;

export type { EpneRegistrySnapshot };
