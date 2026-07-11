/**
 * EPNE in-memory adapters — Sprint 9 default implementation.
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
  EpneRelationship,
  EpneRelationshipType,
  EpneServiceArea,
  EpneTerritory,
} from "@/types/enterprise-partner-network-engine";
import type { EpnePorts } from "@/types/enterprise-partner-network-engine-ports";

function createMutableListStore<T>(): {
  list: () => T[];
  replaceAll: (items: T[]) => void;
  upsert: (item: T, key: (item: T) => string) => void;
} {
  let items: T[] = [];
  return {
    list: () => items,
    replaceAll: (next) => {
      items = next;
    },
    upsert: (item, key) => {
      const id = key(item);
      items = [item, ...items.filter((i) => key(i) !== id)];
    },
  };
}

export function createInMemoryEpnePorts(): EpnePorts {
  const partners = createMutableListStore<EpnePartner>();
  const partnerProfiles = createMutableListStore<EpnePartnerProfile>();
  const partnerOrganizations = createMutableListStore<EpnePartnerOrganization>();
  const partnerLegalEntities = createMutableListStore<EpnePartnerLegalEntity>();
  const partnerContacts = createMutableListStore<EpnePartnerContact>();
  const partnerAddresses = createMutableListStore<EpnePartnerAddress>();
  const relationshipTypes = createMutableListStore<EpneRelationshipType>();
  const relationships = createMutableListStore<EpneRelationship>();
  const capabilities = createMutableListStore<EpneCapability>();
  const capabilityAssignments = createMutableListStore<EpnePartnerCapabilityAssignment>();
  const partnerVersions = createMutableListStore<EpnePartnerVersion>();
  const agreements = createMutableListStore<EpnePartnerAgreement>();
  const agreementVersions = createMutableListStore<EpneAgreementVersion>();
  const networks = createMutableListStore<EpnePartnerNetwork>();
  const memberships = createMutableListStore<EpneNetworkMembership>();
  const referralNetworks = createMutableListStore<EpneReferralNetwork>();
  const referralMappings = createMutableListStore<EpneReferralMapping>();
  const territories = createMutableListStore<EpneTerritory>();
  const serviceAreas = createMutableListStore<EpneServiceArea>();
  const referrals = createMutableListStore<EpneReferralRelationship>();
  const ratings = createMutableListStore<EpnePartnerRating>();
  const performance = createMutableListStore<EpnePartnerPerformanceSummary>();
  const kycReferences = createMutableListStore<EpnePartnerKycReference>();
  const bankingReferences = createMutableListStore<EpnePartnerBankingReference>();
  const complianceReferences = createMutableListStore<EpnePartnerComplianceReference>();
  const auditReferences = createMutableListStore<EpnePartnerAuditReference>();

  return {
    partners: {
      list: () => partners.list(),
      findById: (id) => partners.list().find((p) => p.id === id),
      findByCode: (partnerCode, tenantId) =>
        partners
          .list()
          .find(
            (p) =>
              p.partnerCode === partnerCode &&
              p.enabled &&
              (tenantId === undefined || p.tenantId === tenantId),
          ),
      listByParent: (parentPartnerId) =>
        partners.list().filter((p) => p.parentPartnerId === parentPartnerId),
      search: (query) => {
        const q = query.toLowerCase();
        return partners
          .list()
          .filter(
            (p) =>
              p.enabled &&
              (p.partnerCode.toLowerCase().includes(q) ||
                p.partnerName.toLowerCase().includes(q) ||
                p.tags.some((t) => t.tagCode.toLowerCase().includes(q)) ||
                partnerProfiles
                  .list()
                  .some(
                    (profile) =>
                      profile.partnerId === p.id &&
                      (profile.displayName.toLowerCase().includes(q) ||
                        profile.summary.toLowerCase().includes(q)),
                  )),
          );
      },
      save: (partner) => partners.upsert(partner, (p) => p.id),
      replaceAll: (items) => partners.replaceAll(items),
    },
    partnerProfiles: {
      list: () => partnerProfiles.list(),
      findById: (id) => partnerProfiles.list().find((p) => p.id === id),
      findByPartner: (partnerId) => partnerProfiles.list().find((p) => p.partnerId === partnerId),
      save: (profile) => partnerProfiles.upsert(profile, (p) => p.id),
      replaceAll: (items) => partnerProfiles.replaceAll(items),
    },
    partnerOrganizations: {
      list: () => partnerOrganizations.list(),
      findById: (id) => partnerOrganizations.list().find((o) => o.id === id),
      listByPartner: (partnerId) => partnerOrganizations.list().filter((o) => o.partnerId === partnerId),
      save: (organization) => partnerOrganizations.upsert(organization, (o) => o.id),
      replaceAll: (items) => partnerOrganizations.replaceAll(items),
    },
    partnerLegalEntities: {
      list: () => partnerLegalEntities.list(),
      findById: (id) => partnerLegalEntities.list().find((e) => e.id === id),
      listByPartner: (partnerId) => partnerLegalEntities.list().filter((e) => e.partnerId === partnerId),
      save: (entity) => partnerLegalEntities.upsert(entity, (e) => e.id),
      replaceAll: (items) => partnerLegalEntities.replaceAll(items),
    },
    partnerContacts: {
      list: () => partnerContacts.list(),
      findById: (id) => partnerContacts.list().find((c) => c.id === id),
      listByPartner: (partnerId) => partnerContacts.list().filter((c) => c.partnerId === partnerId),
      save: (contact) => partnerContacts.upsert(contact, (c) => c.id),
      replaceAll: (items) => partnerContacts.replaceAll(items),
    },
    partnerAddresses: {
      list: () => partnerAddresses.list(),
      findById: (id) => partnerAddresses.list().find((a) => a.id === id),
      listByPartner: (partnerId) => partnerAddresses.list().filter((a) => a.partnerId === partnerId),
      save: (address) => partnerAddresses.upsert(address, (a) => a.id),
      replaceAll: (items) => partnerAddresses.replaceAll(items),
    },
    relationshipTypes: {
      list: () => relationshipTypes.list(),
      findById: (id) => relationshipTypes.list().find((t) => t.id === id),
      findByCode: (typeCode) =>
        relationshipTypes.list().find((t) => t.typeCode === typeCode && t.enabled),
      save: (type) => relationshipTypes.upsert(type, (t) => t.id),
      replaceAll: (items) => relationshipTypes.replaceAll(items),
    },
    relationships: {
      list: () => relationships.list(),
      findById: (id) => relationships.list().find((r) => r.id === id),
      listBySource: (sourcePartnerId) =>
        relationships.list().filter((r) => r.sourcePartnerId === sourcePartnerId),
      listByTarget: (targetPartnerId) =>
        relationships.list().filter((r) => r.targetPartnerId === targetPartnerId),
      save: (relationship) => relationships.upsert(relationship, (r) => r.id),
      replaceAll: (items) => relationships.replaceAll(items),
    },
    capabilities: {
      list: () => capabilities.list(),
      findById: (id) => capabilities.list().find((c) => c.id === id),
      findByCode: (capabilityCode) =>
        capabilities.list().find((c) => c.capabilityCode === capabilityCode && c.enabled),
      save: (capability) => capabilities.upsert(capability, (c) => c.id),
      replaceAll: (items) => capabilities.replaceAll(items),
    },
    capabilityAssignments: {
      list: () => capabilityAssignments.list(),
      findById: (id) => capabilityAssignments.list().find((a) => a.id === id),
      listByPartner: (partnerId) =>
        capabilityAssignments.list().filter((a) => a.partnerId === partnerId),
      save: (assignment) => capabilityAssignments.upsert(assignment, (a) => a.id),
      replaceAll: (items) => capabilityAssignments.replaceAll(items),
    },
    partnerVersions: {
      list: () => partnerVersions.list(),
      findById: (id) => partnerVersions.list().find((v) => v.id === id),
      listByPartner: (partnerId) => partnerVersions.list().filter((v) => v.partnerId === partnerId),
      save: (version) => partnerVersions.upsert(version, (v) => v.id),
      replaceAll: (items) => partnerVersions.replaceAll(items),
    },
    agreements: {
      list: () => agreements.list(),
      findById: (id) => agreements.list().find((a) => a.id === id),
      listByPartner: (partnerId) => agreements.list().filter((a) => a.partnerId === partnerId),
      findByCode: (agreementCode) => agreements.list().find((a) => a.agreementCode === agreementCode),
      findByPartnerAndCode: (partnerId, agreementCode) =>
        agreements
          .list()
          .find((a) => a.partnerId === partnerId && a.agreementCode === agreementCode && a.enabled),
      save: (agreement) => agreements.upsert(agreement, (a) => a.id),
      replaceAll: (items) => agreements.replaceAll(items),
    },
    agreementVersions: {
      list: () => agreementVersions.list(),
      findById: (id) => agreementVersions.list().find((v) => v.id === id),
      listByAgreement: (agreementId) => agreementVersions.list().filter((v) => v.agreementId === agreementId),
      findByAgreementAndVersion: (agreementId, major, minor) =>
        agreementVersions
          .list()
          .find((v) => v.agreementId === agreementId && v.versionMajor === major && v.versionMinor === minor),
      save: (version) => agreementVersions.upsert(version, (v) => v.id),
      replaceAll: (items) => agreementVersions.replaceAll(items),
    },
    networks: {
      list: () => networks.list(),
      findById: (id) => networks.list().find((n) => n.id === id),
      findByCode: (networkCode) => networks.list().find((n) => n.networkCode === networkCode && n.enabled),
      save: (network) => networks.upsert(network, (n) => n.id),
      replaceAll: (items) => networks.replaceAll(items),
    },
    memberships: {
      list: () => memberships.list(),
      findById: (id) => memberships.list().find((m) => m.id === id),
      listByNetwork: (networkId) => memberships.list().filter((m) => m.networkId === networkId),
      listByPartner: (partnerId) => memberships.list().filter((m) => m.partnerId === partnerId),
      save: (membership) => memberships.upsert(membership, (m) => m.id),
      replaceAll: (items) => memberships.replaceAll(items),
    },
    referralNetworks: {
      list: () => referralNetworks.list(),
      findById: (id) => referralNetworks.list().find((n) => n.id === id),
      findByCode: (networkCode) =>
        referralNetworks.list().find((n) => n.networkCode === networkCode && n.enabled),
      save: (network) => referralNetworks.upsert(network, (n) => n.id),
      replaceAll: (items) => referralNetworks.replaceAll(items),
    },
    referralMappings: {
      list: () => referralMappings.list(),
      findById: (id) => referralMappings.list().find((m) => m.id === id),
      listByNetwork: (networkId) => referralMappings.list().filter((m) => m.networkId === networkId),
      listByPartner: (partnerId) => referralMappings.list().filter((m) => m.partnerId === partnerId),
      save: (mapping) => referralMappings.upsert(mapping, (m) => m.id),
      replaceAll: (items) => referralMappings.replaceAll(items),
    },
    territories: {
      list: () => territories.list(),
      findById: (id) => territories.list().find((t) => t.id === id),
      findByCode: (territoryCode) => territories.list().find((t) => t.territoryCode === territoryCode && t.enabled),
      save: (territory) => territories.upsert(territory, (t) => t.id),
      replaceAll: (items) => territories.replaceAll(items),
    },
    serviceAreas: {
      list: () => serviceAreas.list(),
      listByPartner: (partnerId) => serviceAreas.list().filter((a) => a.partnerId === partnerId),
      listByTerritory: (territoryId) => serviceAreas.list().filter((a) => a.territoryId === territoryId),
      save: (area) => serviceAreas.upsert(area, (a) => `${a.territoryId}:${a.partnerId}:${a.areaCode}`),
      replaceAll: (items) => serviceAreas.replaceAll(items),
    },
    referrals: {
      list: () => referrals.list(),
      listByReferrer: (referrerPartnerId) =>
        referrals.list().filter((r) => r.referrerPartnerId === referrerPartnerId),
      save: (referral) => referrals.upsert(referral, (r) => r.id),
      replaceAll: (items) => referrals.replaceAll(items),
    },
    ratings: {
      list: () => ratings.list(),
      listByPartner: (partnerId) => ratings.list().filter((r) => r.partnerId === partnerId),
      save: (rating) => ratings.upsert(rating, (r) => r.id),
      replaceAll: (items) => ratings.replaceAll(items),
    },
    performance: {
      list: () => performance.list(),
      listByPartner: (partnerId) => performance.list().filter((s) => s.partnerId === partnerId),
      save: (summary) => performance.upsert(summary, (s) => s.id),
      replaceAll: (items) => performance.replaceAll(items),
    },
    kycReferences: {
      list: () => kycReferences.list(),
      listByPartner: (partnerId) => kycReferences.list().filter((r) => r.partnerId === partnerId),
      save: (reference) => kycReferences.upsert(reference, (r) => r.id),
      replaceAll: (items) => kycReferences.replaceAll(items),
    },
    bankingReferences: {
      list: () => bankingReferences.list(),
      listByPartner: (partnerId) => bankingReferences.list().filter((r) => r.partnerId === partnerId),
      save: (reference) => bankingReferences.upsert(reference, (r) => r.id),
      replaceAll: (items) => bankingReferences.replaceAll(items),
    },
    complianceReferences: {
      list: () => complianceReferences.list(),
      listByPartner: (partnerId) => complianceReferences.list().filter((r) => r.partnerId === partnerId),
      save: (reference) => complianceReferences.upsert(reference, (r) => r.id),
      replaceAll: (items) => complianceReferences.replaceAll(items),
    },
    auditReferences: {
      list: () => auditReferences.list(),
      listByEntity: (entityId) => auditReferences.list().filter((r) => r.entityId === entityId),
      save: (reference) => auditReferences.upsert(reference, (r) => r.id),
      replaceAll: (items) => auditReferences.replaceAll(items),
    },
  };
}
