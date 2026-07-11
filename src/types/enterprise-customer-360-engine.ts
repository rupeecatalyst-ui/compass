/**
 * Enterprise Customer 360 Engine (EC360) — Sprint 10 Foundation.
 *
 * Canonical customer domain. Business-agnostic. No loan-specific logic.
 */

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export type Ec360CustomerLifecycleStatus =
  | "prospect"
  | "lead"
  | "active"
  | "dormant"
  | "archived";

export type Ec360CustomerLifecycleAction =
  | "qualify"
  | "activate"
  | "dormant"
  | "reactivate"
  | "archive";

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

export type Ec360CustomerType = "individual" | "organization";

export type Ec360ContactType = "primary" | "secondary" | "emergency" | "work";

export type Ec360AddressType = "residential" | "permanent" | "office" | "mailing";

export type Ec360ConsentStatus = "granted" | "denied" | "revoked" | "pending";

export type Ec360CommunicationChannel = "email" | "sms" | "phone" | "push" | "postal";

export type Ec360TimelineEventType =
  | "onboarded"
  | "lifecycle_changed"
  | "profile_updated"
  | "relationship_added"
  | "consent_updated"
  | "segment_assigned"
  | "tagged";

export type Ec360AuditEntityType =
  | "customer"
  | "customer_profile"
  | "household"
  | "relationship"
  | "consent"
  | "communication_preference"
  | "segment"
  | "timeline";

// ---------------------------------------------------------------------------
// Customer core
// ---------------------------------------------------------------------------

export interface Ec360CustomerTag {
  id: string;
  tagCode: string;
  label: string;
}

