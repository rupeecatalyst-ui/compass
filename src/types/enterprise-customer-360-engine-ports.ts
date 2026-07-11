/**
 * EC360 Ports — repository contracts.
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
  Ec360RegistrySnapshot,
  Ec360RelationshipType,
} from "./enterprise-customer-360-engine";

export interface Ec360CustomerRepositoryPort {
  list(): Ec360Customer[];
  findById(id: string): Ec360Customer | undefined;
  findByCode(customerCode: string, tenantId?: string): Ec360Customer | undefined;
  findByIdentityRef(identityRef: string): Ec360Customer | undefined;
  listByHousehold(householdId: string): Ec360Customer[];
  search(query: string): Ec360Customer[];
  save(customer: Ec360Customer): void;
  replaceAll(customers: Ec360Customer[]): void;
}

export interface Ec360CustomerProfileRepositoryPort {
  list(): Ec360CustomerProfile[];
  findById(id: string): Ec360CustomerProfile | undefined;
  findByCustomer(customerId: string): Ec360CustomerProfile | undefined;
  save(profile: Ec360CustomerProfile): void;
  replaceAll(profiles: Ec360CustomerProfile[]): void;
}

export interface Ec360IndividualRepositoryPort {
  list(): Ec360Individual[];
  findById(id: string): Ec360Individual | undefined;
  findByCustomer(customerId: string): Ec360Individual | undefined;
  save(individual: Ec360Individual): void;
  replaceAll(individuals: Ec360Individual[]): void;
}

export interface Ec360OrganizationCustomerRepositoryPort {
  list(): Ec360OrganizationCustomer[];
  findById(id: string): Ec360OrganizationCustomer | undefined;
  findByCustomer(customerId: string): Ec360OrganizationCustomer | undefined;
  save(organization: Ec360OrganizationCustomer): void;
  replaceAll(organizations: Ec360OrganizationCustomer[]): void;
}

export interface Ec360HouseholdRepositoryPort {
  list(): Ec360Household[];
  findById(id: string): Ec360Household | undefined;
  findByCode(householdCode: string): Ec360Household | undefined;
  save(household: Ec360Household): void;
  replaceAll(households: Ec360Household[]): void;
}

export interface Ec360RelationshipTypeRepositoryPort {
  list(): Ec360RelationshipType[];
  findById(id: string): Ec360RelationshipType | undefined;
  findByCode(typeCode: string): Ec360RelationshipType | undefined;
  save(type: Ec360RelationshipType): void;
  replaceAll(types: Ec360RelationshipType[]): void;
}

export interface Ec360RelationshipRepositoryPort {
  list(): Ec360CustomerRelationship[];
  findById(id: string): Ec360CustomerRelationship | undefined;
  listBySource(sourceCustomerId: string): Ec360CustomerRelationship[];
  listByTarget(targetCustomerId: string): Ec360CustomerRelationship[];
  listByHousehold(householdId: string): Ec360CustomerRelationship[];
  save(relationship: Ec360CustomerRelationship): void;
  replaceAll(relationships: Ec360CustomerRelationship[]): void;
}

export interface Ec360AddressRepositoryPort {
  list(): Ec360CustomerAddress[];
  findById(id: string): Ec360CustomerAddress | undefined;
  listByCustomer(customerId: string): Ec360CustomerAddress[];
  save(address: Ec360CustomerAddress): void;
  replaceAll(addresses: Ec360CustomerAddress[]): void;
}

export interface Ec360ContactRepositoryPort {
  list(): Ec360CustomerContact[];
  findById(id: string): Ec360CustomerContact | undefined;
  listByCustomer(customerId: string): Ec360CustomerContact[];
  save(contact: Ec360CustomerContact): void;
  replaceAll(contacts: Ec360CustomerContact[]): void;
}

export interface Ec360IdentityReferenceRepositoryPort {
  list(): Ec360CustomerIdentityReference[];
  listByCustomer(customerId: string): Ec360CustomerIdentityReference[];
  findByIdentityRef(identityRef: string): Ec360CustomerIdentityReference | undefined;
  save(reference: Ec360CustomerIdentityReference): void;
  replaceAll(references: Ec360CustomerIdentityReference[]): void;
}

export interface Ec360KycReferenceRepositoryPort {
  list(): Ec360CustomerKycReference[];
  listByCustomer(customerId: string): Ec360CustomerKycReference[];
  save(reference: Ec360CustomerKycReference): void;
  replaceAll(references: Ec360CustomerKycReference[]): void;
}

export interface Ec360EmploymentRepositoryPort {
  list(): Ec360CustomerEmployment[];
  listByCustomer(customerId: string): Ec360CustomerEmployment[];
  save(employment: Ec360CustomerEmployment): void;
  replaceAll(employments: Ec360CustomerEmployment[]): void;
}

export interface Ec360IncomeProfileRepositoryPort {
  list(): Ec360CustomerIncomeProfile[];
  listByCustomer(customerId: string): Ec360CustomerIncomeProfile[];
  save(profile: Ec360CustomerIncomeProfile): void;
  replaceAll(profiles: Ec360CustomerIncomeProfile[]): void;
}

export interface Ec360FinancialProfileRepositoryPort {
  list(): Ec360CustomerFinancialProfile[];
  listByCustomer(customerId: string): Ec360CustomerFinancialProfile[];
  save(profile: Ec360CustomerFinancialProfile): void;
  replaceAll(profiles: Ec360CustomerFinancialProfile[]): void;
}

export interface Ec360RiskProfileRepositoryPort {
  list(): Ec360CustomerRiskProfile[];
  listByCustomer(customerId: string): Ec360CustomerRiskProfile[];
  save(profile: Ec360CustomerRiskProfile): void;
  replaceAll(profiles: Ec360CustomerRiskProfile[]): void;
}

export interface Ec360PreferenceRepositoryPort {
  list(): Ec360CustomerPreference[];
  listByCustomer(customerId: string): Ec360CustomerPreference[];
  save(preference: Ec360CustomerPreference): void;
  replaceAll(preferences: Ec360CustomerPreference[]): void;
}

export interface Ec360ConsentRepositoryPort {
  list(): Ec360CustomerConsent[];
  findById(id: string): Ec360CustomerConsent | undefined;
  listByCustomer(customerId: string): Ec360CustomerConsent[];
  findByCustomerAndCode(customerId: string, consentCode: string): Ec360CustomerConsent | undefined;
  save(consent: Ec360CustomerConsent): void;
  replaceAll(consents: Ec360CustomerConsent[]): void;
}

export interface Ec360CommunicationPreferenceRepositoryPort {
  list(): Ec360CustomerCommunicationPreference[];
  listByCustomer(customerId: string): Ec360CustomerCommunicationPreference[];
  save(preference: Ec360CustomerCommunicationPreference): void;
  replaceAll(preferences: Ec360CustomerCommunicationPreference[]): void;
}

export interface Ec360SegmentRepositoryPort {
  list(): Ec360CustomerSegment[];
  findById(id: string): Ec360CustomerSegment | undefined;
  findByCode(segmentCode: string): Ec360CustomerSegment | undefined;
  save(segment: Ec360CustomerSegment): void;
  replaceAll(segments: Ec360CustomerSegment[]): void;
}

export interface Ec360SegmentAssignmentRepositoryPort {
  list(): Ec360CustomerSegmentAssignment[];
  listByCustomer(customerId: string): Ec360CustomerSegmentAssignment[];
  save(assignment: Ec360CustomerSegmentAssignment): void;
  replaceAll(assignments: Ec360CustomerSegmentAssignment[]): void;
}

export interface Ec360TimelineRepositoryPort {
  list(): Ec360CustomerTimelineEntry[];
  listByCustomer(customerId: string): Ec360CustomerTimelineEntry[];
  save(entry: Ec360CustomerTimelineEntry): void;
  replaceAll(entries: Ec360CustomerTimelineEntry[]): void;
}

export interface Ec360AuditReferenceRepositoryPort {
  list(): Ec360CustomerAuditReference[];
  listByEntity(entityId: string): Ec360CustomerAuditReference[];
  save(reference: Ec360CustomerAuditReference): void;
  replaceAll(references: Ec360CustomerAuditReference[]): void;
}

export interface Ec360Ports {
  customers: Ec360CustomerRepositoryPort;
  customerProfiles: Ec360CustomerProfileRepositoryPort;
  individuals: Ec360IndividualRepositoryPort;
  organizationCustomers: Ec360OrganizationCustomerRepositoryPort;
  households: Ec360HouseholdRepositoryPort;
  relationshipTypes: Ec360RelationshipTypeRepositoryPort;
  relationships: Ec360RelationshipRepositoryPort;
  addresses: Ec360AddressRepositoryPort;
  contacts: Ec360ContactRepositoryPort;
  identityReferences: Ec360IdentityReferenceRepositoryPort;
  kycReferences: Ec360KycReferenceRepositoryPort;
  employments: Ec360EmploymentRepositoryPort;
  incomeProfiles: Ec360IncomeProfileRepositoryPort;
  financialProfiles: Ec360FinancialProfileRepositoryPort;
  riskProfiles: Ec360RiskProfileRepositoryPort;
  preferences: Ec360PreferenceRepositoryPort;
  consents: Ec360ConsentRepositoryPort;
  communicationPreferences: Ec360CommunicationPreferenceRepositoryPort;
  segments: Ec360SegmentRepositoryPort;
  segmentAssignments: Ec360SegmentAssignmentRepositoryPort;
  timeline: Ec360TimelineRepositoryPort;
  auditReferences: Ec360AuditReferenceRepositoryPort;
}

export type PartialEc360Ports = Partial<Ec360Ports>;

export type { Ec360RegistrySnapshot };
