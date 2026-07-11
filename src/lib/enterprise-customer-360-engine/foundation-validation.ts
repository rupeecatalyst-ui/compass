/**
 * EC360 foundation validation — smoke checks for Sprint 10 deliverable verification.
 */

import {
  EC360_COMMUNICATION_CHANNELS,
  EC360_CONSENT_STATUS,
  EC360_CUSTOMER_LIFECYCLE_STATUS,
  EC360_CUSTOMER_TYPES,
  EC360_RELATIONSHIP_TYPE_CODES,
} from "@/constants/enterprise-customer-360-engine";
import {
  registerEc360Consent,
  setEc360CommunicationPreference,
} from "./consent-registry";
import { resetEc360Composition } from "./composition";
import {
  addEc360CustomerToHousehold,
  registerEc360Household,
} from "./household-registry";
import {
  assignEc360CustomerSegment,
  enrichEc360CustomerEmployment,
  enrichEc360FinancialProfile,
  enrichEc360IncomeProfile,
  enrichEc360RiskProfile,
  onboardEc360Customer,
  registerEc360CustomerAddress,
  registerEc360CustomerContact,
  registerEc360CustomerProfile,
  registerEc360IdentityReference,
  registerEc360Individual,
  registerEc360KycReference,
  registerEc360OrganizationCustomer,
  registerEc360Segment,
  searchEc360Customers,
  tagEc360Customer,
  transitionEc360CustomerLifecycle,
} from "./customer-registry";
import {
  initializeEc360RelationshipTypes,
  registerEc360Relationship,
} from "./relationship-engine";
import { getEc360RegistrySnapshot } from "./registry-snapshot";
import { listEc360Timeline } from "./timeline-registry";
import {
  validateEc360CommunicationPreference,
  validateEc360Consent,
  validateEc360Relationship,
} from "./validation-engine";