export interface Ec360Customer {
  id: string;
  tenantId?: string;
  customerCode: string;
  customerType: Ec360CustomerType;
  displayName: string;
  lifecycleStatus: Ec360CustomerLifecycleStatus;
  householdId?: string;
  tags: Ec360CustomerTag[];
  /** Conceptual IAAE identity reference — not duplicated here. */
  identityRef?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

export interface Ec360CustomerProfile {
  id: string;
  customerId: string;
  summary: string;
  preferredLanguage?: string;
  nationality?: string;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

export interface Ec360Individual {
  id: string;
  customerId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: string;
  gender?: string;
  createdBy: string;
  createdOn: string;
}

export interface Ec360OrganizationCustomer {
  id: string;
  customerId: string;
  organizationName: string;
  registrationNumber?: string;
  industryCode?: string;
  createdBy: string;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// Household & relationships
// ---------------------------------------------------------------------------

export interface Ec360Household {
  id: string;
  householdCode: string;
  householdName: string;
  headCustomerId?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

export interface Ec360RelationshipType {
  id: string;
  typeCode: string;
  typeName: string;
  description: string;
  hierarchyImplied: boolean;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface Ec360CustomerRelationship {
  id: string;
  sourceCustomerId: string;
  targetCustomerId: string;
  relationshipTypeCode: string;
  householdId?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface Ec360FamilyRelationship extends Ec360CustomerRelationship {
  relationshipTypeCode: "family";
}

export interface Ec360BusinessRelationship extends Ec360CustomerRelationship {
  relationshipTypeCode: "business";
}

// ---------------------------------------------------------------------------
// Contact & address
// ---------------------------------------------------------------------------

export interface Ec360CustomerAddress {
  id: string;
  customerId: string;
  addressType: Ec360AddressType;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  isPrimary: boolean;
  enabled: boolean;
}

export interface Ec360CustomerContact {
  id: string;
  customerId: string;
  contactType: Ec360ContactType;
  fullName: string;
  email?: string;
  phone?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// External references (not duplicated)
// ---------------------------------------------------------------------------

export interface Ec360CustomerIdentityReference {
  id: string;
  customerId: string;
  identityRef: string;
  verifiedOn?: string;
  status: "pending" | "verified" | "rejected";
}

export interface Ec360CustomerKycReference {
  id: string;
  customerId: string;
  kycRef: string;
  verifiedOn?: string;
  status: "pending" | "verified" | "rejected";
}

// ---------------------------------------------------------------------------
// Profiles (employment, income, financial, risk)
// ---------------------------------------------------------------------------

export interface Ec360CustomerEmployment {
  id: string;
  customerId: string;
  employerName: string;
  occupation: string;
  employmentType: string;
  startDate?: string;
  endDate?: string;
  enabled: boolean;
}

export interface Ec360CustomerIncomeProfile {
  id: string;
  customerId: string;
  incomeSource: string;
  annualIncome: number;
  currencyCode: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface Ec360CustomerFinancialProfile {
  id: string;
  customerId: string;
  netWorth?: number;
  liquidAssets?: number;
  currencyCode: string;
  asOfDate: string;
}

export interface Ec360CustomerRiskProfile {
  id: string;
  customerId: string;
  riskCategory: string;
  riskScore: number;
  assessedOn: string;
  assessedBy: string;
}

// ---------------------------------------------------------------------------
// Preferences, consent, communication
// ---------------------------------------------------------------------------

export interface Ec360CustomerPreference {
  id: string;
  customerId: string;
  preferenceCode: string;
  preferenceValue: string;
  enabled: boolean;
}

export interface Ec360CustomerConsent {
  id: string;
  customerId: string;
  consentCode: string;
  consentName: string;
  status: Ec360ConsentStatus;
  grantedOn?: string;
  revokedOn?: string;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

export interface Ec360CustomerCommunicationPreference {
  id: string;
  customerId: string;
  channel: Ec360CommunicationChannel;
  enabled: boolean;
  preferredTime?: string;
  requiresConsent: boolean;
  consentCode?: string;
}

// ---------------------------------------------------------------------------
// Segmentation & timeline
// ---------------------------------------------------------------------------

export interface Ec360CustomerSegment {
  id: string;
  segmentCode: string;
  segmentName: string;
  description: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface Ec360CustomerSegmentAssignment {
  id: string;
  customerId: string;
  segmentId: string;
  segmentCode: string;
  assignedBy: string;
  assignedOn: string;
}

export interface Ec360CustomerTimelineEntry {
  id: string;
  customerId: string;
  eventType: Ec360TimelineEventType;
  title: string;
  description: string;
  actorId: string;
  occurredOn: string;
  metadata?: Record<string, unknown>;
}

export interface Ec360CustomerAuditReference {
  id: string;
  entityId: string;
  entityType: Ec360AuditEntityType;
  eafAuditEntryId: string;
  recordedOn: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type Ec360ValidationSeverity = "error" | "warning";

export interface Ec360ValidationIssue {
  code: string;
  severity: Ec360ValidationSeverity;
  message: string;
  entityRef?: string;
}

export interface Ec360ValidationResult {
  valid: boolean;
  issues: Ec360ValidationIssue[];
}

// ---------------------------------------------------------------------------
// Registry snapshot
// ---------------------------------------------------------------------------

export interface Ec360RegistrySnapshot {
  customers: Ec360Customer[];
  customerProfiles: Ec360CustomerProfile[];
  individuals: Ec360Individual[];
  organizationCustomers: Ec360OrganizationCustomer[];
  households: Ec360Household[];
  relationshipTypes: Ec360RelationshipType[];
  relationships: Ec360CustomerRelationship[];
  addresses: Ec360CustomerAddress[];
  contacts: Ec360CustomerContact[];
  identityReferences: Ec360CustomerIdentityReference[];
  kycReferences: Ec360CustomerKycReference[];
  employments: Ec360CustomerEmployment[];
  incomeProfiles: Ec360CustomerIncomeProfile[];
  financialProfiles: Ec360CustomerFinancialProfile[];
  riskProfiles: Ec360CustomerRiskProfile[];
  preferences: Ec360CustomerPreference[];
  consents: Ec360CustomerConsent[];
  communicationPreferences: Ec360CustomerCommunicationPreference[];
  segments: Ec360CustomerSegment[];
  segmentAssignments: Ec360CustomerSegmentAssignment[];
  timelineEntries: Ec360CustomerTimelineEntry[];
  auditReferences: Ec360CustomerAuditReference[];
}
