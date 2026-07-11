/**
 * EPNE foundation validation — smoke checks for Sprint 9 deliverable verification.
 */

import {
  EPNE_PARTNER_CATEGORIES,
  EPNE_PARTNER_LIFECYCLE_STATUS,
  EPNE_PARTNER_TYPES,
  EPNE_RELATIONSHIP_TYPE_CODES,
} from "@/constants/enterprise-partner-network-engine";
import {
  createEpneAgreementVersion,
  registerEpneAgreement,
  transitionEpneAgreementLifecycle,
} from "./agreement-registry";
import {
  assignEpneCapabilityToPartner,
  registerEpneCapability,
} from "./capability-registry";
import { resetEpneComposition } from "./composition";
import {
  getEpnePartnerAncestors,
  getEpnePartnerDescendants,
  setEpneParentPartner,
} from "./hierarchy-engine";
import { computeEpnePerformanceSummary } from "./performance-registry";
import {
  onboardEpnePartner,
  registerEpnePartnerAddress,
  registerEpnePartnerContact,
  registerEpnePartnerLegalEntity,
  registerEpnePartnerOrganization,
  registerEpnePartnerProfile,
  searchEpnePartners,
  tagEpnePartner,
  transitionEpnePartnerLifecycle,
} from "./partner-registry";
import { getEpneRegistrySnapshot } from "./registry-snapshot";
import {
  initializeEpneRelationshipTypes,
  registerEpneReferralMapping,
  registerEpneReferralNetwork,
  registerEpneRelationship,
} from "./relationship-registry";
import {
  assignEpneServiceArea,
  registerEpneTerritory,
} from "./territory-registry";
import { validateEpneParentRelationship, validateEpneRelationship } from "./validation-engine";