export function runEc360FoundationValidation(): { passed: boolean; details: Record<string, unknown> } {
  resetEc360Composition();
  initializeEc360RelationshipTypes();

  const household = registerEc360Household({
    householdCode: "HH-001",
    householdName: "Sharma Family",
    enabled: true,
    createdBy: "system",
  });

  const primary = onboardEc360Customer({
    customerCode: "CUST-001",
    customerType: EC360_CUSTOMER_TYPES.INDIVIDUAL,
    displayName: "Ravi Sharma",
    tenantId: "tenant-1",
    identityRef: "iaae:identity:ravi",
    createdBy: "system",
  });

  const activated = transitionEc360CustomerLifecycle({
    customerId: primary.id,
    action: "activate",
    actorId: "system",
  });

  addEc360CustomerToHousehold({
    customerId: primary.id,
    householdId: household.id,
    modifiedBy: "system",
  });

  registerEc360CustomerProfile({
    customerId: primary.id,
    summary: "Primary household member",
    preferredLanguage: "en",
    nationality: "IN",
    createdBy: "system",
  });

  registerEc360Individual({
    customerId: primary.id,
    firstName: "Ravi",
    lastName: "Sharma",
    dateOfBirth: "1985-06-15",
    createdBy: "system",
  });

  registerEc360CustomerAddress({
    customerId: primary.id,
    addressType: "residential",
    line1: "42 Lake View",
    city: "Mumbai",
    state: "MH",
    postalCode: "400001",
    countryCode: "IN",
    isPrimary: true,
    enabled: true,
  });

  registerEc360CustomerContact({
    customerId: primary.id,
    contactType: "primary",
    fullName: "Ravi Sharma",
    email: "ravi@example.com",
    phone: "+91-9000000001",
    enabled: true,
    createdBy: "system",
  });

  registerEc360IdentityReference({
    customerId: primary.id,
    identityRef: "iaae:identity:ravi",
    status: "verified",
    verifiedOn: new Date().toISOString(),
  });

  registerEc360KycReference({
    customerId: primary.id,
    kycRef: "kyc:ravi:001",
    status: "verified",
    verifiedOn: new Date().toISOString(),
  });

  const spouse = onboardEc360Customer({
    customerCode: "CUST-002",
    customerType: EC360_CUSTOMER_TYPES.INDIVIDUAL,
    displayName: "Priya Sharma",
    tenantId: "tenant-1",
    createdBy: "system",
  });

  transitionEc360CustomerLifecycle({ customerId: spouse.id, action: "activate", actorId: "system" });

  addEc360CustomerToHousehold({
    customerId: spouse.id,
    householdId: household.id,
    modifiedBy: "system",
  });

  const familyRelationship = registerEc360Relationship({
    sourceCustomerId: primary.id,
    targetCustomerId: spouse.id,
    relationshipTypeCode: EC360_RELATIONSHIP_TYPE_CODES.FAMILY,
    householdId: household.id,
    enabled: true,
    createdBy: "system",
  });

  const orgCustomer = onboardEc360Customer({
    customerCode: "CUST-ORG-001",
    customerType: EC360_CUSTOMER_TYPES.ORGANIZATION,
    displayName: "Sharma Enterprises",
    tenantId: "tenant-1",
    createdBy: "system",
  });

  transitionEc360CustomerLifecycle({ customerId: orgCustomer.id, action: "activate", actorId: "system" });

  registerEc360OrganizationCustomer({
    customerId: orgCustomer.id,
    organizationName: "Sharma Enterprises Pvt Ltd",
    registrationNumber: "CIN-12345",
    createdBy: "system",
  });

  const businessRelationship = registerEc360Relationship({
    sourceCustomerId: primary.id,
    targetCustomerId: orgCustomer.id,
    relationshipTypeCode: EC360_RELATIONSHIP_TYPE_CODES.BUSINESS,
    enabled: true,
    createdBy: "system",
  });

  const guarantor = onboardEc360Customer({
    customerCode: "CUST-003",
    customerType: EC360_CUSTOMER_TYPES.INDIVIDUAL,
    displayName: "Amit Guarantor",
    tenantId: "tenant-1",
    createdBy: "system",
  });

  transitionEc360CustomerLifecycle({ customerId: guarantor.id, action: "activate", actorId: "system" });

  const guarantorRelationship = registerEc360Relationship({
    sourceCustomerId: guarantor.id,
    targetCustomerId: primary.id,
    relationshipTypeCode: EC360_RELATIONSHIP_TYPE_CODES.GUARANTOR,
    enabled: true,
    createdBy: "system",
  });

  const coApplicantRelationship = registerEc360Relationship({
    sourceCustomerId: spouse.id,
    targetCustomerId: primary.id,
    relationshipTypeCode: EC360_RELATIONSHIP_TYPE_CODES.CO_APPLICANT,
    enabled: true,
    createdBy: "system",
  });

  const consent = registerEc360Consent({
    customerId: primary.id,
    consentCode: "MARKETING_EMAIL",
    consentName: "Marketing Email Consent",
    status: EC360_CONSENT_STATUS.GRANTED,
    grantedOn: new Date().toISOString(),
    createdBy: "system",
  });

  const commPref = setEc360CommunicationPreference({
    customerId: primary.id,
    channel: EC360_COMMUNICATION_CHANNELS.EMAIL,
    enabled: true,
    requiresConsent: true,
    consentCode: "MARKETING_EMAIL",
  });

  const segment = registerEc360Segment({
    segmentCode: "PREMIUM",
    segmentName: "Premium Customers",
    description: "High-value segment",
    enabled: true,
    createdBy: "system",
  });

  const segmentAssignment = assignEc360CustomerSegment({
    customerId: primary.id,
    segmentId: segment.id,
    assignedBy: "system",
  });

  enrichEc360CustomerEmployment({
    customerId: primary.id,
    employerName: "Tech Corp",
    occupation: "Engineer",
    employmentType: "salaried",
    enabled: true,
  });

  enrichEc360IncomeProfile({
    customerId: primary.id,
    incomeSource: "salary",
    annualIncome: 1200000,
    currencyCode: "INR",
  });

  enrichEc360FinancialProfile({
    customerId: primary.id,
    netWorth: 5000000,
    liquidAssets: 1000000,
    currencyCode: "INR",
    asOfDate: new Date().toISOString(),
  });

  enrichEc360RiskProfile({
    customerId: primary.id,
    riskCategory: "low",
    riskScore: 25,
    assessedOn: new Date().toISOString(),
    assessedBy: "system",
  });

  const tagged = tagEc360Customer(
    primary.id,
    [{ id: crypto.randomUUID(), tagCode: "vip", label: "VIP Customer" }],
    "system",
  );

  const searchResults = searchEc360Customers("Ravi");
  const timeline = listEc360Timeline(primary.id);

  let rejectionChecks = 0;

  try {
    onboardEc360Customer({
      customerCode: "CUST-001",
      customerType: EC360_CUSTOMER_TYPES.INDIVIDUAL,
      displayName: "Duplicate",
      tenantId: "tenant-1",
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  try {
    registerEc360IdentityReference({
      customerId: spouse.id,
      identityRef: "iaae:identity:ravi",
      status: "pending",
    });
  } catch {
    rejectionChecks += 1;
  }

  try {
    addEc360CustomerToHousehold({
      customerId: guarantor.id,
      householdId: "nonexistent-household",
      modifiedBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  try {
    registerEc360Relationship({
      sourceCustomerId: primary.id,
      targetCustomerId: spouse.id,
      relationshipTypeCode: "invalid_type",
      enabled: true,
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  const invalidTypeCheck = validateEc360Relationship({
    id: crypto.randomUUID(),
    sourceCustomerId: primary.id,
    targetCustomerId: spouse.id,
    relationshipTypeCode: "invalid_type",
    enabled: true,
    createdBy: "system",
    createdOn: new Date().toISOString(),
  });
  if (invalidTypeCheck.issues.some((i) => i.code === "EC360_INVALID_RELATIONSHIP_TYPE")) rejectionChecks += 1;

  const inconsistentConsent = validateEc360Consent({
    id: crypto.randomUUID(),
    customerId: primary.id,
    consentCode: "BAD_CONSENT",
    consentName: "Bad",
    status: EC360_CONSENT_STATUS.GRANTED,
    createdBy: "system",
    createdOn: new Date().toISOString(),
    modifiedBy: "system",
    modifiedOn: new Date().toISOString(),
  });
  if (inconsistentConsent.issues.some((i) => i.code === "EC360_CONSENT_INCONSISTENT")) rejectionChecks += 1;

  const badCommPref = validateEc360CommunicationPreference({
    id: crypto.randomUUID(),
    customerId: primary.id,
    channel: EC360_COMMUNICATION_CHANNELS.SMS,
    enabled: true,
    requiresConsent: true,
    consentCode: "MISSING_CONSENT",
  });
  if (badCommPref.issues.some((i) => i.code === "EC360_INVALID_COMM_PREF")) rejectionChecks += 1;

  try {
    registerEc360Relationship({
      sourceCustomerId: guarantor.id,
      targetCustomerId: primary.id,
      relationshipTypeCode: EC360_RELATIONSHIP_TYPE_CODES.GUARANTOR,
      enabled: true,
      createdBy: "system",
    });
    registerEc360Relationship({
      sourceCustomerId: primary.id,
      targetCustomerId: guarantor.id,
      relationshipTypeCode: EC360_RELATIONSHIP_TYPE_CODES.GUARANTOR,
      enabled: true,
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  const snap = getEc360RegistrySnapshot();

  const passed =
    activated?.lifecycleStatus === EC360_CUSTOMER_LIFECYCLE_STATUS.ACTIVE &&
    familyRelationship.relationshipTypeCode === EC360_RELATIONSHIP_TYPE_CODES.FAMILY &&
    businessRelationship.relationshipTypeCode === EC360_RELATIONSHIP_TYPE_CODES.BUSINESS &&
    guarantorRelationship.relationshipTypeCode === EC360_RELATIONSHIP_TYPE_CODES.GUARANTOR &&
    coApplicantRelationship.relationshipTypeCode === EC360_RELATIONSHIP_TYPE_CODES.CO_APPLICANT &&
    consent.status === EC360_CONSENT_STATUS.GRANTED &&
    commPref.channel === EC360_COMMUNICATION_CHANNELS.EMAIL &&
    segmentAssignment.segmentCode === "PREMIUM" &&
    tagged?.tags.length === 1 &&
    searchResults.length >= 1 &&
    timeline.length >= 3 &&
    snap.customers.length >= 4 &&
    snap.households.length === 1 &&
    snap.relationshipTypes.length >= 8 &&
    snap.relationships.length >= 4 &&
    snap.consents.length === 1 &&
    snap.communicationPreferences.length === 1 &&
    snap.segmentAssignments.length === 1 &&
    snap.auditReferences.length >= 5 &&
    rejectionChecks >= 7;

  return {
    passed,
    details: {
      primaryCustomerCode: primary.customerCode,
      activatedStatus: activated?.lifecycleStatus,
      householdCode: household.householdCode,
      relationshipTypes: snap.relationshipTypes.length,
      relationships: snap.relationships.length,
      timelineEntries: timeline.length,
      searchHits: searchResults.length,
      customers: snap.customers.length,
      auditReferences: snap.auditReferences.length,
      rejectionChecks,
      segmentCode: segment.segmentCode,
    },
  };
}
