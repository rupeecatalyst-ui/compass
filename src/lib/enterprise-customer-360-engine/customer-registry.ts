/**
 * EC360 customer registry — onboarding, lifecycle, profile enrichment.
 */

import {
  EC360_CUSTOMER_LIFECYCLE_ACTION_MAP,
  EC360_CUSTOMER_LIFECYCLE_STATUS,
} from "@/constants/enterprise-customer-360-engine";
import type {
  Ec360Customer,
  Ec360CustomerAddress,
  Ec360CustomerContact,
  Ec360CustomerEmployment,
  Ec360CustomerFinancialProfile,
  Ec360CustomerIdentityReference,
  Ec360CustomerIncomeProfile,
  Ec360CustomerKycReference,
  Ec360CustomerLifecycleAction,
  Ec360CustomerLifecycleStatus,
  Ec360CustomerPreference,
  Ec360CustomerProfile,
  Ec360CustomerRiskProfile,
  Ec360CustomerSegment,
  Ec360CustomerSegmentAssignment,
  Ec360CustomerTag,
  Ec360CustomerType,
  Ec360Individual,
  Ec360OrganizationCustomer,
} from "@/types/enterprise-customer-360-engine";
import { recordEc360Audit } from "./audit-integration";
import { getEc360Ports } from "./composition";
import { appendEc360TimelineEntry } from "./timeline-registry";
import {
  validateEc360Customer,
  validateEc360CustomerLifecycleTransition,
  validateEc360IdentityReferenceUniqueness,
} from "./validation-engine";

type CreateCustomerInput = Omit<
  Ec360Customer,
  "id" | "lifecycleStatus" | "enabled" | "createdOn" | "modifiedOn" | "modifiedBy" | "tags"
> &
  Partial<Pick<Ec360Customer, "enabled" | "tags" | "householdId" | "tenantId" | "identityRef">>;

export function registerEc360Customer(input: CreateCustomerInput): Ec360Customer {
  const now = new Date().toISOString();
  const customer: Ec360Customer = {
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    customerCode: input.customerCode,
    customerType: input.customerType,
    displayName: input.displayName,
    lifecycleStatus: EC360_CUSTOMER_LIFECYCLE_STATUS.PROSPECT,
    householdId: input.householdId,
    tags: input.tags ?? [],
    identityRef: input.identityRef,
    enabled: input.enabled ?? true,
    createdBy: input.createdBy,
    createdOn: now,
    modifiedBy: input.createdBy,
    modifiedOn: now,
  };

  const validation = validateEc360Customer(getEc360Ports().customers, customer);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEc360Ports().customers.save(customer);
  recordEc360Audit({
    entityId: customer.id,
    entityType: "customer",
    action: "created",
    actorId: input.createdBy,
    newStateRef: customer.lifecycleStatus,
    remarks: `Registered customer ${customer.customerCode}`,
  });

  return customer;
}

export function onboardEc360Customer(input: CreateCustomerInput): Ec360Customer {
  const customer = registerEc360Customer(input);
  const qualified = transitionEc360CustomerLifecycle({
    customerId: customer.id,
    action: "qualify",
    actorId: input.createdBy,
    remarks: "Customer qualified as lead",
  })!;
  appendEc360TimelineEntry({
    customerId: customer.id,
    eventType: "onboarded",
    title: "Customer Onboarded",
    description: `Customer ${customer.customerCode} onboarded`,
    actorId: input.createdBy,
  });
  return qualified;
}

export function transitionEc360CustomerLifecycle(input: {
  customerId: string;
  action: Ec360CustomerLifecycleAction;
  actorId: string;
  remarks?: string;
}): Ec360Customer | undefined {
  const customer = getEc360Ports().customers.findById(input.customerId);
  if (!customer) return undefined;

  const target = EC360_CUSTOMER_LIFECYCLE_ACTION_MAP[input.action] as Ec360CustomerLifecycleStatus;
  validateEc360CustomerLifecycleTransition(customer.lifecycleStatus, target);

  const updated: Ec360Customer = {
    ...customer,
    lifecycleStatus: target,
    modifiedBy: input.actorId,
    modifiedOn: new Date().toISOString(),
  };

  getEc360Ports().customers.save(updated);
  recordEc360Audit({
    entityId: customer.id,
    entityType: "customer",
    action:
      target === EC360_CUSTOMER_LIFECYCLE_STATUS.ARCHIVED
        ? "archived"
        : target === EC360_CUSTOMER_LIFECYCLE_STATUS.ACTIVE
          ? "activated"
          : "lifecycle_changed",
    actorId: input.actorId,
    previousStateRef: customer.lifecycleStatus,
    newStateRef: target,
    remarks: input.remarks,
  });
  appendEc360TimelineEntry({
    customerId: customer.id,
    eventType: "lifecycle_changed",
    title: "Lifecycle Changed",
    description: `Transitioned from ${customer.lifecycleStatus} to ${target}`,
    actorId: input.actorId,
    metadata: { from: customer.lifecycleStatus, to: target },
  });

  return updated;
}

