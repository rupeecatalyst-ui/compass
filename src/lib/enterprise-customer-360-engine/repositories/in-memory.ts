/**
 * EC360 in-memory adapters — Sprint 10 default implementation.
 */

import type {
  Ec360Customer,
  Ec360CustomerAddress,
  Ec360CustomerAuditReference,
  Ec360CustomerCommunicationPreference,
  Ec360CustomerConsent,
  Ec360CustomerContact,
  Ec360CustomerEmployment,
  Ec360CustomerFinancialProfile,
  Ec360CustomerIdentityReference,
  Ec360CustomerIncomeProfile,
  Ec360CustomerKycReference,
  Ec360CustomerPreference,
  Ec360CustomerProfile,
  Ec360CustomerRelationship,
  Ec360CustomerRiskProfile,
  Ec360CustomerSegment,
  Ec360CustomerSegmentAssignment,
  Ec360CustomerTimelineEntry,
  Ec360Household,
  Ec360Individual,
  Ec360OrganizationCustomer,
  Ec360RelationshipType,
} from "@/types/enterprise-customer-360-engine";
import type { Ec360Ports } from "@/types/enterprise-customer-360-engine-ports";

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

export function createInMemoryEc360Ports(): Ec360Ports {
  const customers = createMutableListStore<Ec360Customer>();
  const customerProfiles = createMutableListStore<Ec360CustomerProfile>();
  const individuals = createMutableListStore<Ec360Individual>();
  const organizationCustomers = createMutableListStore<Ec360OrganizationCustomer>();
  const households = createMutableListStore<Ec360Household>();
  const relationshipTypes = createMutableListStore<Ec360RelationshipType>();
  const relationships = createMutableListStore<Ec360CustomerRelationship>();
  const addresses = createMutableListStore<Ec360CustomerAddress>();
  const contacts = createMutableListStore<Ec360CustomerContact>();
  const identityReferences = createMutableListStore<Ec360CustomerIdentityReference>();
  const kycReferences = createMutableListStore<Ec360CustomerKycReference>();
  const employments = createMutableListStore<Ec360CustomerEmployment>();
  const incomeProfiles = createMutableListStore<Ec360CustomerIncomeProfile>();
  const financialProfiles = createMutableListStore<Ec360CustomerFinancialProfile>();
  const riskProfiles = createMutableListStore<Ec360CustomerRiskProfile>();
  const preferences = createMutableListStore<Ec360CustomerPreference>();
  const consents = createMutableListStore<Ec360CustomerConsent>();
  const communicationPreferences = createMutableListStore<Ec360CustomerCommunicationPreference>();
  const segments = createMutableListStore<Ec360CustomerSegment>();
  const segmentAssignments = createMutableListStore<Ec360CustomerSegmentAssignment>();
  const timeline = createMutableListStore<Ec360CustomerTimelineEntry>();
  const auditReferences = createMutableListStore<Ec360CustomerAuditReference>();

  return {
    customers: {
      list: () => customers.list(),
      findById: (id) => customers.list().find((c) => c.id === id),
      findByCode: (customerCode, tenantId) =>
        customers
          .list()
          .find(
            (c) =>
              c.customerCode === customerCode &&
              c.enabled &&
              (tenantId === undefined || c.tenantId === tenantId),
          ),
      findByIdentityRef: (identityRef) =>
        customers.list().find((c) => c.identityRef === identityRef && c.enabled),
      listByHousehold: (householdId) => customers.list().filter((c) => c.householdId === householdId),
      search: (query) => {
        const q = query.toLowerCase();
        return customers.list().filter(
          (c) =>
            c.enabled &&
            (c.customerCode.toLowerCase().includes(q) ||
              c.displayName.toLowerCase().includes(q) ||
              c.tags.some((t) => t.tagCode.toLowerCase().includes(q)) ||
              customerProfiles
                .list()
                .some(
                  (p) =>
                    p.customerId === c.id &&
                    (p.summary.toLowerCase().includes(q) || p.nationality?.toLowerCase().includes(q)),
                )),
        );
      },
      save: (customer) => customers.upsert(customer, (c) => c.id),
      replaceAll: (items) => customers.replaceAll(items),
    },
    customerProfiles: {
      list: () => customerProfiles.list(),
      findById: (id) => customerProfiles.list().find((p) => p.id === id),
      findByCustomer: (customerId) => customerProfiles.list().find((p) => p.customerId === customerId),
      save: (profile) => customerProfiles.upsert(profile, (p) => p.id),
      replaceAll: (items) => customerProfiles.replaceAll(items),
    },
    individuals: {
      list: () => individuals.list(),
      findById: (id) => individuals.list().find((i) => i.id === id),
      findByCustomer: (customerId) => individuals.list().find((i) => i.customerId === customerId),
      save: (individual) => individuals.upsert(individual, (i) => i.id),
      replaceAll: (items) => individuals.replaceAll(items),
    },
    organizationCustomers: {
      list: () => organizationCustomers.list(),
      findById: (id) => organizationCustomers.list().find((o) => o.id === id),
      findByCustomer: (customerId) => organizationCustomers.list().find((o) => o.customerId === customerId),
      save: (organization) => organizationCustomers.upsert(organization, (o) => o.id),
      replaceAll: (items) => organizationCustomers.replaceAll(items),
    },
    households: {
      list: () => households.list(),
      findById: (id) => households.list().find((h) => h.id === id),
      findByCode: (householdCode) => households.list().find((h) => h.householdCode === householdCode && h.enabled),
      save: (household) => households.upsert(household, (h) => h.id),
      replaceAll: (items) => households.replaceAll(items),
    },
    relationshipTypes: {
      list: () => relationshipTypes.list(),
      findById: (id) => relationshipTypes.list().find((t) => t.id === id),
      findByCode: (typeCode) => relationshipTypes.list().find((t) => t.typeCode === typeCode && t.enabled),
      save: (type) => relationshipTypes.upsert(type, (t) => t.id),
      replaceAll: (items) => relationshipTypes.replaceAll(items),
    },
    relationships: {
      list: () => relationships.list(),
      findById: (id) => relationships.list().find((r) => r.id === id),
      listBySource: (sourceCustomerId) =>
        relationships.list().filter((r) => r.sourceCustomerId === sourceCustomerId),
      listByTarget: (targetCustomerId) =>
        relationships.list().filter((r) => r.targetCustomerId === targetCustomerId),
      listByHousehold: (householdId) =>
        relationships.list().filter((r) => r.householdId === householdId),
      save: (relationship) => relationships.upsert(relationship, (r) => r.id),
      replaceAll: (items) => relationships.replaceAll(items),
    },
    addresses: {
      list: () => addresses.list(),
      findById: (id) => addresses.list().find((a) => a.id === id),
      listByCustomer: (customerId) => addresses.list().filter((a) => a.customerId === customerId),
      save: (address) => addresses.upsert(address, (a) => a.id),
      replaceAll: (items) => addresses.replaceAll(items),
    },
    contacts: {
      list: () => contacts.list(),
      findById: (id) => contacts.list().find((c) => c.id === id),
      listByCustomer: (customerId) => contacts.list().filter((c) => c.customerId === customerId),
      save: (contact) => contacts.upsert(contact, (c) => c.id),
      replaceAll: (items) => contacts.replaceAll(items),
    },
    identityReferences: {
      list: () => identityReferences.list(),
      listByCustomer: (customerId) => identityReferences.list().filter((r) => r.customerId === customerId),
      findByIdentityRef: (identityRef) =>
        identityReferences.list().find((r) => r.identityRef === identityRef),
      save: (reference) => identityReferences.upsert(reference, (r) => r.id),
      replaceAll: (items) => identityReferences.replaceAll(items),
    },
    kycReferences: {
      list: () => kycReferences.list(),
      listByCustomer: (customerId) => kycReferences.list().filter((r) => r.customerId === customerId),
      save: (reference) => kycReferences.upsert(reference, (r) => r.id),
      replaceAll: (items) => kycReferences.replaceAll(items),
    },
    employments: {
      list: () => employments.list(),
      listByCustomer: (customerId) => employments.list().filter((e) => e.customerId === customerId),
      save: (employment) => employments.upsert(employment, (e) => e.id),
      replaceAll: (items) => employments.replaceAll(items),
    },
    incomeProfiles: {
      list: () => incomeProfiles.list(),
      listByCustomer: (customerId) => incomeProfiles.list().filter((p) => p.customerId === customerId),
      save: (profile) => incomeProfiles.upsert(profile, (p) => p.id),
      replaceAll: (items) => incomeProfiles.replaceAll(items),
    },
    financialProfiles: {
      list: () => financialProfiles.list(),
      listByCustomer: (customerId) => financialProfiles.list().filter((p) => p.customerId === customerId),
      save: (profile) => financialProfiles.upsert(profile, (p) => p.id),
      replaceAll: (items) => financialProfiles.replaceAll(items),
    },
    riskProfiles: {
      list: () => riskProfiles.list(),
      listByCustomer: (customerId) => riskProfiles.list().filter((p) => p.customerId === customerId),
      save: (profile) => riskProfiles.upsert(profile, (p) => p.id),
      replaceAll: (items) => riskProfiles.replaceAll(items),
    },
    preferences: {
      list: () => preferences.list(),
      listByCustomer: (customerId) => preferences.list().filter((p) => p.customerId === customerId),
      save: (preference) => preferences.upsert(preference, (p) => p.id),
      replaceAll: (items) => preferences.replaceAll(items),
    },
    consents: {
      list: () => consents.list(),
      findById: (id) => consents.list().find((c) => c.id === id),
      listByCustomer: (customerId) => consents.list().filter((c) => c.customerId === customerId),
      findByCustomerAndCode: (customerId, consentCode) =>
        consents.list().find((c) => c.customerId === customerId && c.consentCode === consentCode),
      save: (consent) => consents.upsert(consent, (c) => c.id),
      replaceAll: (items) => consents.replaceAll(items),
    },
    communicationPreferences: {
      list: () => communicationPreferences.list(),
      listByCustomer: (customerId) =>
        communicationPreferences.list().filter((p) => p.customerId === customerId),
      save: (preference) => communicationPreferences.upsert(preference, (p) => p.id),
      replaceAll: (items) => communicationPreferences.replaceAll(items),
    },
    segments: {
      list: () => segments.list(),
      findById: (id) => segments.list().find((s) => s.id === id),
      findByCode: (segmentCode) => segments.list().find((s) => s.segmentCode === segmentCode && s.enabled),
      save: (segment) => segments.upsert(segment, (s) => s.id),
      replaceAll: (items) => segments.replaceAll(items),
    },
    segmentAssignments: {
      list: () => segmentAssignments.list(),
      listByCustomer: (customerId) => segmentAssignments.list().filter((a) => a.customerId === customerId),
      save: (assignment) => segmentAssignments.upsert(assignment, (a) => a.id),
      replaceAll: (items) => segmentAssignments.replaceAll(items),
    },
    timeline: {
      list: () => timeline.list(),
      listByCustomer: (customerId) => timeline.list().filter((e) => e.customerId === customerId),
      save: (entry) => timeline.upsert(entry, (e) => e.id),
      replaceAll: (items) => timeline.replaceAll(items),
    },
    auditReferences: {
      list: () => auditReferences.list(),
      listByEntity: (entityId) => auditReferences.list().filter((r) => r.entityId === entityId),
      save: (reference) => auditReferences.upsert(reference, (r) => r.id),
      replaceAll: (items) => auditReferences.replaceAll(items),
    },
  };
}
