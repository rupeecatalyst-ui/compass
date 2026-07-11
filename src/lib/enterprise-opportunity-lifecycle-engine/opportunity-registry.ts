/**
 * EOLE opportunity registry — canonical business orchestration entry point.
 */

import {
  EOLE_BUSINESS_MODELS,
  EOLE_OPPORTUNITY_LIFECYCLE_STATUS,
} from "@/constants/enterprise-opportunity-lifecycle-engine";
import type {
  EoleOpportunity,
  EoleOpportunityCustomerReference,
  EoleOpportunityFinancialRequirement,
  EoleOpportunityOrganizationReference,
  EoleOpportunityPartnerReference,
  EoleOpportunityProductReference,
  EoleOpportunityProfile,
  EoleOpportunityRequirement,
  EoleOpportunityStrategy,
} from "@/types/enterprise-opportunity-lifecycle-engine";
import { recordEoleAudit } from "./audit-integration";
import { getEolePorts } from "./composition";
import { appendEoleTimelineEntry } from "./timeline-registry";
import { validateEoleOpportunity } from "./validation-engine";

export function registerEoleOpportunity(
  input: Omit<
    EoleOpportunity,
    | "id"
    | "enterpriseOpportunityId"
    | "lifecycleStatus"
    | "stageCode"
    | "minimumDocumentsSubmitted"
    | "enabled"
    | "createdOn"
    | "modifiedBy"
    | "modifiedOn"
    | "closedOn"
  > & { minimumDocumentsSubmitted?: boolean },
): EoleOpportunity {
  const now = new Date().toISOString();
  const opportunity: EoleOpportunity = {
    ...input,
    id: crypto.randomUUID(),
    enterpriseOpportunityId: `eole:opportunity:${crypto.randomUUID()}`,
    lifecycleStatus: EOLE_OPPORTUNITY_LIFECYCLE_STATUS.NEW,
    stageCode: "intake",
    minimumDocumentsSubmitted: input.minimumDocumentsSubmitted ?? false,
    enabled: true,
    createdOn: now,
    modifiedBy: input.createdBy,
    modifiedOn: now,
  };

  const validation = validateEoleOpportunity(opportunity, getEolePorts().opportunities.list());
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEolePorts().opportunities.save(opportunity);
  recordEoleAudit({
    entityId: opportunity.id,
    entityType: "opportunity",
    action: "created",
    actorId: input.createdBy,
    remarks: `Opportunity ${opportunity.opportunityCode} created`,
  });
  appendEoleTimelineEntry({
    opportunityId: opportunity.id,
    eventType: "created",
    title: "Opportunity Created",
    description: `Enterprise Opportunity ${opportunity.enterpriseOpportunityId} registered`,
    actorId: input.createdBy,
  });

  return opportunity;
}

export function createEoleOpportunityFromLead(input: {
  opportunityCode: string;
  customerRef: string;
  productRef: string;
  financialRequirementId: string;
  strategy: EoleOpportunity["strategy"];
  organizationRef?: string;
  partnerRef?: string;
  minimumDocumentsSubmitted: boolean;
  createdBy: string;
}): EoleOpportunity {
  if (!input.minimumDocumentsSubmitted) {
    throw new Error("EOLE: Opportunity requires minimum document submission before creation.");
  }

  return registerEoleOpportunity({
    opportunityCode: input.opportunityCode,
    customerRef: input.customerRef,
    productRef: input.productRef,
    financialRequirementId: input.financialRequirementId,
    strategy: input.strategy,
    organizationRef: input.organizationRef,
    partnerRef: input.partnerRef,
    minimumDocumentsSubmitted: true,
    createdBy: input.createdBy,
  });
}