export function registerEc360CustomerProfile(
  input: Omit<Ec360CustomerProfile, "id" | "createdOn" | "modifiedOn" | "modifiedBy">,
): Ec360CustomerProfile {
  if (!getEc360Ports().customers.findById(input.customerId)) {
    throw new Error(`EC360: customer "${input.customerId}" not found.`);
  }
  const existing = getEc360Ports().customerProfiles.findByCustomer(input.customerId);
  if (existing) throw new Error(`EC360: profile already exists for customer "${input.customerId}".`);

  const now = new Date().toISOString();
  const profile: Ec360CustomerProfile = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: now,
    modifiedOn: now,
    modifiedBy: input.createdBy,
  };

  getEc360Ports().customerProfiles.save(profile);
  recordEc360Audit({
    entityId: profile.id,
    entityType: "customer_profile",
    action: "created",
    actorId: input.createdBy,
    remarks: "Registered customer profile",
  });
  appendEc360TimelineEntry({
    customerId: input.customerId,
    eventType: "profile_updated",
    title: "Profile Created",
    description: "Customer profile registered",
    actorId: input.createdBy,
  });

  return profile;
}

export function registerEc360Individual(
  input: Omit<Ec360Individual, "id" | "createdOn">,
): Ec360Individual {
  const customer = getEc360Ports().customers.findById(input.customerId);
  if (!customer) throw new Error(`EC360: customer "${input.customerId}" not found.`);
  if (customer.customerType !== "individual") {
    throw new Error(`EC360: customer "${input.customerId}" is not an individual.`);
  }

  const individual: Ec360Individual = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getEc360Ports().individuals.save(individual);
  return individual;
}

export function registerEc360OrganizationCustomer(
  input: Omit<Ec360OrganizationCustomer, "id" | "createdOn">,
): Ec360OrganizationCustomer {
  const customer = getEc360Ports().customers.findById(input.customerId);
  if (!customer) throw new Error(`EC360: customer "${input.customerId}" not found.`);
  if (customer.customerType !== "organization") {
    throw new Error(`EC360: customer "${input.customerId}" is not an organization.`);
  }

  const organization: Ec360OrganizationCustomer = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getEc360Ports().organizationCustomers.save(organization);
  return organization;
}

export function registerEc360CustomerAddress(input: Omit<Ec360CustomerAddress, "id">): Ec360CustomerAddress {
  if (!getEc360Ports().customers.findById(input.customerId)) {
    throw new Error(`EC360: customer "${input.customerId}" not found.`);
  }
  const address: Ec360CustomerAddress = { ...input, id: crypto.randomUUID() };
  getEc360Ports().addresses.save(address);
  return address;
}

export function registerEc360CustomerContact(
  input: Omit<Ec360CustomerContact, "id" | "createdOn">,
): Ec360CustomerContact {
  if (!getEc360Ports().customers.findById(input.customerId)) {
    throw new Error(`EC360: customer "${input.customerId}" not found.`);
  }
  const contact: Ec360CustomerContact = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };
  getEc360Ports().contacts.save(contact);
  return contact;
}

export function registerEc360IdentityReference(
  input: Omit<Ec360CustomerIdentityReference, "id">,
): Ec360CustomerIdentityReference {
  const customer = getEc360Ports().customers.findById(input.customerId);
  if (!customer) throw new Error(`EC360: customer "${input.customerId}" not found.`);

  validateEc360IdentityReferenceUniqueness(input.identityRef, customer.id);

  const reference: Ec360CustomerIdentityReference = { ...input, id: crypto.randomUUID() };
  getEc360Ports().identityReferences.save(reference);

  getEc360Ports().customers.save({
    ...customer,
    identityRef: input.identityRef,
    modifiedOn: new Date().toISOString(),
  });

  return reference;
}

export function registerEc360KycReference(
  input: Omit<Ec360CustomerKycReference, "id">,
): Ec360CustomerKycReference {
  if (!getEc360Ports().customers.findById(input.customerId)) {
    throw new Error(`EC360: customer "${input.customerId}" not found.`);
  }
  const reference: Ec360CustomerKycReference = { ...input, id: crypto.randomUUID() };
  getEc360Ports().kycReferences.save(reference);
  return reference;
}

export function enrichEc360CustomerEmployment(
  input: Omit<Ec360CustomerEmployment, "id">,
): Ec360CustomerEmployment {
  if (!getEc360Ports().customers.findById(input.customerId)) {
    throw new Error(`EC360: customer "${input.customerId}" not found.`);
  }
  const employment: Ec360CustomerEmployment = { ...input, id: crypto.randomUUID() };
  getEc360Ports().employments.save(employment);
  return employment;
}

