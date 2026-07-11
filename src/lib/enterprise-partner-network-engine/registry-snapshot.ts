/**
 * EPNE registry snapshot.
 */

import { EPNE_FRAMEWORK_VERSION } from "@/constants/enterprise-partner-network-engine";
import type { EpneRegistrySnapshot } from "@/types/enterprise-partner-network-engine";
import { getEpnePorts } from "./composition";

export function getEpneFrameworkVersion(): string {
  return EPNE_FRAMEWORK_VERSION;
}

export function getEpneRegistrySnapshot(): EpneRegistrySnapshot {
  const ports = getEpnePorts();
  return {
    partners: ports.partners.list(),
    partnerProfiles: ports.partnerProfiles.list(),
    partnerOrganizations: ports.partnerOrganizations.list(),
    partnerLegalEntities: ports.partnerLegalEntities.list(),
    partnerContacts: ports.partnerContacts.list(),
    partnerAddresses: ports.partnerAddresses.list(),
    partnerVersions: ports.partnerVersions.list(),
    relationshipTypes: ports.relationshipTypes.list(),
    relationships: ports.relationships.list(),
    capabilities: ports.capabilities.list(),
    capabilityAssignments: ports.capabilityAssignments.list(),
    agreements: ports.agreements.list(),
    agreementVersions: ports.agreementVersions.list(),
    networks: ports.networks.list(),
    memberships: ports.memberships.list(),
    referralNetworks: ports.referralNetworks.list(),
    referralMappings: ports.referralMappings.list(),
    territories: ports.territories.list(),
    serviceAreas: ports.serviceAreas.list(),
    referrals: ports.referrals.list(),
    ratings: ports.ratings.list(),
    performanceSummaries: ports.performance.list(),
    kycReferences: ports.kycReferences.list(),
    bankingReferences: ports.bankingReferences.list(),
    complianceReferences: ports.complianceReferences.list(),
    auditReferences: ports.auditReferences.list(),
  };
}