export function registerEoleOpportunityProfile(
  input: Omit<EoleOpportunityProfile, "id" | "enabled" | "createdOn" | "modifiedBy" | "modifiedOn">,
): EoleOpportunityProfile {
  const now = new Date().toISOString();
  const profile: EoleOpportunityProfile = {
    ...input,
    id: crypto.randomUUID(),
    enabled: true,
    createdOn: now,
    modifiedBy: input.createdBy,
    modifiedOn: now,
  };

  getEolePorts().profiles.save(profile);
  recordEoleAudit({
    entityId: profile.id,
    entityType: "opportunity",
    action: "modified",
    actorId: input.createdBy,
    remarks: `Profile ${profile.profileCode} registered`,
  });
  return profile;
}

export function registerEoleOpportunityRequirement(
  input: Omit<EoleOpportunityRequirement, "id" | "enabled" | "createdOn">,
): EoleOpportunityRequirement {
  const requirement: EoleOpportunityRequirement = {
    ...input,
    id: crypto.randomUUID(),
    enabled: true,
    createdOn: new Date().toISOString(),
  };

  getEolePorts().requirements.save(requirement);
  return requirement;
}

export function registerEoleCustomerReference(
  input: Omit<EoleOpportunityCustomerReference, "id" | "enabled" | "createdOn">,
): EoleOpportunityCustomerReference {
  const reference: EoleOpportunityCustomerReference = {
    ...input,
    id: crypto.randomUUID(),
    enabled: true,
    createdOn: new Date().toISOString(),
  };
  getEolePorts().customerReferences.save(reference);
  return reference;
}

export function registerEolePartnerReference(
  input: Omit<EoleOpportunityPartnerReference, "id" | "enabled" | "createdOn">,
): EoleOpportunityPartnerReference {
  const reference: EoleOpportunityPartnerReference = {
    ...input,
    id: crypto.randomUUID(),
    enabled: true,
    createdOn: new Date().toISOString(),
  };
  getEolePorts().partnerReferences.save(reference);
  return reference;
}

export function registerEoleOrganizationReference(
  input: Omit<EoleOpportunityOrganizationReference, "id" | "enabled" | "createdOn">,
): EoleOpportunityOrganizationReference {
  const reference: EoleOpportunityOrganizationReference = {
    ...input,
    id: crypto.randomUUID(),
    enabled: true,
    createdOn: new Date().toISOString(),
  };
  getEolePorts().organizationReferences.save(reference);
  return reference;
}

export function registerEoleProductReference(
  input: Omit<EoleOpportunityProductReference, "id" | "enabled" | "createdOn">,
): EoleOpportunityProductReference {
  const reference: EoleOpportunityProductReference = {
    ...input,
    id: crypto.randomUUID(),
    enabled: true,
    createdOn: new Date().toISOString(),
  };
  getEolePorts().productReferences.save(reference);
  return reference;
}

export function registerEoleFinancialRequirement(
  input: Omit<EoleOpportunityFinancialRequirement, "id" | "enabled" | "fulfilledAmount" | "createdOn" | "modifiedBy" | "modifiedOn">,
): EoleOpportunityFinancialRequirement {
  const now = new Date().toISOString();
  const requirement: EoleOpportunityFinancialRequirement = {
    ...input,
    id: crypto.randomUUID(),
    fulfilledAmount: 0,
    enabled: true,
    createdOn: now,
    modifiedBy: input.createdBy,
    modifiedOn: now,
  };
  getEolePorts().financialRequirements.save(requirement);
  return requirement;
}

export function registerEoleOpportunityStrategy(
  input: Omit<EoleOpportunityStrategy, "id" | "enabled" | "createdOn">,
): EoleOpportunityStrategy {
  const strategy: EoleOpportunityStrategy = {
    ...input,
    id: crypto.randomUUID(),
    enabled: true,
    createdOn: new Date().toISOString(),
    maxSuccessfulDisbursements:
      input.businessModel === EOLE_BUSINESS_MODELS.SECURED_LENDING ? 1 : input.maxSuccessfulDisbursements,
    allowMultipleLenderPipelines: input.allowMultipleLenderPipelines ?? true,
  };
  getEolePorts().strategies.save(strategy);
  return strategy;
}

export function listEoleOpportunitiesByCustomer(customerRef: string): EoleOpportunity[] {
  return getEolePorts().opportunities.listByCustomer(customerRef);
}