export function enrichEc360IncomeProfile(
  input: Omit<Ec360CustomerIncomeProfile, "id">,
): Ec360CustomerIncomeProfile {
  if (!getEc360Ports().customers.findById(input.customerId)) {
    throw new Error(`EC360: customer "${input.customerId}" not found.`);
  }
  const profile: Ec360CustomerIncomeProfile = { ...input, id: crypto.randomUUID() };
  getEc360Ports().incomeProfiles.save(profile);
  return profile;
}

export function enrichEc360FinancialProfile(
  input: Omit<Ec360CustomerFinancialProfile, "id">,
): Ec360CustomerFinancialProfile {
  if (!getEc360Ports().customers.findById(input.customerId)) {
    throw new Error(`EC360: customer "${input.customerId}" not found.`);
  }
  const profile: Ec360CustomerFinancialProfile = { ...input, id: crypto.randomUUID() };
  getEc360Ports().financialProfiles.save(profile);
  return profile;
}

export function enrichEc360RiskProfile(
  input: Omit<Ec360CustomerRiskProfile, "id">,
): Ec360CustomerRiskProfile {
  if (!getEc360Ports().customers.findById(input.customerId)) {
    throw new Error(`EC360: customer "${input.customerId}" not found.`);
  }
  const profile: Ec360CustomerRiskProfile = { ...input, id: crypto.randomUUID() };
  getEc360Ports().riskProfiles.save(profile);
  return profile;
}

export function setEc360CustomerPreference(
  input: Omit<Ec360CustomerPreference, "id">,
): Ec360CustomerPreference {
  if (!getEc360Ports().customers.findById(input.customerId)) {
    throw new Error(`EC360: customer "${input.customerId}" not found.`);
  }
  const preference: Ec360CustomerPreference = { ...input, id: crypto.randomUUID() };
  getEc360Ports().preferences.save(preference);
  return preference;
}

export function registerEc360Segment(
  input: Omit<Ec360CustomerSegment, "id" | "createdOn">,
): Ec360CustomerSegment {
  const duplicate = getEc360Ports().segments.findByCode(input.segmentCode);
  if (duplicate) throw new Error(`EC360: segment code "${input.segmentCode}" already exists.`);

  const segment: Ec360CustomerSegment = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getEc360Ports().segments.save(segment);
  return segment;
}

export function assignEc360CustomerSegment(input: {
  customerId: string;
  segmentId: string;
  assignedBy: string;
}): Ec360CustomerSegmentAssignment {
  const segment = getEc360Ports().segments.findById(input.segmentId);
  if (!segment) throw new Error(`EC360: segment "${input.segmentId}" not found.`);
  if (!getEc360Ports().customers.findById(input.customerId)) {
    throw new Error(`EC360: customer "${input.customerId}" not found.`);
  }

  const assignment: Ec360CustomerSegmentAssignment = {
    id: crypto.randomUUID(),
    customerId: input.customerId,
    segmentId: segment.id,
    segmentCode: segment.segmentCode,
    assignedBy: input.assignedBy,
    assignedOn: new Date().toISOString(),
  };

  getEc360Ports().segmentAssignments.save(assignment);
  appendEc360TimelineEntry({
    customerId: input.customerId,
    eventType: "segment_assigned",
    title: "Segment Assigned",
    description: `Assigned to segment ${segment.segmentCode}`,
    actorId: input.assignedBy,
    metadata: { segmentCode: segment.segmentCode },
  });

  return assignment;
}

export function tagEc360Customer(
  customerId: string,
  tags: Ec360CustomerTag[],
  modifiedBy: string,
): Ec360Customer | undefined {
  const customer = getEc360Ports().customers.findById(customerId);
  if (!customer) return undefined;

  const updated = { ...customer, tags, modifiedBy, modifiedOn: new Date().toISOString() };
  getEc360Ports().customers.save(updated);
  appendEc360TimelineEntry({
    customerId,
    eventType: "tagged",
    title: "Customer Tagged",
    description: `Tags updated: ${tags.map((t) => t.tagCode).join(", ")}`,
    actorId: modifiedBy,
  });
  return updated;
}

export function searchEc360Customers(query: string): Ec360Customer[] {
  return getEc360Ports().customers.search(query);
}

export function getEc360CustomerByCode(customerCode: string, tenantId?: string): Ec360Customer | undefined {
  return getEc360Ports().customers.findByCode(customerCode, tenantId);
}

export function listEc360Customers(): Ec360Customer[] {
  return getEc360Ports().customers.list();
}

export function createEc360CustomerOfType(
  input: CreateCustomerInput & { customerType: Ec360CustomerType },
): Ec360Customer {
  return registerEc360Customer(input);
}
