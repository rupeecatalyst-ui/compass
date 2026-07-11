/**
 * EC360 registry snapshot.
 */

import { EC360_FRAMEWORK_VERSION } from "@/constants/enterprise-customer-360-engine";
import type { Ec360RegistrySnapshot } from "@/types/enterprise-customer-360-engine";
import { getEc360Ports } from "./composition";

export function getEc360FrameworkVersion(): string {
  return EC360_FRAMEWORK_VERSION;
}

export function getEc360RegistrySnapshot(): Ec360RegistrySnapshot {
  const ports = getEc360Ports();
  return {
    customers: ports.customers.list(),
    customerProfiles: ports.customerProfiles.list(),
    individuals: ports.individuals.list(),
    organizationCustomers: ports.organizationCustomers.list(),
    households: ports.households.list(),
    relationshipTypes: ports.relationshipTypes.list(),
    relationships: ports.relationships.list(),
    addresses: ports.addresses.list(),
    contacts: ports.contacts.list(),
    identityReferences: ports.identityReferences.list(),
    kycReferences: ports.kycReferences.list(),
    employments: ports.employments.list(),
    incomeProfiles: ports.incomeProfiles.list(),
    financialProfiles: ports.financialProfiles.list(),
    riskProfiles: ports.riskProfiles.list(),
    preferences: ports.preferences.list(),
    consents: ports.consents.list(),
    communicationPreferences: ports.communicationPreferences.list(),
    segments: ports.segments.list(),
    segmentAssignments: ports.segmentAssignments.list(),
    timelineEntries: ports.timeline.list(),
    auditReferences: ports.auditReferences.list(),
  };
}