export function runEpneFoundationValidation(): { passed: boolean; details: Record<string, unknown> } {
  resetEpneComposition();
  initializeEpneRelationshipTypes();

  const root = onboardEpnePartner({
    partnerCode: "ROOT_PARTNER",
    partnerName: "Root Partner",
    description: "Foundation root partner",
    category: EPNE_PARTNER_CATEGORIES.STRATEGIC,
    partnerType: EPNE_PARTNER_TYPES.ORGANIZATION,
    tenantId: "tenant-1",
    identityRef: "iaae:identity:root",
    organizationRef: "eowe:org:root",
    createdBy: "system",
  });

  const activated = transitionEpnePartnerLifecycle({
    partnerId: root.id,
    action: "verify",
    actorId: "system",
    remarks: "Verified root partner",
  });

  registerEpnePartnerProfile({
    partnerId: root.id,
    displayName: "Root Partner Group",
    summary: "Strategic partner profile",
    website: "https://example.com",
    createdBy: "system",
  });

  registerEpnePartnerOrganization({
    partnerId: root.id,
    organizationName: "Root Partner Org",
    registrationNumber: "REG-001",
    organizationRef: "eowe:org:root",
    createdBy: "system",
  });

  registerEpnePartnerLegalEntity({
    partnerId: root.id,
    legalName: "Root Partner Legal Entity",
    entityType: "private_limited",
    jurisdiction: "IN",
    createdBy: "system",
  });

  registerEpnePartnerContact({
    partnerId: root.id,
    contactType: "primary",
    fullName: "Alex Partner",
    email: "alex@example.com",
    phone: "+91-9000000000",
    enabled: true,
    createdBy: "system",
  });

  registerEpnePartnerAddress({
    partnerId: root.id,
    addressType: "registered",
    line1: "100 Partner Street",
    city: "Mumbai",
    state: "MH",
    postalCode: "400001",
    countryCode: "IN",
    enabled: true,
  });

  const child = onboardEpnePartner({
    partnerCode: "CHILD_PARTNER",
    partnerName: "Child Partner",
    description: "Child in hierarchy",
    category: EPNE_PARTNER_CATEGORIES.DISTRIBUTION,
    partnerType: EPNE_PARTNER_TYPES.FRANCHISE,
    parentPartnerId: root.id,
    tenantId: "tenant-1",
    createdBy: "system",
  });

  transitionEpnePartnerLifecycle({ partnerId: child.id, action: "verify", actorId: "system" });

  const grandchild = onboardEpnePartner({
    partnerCode: "GRANDCHILD_PARTNER",
    partnerName: "Grandchild Partner",
    description: "Third-level hierarchy node",
    category: EPNE_PARTNER_CATEGORIES.CHANNEL,
    partnerType: EPNE_PARTNER_TYPES.AFFILIATE,
    parentPartnerId: child.id,
    tenantId: "tenant-1",
    createdBy: "system",
  });

  transitionEpnePartnerLifecycle({ partnerId: grandchild.id, action: "verify", actorId: "system" });

  const hierarchyDepth = getEpnePartnerDescendants(root.id).length;
  const ancestors = getEpnePartnerAncestors(grandchild.id).length;

  const franchiseRelationship = registerEpneRelationship({
    sourcePartnerId: child.id,
    targetPartnerId: root.id,
    relationshipTypeCode: EPNE_RELATIONSHIP_TYPE_CODES.FRANCHISE_OF,
    enabled: true,
    createdBy: "system",
  });

  const referralRelationship = registerEpneRelationship({
    sourcePartnerId: root.id,
    targetPartnerId: child.id,
    relationshipTypeCode: EPNE_RELATIONSHIP_TYPE_CODES.REFERS_BUSINESS_TO,
    enabled: true,
    createdBy: "system",
  });

  const referralNetwork = registerEpneReferralNetwork({
    networkCode: "REFERRAL_NETWORK",
    networkName: "Referral Network",
    description: "Foundation referral network",
    enabled: true,
    createdBy: "system",
  });

  const referralMapping = registerEpneReferralMapping({
    networkId: referralNetwork.id,
    partnerId: root.id,
    mappingRole: "anchor",
    enabled: true,
    createdBy: "system",
  });

  const territory = registerEpneTerritory({
    territoryCode: "WEST_ZONE",
    territoryName: "West Zone",
    description: "Western territory",
    regionRef: "region:west",
    enabled: true,
    createdBy: "system",
  });

  const serviceArea = assignEpneServiceArea({
    id: `${territory.id}:${root.id}:WEST_CORE`,
    territoryId: territory.id,
    partnerId: root.id,
    areaCode: "WEST_CORE",
    areaName: "West Core Area",
    enabled: true,
  });

  const agreement = registerEpneAgreement({
    partnerId: root.id,
    agreementCode: "MASTER_AGREEMENT",
    agreementName: "Master Partner Agreement",
    description: "Foundation agreement",
    enabled: true,
    createdBy: "system",
  });

  const agreementVersion = createEpneAgreementVersion({
    agreementId: agreement.id,
    agreementCode: agreement.agreementCode,
    versionMajor: 1,
    versionMinor: 0,
    termsRef: "terms:v1",
    createdBy: "system",
  });

  transitionEpneAgreementLifecycle({ agreementId: agreement.id, action: "approve", actorId: "system" });
  transitionEpneAgreementLifecycle({ agreementId: agreement.id, action: "activate", actorId: "system" });

  const capability = registerEpneCapability({
    capabilityCode: "ONBOARDING",
    capabilityName: "Partner Onboarding",
    description: "Can onboard sub-partners",
    category: "operations",
    enabled: true,
    createdBy: "system",
  });

  const capabilityAssignment = assignEpneCapabilityToPartner({
    partnerId: root.id,
    capabilityId: capability.id,
    assignedBy: "system",
  });

  const performance = computeEpnePerformanceSummary({
    partnerId: root.id,
    periodCode: "2026-Q2",
    metrics: { referrals: 12, activations: 8 },
  });

  const tagged = tagEpnePartner(
    root.id,
    [{ id: crypto.randomUUID(), tagCode: "premium", label: "Premium Partner" }],
    "system",
  );

  const searchResults = searchEpnePartners("Root Partner Group");

  let rejectionChecks = 0;

  try {
    onboardEpnePartner({
      partnerCode: "ROOT_PARTNER",
      partnerName: "Duplicate",
      description: "",
      category: EPNE_PARTNER_CATEGORIES.GENERAL,
      partnerType: EPNE_PARTNER_TYPES.INDIVIDUAL,
      tenantId: "tenant-1",
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  try {
    setEpneParentPartner(root.id, grandchild.id, "system");
  } catch {
    rejectionChecks += 1;
  }

  const cycleIssues = validateEpneParentRelationship({
    ...root,
    parentPartnerId: grandchild.id,
  });
  if (cycleIssues.some((i) => i.code === "EPNE_CIRCULAR_HIERARCHY")) rejectionChecks += 1;

  try {
    registerEpneRelationship({
      sourcePartnerId: root.id,
      targetPartnerId: child.id,
      relationshipTypeCode: "invalid_type",
      enabled: true,
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  const invalidTypeCheck = validateEpneRelationship({
    id: crypto.randomUUID(),
    sourcePartnerId: root.id,
    targetPartnerId: child.id,
    relationshipTypeCode: "invalid_type",
    enabled: true,
    createdBy: "system",
    createdOn: new Date().toISOString(),
  });
  if (invalidTypeCheck.issues.some((i) => i.code === "EPNE_INVALID_RELATIONSHIP_TYPE")) rejectionChecks += 1;

  try {
    registerEpneAgreement({
      partnerId: root.id,
      agreementCode: "MASTER_AGREEMENT",
      agreementName: "Duplicate Agreement",
      description: "",
      enabled: true,
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  try {
    registerEpneReferralMapping({
      networkId: referralNetwork.id,
      partnerId: root.id,
      mappingRole: "duplicate",
      enabled: true,
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  const snap = getEpneRegistrySnapshot();

  const passed =
    activated?.lifecycleStatus === EPNE_PARTNER_LIFECYCLE_STATUS.ACTIVE &&
    hierarchyDepth >= 2 &&
    ancestors >= 2 &&
    franchiseRelationship.relationshipTypeCode === EPNE_RELATIONSHIP_TYPE_CODES.FRANCHISE_OF &&
    referralRelationship.relationshipTypeCode === EPNE_RELATIONSHIP_TYPE_CODES.REFERS_BUSINESS_TO &&
    referralMapping.id.length > 0 &&
    serviceArea.areaCode === "WEST_CORE" &&
    agreementVersion.versionMajor === 1 &&
    capabilityAssignment.capabilityCode === "ONBOARDING" &&
    performance.metrics.referrals === 12 &&
    tagged?.tags.length === 1 &&
    searchResults.length >= 1 &&
    snap.partners.length >= 3 &&
    snap.partnerProfiles.length === 1 &&
    snap.relationshipTypes.length >= 9 &&
    snap.relationships.length >= 2 &&
    snap.capabilities.length === 1 &&
    snap.capabilityAssignments.length === 1 &&
    snap.agreements.length === 1 &&
    snap.referralNetworks.length === 1 &&
    snap.referralMappings.length === 1 &&
    snap.auditReferences.length >= 5 &&
    rejectionChecks >= 6;

  return {
    passed,
    details: {
      rootPartnerCode: root.partnerCode,
      activatedStatus: activated?.lifecycleStatus,
      hierarchyDepth,
      ancestors,
      relationshipTypes: snap.relationshipTypes.length,
      relationships: snap.relationships.length,
      capabilityCode: capability.capabilityCode,
      performanceReferrals: performance.metrics.referrals,
      searchHits: searchResults.length,
      partners: snap.partners.length,
      auditReferences: snap.auditReferences.length,
      rejectionChecks,
      referralNetworkCode: referralNetwork.networkCode,
    },
  };
}
